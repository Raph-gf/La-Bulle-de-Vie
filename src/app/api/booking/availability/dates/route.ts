import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  // groupBy gives us one row per date that has at least one free slot —
  // distinct: ["date"] can mis-fire with the pg adapter when the first row
  // it picks for a date happens to be the booked one.
  const groups = await prisma.availabilitySlot.groupBy({
    by: ["date"],
    where: { date: { gte: today }, isBooked: false },
    orderBy: { date: "asc" },
  })

  const dates = groups.map((g) => {
    const d = g.date
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`
  })

  return NextResponse.json({ dates })
}
