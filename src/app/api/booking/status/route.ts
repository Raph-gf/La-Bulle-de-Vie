import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { stripe } from "@/lib/stripe"

// GET /api/booking/status?pi=pi_xxx
// Returns: { status: "confirmed" | "refunded" | "pending" }
export async function GET(req: NextRequest) {
  const pi = req.nextUrl.searchParams.get("pi")
  if (!pi || !pi.startsWith("pi_")) {
    return NextResponse.json({ error: "Invalid PI" }, { status: 400 })
  }

  // 1. Check if appointment was created by the webhook
  const appointment = await prisma.appointment.findFirst({
    where: { stripePaymentIntentId: pi },
    select: { id: true, status: true },
  })

  if (appointment) {
    return NextResponse.json({ status: appointment.status === "cancelled" ? "refunded" : "confirmed" })
  }

  // 2. Appointment not yet created — check if a refund was issued (race condition)
  try {
    const refunds = await stripe.refunds.list({ payment_intent: pi, limit: 1 })
    if (refunds.data.length > 0) {
      return NextResponse.json({ status: "refunded" })
    }
  } catch {
    // Stripe error — treat as pending
  }

  // 3. Webhook hasn't fired yet
  return NextResponse.json({ status: "pending" })
}
