import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { exchangeCode } from "@/lib/google-calendar"

const DASHBOARD_URL = "/dashboard/rendez-vous"

// GET — Google redirects here with ?code=... after user grants access
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get("code")
  const error = searchParams.get("error")

  if (error || !code) {
    return NextResponse.redirect(new URL(`${DASHBOARD_URL}?gcal=denied`, req.url))
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.redirect(new URL("/login", req.url))

    const profile = await prisma.profile.findUnique({ where: { id: user.id }, select: { role: true } })
    if (profile?.role !== "specialist") return NextResponse.redirect(new URL("/login", req.url))

    const token = await exchangeCode(code)

    await prisma.profile.update({
      where: { id: user.id },
      data: { googleCalendarToken: token as object },
    })

    return NextResponse.redirect(new URL(`${DASHBOARD_URL}?gcal=connected`, req.url))
  } catch (err) {
    console.error("[google-calendar/callback]", err)
    return NextResponse.redirect(new URL(`${DASHBOARD_URL}?gcal=error`, req.url))
  }
}
