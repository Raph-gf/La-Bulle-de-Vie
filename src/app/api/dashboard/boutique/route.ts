import { NextResponse } from "next/server"
import { requireSpecialist } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"


const productSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  price: z.number().min(0),
  stock: z.number().int().min(0),
  medium: z.string().min(1).max(200),
  dimensions: z.string().min(1).max(100),
  vatRate: z.number().int().min(0).max(100).default(20),
  imageUrl: z.string().url().optional().nullable(),
})

export async function GET() {
  try {
    const user = await requireSpecialist()
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

    const [products, orders] = await Promise.all([
      prisma.product.findMany({
        orderBy: { createdAt: "desc" },
      }),
      prisma.order.findMany({
        take: 50,
        orderBy: { createdAt: "desc" },
        include: {
          client: { select: { fullName: true } },
          items: {
            include: {
              product: { select: { name: true } },
            },
          },
        },
      }),
    ])

    const totalRevenue = orders
      .filter((o) => o.status === "paid" || o.status === "shipped")
      .reduce((sum, o) => sum + (o.amountPaid ?? o.total), 0)

    const totalOrders = orders.length
    const pendingOrders = orders.filter((o) => o.status === "pending").length
    const lowStockCount = products.filter((p) => p.stock <= 3).length

    return NextResponse.json({
      products,
      orders,
      kpis: { totalRevenue, totalOrders, pendingOrders, lowStockCount },
    })
  } catch (err) {
    console.error("[dashboard/boutique] GET error:", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireSpecialist()
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

    let body: unknown
    try { body = await req.json() } catch { return NextResponse.json({ error: "Corps invalide" }, { status: 400 }) }

    const parsed = productSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données invalides", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 422 }
      )
    }

    const { price, ...rest } = parsed.data
    const product = await prisma.product.create({
      data: {
        ...rest,
        price: Math.round(price * 100),
      },
    })

    return NextResponse.json({ product }, { status: 201 })
  } catch (err) {
    console.error("[dashboard/boutique] POST error:", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
