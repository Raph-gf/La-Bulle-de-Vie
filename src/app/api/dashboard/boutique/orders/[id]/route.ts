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

const statusSchema = z.object({
  status: z.enum(["pending", "paid", "shipped", "cancelled"]),
})

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSpecialist()
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

    const { id } = await params

    let body: unknown
    try { body = await req.json() } catch { return NextResponse.json({ error: "Corps invalide" }, { status: 400 }) }

    const parsed = statusSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Statut invalide", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 422 }
      )
    }

    const existing = await prisma.order.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 })

    const order = await prisma.order.update({
      where: { id },
      data: { status: parsed.data.status },
    })

    return NextResponse.json({ order })
  } catch (err) {
    console.error("[dashboard/boutique/orders/:id] PATCH error:", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
