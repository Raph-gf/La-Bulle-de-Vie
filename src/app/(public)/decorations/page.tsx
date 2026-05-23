"use client"
import { useState, useEffect, useMemo } from "react"
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

const BG_COLORS = ["#1C1209", "#2C1F14", "#3D2B1A", "#4A3530", "#221812", "#3A2A22"]

function mediumKey(medium: string): string {
  return medium.split(" ")[0].toLowerCase()
}

export default function DecorationsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState("all")
  const [added, setAdded] = useState<Record<string, boolean>>({})
  const { add, items } = useCartStore()

  useEffect(() => {
    fetch("/api/products")
      .then(r => r.json())
      .then(d => setProducts(d.products ?? []))
      .finally(() => setLoading(false))
  }, [])

  const mediums = useMemo(() => {
    const keys = [...new Set(products.map(p => mediumKey(p.medium)))]
    return keys
  }, [products])

  const filtered = active === "all" ? products : products.filter(p => mediumKey(p.medium) === active)

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
      {/* PAGE HERO */}
      <header className="page-hero">
        <div className="hero-media" style={{ background: "linear-gradient(160deg,#1a110b 0%,#3D2B1A 60%,#5C4033 100%)" }} />
        <div className="wrap">
          <span className="eyebrow eyebrow-light">Créations · Pièces uniques</span>
          <h1 style={{ marginTop: 24 }}>Découvrez <span className="italic">mes tableaux.</span></h1>
          <p className="lede">Une collection de pièces peintes à la main, à laisser respirer dans votre intérieur. Chaque tableau est une bulle posée sur un mur.</p>
        </div>
      </header>

      {/* BREADCRUMB + FILTERS */}
      <div className="wrap" style={{ paddingTop: 40 }}>
        <div className="crumb-row">
          <div>
            <Link href="/">Accueil</Link>
            <span className="sep">›</span>
            <span>Décorations</span>
          </div>
          <div className="count">
            Résultats : <strong>{filtered.length}</strong> tableau{filtered.length !== 1 ? "x" : ""}
          </div>
        </div>

        {!loading && mediums.length > 0 && (
          <div className="filters" style={{ marginTop: 16 }}>
            <button
              className={`chip${active === "all" ? " active" : ""}`}
              onClick={() => setActive("all")}
            >
              Tous <span className="ct">{products.length}</span>
            </button>
            {mediums.map(m => (
              <button
                key={m}
                className={`chip${active === m ? " active" : ""}`}
                onClick={() => setActive(m)}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
                <span className="ct">{products.filter(p => mediumKey(p.medium) === m).length}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* CATALOG */}
      <section className="catalog">
        <div className="wrap">
          {loading && (
            <div style={{ textAlign: "center", padding: "80px 0", color: "var(--mute)", fontStyle: "italic" }}>
              Chargement des œuvres…
            </div>
          )}

          {!loading && products.length === 0 && (
            <div style={{ textAlign: "center", padding: "80px 0" }}>
              <p style={{ fontFamily: "var(--serif)", fontSize: 22, marginBottom: 12 }}>Aucune œuvre disponible pour le moment.</p>
              <p style={{ color: "var(--mute)", fontSize: 14 }}>Revenez bientôt ou contactez-moi pour une commande sur mesure.</p>
            </div>
          )}

          {!loading && products.length > 0 && (
            <div className="cat-grid">
              {filtered.map((p, i) => {
                const bg = BG_COLORS[i % BG_COLORS.length]
                const isAdded = added[p.id]
                return (
                  <article key={p.id} className="cat-card">
                    {/* Background image or colour */}
                    {p.imageUrl ? (
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 1s cubic-bezier(.2,.7,.2,1)" }}
                      />
                    ) : (
                      <div style={{ width: "100%", height: "100%", background: bg }} />
                    )}

                    {/* Tag + num overlays */}
                    <span className="tag">{p.medium.split(" ")[0]}</span>
                    <span className="num">0{i + 1}</span>

                    {/* Card body */}
                    <div className="cat-body">
                      <h3>{p.name}</h3>
                      <p className="desc">{p.description}</p>
                      <div className="cat-meta-row">
                        <span className="price">
                          {(p.price / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
                        </span>
                        <span className="meta-pill">
                          <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                            <path d="M7 17L17 7M7 7h10v10"/>
                          </svg>
                          {p.dimensions}
                        </span>
                      </div>
                      <button
                        className={`cat-cta${isAdded ? " added" : ""}`}
                        onClick={() => handleAdd(p)}
                        disabled={p.stock === 0}
                      >
                        <span className="lbl">
                          {p.stock === 0 ? "Épuisé" : isAdded ? "Ajouté ✓" : "Ajouter au panier"}
                        </span>
                        {!isAdded && p.stock > 0 && <span className="arrow">→</span>}
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* MARQUEE */}
      <div className="marquee" aria-hidden="true">
        <div className="marquee-track">
          <span>Pièces uniques</span>
          <span>Peint à la main</span>
          <span>Livraison soignée</span>
          <span>Commande sur mesure</span>
          <span>Atelier à Lyon</span>
          <span>Pièces uniques</span>
          <span>Peint à la main</span>
          <span>Livraison soignée</span>
          <span>Commande sur mesure</span>
          <span>Atelier à Lyon</span>
        </div>
      </div>

      {/* L'ATELIER / CUSTOM ORDER */}
      <section className="ressource">
        <div className="wrap">
          <div className="ressource-grid">
            <Reveal className="ressource-copy">
              <span className="eyebrow">L&apos;atelier</span>
              <h2 style={{ marginTop: 18 }}>
                Une pièce <span className="italic">imaginée pour vous.</span>
              </h2>
              <p>
                Vous ne trouvez pas exactement votre toile ? Je peins aussi sur commande : couleurs, dimensions, geste. Dites‑moi l&apos;esprit du mur, je vous propose une esquisse sous quelques jours.
              </p>
              <div style={{ display: "flex", gap: 12, marginTop: 36 }}>
                <a className="btn primary" href="mailto:contact@labulledevie.fr">
                  Lancer un projet <span className="arrow">→</span>
                </a>
                <Link className="btn" href="/mon-parcours">
                  Mon parcours <span className="arrow">→</span>
                </Link>
              </div>
            </Reveal>

            <Reveal delay={0.15} className="ressource-media">
              <div className="a" style={{ background: "linear-gradient(135deg,#2C1F14,#5C4033)" }} />
              <div className="b" style={{ background: "linear-gradient(135deg,#3D2B1A,#B86F4A44)" }} />
              <div className="badge">
                <span>Pièce<br />unique<br />· signée ·</span>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* INFO STRIP */}
      <section className="cta">
        <div className="quote-bulle" style={{ width: 160, height: 160, top: -30, left: "10%" }} />
        <div className="quote-bulle" style={{ width: 100, height: 100, bottom: -20, right: "14%" }} />
        <Reveal className="wrap" style={{ textAlign: "left", maxWidth: 1100 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 32 }}>
            {[
              {
                n: "01", title: "Emballage sur mesure",
                body: "Chaque tableau part dans un emballage de protection rigide, recyclable.",
              },
              {
                n: "02", title: "Livraison France & UE",
                body: "5 à 10 jours ouvrés, suivi inclus. Remise en mains propres possible à Lyon.",
              },
              {
                n: "03", title: "Échange sous 14 jours",
                body: "Si la lumière de la pièce ne lui rend pas justice, on échange — sans frais.",
              },
            ].map(item => (
              <div key={item.n}>
                <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", color: "var(--terra)", fontSize: 24 }}>{item.n}</div>
                <h3 style={{ marginTop: 10 }}>{item.title}</h3>
                <p style={{ marginTop: 8, fontSize: 14, maxWidth: 280 }}>{item.body}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>
    </>
  )
}
