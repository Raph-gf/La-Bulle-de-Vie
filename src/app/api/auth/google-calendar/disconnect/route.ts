import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const profile = await prisma.profile.findUnique({ where: { id: user.id }, select: { role: true } })
  if (profile?.role !== "specialist") return NextResponse.json({ error: "Non autorisé" }, { status: 403 })

  await prisma.profile.update({
    where: { id: user.id },
    data: { googleCalendarToken: Prisma.DbNull },
  })

  return NextResponse.json({ ok: true })
}
