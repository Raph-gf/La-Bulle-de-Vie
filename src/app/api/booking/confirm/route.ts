import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { stripe } from "@/lib/stripe"
import { sendBookingConfirmation, sendSpecialistNotification } from "@/lib/resend/emails"
import { createCalendarEvent, type GCalToken } from "@/lib/google-calendar"

// POST /api/booking/confirm
// Called client-side after stripe.confirmPayment() succeeds.
// Verifies the PaymentIntent server-side, then creates the appointment + sends emails.
// The Stripe webhook does the same thing as idempotent backup — the unique constraint on
// stripePaymentIntentId prevents double-creation (second caller gets P2002 and exits cleanly).
export async function POST(req: NextRequest) {
  try {
    const { paymentIntentId } = await req.json()
    console.log("[booking/confirm] received paymentIntentId:", paymentIntentId)

    if (!paymentIntentId || typeof paymentIntentId !== "string") {
      return NextResponse.json({ error: "paymentIntentId requis" }, { status: 400 })
    }

    // Verify with Stripe server-side — never trust the client
    let pi
    try {
      pi = await stripe.paymentIntents.retrieve(paymentIntentId)
      console.log("[booking/confirm] PI status:", pi.status, "amount_received:", pi.amount_received)
    } catch (err) {
      console.error("[booking/confirm] Stripe retrieve failed:", err)
      return NextResponse.json({ error: "PaymentIntent introuvable" }, { status: 404 })
    }

    if (pi.status !== "succeeded") {
      console.warn("[booking/confirm] PI not succeeded, status:", pi.status)
      return NextResponse.json({ error: "Paiement non finalisé" }, { status: 402 })
    }

    // Idempotency: appointment may already exist (webhook beat us to it)
    const existing = await prisma.appointment.findUnique({
      where: { stripePaymentIntentId: pi.id },
      select: { id: true, status: true },
    })
    if (existing) {
      return NextResponse.json({ ok: true, alreadyCreated: true })
    }

    const {
      slotId, serviceId, clientId, clientEmail, clientName, clientPhone,
      location, clientAddress, notes, isFirstVisit, travelFeeInCents, discountAmount,
    } = pi.metadata

    console.log("[booking/confirm] metadata:", { slotId, serviceId, clientEmail, clientName, location })

    if (!slotId || !serviceId) {
      console.error("[booking/confirm] missing metadata — slotId:", slotId, "serviceId:", serviceId)
      return NextResponse.json({ error: "Métadonnées PaymentIntent manquantes" }, { status: 422 })
    }

    // Atomic transaction: check slot free → mark booked → create appointment
    let appointment
    try {
      appointment = await prisma.$transaction(async (tx) => {
        const slot = await tx.availabilitySlot.findUnique({ where: { id: slotId } })
        if (!slot || slot.isBooked) throw new Error("SLOT_TAKEN")

        await tx.availabilitySlot.update({ where: { id: slotId }, data: { isBooked: true } })

        return tx.appointment.create({
          data: {
            clientId: clientId || null,
            serviceId,
            slotId,
            notes: notes || null,
            isFirstVisit: isFirstVisit === "true",
            location: location ?? "cabinet",
            clientAddress: clientAddress || null,
            travelFee: parseInt(travelFeeInCents ?? "0"),
            discountAmount: parseInt(discountAmount ?? "0"),
            amountPaid: pi.amount_received,
            stripePaymentIntentId: pi.id,
            guestName: clientId ? null : clientName,
            guestEmail: clientId ? null : clientEmail,
            guestPhone: clientId ? null : (clientPhone || null),
            status: "confirmed",
          },
          select: { id: true },
        })
      })
    } catch (err) {
      console.error("[booking/confirm] transaction error:", err)
      if (err instanceof Error && err.message === "SLOT_TAKEN") {
        await stripe.refunds.create({ payment_intent: pi.id, reason: "duplicate" })
        return NextResponse.json({ error: "Ce créneau n'est plus disponible. Votre paiement sera remboursé." }, { status: 409 })
      }
      if ((err as { code?: string }).code === "P2002") {
        return NextResponse.json({ ok: true, alreadyCreated: true })
      }
      throw err
    }
    console.log("[booking/confirm] appointment created:", appointment.id)

    // Store appointmentId in PI metadata for future reference
    await stripe.paymentIntents.update(pi.id, {
      metadata: { ...pi.metadata, appointmentId: appointment.id },
    }).catch(() => {})

    // Fetch service, slot and specialist profile in parallel
    const [service, slot, specialist] = await Promise.all([
      prisma.service.findUnique({ where: { id: serviceId }, select: { name: true, durationMinutes: true } }),
      prisma.availabilitySlot.findUnique({ where: { id: slotId }, select: { date: true, startTime: true } }),
      prisma.profile.findFirst({
        where: { role: "specialist" },
        select: { notificationPrefs: true, googleCalendarToken: true },
      }),
    ])

    if (service && slot) {
      const ref = `BDV-${pi.id.slice(-6).toUpperCase()}`
      const date = new Intl.DateTimeFormat("fr-FR", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
        timeZone: "Europe/Paris",
      }).format(slot.date)
      const amountEur = (pi.amount_received / 100).toLocaleString("fr-FR", {
        minimumFractionDigits: 2, maximumFractionDigits: 2,
      })

      const baseData = {
        clientName, serviceName: service.name, date, time: slot.startTime,
        location: location ?? "cabinet", clientAddress: clientAddress || undefined,
        amountEur, ref,
      }

      // Client confirmation email (non-blocking)
      sendBookingConfirmation(clientEmail, baseData)
        .catch(err => console.error("[email] confirmation failed:", err))

      // Specialist notification email (non-blocking)
      const specialistEmail = process.env.SPECIALIST_EMAIL
      if (specialistEmail) {
        const notifPrefs = (specialist?.notificationPrefs as Record<string, boolean> | null) ?? {}
        if (notifPrefs.onNewBooking !== false) {
          sendSpecialistNotification(specialistEmail, {
            ...baseData,
            clientEmail,
            clientPhone: clientPhone || undefined,
            notes: notes || undefined,
            isFirstVisit: isFirstVisit === "true",
          }).catch(err => console.error("[email] specialist notification failed:", err))
        }
      }

      // Google Calendar event (non-blocking)
      if (specialist?.googleCalendarToken) {
        const dateStr = new Date(slot.date).toISOString().split("T")[0]
        const [startH, startM] = slot.startTime.split(":").map(Number)
        const totalMin = startH * 60 + startM + service.durationMinutes
        const endH = String(Math.floor(totalMin / 60)).padStart(2, "0")
        const endM = String(totalMin % 60).padStart(2, "0")
        const locationLabel = location === "domicile"
          ? (clientAddress || "À domicile")
          : "Au cabinet"

        createCalendarEvent(specialist.googleCalendarToken as GCalToken, {
          summary: `${service.name} — ${clientName}`,
          description: notes || undefined,
          location: locationLabel,
          start: `${dateStr}T${slot.startTime}:00`,
          end: `${dateStr}T${endH}:${endM}:00`,
        }).catch(err => console.error("[gcal] event creation failed:", err))
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[booking/confirm] POST error:", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
