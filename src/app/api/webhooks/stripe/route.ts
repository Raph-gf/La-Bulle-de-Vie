import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"
import type Stripe from "stripe"

// Next.js App Router: disable body parsing so we can verify the raw body
export const config = { api: { bodyParser: false } }

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature")
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    const rawBody = await req.text()
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
  } catch (err) {
    console.error("[stripe-webhook] signature verification failed:", err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent
        const appointmentId = pi.metadata?.appointmentId
        if (!appointmentId) break

        await prisma.appointment.update({
          where: { id: appointmentId },
          data: { status: "confirmed", amountPaid: pi.amount_received },
        })
        break
      }

      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent
        const appointmentId = pi.metadata?.appointmentId
        if (!appointmentId) break

        // Cancel appointment and free the slot
        const appt = await prisma.appointment.findUnique({
          where: { id: appointmentId },
          select: { id: true, slotId: true },
        })
        if (!appt) break

        await prisma.$transaction([
          prisma.appointment.update({
            where: { id: appt.id },
            data: { status: "cancelled" },
          }),
          prisma.availabilitySlot.update({
            where: { id: appt.slotId },
            data: { isBooked: false },
          }),
        ])
        break
      }

      default:
        // Ignore unhandled event types
        break
    }
  } catch (err) {
    console.error(`[stripe-webhook] error handling ${event.type}:`, err)
    return NextResponse.json({ error: "Handler error" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
