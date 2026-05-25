import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const revalidate = 300 // cache 5 min — hours rarely change

type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun"

export type DayHours = {
  key: DayKey
  enabled: boolean
  start: string // "09:00"
  end: string   // "19:00"
}

export async function GET() {
  try {
    const specialist = await prisma.profile.findFirst({
      where: { role: "specialist" },
      select: { weeklySchedule: true },
    })

    if (!specialist?.weeklySchedule) {
      return NextResponse.json({ hours: null })
    }

    const sched = specialist.weeklySchedule as Record<DayKey, { enabled: boolean; start: string; end: string }>

    const DAYS: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
    const hours: DayHours[] = DAYS.map(key => ({
      key,
      enabled: sched[key]?.enabled ?? false,
      start: sched[key]?.start ?? "09:00",
      end: sched[key]?.end ?? "18:00",
    }))

    return NextResponse.json({ hours })
  } catch (err) {
    console.error("[GET /api/opening-hours]", err)
    return NextResponse.json({ hours: null })
  }
}
