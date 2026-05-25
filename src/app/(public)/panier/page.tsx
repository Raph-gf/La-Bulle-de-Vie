"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js"
import { useCartStore } from "@/lib/stores/useCartStore"
import { toast } from "sonner"

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

type ShippingData = { name: string; email: string; address: string; city: string; postalCode: string }

type Product = { id: string; name: string; price: number; imageUrl: string | null; medium: string; dimensions: string; stock: number }

const SHIPPING_OPTS = [
  { value: "standard", label: "Livraison standard", desc: "5 — 8 jours ouvrés · Suivi inclus", cents: 650 },
  { value: "express",  label: "Express",             desc: "2 — 3 jours ouvrés · Chronopost",   cents: 1490 },
  { value: "pickup",   label: "Retrait au cabinet",  desc: "Lyon 7ᵉ · sous 24h, sur RDV",      cents: 0 },
] as const

type ShippingValue = typeof SHIPPING_OPTS[number]["value"]

const PROMOS: Record<string, { rate?: number; flat?: number; desc: string }> = {
  "BULLE20":   { rate: 0.20, desc: "20 % offert" },
  "BIENVENUE": { flat: 1500, desc: "15 € offert" },
}

function fmt(cents: number) {
  return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2 })
}

// ── Stripe payment step ───────────────────────────────────────────────────────

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
  const [mounted, setMounted] = useState(false)
  const { items, remove, updateQty, add, count, total } = useCartStore()

  const [step, setStep] = useState<"cart" | "shipping" | "payment">("cart")
  const [shipping, setShipping] = useState<ShippingData>({ name: "", email: "", address: "", city: "", postalCode: "" })
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const [shippingMethod, setShippingMethod] = useState<ShippingValue>("standard")
  const [promoInput, setPromoInput] = useState("")
  const [promoApplied, setPromoApplied] = useState<string | null>(null)
  const [promoOk, setPromoOk] = useState(false)
  const [crossProducts, setCrossProducts] = useState<Product[]>([])
  const [removing, setRemoving] = useState<Record<string, boolean>>({})

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    fetch("/api/products")
      .then(r => r.json())
      .then(d => setCrossProducts(d.products ?? []))
      .catch(() => {})
  }, [])

  if (!mounted) return null

  const safeItems = items
  const n = count()
  const subtotal = safeItems.reduce((s, i) => s + i.price * i.quantity, 0)
  const shippingOpt = SHIPPING_OPTS.find(o => o.value === shippingMethod)!
  const shippingFee = shippingOpt.cents
  const promo = promoApplied ? PROMOS[promoApplied] : null
  const discount = promo
    ? promo.rate ? Math.round(subtotal * promo.rate)
    : Math.min(promo.flat ?? 0, subtotal)
    : 0
  const afterDiscount = Math.max(0, subtotal - discount)
  const grandTotal = afterDiscount + shippingFee
  const tva = Math.round(grandTotal * 0.2 / 1.2)

  const cartItemIds = new Set(safeItems.map(i => i.id))
  const crossSell = crossProducts.filter(p => !cartItemIds.has(p.id) && p.stock > 0).slice(0, 3)

  function handleRemove(id: string, name: string) {
    setRemoving(r => ({ ...r, [id]: true }))
    toast(`${name} retiré du panier`, {
      action: {
        label: "Annuler",
        onClick: () => setRemoving(r => ({ ...r, [id]: false })),
      },
      duration: 5000,
    })
    setTimeout(() => {
      remove(id)
      setRemoving(r => ({ ...r, [id]: false }))
    }, 380)
  }

  function handlePromo() {
    const code = promoInput.trim().toUpperCase()
    if (PROMOS[code]) {
      setPromoApplied(code)
      setPromoOk(true)
      toast.success("Code appliqué", { description: PROMOS[code].desc })
    } else if (code) {
      toast.error("Code invalide", { description: "Vérifiez la saisie" })
      setPromoInput("")
    }
  }

  function clearPromo() {
    setPromoApplied(null)
    setPromoOk(false)
    setPromoInput("")
  }

  async function handleShippingSubmit(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: safeItems.map(i => ({ id: i.id, quantity: i.quantity })), shippingMethod }),
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

  // ── Empty cart ──────────────────────────────────────────────────────────────

  if (safeItems.length === 0 && step === "cart") {
    return (
      <div className="panier-page">
        <div className="panier-cart-list" style={{ maxWidth: 560, margin: "0 auto" }}>
          <div className="panier-cart-empty">
            <div className="ic">❋</div>
            <h3>Votre panier est <span style={{ fontStyle: "italic", color: "var(--terra)" }}>vide.</span></h3>
            <p>Découvrez les pièces uniques peintes à la main dans la boutique.</p>
            <Link href="/decorations" className="btn primary" style={{ textDecoration: "none", display: "inline-flex", gap: 8 }}>
              Explorer la boutique <span className="arrow">→</span>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ── Shipping address step ───────────────────────────────────────────────────

  if (step === "shipping") {
    return (
      <>
        <section style={{ padding: "60px 0 0" }}>
          <div className="wrap">
            <span className="eyebrow">Panier</span>
            <h1 style={{ fontFamily: "var(--serif)", fontSize: "clamp(32px,3.5vw,48px)", marginTop: 8 }}>
              Adresse de livraison
            </h1>
          </div>
        </section>
        <section style={{ padding: "40px 0 120px" }}>
          <div className="wrap">
            <div className="panier-layout">
              <form onSubmit={handleShippingSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div className="co-fld">
                  <label className="co-label">Nom complet</label>
                  <input className="co-input" required value={shipping.name} onChange={e => setShipping(s => ({ ...s, name: e.target.value }))} placeholder="Prénom Nom" />
                </div>
                <div className="co-fld">
                  <label className="co-label">Email</label>
                  <input className="co-input" type="email" required value={shipping.email} onChange={e => setShipping(s => ({ ...s, email: e.target.value }))} placeholder="votre@email.fr" />
                </div>
                <div className="co-fld">
                  <label className="co-label">Adresse</label>
                  <input className="co-input" required value={shipping.address} onChange={e => setShipping(s => ({ ...s, address: e.target.value }))} placeholder="12 rue des Fleurs" />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 12 }}>
                  <div className="co-fld">
                    <label className="co-label">Code postal</label>
                    <input className="co-input" required value={shipping.postalCode} onChange={e => setShipping(s => ({ ...s, postalCode: e.target.value }))} placeholder="75001" />
                  </div>
                  <div className="co-fld">
                    <label className="co-label">Ville</label>
                    <input className="co-input" required value={shipping.city} onChange={e => setShipping(s => ({ ...s, city: e.target.value }))} placeholder="Paris" />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
                  <button type="submit" className={`pay-btn${creating ? " loading" : ""}`} disabled={creating} style={{ flex: 1, minWidth: 200 }}>
                    <span className="lbl">Continuer vers le paiement <span className="arrow">→</span></span>
                  </button>
                  <button type="button" className="btn" onClick={() => setStep("cart")}>← Panier</button>
                </div>
              </form>
              <div className="panier-sidebar">
                <h3>Récapitulatif</h3>
                {safeItems.map(item => (
                  <div key={item.id} className="panier-row">
                    <span>{item.name} ×{item.quantity}</span>
                    <span>{fmt(item.price * item.quantity)}</span>
                  </div>
                ))}
                <div className="panier-row" style={{ marginTop: 8 }}>
                  <span>Livraison</span>
                  <span style={{ color: "var(--mute)" }}>{shippingFee === 0 ? "Offert" : fmt(shippingFee)}</span>
                </div>
                <div className="panier-row total">
                  <span>Total</span>
                  <span>{fmt(grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </>
    )
  }

  // ── Payment step ────────────────────────────────────────────────────────────

  if (step === "payment" && clientSecret) {
    return (
      <>
        <section style={{ padding: "60px 0 0" }}>
          <div className="wrap">
            <span className="eyebrow">Panier</span>
            <h1 style={{ fontFamily: "var(--serif)", fontSize: "clamp(32px,3.5vw,48px)", marginTop: 8 }}>
              Paiement sécurisé
            </h1>
          </div>
        </section>
        <section style={{ padding: "40px 0 120px" }}>
          <div className="wrap">
            <div className="panier-layout">
              <Elements stripe={stripePromise} options={{ clientSecret, appearance: APPEARANCE }}>
                <PayStep shipping={shipping} onBack={() => setStep("shipping")} />
              </Elements>
              <div className="panier-sidebar">
                <h3>Récapitulatif</h3>
                {safeItems.map(item => (
                  <div key={item.id} className="panier-row">
                    <span>{item.name} ×{item.quantity}</span>
                    <span>{fmt(item.price * item.quantity)}</span>
                  </div>
                ))}
                <div className="panier-row" style={{ marginTop: 8 }}>
                  <span>Livraison</span>
                  <span style={{ color: "var(--mute)" }}>{shippingFee === 0 ? "Offert" : fmt(shippingFee)}</span>
                </div>
                {discount > 0 && (
                  <div className="panier-row" style={{ color: "var(--terra)" }}>
                    <span>Réduction</span>
                    <span>−{fmt(discount)}</span>
                  </div>
                )}
                <div className="panier-row total">
                  <span>Total</span>
                  <span>{fmt(grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </>
    )
  }

  // ── Cart step — redesigned ──────────────────────────────────────────────────

  return (
    <div className="panier-page">

      {/* Header */}
      <header className="panier-head">
        <div>
          <span className="eyebrow">Boutique</span>
          <h1 style={{ marginTop: 14 }}>
            Votre <span className="italic" style={{ color: "var(--terra)" }}>panier.</span>
          </h1>
          <p className="lede">Vos créations sélectionnées. Chaque pièce est unique et préparée avec soin avant l&apos;envoi.</p>
        </div>
        <div className="panier-head-count">
          <strong>{n}</strong> pièce{n !== 1 ? "s" : ""} · <strong>{fmt(grandTotal)}</strong>
        </div>
      </header>

      <div className="panier-grid">

        {/* LEFT — items + actions + cross-sell */}
        <section>
          <div className="panier-cart-list">
            {safeItems.map((item, i) => (
              <div
                key={item.id}
                className={`panier-cart-item${removing[item.id] ? " removing" : ""}`}
              >
                {/* Thumbnail */}
                <div className="panier-cart-thumb">
                  {item.imageUrl
                    ? <img src={item.imageUrl} alt={item.name} />
                    : item.name.charAt(0)
                  }
                </div>

                {/* Body */}
                <div className="panier-cart-body">
                  <div className="nm">{item.name}</div>
                  <div className="tags">
                    {item.medium && <span className="t">{item.medium.split(" ")[0]}</span>}
                    {item.dimensions && <span className="t">{item.dimensions}</span>}
                    <span className="t">Pièce unique</span>
                  </div>
                  <div className="meta">Préparation 3–5 jours · Emballage rigide · <strong>Signé</strong></div>
                </div>

                {/* Right */}
                <div className="panier-cart-right">
                  <div className="panier-cart-price">
                    <span>{fmt(item.price * item.quantity)}</span>
                    {item.quantity > 1 && (
                      <small>{fmt(item.price)} × {item.quantity}</small>
                    )}
                  </div>
                  <div className="panier-qty">
                    <button
                      onClick={() => updateQty(item.id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      aria-label="Diminuer"
                    >−</button>
                    <span>{item.quantity}</span>
                    <button
                      onClick={() => updateQty(item.id, item.quantity + 1)}
                      disabled={item.quantity >= item.stock}
                      aria-label="Augmenter"
                    >+</button>
                  </div>
                  <div className="panier-cart-act">
                    <button
                      className="danger"
                      onClick={() => handleRemove(item.id, item.name)}
                    >
                      Retirer
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Actions bar */}
          <div className="panier-actions-bar">
            <div className="left">
              <Link href="/decorations" className="panier-link">← Continuer mes achats</Link>
            </div>
            <span style={{ fontSize: 12, color: "var(--mute)", letterSpacing: ".04em" }}>
              Sous-total{" "}
              <strong style={{ color: "var(--ink)", fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 16, marginLeft: 4 }}>
                {fmt(subtotal)}
              </strong>
            </span>
          </div>

          {/* Cross-sell */}
          {crossSell.length > 0 && (
            <div className="panier-crosssell">
              <h3>
                Vous aimerez peut-être{" "}
                <span className="italic" style={{ fontFamily: "var(--serif)", color: "var(--terra)" }}>aussi…</span>
              </h3>
              <div className="panier-cross-grid">
                {crossSell.map(p => (
                  <div
                    key={p.id}
                    className="panier-cross-card"
                    onClick={() => {
                      add({ id: p.id, name: p.name, price: p.price, imageUrl: p.imageUrl, medium: p.medium, dimensions: p.dimensions, stock: p.stock })
                      toast.success("Ajouté au panier", { description: p.name })
                    }}
                  >
                    <div className="th">
                      {p.imageUrl
                        ? <img src={p.imageUrl} alt={p.name} />
                        : p.name.charAt(0)
                      }
                    </div>
                    <div className="info">
                      <div className="nm">{p.name}</div>
                      <div className="pr">{fmt(p.price)}</div>
                    </div>
                    <div className="plus">+</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* RIGHT — summary sidebar */}
        <aside className="panier-sidebar">
          <h3>Récapitulatif</h3>

          {/* Promo code */}
          <div className="promo-row">
            <input
              type="text"
              placeholder="Code promo"
              value={promoInput}
              maxLength={16}
              onChange={e => setPromoInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handlePromo()}
              disabled={promoOk}
            />
            <button className={promoOk ? "ok" : ""} onClick={handlePromo} disabled={promoOk}>
              {promoOk ? "✓" : "Appliquer"}
            </button>
          </div>

          {promoApplied && (
            <div className="promo-banner">
              <span>✓</span>
              <div><strong>{promoApplied}</strong> appliqué — {PROMOS[promoApplied]?.desc}</div>
              <button className="x" onClick={clearPromo} aria-label="Retirer le code">×</button>
            </div>
          )}

          {/* Shipping picker */}
          <p style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--mute)", marginBottom: 12 }}>
            Mode de livraison
          </p>
          <div className="ship-pick">
            {SHIPPING_OPTS.map(opt => (
              <div
                key={opt.value}
                className={`ship-opt${shippingMethod === opt.value ? " selected" : ""}`}
                onClick={() => setShippingMethod(opt.value)}
              >
                <div className="ship-dot" />
                <div className="ship-info">
                  <div className="nm">{opt.label}</div>
                  <div className="desc">{opt.desc}</div>
                </div>
                <div className={`ship-price${opt.cents === 0 ? " free" : ""}`}>
                  {opt.cents === 0 ? "Offert" : fmt(opt.cents)}
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="total-line">
            <span>Sous-total</span>
            <span className="v">{fmt(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="total-line discount">
              <span>Réduction ({promoApplied})</span>
              <span className="v">−{fmt(discount)}</span>
            </div>
          )}
          <div className="total-line">
            <span>Livraison</span>
            <span className="v">{shippingFee === 0 ? <span style={{ color: "#3D6346", fontStyle: "italic" }}>Offert</span> : fmt(shippingFee)}</span>
          </div>
          <div className="total-line">
            <span>TVA incluse (20 %)</span>
            <span className="v">{fmt(tva)}</span>
          </div>

          <div className="total-grand">
            <div><div className="lbl">Total</div></div>
            <div className="v">{(grandTotal / 100).toFixed(2).replace(".", ",")}<small>€</small></div>
          </div>

          <button className="checkout-btn" onClick={() => setStep("shipping")}>
            Passer commande <span className="arrow">→</span>
          </button>

          <div className="panier-trust">
            <div className="panier-trust-it">◐ Paiement sécurisé</div>
            <div className="panier-trust-it">↻ Retour 14 jours</div>
            <div className="panier-trust-it">✿ Emballage soigné</div>
          </div>
        </aside>

      </div>
    </div>
  )
}
