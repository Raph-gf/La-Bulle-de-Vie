import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  // TODO: create booking
  return NextResponse.json({ ok: true })
}
