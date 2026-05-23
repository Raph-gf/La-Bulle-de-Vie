import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { stripe } from "@/lib/stripe"

async function requireSpecialist() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const profile = await prisma.profile.findUnique({ where: { id: user.id }, select: { role: true } })
  return profile?.role === "specialist" ? user : null
}

export async function GET() {
  try {
    const user = await requireSpecialist()
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

    // ── Date ranges (UTC-safe) ───────────────────────────────────────────────
    const now = new Date()

    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))

    const weekStart = new Date(now)
    weekStart.setUTCDate(weekStart.getUTCDate() - 7)
    weekStart.setUTCHours(0, 0, 0, 0)

    // First day of the month 11 months ago → gives us current + 11 prev = 12 months total
    const twelveMonthsAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1))

    // ── Run all queries in parallel ──────────────────────────────────────────
    const PAID_STATUSES = ["confirmed", "completed"] as const

    const [allTimeAgg, recentAppts, transactions, refunds, stripeBalance, stripePayouts] =
      await Promise.all([

        // All-time aggregate KPIs
        prisma.appointment.aggregate({
          where: {
            status: { in: [...PAID_STATUSES] },
            amountPaid: { not: null },
          },
          _sum: { amountPaid: true, discountAmount: true },
          _count: { id: true },
        }),

        // Last 12 months — for chart + top services + month/week KPIs
        prisma.appointment.findMany({
          where: {
            status: { in: [...PAID_STATUSES] },
            amountPaid: { not: null },
            slot: { date: { gte: twelveMonthsAgo } },
          },
          select: {
            amountPaid: true,
            service: { select: { id: true, name: true } },
            slot: { select: { date: true } },
          },
        }),

        // Recent transactions list (last 30)
        prisma.appointment.findMany({
          where: { status: { in: [...PAID_STATUSES] } },
          orderBy: { slot: { date: "desc" } },
          take: 30,
          select: {
            id: true,
            amountPaid: true,
            discountAmount: true,
            travelFee: true,
            refundStatus: true,
            isFirstVisit: true,
            client: { select: { fullName: true } },
            guestName: true,
            service: { select: { name: true } },
            slot: { select: { date: true, startTime: true } },
          },
        }),

        // Refunds
        prisma.appointment.findMany({
          where: { refundStatus: { not: "none" } },
          orderBy: { updatedAt: "desc" },
          take: 20,
          select: {
            id: true,
            amountPaid: true,
            refundStatus: true,
            client: { select: { fullName: true } },
            guestName: true,
            service: { select: { name: true } },
            slot: { select: { date: true } },
          },
        }),

        // Stripe balance — null if API fails (test mode / not configured)
        stripe.balance.retrieve().catch(() => null),

        // Stripe payouts — last 5 bank transfers
        stripe.payouts.list({ limit: 5 }).catch(() => null),
      ])

    // ── Monthly buckets (12 months, chronological) ───────────────────────────
    const monthlyMap = new Map<string, { totalCents: number; count: number }>()
    for (let i = 11; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
      monthlyMap.set(key, { totalCents: 0, count: 0 })
    }
    for (const appt of recentAppts) {
      const d = new Date(appt.slot.date)
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
      const bucket = monthlyMap.get(key)
      if (bucket) {
        bucket.totalCents += appt.amountPaid ?? 0
        bucket.count += 1
      }
    }
    const monthly = Array.from(monthlyMap.entries()).map(([month, b]) => ({ month, ...b }))

    // ── This month / this week ───────────────────────────────────────────────
    const thisMonthCents = recentAppts
      .filter((a) => new Date(a.slot.date) >= monthStart)
      .reduce((s, a) => s + (a.amountPaid ?? 0), 0)

    const thisWeekCents = recentAppts
      .filter((a) => new Date(a.slot.date) >= weekStart)
      .reduce((s, a) => s + (a.amountPaid ?? 0), 0)

    // ── Top services (from last 12 months) ───────────────────────────────────
    const svcMap = new Map<string, { name: string; totalCents: number; count: number }>()
    for (const appt of recentAppts) {
      const { id, name } = appt.service
      const entry = svcMap.get(id) ?? { name, totalCents: 0, count: 0 }
      entry.totalCents += appt.amountPaid ?? 0
      entry.count += 1
      svcMap.set(id, entry)
    }
    const topServices = Array.from(svcMap.values())
      .sort((a, b) => b.totalCents - a.totalCents)
      .slice(0, 5)

    // ── Refunded total ───────────────────────────────────────────────────────
    const totalRefundedCents = refunds
      .filter((r) => r.refundStatus === "refunded")
      .reduce((s, r) => s + (r.amountPaid ?? 0), 0)

    // ── Stripe ───────────────────────────────────────────────────────────────
    const availableBalance =
      stripeBalance?.available.reduce((s, b) => s + b.amount, 0) ?? null
    const pendingBalance =
      stripeBalance?.pending.reduce((s, b) => s + b.amount, 0) ?? null

    const payouts =
      stripePayouts?.data.map((p) => ({
        id: p.id,
        amountCents: p.amount,
        currency: p.currency,
        status: p.status,
        arrivalDate: p.arrival_date, // Unix timestamp (seconds)
        description: p.description,
      })) ?? []

    // ── Shape transactions for frontend ─────────────────────────────────────
    const txns = transactions.map((t) => ({
      id: t.id,
      clientName: t.client?.fullName ?? t.guestName ?? "Client inconnu",
      serviceName: t.service.name,
      date: t.slot.date,
      startTime: t.slot.startTime,
      amountPaid: t.amountPaid,
      discountAmount: t.discountAmount,
      travelFee: t.travelFee,
      refundStatus: t.refundStatus,
      isFirstVisit: t.isFirstVisit,
    }))

    const refundList = refunds.map((r) => ({
      id: r.id,
      clientName: r.client?.fullName ?? r.guestName ?? "Client inconnu",
      serviceName: r.service.name,
      date: r.slot.date,
      amountPaid: r.amountPaid,
      refundStatus: r.refundStatus,
    }))

    return NextResponse.json({
      kpis: {
        allTimeCents: allTimeAgg._sum.amountPaid ?? 0,
        allTimeCount: allTimeAgg._count.id,
        thisMonthCents,
        thisWeekCents,
        avgPerSessionCents:
          allTimeAgg._count.id > 0
            ? Math.round((allTimeAgg._sum.amountPaid ?? 0) / allTimeAgg._count.id)
            : 0,
        totalRefundedCents,
        availableBalance,   // null = Stripe not reachable
        pendingBalance,     // null = Stripe not reachable
      },
      monthly,
      transactions: txns,
      topServices,
      refunds: refundList,
      payouts,
    })
  } catch (err) {
    console.error("[dashboard/finances] GET error:", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
