import { NextRequest, NextResponse } from "next/server"
import { requireSpecialist } from "@/lib/auth"
import { z } from "zod"
import { prisma } from "@/lib/prisma"


export const DEFAULT_NOTIF_PREFS = {
  onNewBooking:      true,
  onCancellation:    true,
  onNewReview:       true,
  clientReminder24h: true,
  clientReminder2h:  false,
  clientSmsReminder: false,
}

const prefsSchema = z.object({
  onNewBooking:      z.boolean(),
  onCancellation:    z.boolean(),
  onNewReview:       z.boolean(),
  clientReminder24h: z.boolean(),
  clientReminder2h:  z.boolean(),
  clientSmsReminder: z.boolean(),
})

export async function GET() {
  try {
    const user = await requireSpecialist()
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { notificationPrefs: true },
    })

    // Merge saved prefs with defaults so new keys always have a value
    const saved = (profile?.notificationPrefs as Record<string, boolean> | null) ?? {}
    const prefs = { ...DEFAULT_NOTIF_PREFS, ...saved }

    return NextResponse.json({ prefs })
  } catch (err) {
    console.error("[dashboard/notifications] GET error:", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireSpecialist()
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

    let body: unknown
    try { body = await req.json() } catch {
      return NextResponse.json({ error: "Corps invalide" }, { status: 400 })
    }

    const parsed = prefsSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 422 })
    }

    await prisma.profile.update({
      where: { id: user.id },
      data: { notificationPrefs: parsed.data },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[dashboard/notifications] PATCH error:", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
