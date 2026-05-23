import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

    const profile = await prisma.profile.findUnique({ where: { id: user.id }, select: { role: true } })
    if (profile?.role !== "specialist") return NextResponse.json({ error: "Accès refusé" }, { status: 403 })

    const { id } = await params

    const appointment = await prisma.appointment.findUnique({ where: { id }, select: { id: true, status: true } })
    if (!appointment) return NextResponse.json({ error: "Rendez-vous introuvable" }, { status: 404 })
    if (appointment.status === "confirmed") return NextResponse.json({ error: "Déjà confirmé" }, { status: 409 })
    if (appointment.status === "cancelled") return NextResponse.json({ error: "Ce rendez-vous est annulé" }, { status: 400 })

    const updated = await prisma.appointment.update({
      where: { id },
      data: { status: "confirmed" },
      select: { id: true, status: true },
    })

    return NextResponse.json({ appointment: updated })
  } catch (err) {
    console.error("[appointments/confirm] POST error:", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
