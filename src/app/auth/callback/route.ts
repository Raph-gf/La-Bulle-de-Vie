import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/"

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const fullName =
          user.user_metadata?.full_name ??
          user.user_metadata?.name ??
          user.email?.split("@")[0] ??
          "Utilisateur"

        await prisma.profile.upsert({
          where: { id: user.id },
          create: {
            id: user.id,
            fullName,
            phone: user.user_metadata?.phone ?? null,
            role: user.email === process.env.SPECIALIST_EMAIL ? "specialist" : "client",
          },
          update: { fullName },
        })
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
