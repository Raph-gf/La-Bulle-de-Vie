import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { stripe } from "@/lib/stripe"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { serviceId, serviceSlug, slotId, notes, isFirstVisit, location, clientAddress, name, email, phone } = body

    if (!slotId || !name || !email || (!serviceId && !serviceSlug)) {
      return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 })
    }

    // Resolve service from slug or ID
    let service: { id: string; price: number } | null = null
    if (serviceSlug) {
      service = await prisma.service.findUnique({
        where: { slug: serviceSlug },
        select: { id: true, price: true },
      })
    } else {
      service = await prisma.service.findUnique({
        where: { id: serviceId },
        select: { id: true, price: true },
      })
    }
    if (!service) {
      return NextResponse.json({ error: "Service introuvable" }, { status: 400 })
    }

    // Get logged-in user if any — verify profile exists in DB (may not if signup trigger not yet set up)
    let clientId: string | undefined
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const profile = await prisma.profile.findUnique({ where: { id: user.id }, select: { id: true } })
      if (profile) clientId = user.id
    }

    // Verify slot is still free
    const slot = await prisma.availabilitySlot.findUnique({ where: { id: slotId } })
    if (!slot || slot.isBooked) {
      return NextResponse.json(
        { error: "Ce créneau vient d'être pris. Veuillez en choisir un autre." },
        { status: 409 }
      )
    }

    // Server-side price calculation — never trust client amount
    let amountInCents = service.price

    // Travel fee: fetch from specialist settings if domicile
    let travelFeeInCents = 0
    if (location === "domicile") {
      const profile = await prisma.profile.findFirst({
        where: { role: "specialist" },
        select: { travelPricing: true },
      })
      if (profile?.travelPricing) {
        const pricing = profile.travelPricing as { type?: string; zones?: { maxKm: number; feeInCents: number }[] }
        if (pricing.type === "zones" && Array.isArray(pricing.zones) && pricing.zones.length > 0) {
          // Default to first zone fee when address geocoding isn't done at this step
          travelFeeInCents = pricing.zones[0]?.feeInCents ?? 1800
        }
      } else {
        travelFeeInCents = 1800 // fallback 18€
      }
    }

    // First-visit discount: -20% on the service price only (not on travel fee)
    let discountAmount = 0
    if (isFirstVisit) {
      discountAmount = Math.round(service.price * 0.2)
      amountInCents = service.price - discountAmount
    }

    amountInCents += travelFeeInCents

    // Stripe minimum is 50 cents
    if (amountInCents < 50) amountInCents = 50

    const ref = `BDV-` // will be completed after appointment creation

    // Create PaymentIntent before the appointment so we have the ID
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: "eur",
      automatic_payment_methods: { enabled: true },
      metadata: {
        slotId,
        serviceId: service.id,
        clientEmail: email,
        location,
      },
    })

    // Atomic: mark slot booked + create appointment
    const appointment = await prisma.$transaction(async (tx) => {
      await tx.availabilitySlot.update({
        where: { id: slotId },
        data: { isBooked: true },
      })
      return tx.appointment.create({
        data: {
          clientId: clientId ?? null,
          serviceId: service.id,
          slotId,
          notes: notes ?? null,
          isFirstVisit: isFirstVisit ?? false,
          location: location ?? "cabinet",
          clientAddress: clientAddress ?? null,
          travelFee: travelFeeInCents,
          discountAmount,
          amountPaid: amountInCents,
          stripePaymentIntentId: paymentIntent.id,
          guestName: clientId ? null : name,
          guestEmail: clientId ? null : email,
          guestPhone: clientId ? null : (phone ?? null),
          status: "pending",
        },
        select: { id: true },
      })
    })

    // Update PaymentIntent metadata with the real appointment ID
    await stripe.paymentIntents.update(paymentIntent.id, {
      metadata: {
        slotId,
        serviceId: service.id,
        appointmentId: appointment.id,
        clientEmail: email,
        location,
      },
    })

    const bookingRef = `BDV-${appointment.id.slice(0, 6).toUpperCase()}`
    return NextResponse.json({
      ok: true,
      appointmentId: appointment.id,
      ref: bookingRef,
      clientSecret: paymentIntent.client_secret,
      amountInCents,
    })
  } catch (err: unknown) {
    // Unique constraint on slotId — two users hit the same slot simultaneously
    if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "P2002") {
      return NextResponse.json(
        { error: "Ce créneau vient d'être pris. Veuillez en choisir un autre." },
        { status: 409 }
      )
    }
    console.error("[booking] POST error:", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
