import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

async function requireSpecialist() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const profile = await prisma.profile.findUnique({ where: { id: user.id }, select: { role: true } })
  return profile?.role === "specialist" ? user : null
}

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(2000).optional(),
  price: z.number().min(0).optional(),
  stock: z.number().int().min(0).optional(),
  medium: z.string().min(1).max(200).optional(),
  dimensions: z.string().min(1).max(100).optional(),
  vatRate: z.number().int().min(0).max(100).optional(),
  imageUrl: z.string().url().optional().nullable(),
  isPublished: z.boolean().optional(),
})

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSpecialist()
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

    const { id } = await params

    let body: unknown
    try { body = await req.json() } catch { return NextResponse.json({ error: "Corps invalide" }, { status: 400 }) }

    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données invalides", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 422 }
      )
    }

    const existing = await prisma.product.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Produit introuvable" }, { status: 404 })

    const { price, ...rest } = parsed.data
    const product = await prisma.product.update({
      where: { id },
      data: {
        ...rest,
        ...(price !== undefined ? { price: Math.round(price * 100) } : {}),
      },
    })

    return NextResponse.json({ product })
  } catch (err) {
    console.error("[dashboard/boutique/:id] PATCH error:", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSpecialist()
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

    const { id } = await params

    const existing = await prisma.product.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Produit introuvable" }, { status: 404 })

    try {
      await prisma.product.delete({ where: { id } })
    } catch (e) {
      const err = e as { code?: string }
      if (err.code === "P2003") {
        return NextResponse.json(
          { error: "Impossible de supprimer ce produit : des commandes y sont associées." },
          { status: 409 }
        )
      }
      throw e
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[dashboard/boutique/:id] DELETE error:", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
