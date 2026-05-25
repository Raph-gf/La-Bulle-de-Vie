import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { stripe } from "@/lib/stripe"
import { sendOrderConfirmation } from "@/lib/resend/emails"

// POST /api/orders/confirm
// Called client-side after stripe.confirmPayment() succeeds.
// Verifies the PI server-side, decrements stock, creates Order + OrderItems.
export async function POST(req: NextRequest) {
  try {
    const { paymentIntentId, guestName, guestEmail, shippingAddress } = await req.json()

    if (!paymentIntentId || typeof paymentIntentId !== "string") {
      return NextResponse.json({ error: "paymentIntentId requis" }, { status: 400 })
    }

    // Verify with Stripe
    let pi
    try {
      pi = await stripe.paymentIntents.retrieve(paymentIntentId)
    } catch {
      return NextResponse.json({ error: "PaymentIntent introuvable" }, { status: 404 })
    }

    if (pi.status !== "succeeded") {
      return NextResponse.json({ error: "Paiement non finalisé" }, { status: 402 })
    }

    // Idempotency: order may already exist (webhook beat us)
    const existing = await prisma.order.findFirst({
      where: { stripePaymentIntentId: pi.id },
      select: { id: true },
    })
    if (existing) {
      return NextResponse.json({ ok: true, orderId: existing.id, alreadyCreated: true })
    }

    const rawItems: { id: string; qty: number }[] = JSON.parse(pi.metadata.items ?? "[]")
    const clientId = pi.metadata.clientId || null

    if (rawItems.length === 0) {
      return NextResponse.json({ error: "Métadonnées manquantes" }, { status: 422 })
    }

    // Fetch current product data
    const products = await prisma.product.findMany({
      where: { id: { in: rawItems.map(i => i.id) } },
      select: { id: true, price: true, name: true, stock: true },
    })

    // Verify amount received matches expected total from current DB prices — prevents
    // a PI created for a lower amount from confirming a higher-value order
    const expectedTotal = rawItems.reduce((sum, line) => {
      const p = products.find(p => p.id === line.id)
      return sum + (p ? p.price * line.qty : 0)
    }, 0)
    if (pi.amount_received < expectedTotal - 10) {
      await stripe.refunds.create({ payment_intent: paymentIntentId, reason: "fraudulent" })
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 })
    }

    // Atomic: decrement stock + create order + create items
    let order
    try {
      order = await prisma.$transaction(async (tx) => {
        for (const line of rawItems) {
          const p = products.find(p => p.id === line.id)
          if (!p || p.stock < line.qty) throw new Error("STOCK_ISSUE")
          await tx.product.update({
            where: { id: line.id },
            data: { stock: { decrement: line.qty } },
          })
        }

        return tx.order.create({
          data: {
            clientId,
            guestName: clientId ? null : (guestName || null),
            guestEmail: clientId ? null : (guestEmail || null),
            status: "paid",
            total: pi.amount,
            amountPaid: pi.amount_received,
            stripePaymentIntentId: pi.id,
            shippingAddress: shippingAddress ?? null,
            items: {
              create: rawItems.map(line => ({
                productId: line.id,
                quantity: line.qty,
                unitPrice: products.find(p => p.id === line.id)!.price,
              })),
            },
          },
          select: { id: true },
        })
      })
    } catch (txErr) {
      if (txErr instanceof Error && txErr.message === "STOCK_ISSUE") {
        await stripe.refunds.create({ payment_intent: paymentIntentId, reason: "duplicate" })
        return NextResponse.json(
          { error: "Stock insuffisant — votre paiement sera remboursé automatiquement." },
          { status: 409 }
        )
      }
      throw txErr
    }

    const ref = `BDV-${pi.id.slice(-6).toUpperCase()}`
    const email = guestEmail || (clientId ? undefined : undefined)

    if (email) {
      const itemLines = rawItems.map(line => {
        const p = products.find(p => p.id === line.id)!
        return { name: p.name, qty: line.qty, unitPrice: p.price }
      })
      sendOrderConfirmation(email, {
        clientName: guestName || "Client",
        ref,
        amountEur: (pi.amount_received / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 }),
        items: itemLines,
        shippingAddress,
      }).catch(err => console.error("[email] order confirmation failed:", err))
    }

    return NextResponse.json({ ok: true, orderId: order.id })
  } catch (err) {
    console.error("[orders/confirm] POST error:", err)
    if (err instanceof Error && err.message === "STOCK_ISSUE") {
      return NextResponse.json({ error: "Stock insuffisant — votre paiement sera remboursé." }, { status: 409 })
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
