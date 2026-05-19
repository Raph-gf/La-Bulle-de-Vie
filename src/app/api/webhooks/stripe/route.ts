import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"
import type Stripe from "stripe"

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

        // Idempotency: if we already processed this PI, skip
        const existing = await prisma.appointment.findFirst({
          where: { stripePaymentIntentId: pi.id },
          select: { id: true },
        })
        if (existing) break

        const {
          slotId,
          serviceId,
          clientId,
          clientEmail,
          clientName,
          clientPhone,
          location,
          clientAddress,
          notes,
          isFirstVisit,
          travelFeeInCents,
          discountAmount,
        } = pi.metadata

        if (!slotId || !serviceId) {
          console.error("[stripe-webhook] missing metadata on PI", pi.id)
          break
        }

        // Atomic: verify slot still free + mark booked + create appointment
        try {
          const appointment = await prisma.$transaction(async (tx) => {
            const slot = await tx.availabilitySlot.findUnique({ where: { id: slotId } })
            if (!slot || slot.isBooked) {
              throw new Error("SLOT_TAKEN")
            }

            await tx.availabilitySlot.update({
              where: { id: slotId },
              data: { isBooked: true },
            })

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

          // Store appointmentId in PI metadata for future reference
          await stripe.paymentIntents.update(pi.id, {
            metadata: { ...pi.metadata, appointmentId: appointment.id },
          })
        } catch (txErr) {
          if (txErr instanceof Error && txErr.message === "SLOT_TAKEN") {
            // Race condition: slot was taken by another booking — refund automatically
            console.warn("[stripe-webhook] slot taken on payment success, refunding PI", pi.id)
            await stripe.refunds.create({ payment_intent: pi.id, reason: "duplicate" })
          } else {
            throw txErr
          }
        }
        break
      }

      case "payment_intent.payment_failed": {
        // No appointment was created yet, nothing to clean up
        const pi = event.data.object as Stripe.PaymentIntent
        console.log("[stripe-webhook] payment failed for PI", pi.id)
        break
      }

      default:
        break
    }
  } catch (err) {
    console.error(`[stripe-webhook] error handling ${event.type}:`, err)
    return NextResponse.json({ error: "Handler error" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
