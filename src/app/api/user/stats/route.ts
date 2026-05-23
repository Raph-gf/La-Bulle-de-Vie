import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)

    const [totalSessions, reviewsCount, nextAppointment, topServiceRaw] = await Promise.all([
      prisma.appointment.count({
        where: { clientId: user.id, status: { in: ["confirmed", "completed"] } },
      }),
      prisma.review.count({
        where: { clientId: user.id },
      }),
      prisma.appointment.findFirst({
        where: { clientId: user.id, slot: { date: { gte: today } }, status: { in: ["confirmed", "pending"] } },
        orderBy: { slot: { date: "asc" } },
        select: {
          id: true,
          location: true,
          clientAddress: true,
          amountPaid: true,
          service: { select: { name: true, durationMinutes: true, price: true } },
          slot: { select: { date: true, startTime: true } },
        },
      }),
      prisma.appointment.groupBy({
        by: ["serviceId"],
        where: { clientId: user.id, status: { in: ["confirmed", "completed"] } },
        _count: { serviceId: true },
        orderBy: { _count: { serviceId: "desc" } },
        take: 1,
      }),
    ])

    let topService: string | null = null
    if (topServiceRaw[0]) {
      const svc = await prisma.service.findUnique({
        where: { id: topServiceRaw[0].serviceId },
        select: { name: true },
      })
      topService = svc?.name ?? null
    }

    return NextResponse.json({ totalSessions, reviewsCount, nextAppointment, topService })
  } catch (err) {
    console.error("[user/stats] GET error:", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
