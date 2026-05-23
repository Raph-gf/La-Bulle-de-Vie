"use client"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js"
import { useCartStore } from "@/lib/stores/useCartStore"
import { toast } from "sonner"
import Reveal from "@/components/animations/Reveal"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

const APPEARANCE = {
  theme: "stripe" as const,
  variables: {
    colorPrimary: "#D89175",
    colorBackground: "#ffffff",
    colorText: "#1C1C1C",
    colorTextPlaceholder: "#9e9181",
    fontFamily: "Manrope, sans-serif",
    borderRadius: "10px",
    spacingUnit: "4px",
  },
  rules: {
    ".Input": { border: "1px solid #e8ddd5", boxShadow: "none", padding: "14px 16px", fontSize: "15px" },
    ".Input:focus": { border: "1px solid #1C1C1C", boxShadow: "0 0 0 4px #2218120c" },
    ".Label": { fontSize: "11px", letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: "500", color: "#9e9181" },
  },
}

// ── Shipping form + Stripe payment (inside <Elements>) ────────────────────────

type ShippingData = { name: string; email: string; address: string; city: string; postalCode: string }

function PayStep({ shipping, onBack }: { shipping: ShippingData; onBack: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const router = useRouter()
  const { items, clear } = useCartStore()
  const [paying, setPaying] = useState(false)

  async function handlePay(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return
    setPaying(true)

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    })

    if (error) {
      toast.error(error.message ?? "Erreur de paiement.")
      setPaying(false)
      return
    }

    if (paymentIntent?.status === "succeeded") {
      try {
        const res = await fetch("/api/orders/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentIntentId: paymentIntent.id,
            guestName: shipping.name,
            guestEmail: shipping.email,
            shippingAddress: {
              name: shipping.name,
              address: shipping.address,
              city: shipping.city,
              postalCode: shipping.postalCode,
            },
          }),
        })
        const body = await res.json()
        if (!res.ok) {
          toast.error(body.error ?? "Erreur lors de la confirmation.")
          setPaying(false)
          return
        }
        clear()
        router.push(`/confirmation/commande/${body.orderId}`)
      } catch {
        toast.error("Erreur réseau lors de la confirmation.")
        setPaying(false)
      }
    } else {
      toast.error("Paiement non finalisé. Veuillez réessayer.")
      setPaying(false)
    }
  }

  const total = items.reduce((s, i) => s + i.price * i.quantity, 0)

  return (
    <form onSubmit={handlePay}>
      <PaymentElement />
      <button
        type="submit"
        className={`pay-btn${paying ? " loading" : ""}`}
        disabled={!stripe || paying}
        style={{ marginTop: 24 }}
      >
        <span className="lbl">
          Payer {(total / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
          <span className="arrow">→</span>
        </span>
      </button>
      <button type="button" className="btn full" style={{ marginTop: 12 }} onClick={onBack}>
        ← Modifier la livraison
      </button>
    </form>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PanierPage() {
  const { items, remove, updateQty, total, count } = useCartStore()
  const [step, setStep] = useState<"cart" | "shipping" | "payment">("cart")
  const [shipping, setShipping] = useState<ShippingData>({ name: "", email: "", address: "", city: "", postalCode: "" })
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const n = count()
  const cartTotal = total()

  async function handleShippingSubmit(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: items.map(i => ({ id: i.id, quantity: i.quantity })) }),
      })
      const body = await res.json()
      if (!res.ok) {
        toast.error(body.error ?? "Impossible de créer la commande.")
        return
      }
      setClientSecret(body.clientSecret)
      setStep("payment")
    } catch {
      toast.error("Erreur réseau.")
    } finally {
      setCreating(false)
    }
  }

  if (items.length === 0 && step === "cart") {
    return (
      <section style={{ padding: "120px 0", textAlign: "center" }}>
        <div className="wrap">
          <Reveal>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" style={{ color: "var(--mute)", marginBottom: 20 }}>
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            <h1 style={{ fontFamily: "var(--serif)", fontSize: "clamp(32px,4vw,48px)", marginBottom: 12 }}>
              Votre panier est vide
            </h1>
            <p style={{ color: "var(--mute)", marginBottom: 32 }}>Découvrez nos créations originales.</p>
            <Link href="/decorations" className="btn primary">
              Voir les œuvres <span className="arrow">→</span>
            </Link>
          </Reveal>
        </div>
      </section>
    )
  }

  return (
    <>
      {/* Header */}
      <section style={{ padding: "60px 0 0" }}>
        <div className="wrap">
          <Reveal>
            <span className="eyebrow">Panier</span>
            <h1 style={{ fontFamily: "var(--serif)", fontSize: "clamp(32px,3.5vw,48px)", marginTop: 8 }}>
              {step === "cart" ? <>Votre sélection <span style={{ fontStyle: "italic", color: "var(--terra)" }}>({n} article{n !== 1 ? "s" : ""})</span></> :
               step === "shipping" ? "Adresse de livraison" :
               "Paiement sécurisé"}
            </h1>
          </Reveal>
        </div>
      </section>

      <section style={{ padding: "40px 0 120px" }}>
        <div className="wrap">
          <div className="panier-layout">
            {/* Left column */}
            <div>
              {/* STEP: Cart review */}
              {step === "cart" && (
                <>
                  <div className="panier-items">
                    {items.map(item => (
                      <div key={item.id} className="panier-item">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="panier-thumb" />
                        ) : (
                          <div className="panier-thumb-ph" />
                        )}
                        <div className="panier-item-body">
                          <p className="panier-item-name">{item.name}</p>
                          <p className="panier-item-meta">{item.medium} · {item.dimensions}</p>
                          <div className="qty-ctrl">
                            <button onClick={() => updateQty(item.id, item.quantity - 1)}>−</button>
                            <span>{item.quantity}</span>
                            <button onClick={() => updateQty(item.id, item.quantity + 1)} disabled={item.quantity >= item.stock}>+</button>
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 12 }}>
                          <span className="panier-item-price">
                            {((item.price * item.quantity) / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
                          </span>
                          <button
                            onClick={() => remove(item.id)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--mute)", fontSize: 12, letterSpacing: ".06em" }}
                          >
                            Supprimer
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 32, display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <button className="btn primary" onClick={() => setStep("shipping")}>
                      Valider mon panier <span className="arrow">→</span>
                    </button>
                    <Link href="/decorations" className="btn">Continuer mes achats</Link>
                  </div>
                </>
              )}

              {/* STEP: Shipping address */}
              {step === "shipping" && (
                <form onSubmit={handleShippingSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div className="co-fld">
                    <label className="co-label">Nom complet</label>
                    <input
                      className="co-input"
                      required
                      value={shipping.name}
                      onChange={e => setShipping(s => ({ ...s, name: e.target.value }))}
                      placeholder="Prénom Nom"
                    />
                  </div>
                  <div className="co-fld">
                    <label className="co-label">Email</label>
                    <input
                      className="co-input"
                      type="email"
                      required
                      value={shipping.email}
                      onChange={e => setShipping(s => ({ ...s, email: e.target.value }))}
                      placeholder="votre@email.fr"
                    />
                  </div>
                  <div className="co-fld">
                    <label className="co-label">Adresse</label>
                    <input
                      className="co-input"
                      required
                      value={shipping.address}
                      onChange={e => setShipping(s => ({ ...s, address: e.target.value }))}
                      placeholder="12 rue des Fleurs"
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 12 }}>
                    <div className="co-fld">
                      <label className="co-label">Code postal</label>
                      <input
                        className="co-input"
                        required
                        value={shipping.postalCode}
                        onChange={e => setShipping(s => ({ ...s, postalCode: e.target.value }))}
                        placeholder="75001"
                      />
                    </div>
                    <div className="co-fld">
                      <label className="co-label">Ville</label>
                      <input
                        className="co-input"
                        required
                        value={shipping.city}
                        onChange={e => setShipping(s => ({ ...s, city: e.target.value }))}
                        placeholder="Paris"
                      />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
                    <button type="submit" className={`pay-btn${creating ? " loading" : ""}`} disabled={creating} style={{ flex: 1, minWidth: 200 }}>
                      <span className="lbl">Continuer vers le paiement <span className="arrow">→</span></span>
                    </button>
                    <button type="button" className="btn" onClick={() => setStep("cart")}>← Panier</button>
                  </div>
                </form>
              )}

              {/* STEP: Stripe payment */}
              {step === "payment" && clientSecret && (
                <Elements stripe={stripePromise} options={{ clientSecret, appearance: APPEARANCE }}>
                  <PayStep shipping={shipping} onBack={() => setStep("shipping")} />
                </Elements>
              )}
            </div>

            {/* Right column: order summary */}
            <div className="panier-sidebar">
              <h3>Récapitulatif</h3>
              <p className="sub">{n} article{n !== 1 ? "s" : ""}</p>

              {items.map(item => (
                <div key={item.id} className="panier-row">
                  <span>{item.name} ×{item.quantity}</span>
                  <span>{((item.price * item.quantity) / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}</span>
                </div>
              ))}

              <div className="panier-row" style={{ marginTop: 8 }}>
                <span>Livraison</span>
                <span style={{ color: "var(--mute)" }}>Calculée après</span>
              </div>

              <div className="panier-row total">
                <span>Total</span>
                <span>{(cartTotal / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}</span>
              </div>

              <div className="trust" style={{ marginTop: 24 }}>
                <div className="trust-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>
                  </svg>
                  Paiement sécurisé
                </div>
                <div className="trust-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                  </svg>
                  Œuvres originales
                </div>
                <div className="trust-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                  Livraison soignée
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
