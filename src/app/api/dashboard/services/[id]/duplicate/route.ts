import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

async function requireSpecialist() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const profile = await prisma.profile.findUnique({ where: { id: user.id }, select: { role: true } })
  return profile?.role === "specialist" ? user : null
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireSpecialist()
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { id } = await params

  const original = await prisma.service.findUnique({ where: { id } })
  if (!original) return NextResponse.json({ error: "Prestation introuvable" }, { status: 404 })

  // Generate a unique slug by appending -copie or -copie-2, -copie-3 etc.
  let slug = `${original.slug}-copie`
  let attempt = 1
  while (await prisma.service.findUnique({ where: { slug } })) {
    attempt++
    slug = `${original.slug}-copie-${attempt}`
  }

  const { id: _id, createdAt: _c, updatedAt: _u, slug: _s, benefits, ...rest } = original

  const duplicate = await prisma.service.create({
    data: {
      ...rest,
      slug,
      name: `${original.name} (copie)`,
      isPublished: false,
      displayOrder: original.displayOrder + 1,
      benefits: benefits === null ? Prisma.JsonNull : benefits,
    },
  })

  return NextResponse.json({ service: duplicate }, { status: 201 })
}
