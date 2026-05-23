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

    const appointments = await prisma.appointment.findMany({
      where: {
        clientId: user.id,
        OR: [
          { slot: { date: { lt: today } } },
          { status: { in: ["completed", "cancelled"] } },
        ],
      },
      orderBy: { slot: { date: "desc" } },
      select: {
        id: true,
        status: true,
        amountPaid: true,
        review: { select: { id: true, stars: true } },
        service: { select: { name: true, durationMinutes: true } },
        slot: { select: { date: true, startTime: true } },
      },
    })

    return NextResponse.json({ appointments })
  } catch (err) {
    console.error("[user/history] GET error:", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
