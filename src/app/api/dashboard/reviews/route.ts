import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const profile = await prisma.profile.findUnique({
    where: { id: user.id }, select: { role: true },
  })
  if (profile?.role !== "specialist") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
  }

  const reviews = await prisma.review.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true, stars: true, body: true, approved: true,
      specialistReply: true, createdAt: true,
      client: { select: { id: true, fullName: true } },
      service: { select: { name: true } },
    },
  })

  const total = reviews.length
  const approved = reviews.filter(r => r.approved).length
  const pending = total - approved
  const avgStars = total > 0
    ? Math.round((reviews.reduce((s, r) => s + r.stars, 0) / total) * 10) / 10
    : 0

  return NextResponse.json({
    reviews,
    stats: { total, approved, pending, avgStars },
  })
}
