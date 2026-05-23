import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const profile = await prisma.profile.findUnique({
    where: { id: user.id }, select: { role: true },
  })
  if (profile?.role !== "specialist") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
  }

  const { id } = await params
  await prisma.review.update({ where: { id }, data: { approved: true } })
  return NextResponse.json({ ok: true })
}
