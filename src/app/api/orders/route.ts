import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { stripe } from "@/lib/stripe"
import { createClient } from "@/lib/supabase/server"

type CartLine = { id: string; quantity: number }

// POST /api/orders
// Creates a Stripe PaymentIntent for a cart.
// Prices are always read from the DB — client values are never trusted.
export async function POST(req: NextRequest) {
  try {
    const { items }: { items: CartLine[] } = await req.json()

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Panier vide" }, { status: 400 })
    }

    if (items.length > 50) {
      return NextResponse.json({ error: "Trop d'articles dans le panier (max 50)" }, { status: 422 })
    }

    const productIds = items.map(i => i.id)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, isPublished: true },
      select: { id: true, price: true, stock: true, name: true },
    })

    // Validate every item exists and has enough stock
    for (const line of items) {
      if (!Number.isInteger(line.quantity) || line.quantity < 1) {
        return NextResponse.json({ error: "Quantité invalide" }, { status: 422 })
      }
      const p = products.find(p => p.id === line.id)
      if (!p) return NextResponse.json({ error: `Produit introuvable (${line.id})` }, { status: 422 })
      if (line.quantity > p.stock) {
        return NextResponse.json({ error: `Stock insuffisant pour « ${p.name} »` }, { status: 422 })
      }
    }

    // Calculate total from server-side prices
    const total = items.reduce((sum, line) => {
      const p = products.find(p => p.id === line.id)!
      return sum + p.price * line.quantity
    }, 0)

    if (total < 50) {
      return NextResponse.json({ error: "Montant minimum non atteint" }, { status: 422 })
    }

    // Resolve authenticated client (optional — guest checkout is allowed)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const pi = await stripe.paymentIntents.create({
      amount: total,
      currency: "eur",
      automatic_payment_methods: { enabled: true },
      metadata: {
        type: "order",
        clientId: user?.id ?? "",
        items: JSON.stringify(items.map(l => ({ id: l.id, qty: l.quantity }))),
      },
    })

    return NextResponse.json({ clientSecret: pi.client_secret, total, paymentIntentId: pi.id })
  } catch (err) {
    console.error("[orders] POST error:", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
