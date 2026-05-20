import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

type DaySchedule = { enabled: boolean; start: string; end: string }
type WeeklySchedule = {
  mon: DaySchedule
  tue: DaySchedule
  wed: DaySchedule
  thu: DaySchedule
  fri: DaySchedule
  sat: DaySchedule
  sun: DaySchedule
  slotDurationMin: number
  lunchStart?: string
  lunchEnd?: string
}

const VALID_DURATIONS = [30, 45, 60, 90]
const TIME_RE = /^\d{2}:\d{2}$/
const DOW_TO_KEY = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const
const WORK_DAYS = new Set(["mon", "tue", "wed", "thu", "fri", "sat", "sun"])

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number)
  return h * 60 + m
}

function minutesToTime(m: number) {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`
}

function generateSlots(
  start: string,
  end: string,
  durationMin: number,
  lunchStart?: string,
  lunchEnd?: string
) {
  const result: { start: string; end: string }[] = []
  let cur = timeToMinutes(start)
  const endMin = timeToMinutes(end)
  const lunchS = lunchStart ? timeToMinutes(lunchStart) : null
  const lunchE = lunchEnd ? timeToMinutes(lunchEnd) : null

  while (cur + durationMin <= endMin) {
    const slotEnd = cur + durationMin
    if (lunchS !== null && lunchE !== null && cur < lunchE && slotEnd > lunchS) {
      cur = lunchE
      continue
    }
    result.push({ start: minutesToTime(cur), end: minutesToTime(slotEnd) })
    cur += durationMin
  }
  return result
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { role: true },
  })
  if (profile?.role !== "specialist") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
  }

  let body: WeeklySchedule
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 })
  }

  if (!VALID_DURATIONS.includes(body.slotDurationMin)) {
    return NextResponse.json({ error: "Durée de créneau invalide" }, { status: 400 })
  }

  for (const key of ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const) {
    const d = body[key]
    if (!d || typeof d.enabled !== "boolean") continue
    if (d.enabled && (!TIME_RE.test(d.start) || !TIME_RE.test(d.end))) {
      return NextResponse.json({ error: `Heure invalide pour ${key}` }, { status: 400 })
    }
  }

  await prisma.profile.update({
    where: { id: user.id },
    data: { weeklySchedule: body as object },
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  await prisma.availabilitySlot.deleteMany({
    where: { date: { gte: today }, isBooked: false },
  })

  const slotsToCreate: { date: Date; startTime: string; endTime: string }[] = []

  for (let i = 0; i < 60; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    const dowKey = DOW_TO_KEY[d.getDay()]
    if (!WORK_DAYS.has(dowKey)) continue

    const daySched = body[dowKey as keyof typeof body] as DaySchedule | undefined
    if (!daySched?.enabled) continue

    const times = generateSlots(
      daySched.start,
      daySched.end,
      body.slotDurationMin,
      body.lunchStart,
      body.lunchEnd
    )

    for (const { start, end } of times) {
      slotsToCreate.push({ date: d, startTime: start, endTime: end })
    }
  }

  if (slotsToCreate.length > 0) {
    await prisma.availabilitySlot.createMany({ data: slotsToCreate })
  }

  return NextResponse.json({ generated: slotsToCreate.length })
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { role: true, weeklySchedule: true },
    })
    if (profile?.role !== "specialist") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const slotCount = await prisma.availabilitySlot.count({
      where: { date: { gte: today }, isBooked: false },
    })

    return NextResponse.json({
      weeklySchedule: profile.weeklySchedule,
      upcomingSlotCount: slotCount,
    })
  } catch (err) {
    console.error("[GET /api/dashboard/availability]", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
