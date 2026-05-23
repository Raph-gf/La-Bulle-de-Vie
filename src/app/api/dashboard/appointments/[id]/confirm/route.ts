import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { createCalendarEvent, type GCalToken } from "@/lib/google-calendar"

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { role: true, googleCalendarToken: true },
    })
    if (profile?.role !== "specialist") return NextResponse.json({ error: "Accès refusé" }, { status: 403 })

    const { id } = await params

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        location: true,
        clientAddress: true,
        notes: true,
        guestName: true,
        client: { select: { fullName: true } },
        service: { select: { name: true, durationMinutes: true } },
        slot: { select: { date: true, startTime: true } },
      },
    })
    if (!appointment) return NextResponse.json({ error: "Rendez-vous introuvable" }, { status: 404 })
    if (appointment.status === "confirmed") return NextResponse.json({ error: "Déjà confirmé" }, { status: 409 })
    if (appointment.status === "cancelled") return NextResponse.json({ error: "Ce rendez-vous est annulé" }, { status: 400 })

    const updated = await prisma.appointment.update({
      where: { id },
      data: { status: "confirmed" },
      select: { id: true, status: true },
    })

    // Fire-and-forget: create Google Calendar event if specialist has connected their account
    if (profile.googleCalendarToken) {
      const clientName = appointment.client?.fullName ?? appointment.guestName ?? "Client"
      const dateStr = new Date(appointment.slot.date).toISOString().split("T")[0]
      const [startH, startM] = appointment.slot.startTime.split(":").map(Number)
      const totalMin = startH * 60 + startM + appointment.service.durationMinutes
      const endH = String(Math.floor(totalMin / 60)).padStart(2, "0")
      const endM = String(totalMin % 60).padStart(2, "0")

      const location = appointment.location === "domicile"
        ? appointment.clientAddress ?? "À domicile"
        : "Au cabinet"

      createCalendarEvent(profile.googleCalendarToken as GCalToken, {
        summary: `${appointment.service.name} — ${clientName}`,
        description: appointment.notes ?? undefined,
        location,
        start: `${dateStr}T${appointment.slot.startTime}:00`,
        end: `${dateStr}T${endH}:${endM}:00`,
      }).catch(err => console.error("[gcal] event creation failed:", err))
    }

    return NextResponse.json({ appointment: updated })
  } catch (err) {
    console.error("[appointments/confirm] POST error:", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
