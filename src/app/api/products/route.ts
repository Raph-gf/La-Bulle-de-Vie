import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const products = await prisma.product.findMany({
    where: { isPublished: true, stock: { gt: 0 } },
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      stock: true,
      medium: true,
      dimensions: true,
      imageUrl: true,
    },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json({ products })
}
