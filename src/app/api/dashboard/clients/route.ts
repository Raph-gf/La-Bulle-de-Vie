import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

async function requireSpecialist() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const profile = await prisma.profile.findUnique({ where: { id: user.id }, select: { role: true } })
  return profile?.role === "specialist" ? user : null
}

const VALID_SORTS = ["name", "lastVisit", "sessions", "totalSpent"] as const
type SortKey = (typeof VALID_SORTS)[number]

export async function GET(req: NextRequest) {
  try {
    const user = await requireSpecialist()
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

    const search = req.nextUrl.searchParams.get("search")?.trim() ?? ""
    const sortRaw = req.nextUrl.searchParams.get("sort") ?? "name"
    const sort: SortKey = (VALID_SORTS as readonly string[]).includes(sortRaw)
      ? (sortRaw as SortKey)
      : "name"

    const profiles = await prisma.profile.findMany({
      where: {
        role: "client",
        ...(search
          ? {
              OR: [
                { fullName: { contains: search, mode: "insensitive" } },
                { phone: { contains: search } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        fullName: true,
        phone: true,
        avatarUrl: true,
        specialistNotes: true,
        createdAt: true,
        appointments: {
          where: { status: { not: "cancelled" } },
          select: {
            status: true,
            amountPaid: true,
            slot: { select: { date: true } },
          },
        },
      },
    })

    // Compute per-client aggregates server-side
    const clients = profiles.map((p) => {
      const appts = p.appointments
      const confirmed = appts.filter(
        (a) => a.status === "confirmed" || a.status === "completed"
      )
      const totalSpentCents = confirmed.reduce(
        (sum, a) => sum + (a.amountPaid ?? 0),
        0
      )
      const byDateDesc = [...appts].sort(
        (a, b) =>
          new Date(b.slot.date).getTime() - new Date(a.slot.date).getTime()
      )

      return {
        id: p.id,
        fullName: p.fullName,
        phone: p.phone,
        avatarUrl: p.avatarUrl,
        hasNotes: Boolean(p.specialistNotes?.trim()),
        joinedAt: p.createdAt,
        totalSessions: confirmed.length,
        lastVisitDate: byDateDesc[0]?.slot.date ?? null,
        totalSpentCents,
      }
    })

    // Sort
    if (sort === "lastVisit") {
      clients.sort((a, b) => {
        if (!a.lastVisitDate && !b.lastVisitDate) return 0
        if (!a.lastVisitDate) return 1
        if (!b.lastVisitDate) return -1
        return new Date(b.lastVisitDate).getTime() - new Date(a.lastVisitDate).getTime()
      })
    } else if (sort === "sessions") {
      clients.sort((a, b) => b.totalSessions - a.totalSessions)
    } else if (sort === "totalSpent") {
      clients.sort((a, b) => b.totalSpentCents - a.totalSpentCents)
    } else {
      clients.sort((a, b) => a.fullName.localeCompare(b.fullName, "fr"))
    }

    return NextResponse.json({ clients })
  } catch (err) {
    console.error("[dashboard/clients] GET error:", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
