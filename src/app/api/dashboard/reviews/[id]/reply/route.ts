import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const replySchema = z.object({
  reply: z.string().min(1).max(1000).transform(s => s.trim()),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const profile = await prisma.profile.findUnique({
    where: { id: user.id }, select: { role: true },
  })
  if (profile?.role !== "specialist") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const result = replySchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: "Réponse invalide" }, { status: 422 })
  }

  const { id } = await params
  await prisma.review.update({
    where: { id },
    data: { specialistReply: result.data.reply },
  })
  return NextResponse.json({ ok: true })
}
