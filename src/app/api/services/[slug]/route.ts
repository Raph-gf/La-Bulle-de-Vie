import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const service = await prisma.service.findFirst({
    where: { slug, isPublished: true },
    include: {
      reviews: {
        where: { approved: true },
        orderBy: { createdAt: "desc" },
        select: {
          id: true, stars: true, body: true, specialistReply: true, createdAt: true,
          client: { select: { fullName: true } },
        },
      },
      _count: { select: { reviews: true } },
    },
  })

  if (!service) return NextResponse.json({ error: "Soin introuvable" }, { status: 404 })

  const relatedServices = service.relatedSlugs.length > 0
    ? await prisma.service.findMany({
        where: { slug: { in: service.relatedSlugs }, isPublished: true },
        select: { id: true, slug: true, name: true, tagline: true, durationMinutes: true, price: true, bgColor: true, category: true },
      })
    : []

  const avgStars = service.reviews.length > 0
    ? Math.round((service.reviews.reduce((s, r) => s + r.stars, 0) / service.reviews.length) * 10) / 10
    : 0

  const starBars = [5, 4, 3, 2, 1].map(n => {
    const count = service.reviews.filter(r => r.stars === n).length
    return service.reviews.length > 0 ? Math.round((count / service.reviews.length) * 100) : 0
  })

  return NextResponse.json({ service, relatedServices, avgStars, starBars })
}
