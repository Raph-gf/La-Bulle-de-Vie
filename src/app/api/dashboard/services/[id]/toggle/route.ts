import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

async function requireSpecialist() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const profile = await prisma.profile.findUnique({ where: { id: user.id }, select: { role: true } })
  return profile?.role === "specialist" ? user : null
}

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireSpecialist()
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { id } = await params

  const service = await prisma.service.findUnique({ where: { id }, select: { isPublished: true } })
  if (!service) return NextResponse.json({ error: "Prestation introuvable" }, { status: 404 })

  const updated = await prisma.service.update({
    where: { id },
    data: { isPublished: !service.isPublished },
  })

  return NextResponse.json({ isPublished: updated.isPublished })
}
