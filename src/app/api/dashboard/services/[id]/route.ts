import { NextResponse } from "next/server"
import { requireSpecialist } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { z } from "zod"


const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  tagline: z.string().max(50).optional().nullable(),
  forWho: z.string().max(200).optional().nullable(),
  shortDescription: z.string().max(500).optional().nullable(),
  longDescription: z.string().max(2000).optional().nullable(),
  ritualCore: z.string().max(500).optional().nullable(),
  ritualCoreDuration: z.string().max(50).optional().nullable(),
  benefits: z.array(z.object({ title: z.string().min(1), description: z.string().min(1) })).max(8).optional().nullable(),
  relatedSlugs: z.array(z.string()).max(4).optional(),
  bgColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
  displayOrder: z.number().int().min(0).optional(),
  description: z.string().min(1).max(2000).optional(),
  durationMinutes: z.number().int().min(5).max(480).optional(),
  price: z.number().min(0.5).optional(),
  category: z.enum(["massage", "energetique", "creation"]).optional(),
  isPublished: z.boolean().optional(),
  imageUrls: z.array(z.string().url()).max(3).optional(),
  vatRate: z.number().int().min(0).max(100).optional(),
})

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireSpecialist()
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { id } = await params

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: "Corps invalide" }, { status: 400 }) }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Données invalides", fieldErrors: parsed.error.flatten().fieldErrors }, { status: 422 })

  const service = await prisma.service.findUnique({ where: { id } })
  if (!service) return NextResponse.json({ error: "Prestation introuvable" }, { status: 404 })

  const { benefits, price, ...restData } = parsed.data
  const updated = await prisma.service.update({
    where: { id },
    data: {
      ...restData,
      ...(price !== undefined ? { price: Math.round(price * 100) } : {}),
      ...(benefits !== undefined ? { benefits: benefits === null ? Prisma.JsonNull : benefits } : {}),
    },
  })
  return NextResponse.json({ service: updated })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireSpecialist()
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { id } = await params

  const service = await prisma.service.findUnique({
    where: { id },
    include: { _count: { select: { appointments: true } } },
  })
  if (!service) return NextResponse.json({ error: "Prestation introuvable" }, { status: 404 })

  if (service._count.appointments > 0) {
    return NextResponse.json(
      { error: `Impossible de supprimer : ${service._count.appointments} rendez-vous sont liés à cette prestation.` },
      { status: 409 }
    )
  }

  await prisma.service.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
