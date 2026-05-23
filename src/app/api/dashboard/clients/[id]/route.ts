import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

async function requireSpecialist() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const profile = await prisma.profile.findUnique({ where: { id: user.id }, select: { role: true } })
  return profile?.role === "specialist" ? user : null
}

const notesSchema = z.object({
  notes: z.string().max(2000),
})

// GET /api/dashboard/clients/[id] — full client profile + appointment history
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireSpecialist()
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

    const { id } = await params

    const client = await prisma.profile.findUnique({
      where: { id, role: "client" },
      select: {
        id: true,
        fullName: true,
        phone: true,
        avatarUrl: true,
        specialistNotes: true,
        preferredLocation: true,
        createdAt: true,
        appointments: {
          orderBy: { slot: { date: "desc" } },
          select: {
            id: true,
            status: true,
            location: true,
            notes: true,
            isFirstVisit: true,
            amountPaid: true,
            discountAmount: true,
            travelFee: true,
            refundStatus: true,
            createdAt: true,
            service: {
              select: { name: true, durationMinutes: true, slug: true },
            },
            slot: {
              select: { date: true, startTime: true, endTime: true },
            },
            review: {
              select: { stars: true, approved: true },
            },
          },
        },
      },
    })

    if (!client) return NextResponse.json({ error: "Client introuvable" }, { status: 404 })

    // Derive summary stats
    const confirmed = client.appointments.filter(
      (a) => a.status === "confirmed" || a.status === "completed"
    )
    const totalSpentCents = confirmed.reduce((sum, a) => sum + (a.amountPaid ?? 0), 0)
    const firstVisit = confirmed.at(-1) // last element = earliest since desc order

    return NextResponse.json({
      client: {
        ...client,
        totalSessions: confirmed.length,
        totalSpentCents,
        firstVisitDate: firstVisit?.slot.date ?? null,
      },
    })
  } catch (err) {
    console.error("[dashboard/clients/[id]] GET error:", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// PATCH /api/dashboard/clients/[id] — update specialist private notes
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireSpecialist()
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

    const { id } = await params

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Corps invalide" }, { status: 400 })
    }

    const parsed = notesSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données invalides", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 422 }
      )
    }

    // Verify the target profile is a client (not another specialist)
    const target = await prisma.profile.findUnique({
      where: { id, role: "client" },
      select: { id: true },
    })
    if (!target) return NextResponse.json({ error: "Client introuvable" }, { status: 404 })

    await prisma.profile.update({
      where: { id },
      data: { specialistNotes: parsed.data.notes },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[dashboard/clients/[id]] PATCH error:", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
