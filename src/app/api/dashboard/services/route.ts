import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { z } from "zod"

async function requireSpecialist() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const profile = await prisma.profile.findUnique({ where: { id: user.id }, select: { role: true } })
  return profile?.role === "specialist" ? user : null
}

const benefitSchema = z.object({ title: z.string().min(1), description: z.string().min(1) })

const serviceSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, "Slug: lettres minuscules, chiffres, tirets uniquement"),
  tagline: z.string().max(50).optional().nullable(),
  forWho: z.string().max(200).optional().nullable(),
  shortDescription: z.string().max(500).optional().nullable(),
  longDescription: z.string().max(2000).optional().nullable(),
  ritualCore: z.string().max(500).optional().nullable(),
  ritualCoreDuration: z.string().max(50).optional().nullable(),
  benefits: z.array(benefitSchema).max(8).optional().nullable(),
  relatedSlugs: z.array(z.string()).max(4).optional(),
  bgColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur hex invalide").optional().nullable(),
  displayOrder: z.number().int().min(0).optional(),
  description: z.string().min(1).max(2000),
  durationMinutes: z.number().int().min(5).max(480),
  price: z.number().int().min(100),
  category: z.enum(["massage", "energetique", "creation"]),
  isPublished: z.boolean().optional(),
  imageUrl: z.string().url().optional().nullable(),
  vatRate: z.number().int().min(0).max(100).optional(),
})

export async function GET() {
  const user = await requireSpecialist()
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const services = await prisma.service.findMany({
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    include: { _count: { select: { appointments: true, reviews: true } } },
  })

  return NextResponse.json({ services })
}

export async function POST(req: Request) {
  const user = await requireSpecialist()
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: "Corps invalide" }, { status: 400 }) }

  const parsed = serviceSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Données invalides", fieldErrors: parsed.error.flatten().fieldErrors }, { status: 422 })

  const existing = await prisma.service.findUnique({ where: { slug: parsed.data.slug } })
  if (existing) return NextResponse.json({ error: "Ce slug est déjà utilisé" }, { status: 409 })

  const { benefits, ...restData } = parsed.data
  const service = await prisma.service.create({
    data: {
      ...restData,
      benefits: benefits === null || benefits === undefined ? Prisma.JsonNull : benefits,
      relatedSlugs: parsed.data.relatedSlugs ?? [],
      isPublished: parsed.data.isPublished ?? false,
      vatRate: parsed.data.vatRate ?? 0,
      displayOrder: parsed.data.displayOrder ?? 0,
    },
  })

  return NextResponse.json({ service }, { status: 201 })
}
