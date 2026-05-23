import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  await prisma.profile.update({
    where: { id: user.id },
    data: { googleCalendarToken: Prisma.DbNull },
  })

  return NextResponse.json({ ok: true })
}
