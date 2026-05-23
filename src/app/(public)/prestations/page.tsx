import { prisma } from "@/lib/prisma"
import PrestationsClient from "./PrestationsClient"

export const revalidate = 60

export default async function PrestationsPage() {
  const services = await prisma.service.findMany({
    where: { isPublished: true },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true, slug: true, name: true, tagline: true, forWho: true,
      shortDescription: true, durationMinutes: true, price: true,
      category: true, bgColor: true, displayOrder: true,
    },
  })

  return <PrestationsClient services={services} />
}
