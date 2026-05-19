import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const slots = await prisma.availabilitySlot.findMany({
    where: { date: { gte: today }, isBooked: false },
    select: { date: true },
    distinct: ["date"],
    orderBy: { date: "asc" },
  })

  const dates = slots.map((s) => s.date.toISOString().split("T")[0])
  return NextResponse.json({ dates })
}
