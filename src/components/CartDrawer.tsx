"use client"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useCartStore } from "@/lib/stores/useCartStore"

export default function CartDrawer() {
  const { items, isOpen, close, open, remove, updateQty, total, count } = useCartStore()
  const n = count()
  const [bump, setBump] = useState(false)
  const prevN = useRef(n)

  // Trigger badge bump animation whenever the count increases
  useEffect(() => {
    if (n > prevN.current) {
      setBump(true)
      const t = setTimeout(() => setBump(false), 500)
      return () => clearTimeout(t)
    }
    prevN.current = n
  }, [n])

  const pillVisible = n > 0 && !isOpen

  return (
    <>
      {/* Floating cart pill — bottom right, slides up when items > 0 */}
      <button
        className={`cart-pill${pillVisible ? " show" : ""}`}
        onClick={open}
        aria-label="Ouvrir le panier"
      >
        <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
        </svg>
        Panier
        <span className={`n${bump ? " bump" : ""}`}>{n}</span>
      </button>

      {/* Backdrop */}
      <div className={`cart-backdrop${isOpen ? " show" : ""}`} onClick={close} aria-hidden />

      {/* Slide-in drawer */}
      <aside className={`cart-drawer${isOpen ? " open" : ""}`} aria-label="Panier">
        {/* Header */}
        <div className="cd-head">
          <div>
            <span className="eyebrow" style={{ display: "block", marginBottom: 2 }}>Panier</span>
            <span style={{ fontSize: 13, color: "var(--mute)" }}>{n} article{n !== 1 ? "s" : ""}</span>
          </div>
          <button className="cd-close" onClick={close} aria-label="Fermer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        {items.length === 0 ? (
          <div className="cd-empty">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" style={{ color: "var(--mute)", marginBottom: 16 }}>
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            <p style={{ fontFamily: "var(--serif)", fontSize: 18, marginBottom: 6 }}>Votre panier est vide</p>
            <p style={{ fontSize: 13, color: "var(--mute)" }}>Explorez nos créations ci-dessous.</p>
            <button className="btn" style={{ marginTop: 24 }} onClick={close}>
              Voir les œuvres <span className="arrow">→</span>
            </button>
          </div>
        ) : (
          <>
            <div className="cd-items">
              {items.map(item => (
                <div key={item.id} className="cd-item">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="cd-thumb" />
                  ) : (
                    <div className="cd-thumb cd-thumb-placeholder" />
                  )}
                  <div className="cd-item-body">
                    <p className="cd-item-name">{item.name}</p>
                    <p className="cd-item-meta">{item.medium} · {item.dimensions}</p>
                    <div className="cd-item-foot">
                      <div className="qty-ctrl">
                        <button onClick={() => updateQty(item.id, item.quantity - 1)} aria-label="Retirer un">−</button>
                        <span>{item.quantity}</span>
                        <button onClick={() => updateQty(item.id, item.quantity + 1)} disabled={item.quantity >= item.stock} aria-label="Ajouter un">+</button>
                      </div>
                      <span className="cd-item-price">
                        {((item.price * item.quantity) / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>
                  <button className="cd-remove" onClick={() => remove(item.id)} aria-label="Supprimer">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M18 6 6 18M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            <div className="cd-foot">
              <div className="cd-total">
                <span>Total</span>
                <span style={{ fontFamily: "var(--serif)", fontSize: 22 }}>
                  {(total() / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
                </span>
              </div>
              <p style={{ fontSize: 12, color: "var(--mute)", marginBottom: 16, textAlign: "center" }}>
                Livraison calculée à l&apos;étape suivante
              </p>
              <Link href="/panier" className="btn primary full" onClick={close}>
                Commander <span className="arrow">→</span>
              </Link>
              <button className="btn full" style={{ marginTop: 10 }} onClick={close}>
                Continuer mes achats
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  )
}
