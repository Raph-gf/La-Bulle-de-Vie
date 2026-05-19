import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const dateStr = req.nextUrl.searchParams.get("date")

  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return NextResponse.json({ error: "Paramètre date manquant ou invalide" }, { status: 400 })
  }

  const date = new Date(dateStr + "T00:00:00.000Z")

  const slots = await prisma.availabilitySlot.findMany({
    where: { date, isBooked: false },
    select: { id: true, startTime: true, endTime: true },
    orderBy: { startTime: "asc" },
  })

  return NextResponse.json({ slots })
}
