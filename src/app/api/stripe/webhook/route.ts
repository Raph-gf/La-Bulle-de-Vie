import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  // TODO: handle Stripe webhook events
  return NextResponse.json({ received: true })
}
