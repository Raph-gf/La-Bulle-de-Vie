import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { stripe } from "@/lib/stripe"
import { createClient } from "@/lib/supabase/server"
import { geocode, haversineKm, computeTravelFee, TravelPricing, DEFAULT_TRAVEL_PRICING } from "@/lib/geo"

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

    // Get logged-in user if any
    let clientId: string | undefined
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const profile = await prisma.profile.findUnique({ where: { id: user.id }, select: { id: true } })
      if (profile) clientId = user.id
    }

    // Verify slot is still free (read-only check — not locked yet)
    const slot = await prisma.availabilitySlot.findUnique({ where: { id: slotId } })
    if (!slot || slot.isBooked) {
      return NextResponse.json(
        { error: "Ce créneau vient d'être pris. Veuillez en choisir un autre." },
        { status: 409 }
      )
    }

    // Server-side price calculation
    let amountInCents = service.price

    let travelFeeInCents = 0
    if (location === "domicile") {
      const profile = await prisma.profile.findFirst({
        where: { role: "specialist" },
        select: { cabinetLat: true, cabinetLng: true, travelPricing: true },
      })
      const pricing = (profile?.travelPricing as TravelPricing | null) ?? DEFAULT_TRAVEL_PRICING

      if (profile?.cabinetLat && profile?.cabinetLng && clientAddress) {
        const clientCoords = await geocode(clientAddress)
        if (clientCoords) {
          const distanceKm = haversineKm(profile.cabinetLat, profile.cabinetLng, clientCoords.lat, clientCoords.lng)
          const fee = computeTravelFee(distanceKm, pricing)
          // fee === null means out of zone — use first zone fee as fallback
          travelFeeInCents = fee ?? (pricing.zones[0]?.feeInCents ?? 1800)
        } else {
          travelFeeInCents = pricing.zones[0]?.feeInCents ?? 1800
        }
      } else {
        travelFeeInCents = pricing.zones[0]?.feeInCents ?? 1800
      }
    }

    // C1: isFirstVisit discount only applies to authenticated clients with no prior booking
    let isFirstVisitVerified = false
    if (isFirstVisit && clientId) {
      const existingAppt = await prisma.appointment.findFirst({
        where: { clientId, status: { notIn: ["cancelled"] } },
        select: { id: true },
      })
      isFirstVisitVerified = existingAppt === null
    }

    let discountAmount = 0
    if (isFirstVisitVerified) {
      discountAmount = Math.round(service.price * 0.2)
      amountInCents = service.price - discountAmount
    }

    amountInCents += travelFeeInCents
    if (amountInCents < 50) amountInCents = 50

    // Create PaymentIntent — appointment is NOT created yet.
    // The webhook (payment_intent.succeeded) will create the appointment + lock the slot.
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: "eur",
      automatic_payment_methods: { enabled: true },
      metadata: {
        slotId,
        serviceId: service.id,
        clientId: clientId ?? "",
        clientEmail: email,
        clientName: name,
        clientPhone: phone ?? "",
        location: location ?? "cabinet",
        clientAddress: (clientAddress ?? "").slice(0, 490),
        notes: (notes ?? "").slice(0, 490),
        isFirstVisit: String(isFirstVisitVerified),
        travelFeeInCents: String(travelFeeInCents),
        discountAmount: String(discountAmount),
      },
    })

    // Ref is based on the PaymentIntent ID (appointment doesn't exist yet)
    const ref = `BDV-${paymentIntent.id.slice(-6).toUpperCase()}`

    return NextResponse.json({
      ok: true,
      ref,
      clientSecret: paymentIntent.client_secret,
      amountInCents,
    })
  } catch (err: unknown) {
    console.error("[booking] POST error:", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
