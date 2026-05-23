import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { notFound } from "next/navigation"

export default async function OrderConfirmationPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      guestName: true,
      guestEmail: true,
      amountPaid: true,
      stripePaymentIntentId: true,
      createdAt: true,
      items: {
        select: {
          quantity: true,
          unitPrice: true,
          product: { select: { name: true, imageUrl: true, medium: true } },
        },
      },
    },
  })

  if (!order) notFound()

  const ref = order.stripePaymentIntentId
    ? `BDV-${order.stripePaymentIntentId.slice(-6).toUpperCase()}`
    : order.id.slice(-8).toUpperCase()

  const amountEur = ((order.amountPaid ?? 0) / 100).toLocaleString("fr-FR", {
    style: "currency", currency: "EUR", maximumFractionDigits: 0,
  })

  const clientName = order.guestName ?? "Client"

  return (
    <div style={{
      minHeight: "100dvh", background: "var(--cream)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "60px 16px",
    }}>
      <div style={{ maxWidth: 560, width: "100%", textAlign: "center" }}>
        {/* Success icon */}
        <div style={{
          width: 72, height: 72, borderRadius: "50%",
          background: "linear-gradient(135deg, #3a2a22, #B86F4A)",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          marginBottom: 24, boxShadow: "0 12px 40px -16px #B86F4A88",
        }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5"/>
          </svg>
        </div>

        <p style={{ fontSize: 11, letterSpacing: ".22em", textTransform: "uppercase", color: "var(--mute)", marginBottom: 12 }}>
          Commande confirmée
        </p>
        <h1 style={{ fontFamily: "var(--serif)", fontSize: "clamp(32px,5vw,48px)", lineHeight: 1.1, marginBottom: 16 }}>
          Merci, <span style={{ fontStyle: "italic", color: "var(--terra)" }}>{clientName}</span>&nbsp;!
        </h1>
        <p style={{ fontSize: 16, color: "var(--mute)", lineHeight: 1.7, marginBottom: 40, maxWidth: 440, margin: "0 auto 40px" }}>
          Votre commande a bien été enregistrée. Vous recevrez un email de confirmation à <strong>{order.guestEmail}</strong>.
        </p>

        {/* Ref pill */}
        <div className="ref-pill" style={{ display: "inline-flex", alignItems: "center", gap: 18, padding: "12px 24px", background: "#fff", borderRadius: 999, marginBottom: 40, boxShadow: "0 2px 12px #22181212" }}>
          <span style={{ fontSize: 11, letterSpacing: ".22em", textTransform: "uppercase", color: "var(--mute)" }}>Référence</span>
          <span style={{ fontFamily: "var(--serif)", fontSize: 20 }}>{ref}</span>
        </div>

        {/* Items summary */}
        <div style={{
          background: "#fff", borderRadius: 16, border: "1px solid var(--line)",
          padding: "24px 28px", marginBottom: 40, textAlign: "left",
        }}>
          <p style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--mute)", marginBottom: 16 }}>
            Articles commandés
          </p>
          {order.items.map((item, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              paddingBottom: i < order.items.length - 1 ? 14 : 0,
              marginBottom: i < order.items.length - 1 ? 14 : 0,
              borderBottom: i < order.items.length - 1 ? "1px solid var(--line)" : "none",
            }}>
              <div>
                <p style={{ fontFamily: "var(--serif)", fontSize: 17, marginBottom: 2 }}>{item.product.name}</p>
                <p style={{ fontSize: 12, color: "var(--mute)" }}>{item.product.medium} · ×{item.quantity}</p>
              </div>
              <span style={{ fontWeight: 500 }}>
                {((item.unitPrice * item.quantity) / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
              </span>
            </div>
          ))}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "baseline",
            borderTop: "1px solid var(--line)", paddingTop: 16, marginTop: 16,
          }}>
            <span style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--mute)" }}>Total réglé</span>
            <span style={{ fontFamily: "var(--serif)", fontSize: 24 }}>{amountEur}</span>
          </div>
        </div>

        {/* CTAs */}
        <div className="ok-cta" style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          <Link href="/" className="btn primary">
            Retour à l&apos;accueil <span className="arrow">→</span>
          </Link>
          <Link href="/decorations" className="btn">
            Continuer mes achats
          </Link>
        </div>

        <p style={{ marginTop: 40, fontSize: 12, color: "var(--mute)" }}>
          Une question ? Écrivez-nous à{" "}
          <a href="mailto:contact@labulledevie.fr" style={{ color: "var(--terra)" }}>
            contact@labulledevie.fr
          </a>
        </p>
      </div>
    </div>
  )
}
