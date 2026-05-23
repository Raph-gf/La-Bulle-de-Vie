"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import Reveal from "@/components/animations/Reveal"
import { useCartStore } from "@/lib/stores/useCartStore"
import { toast } from "sonner"

type Product = {
  id: string
  name: string
  description: string
  price: number
  stock: number
  medium: string
  dimensions: string
  imageUrl: string | null
}

const BG_PALETTE = ["#2C1F14", "#3D2B1A", "#4A3530", "#5C4033", "#3A2A22", "#2E1E18"]

export default function DecorationsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [added, setAdded] = useState<Record<string, boolean>>({})
  const { add, items } = useCartStore()

  useEffect(() => {
    fetch("/api/products")
      .then(r => r.json())
      .then(d => setProducts(d.products ?? []))
      .finally(() => setLoading(false))
  }, [])

  function handleAdd(p: Product) {
    const inCart = items.find(i => i.id === p.id)
    if (inCart && inCart.quantity >= p.stock) {
      toast.error("Stock insuffisant.")
      return
    }
    add({ id: p.id, name: p.name, price: p.price, imageUrl: p.imageUrl, medium: p.medium, dimensions: p.dimensions, stock: p.stock })
    setAdded(prev => ({ ...prev, [p.id]: true }))
    setTimeout(() => setAdded(prev => ({ ...prev, [p.id]: false })), 1800)
    toast.success(`${p.name} ajouté au panier.`)
  }

  return (
    <>
      {/* PAGE HEADER */}
      <section className="page-hero">
        <div className="wrap">
          <Reveal><span className="eyebrow">Créations décoratives</span></Reveal>
          <Reveal delay={0.1}><h1>L&apos;âme de la bulle <span className="italic">dans votre maison.</span></h1></Reveal>
          <Reveal delay={0.2}><p className="lede">Œuvres originales peintes à la main — acrylique, aquarelle, encre. Des pièces uniques pensées pour habiller votre intérieur d&apos;une énergie douce.</p></Reveal>
        </div>
      </section>

      {/* CATALOG */}
      <section style={{ padding: "80px 0 120px" }}>
        <div className="wrap">
          {loading && (
            <div style={{ textAlign: "center", padding: "60px 0", color: "var(--mute)", fontStyle: "italic" }}>
              Chargement des œuvres…
            </div>
          )}

          {!loading && products.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <p style={{ fontFamily: "var(--serif)", fontSize: 22, marginBottom: 12 }}>Aucune œuvre disponible pour le moment.</p>
              <p style={{ color: "var(--mute)", fontSize: 14 }}>Revenez bientôt ou contactez-moi pour une commande sur mesure.</p>
            </div>
          )}

          {!loading && products.length > 0 && (
            <div className="catalog-grid">
              {products.map((p, i) => {
                const bg = BG_PALETTE[i % BG_PALETTE.length]
                const inCart = items.find(it => it.id === p.id)
                const isAdded = added[p.id]
                return (
                  <Reveal key={p.id} delay={(i % 3) * 0.1}>
                    <div className="catalog-card">
                      {/* Artwork image or colour placeholder */}
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block" }} />
                      ) : (
                        <div style={{ background: bg, aspectRatio: "4/3", display: "flex", alignItems: "flex-end", padding: "16px 20px" }}>
                          <span style={{ fontSize: 11, letterSpacing: ".15em", textTransform: "uppercase", color: "rgba(255,255,255,.4)" }}>{p.medium}</span>
                        </div>
                      )}
                      <div className="card-body">
                        <div className="card-foot">
                          <div className="card-meta">
                            <span className="pill muted">{p.dimensions}</span>
                          </div>
                          <div className="card-price">{(p.price / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}</div>
                        </div>
                        <h3>{p.name}</h3>
                        <p style={{ fontSize: 12, letterSpacing: ".04em", color: "var(--mute)", marginBottom: 6 }}>{p.medium}</p>
                        <p className="card-desc">{p.description}</p>
                        <button
                          className={`btn${isAdded ? " primary" : ""}`}
                          style={{ width: "100%", justifyContent: "center", display: "flex", transition: "all .2s" }}
                          onClick={() => handleAdd(p)}
                          disabled={p.stock === 0}
                        >
                          {p.stock === 0 ? "Épuisé" : isAdded ? "Ajouté ✓" : (inCart ? "Ajouter encore" : "Ajouter au panier")}
                          {!isAdded && p.stock > 0 && <span className="arrow">→</span>}
                        </button>
                      </div>
                    </div>
                  </Reveal>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* CUSTOM ORDER */}
      <section style={{ padding: "80px 0", background: "var(--cream)" }}>
        <div className="wrap">
          <div className="passion-grid">
            <Reveal className="passion-copy">
              <span className="eyebrow">Création sur mesure</span>
              <h2 style={{ marginTop: 18 }}>Une pièce <span className="italic">imaginée pour vous.</span></h2>
              <p>Vous avez une idée précise — une occasion spéciale, un intérieur particulier, une personne à qui offrir quelque chose d&apos;unique ? Je crée des pièces entièrement personnalisées sur commande.</p>
              <p style={{ marginTop: 12 }}>Couleurs, format, technique : tout est possible. Contactez-moi pour en discuter.</p>
              <div className="quote-mini">« Chaque pièce est une petite histoire — la vôtre. »</div>
              <div style={{ marginTop: 32, display: "flex", gap: 12, flexWrap: "wrap" }}>
                <a className="btn primary" href="mailto:contact@labulledevie.fr">Demander un devis <span className="arrow">→</span></a>
                <a className="btn" href="tel:0625486056">06 25 48 60 56</a>
              </div>
            </Reveal>
            <Reveal delay={0.15} className="passion-media">
              <div className="frame" style={{ background: "#3D2B1A", aspectRatio: "3/4", borderRadius: 20 }} />
              <div className="name-tag">
                <div className="n">Pièce unique</div>
                <div className="r">Créée avec soin · Livraison possible</div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <div className="quote-bulle" style={{ width: 130, height: 130, top: -20, right: "10%" }} />
        <Reveal className="wrap">
          <span className="eyebrow">Offrir la bulle</span>
          <h2 style={{ marginTop: 18 }}>Un cadeau <span className="italic">qui touche vraiment.</span></h2>
          <p>Offrez un bon cadeau — soin massage ou œuvre d&apos;art — à vos proches.</p>
          <div className="cta-row">
            <Link className="btn primary" href="/booking">Réserver un soin <span className="arrow">→</span></Link>
            <Link className="btn" href="/panier">Voir mon panier</Link>
          </div>
        </Reveal>
      </section>
    </>
  )
}
