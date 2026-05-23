import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { getAuthUrl, isGCalConfigured } from "@/lib/google-calendar"

// GET — redirects specialist to Google OAuth consent screen
export async function GET() {
  if (!isGCalConfigured()) {
    return NextResponse.json({ error: "Google Calendar non configuré (GOOGLE_CLIENT_ID manquant)" }, { status: 503 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const profile = await prisma.profile.findUnique({ where: { id: user.id }, select: { role: true } })
  if (profile?.role !== "specialist") return NextResponse.json({ error: "Accès refusé" }, { status: 403 })

  return NextResponse.redirect(getAuthUrl())
}
