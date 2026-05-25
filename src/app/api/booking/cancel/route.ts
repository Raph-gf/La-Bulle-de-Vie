import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { stripe } from "@/lib/stripe"
import { sendCancellationConfirmation } from "@/lib/resend/emails"

// POST /api/booking/cancel
// Cancels an upcoming appointment, processes a Stripe refund per policy,
// and frees the slot so it can be rebooked.
//
// Refund policy:
//   > 24h before slot  → 100% refund
//   4h–24h before slot → 50% refund
//   < 4h before slot   → no refund (but endpoint still rejects with 409)
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

    let appointmentId: string
    try {
      const body = await req.json()
      if (!body?.appointmentId || typeof body.appointmentId !== "string") {
        return NextResponse.json({ error: "appointmentId requis" }, { status: 400 })
      }
      appointmentId = body.appointmentId
    } catch {
      return NextResponse.json({ error: "Corps invalide" }, { status: 400 })
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        id: true,
        clientId: true,
        status: true,
        amountPaid: true,
        stripePaymentIntentId: true,
        guestEmail: true,
        service: { select: { name: true } },
        slot: { select: { id: true, date: true, startTime: true } },
        client: { select: { fullName: true } },
      },
    })

    if (!appointment) {
      return NextResponse.json({ error: "Rendez-vous introuvable" }, { status: 404 })
    }
    if (appointment.clientId !== user.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
    }
    if (appointment.status === "cancelled") {
      return NextResponse.json({ error: "Ce rendez-vous est déjà annulé" }, { status: 409 })
    }
    if (appointment.status === "completed") {
      return NextResponse.json({ error: "Une séance terminée ne peut pas être annulée" }, { status: 409 })
    }

    // Compute hours until the slot (Paris UTC+2 → UTC)
    const [slotH, slotM] = appointment.slot.startTime.split(":").map(Number)
    const slotUtc = new Date(appointment.slot.date)
    slotUtc.setUTCHours(slotH - 2, slotM, 0, 0)
    const hoursUntil = (slotUtc.getTime() - Date.now()) / 3_600_000

    if (hoursUntil <= 4) {
      return NextResponse.json(
        { error: "L'annulation n'est plus possible moins de 4h avant la séance" },
        { status: 409 }
      )
    }

    // Determine refund policy
    const refundPolicy: "full" | "half" | "none" = hoursUntil > 24 ? "full" : "half"
    const amountPaid = appointment.amountPaid ?? 0
    const refundAmountCents = refundPolicy === "full"
      ? amountPaid
      : Math.floor(amountPaid / 2)

    // Atomic: cancel appointment + free slot
    await prisma.$transaction([
      prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          status: "cancelled",
          refundStatus: refundAmountCents > 0 ? "requested" : "none",
        },
      }),
      prisma.availabilitySlot.update({
        where: { id: appointment.slot.id },
        data: { isBooked: false },
      }),
    ])

    // Issue Stripe refund (non-blocking failure — appointment is already cancelled)
    if (refundAmountCents > 0 && appointment.stripePaymentIntentId) {
      try {
        const refund = await stripe.refunds.create({
          payment_intent: appointment.stripePaymentIntentId,
          amount: refundAmountCents,
          reason: "requested_by_customer",
        })
        if (refund.status === "succeeded" || refund.status === "pending") {
          await prisma.appointment.update({
            where: { id: appointmentId },
            data: { refundStatus: "refunded" },
          })
        }
      } catch (refundErr) {
        // Don't fail the request — appointment is cancelled, specialist can handle refund manually
        console.error("[booking/cancel] Stripe refund failed:", refundErr)
      }
    }

    // Send cancellation confirmation email (non-blocking)
    const clientEmail = user.email ?? appointment.guestEmail
    const clientName = appointment.client?.fullName ?? user.email?.split("@")[0] ?? "Client"
    if (clientEmail) {
      const date = new Intl.DateTimeFormat("fr-FR", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
        timeZone: "Europe/Paris",
      }).format(new Date(appointment.slot.date))
      const refundEur = (refundAmountCents / 100).toLocaleString("fr-FR", {
        minimumFractionDigits: 2, maximumFractionDigits: 2,
      })
      const ref = appointment.stripePaymentIntentId
        ? `BDV-${appointment.stripePaymentIntentId.slice(-6).toUpperCase()}`
        : appointmentId.slice(0, 8).toUpperCase()

      sendCancellationConfirmation(clientEmail, {
        clientName,
        serviceName: appointment.service.name,
        date,
        time: appointment.slot.startTime,
        refundEur: `${refundEur} €`,
        refundPolicy,
        ref,
      }).catch(err => console.error("[email] cancellation confirmation failed:", err))
    }

    return NextResponse.json({ ok: true, refundPolicy, refundAmountCents })
  } catch (err) {
    console.error("[booking/cancel] POST error:", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
