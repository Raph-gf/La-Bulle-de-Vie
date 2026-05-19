import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
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

    const fromParam = req.nextUrl.searchParams.get("from")
    const toParam = req.nextUrl.searchParams.get("to")

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let dateFilter: { gte: Date; lt?: Date } | { gte: Date }
    if (fromParam && toParam) {
      const from = new Date(fromParam)
      const to = new Date(toParam)
      dateFilter = { gte: from, lt: to }
    } else {
      dateFilter = { gte: today }
    }

    const appointments = await prisma.appointment.findMany({
      where: {
        slot: { date: dateFilter },
        status: { not: "cancelled" },
      },
      orderBy: [{ slot: { date: "asc" } }, { slot: { startTime: "asc" } }],
      select: {
        id: true,
        status: true,
        location: true,
        clientAddress: true,
        notes: true,
        isFirstVisit: true,
        client: { select: { fullName: true } },
        guestName: true,
        guestEmail: true,
        service: { select: { name: true, durationMinutes: true, price: true } },
        slot: { select: { date: true, startTime: true } },
      },
    })

    return NextResponse.json({ appointments })
  } catch (err) {
    console.error("[dashboard/appointments] GET error:", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
