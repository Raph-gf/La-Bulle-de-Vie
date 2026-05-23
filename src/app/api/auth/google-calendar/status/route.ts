import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { isGCalConfigured } from "@/lib/google-calendar"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ connected: false })

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { googleCalendarToken: true },
  })

  return NextResponse.json({
    connected: !!profile?.googleCalendarToken,
    configured: isGCalConfigured(),
  })
}
