"use client"
import { useState } from "react"
import Link from "next/link"

const products = [
  {
    num: "01", cat: "bougies", label: "Bougie",
    name: "Bougie Séréno", sub: "Cire de soja · Bergamote & Vétiver",
    price: "32€", bg: "#2C1F14",
    desc: "Une fragrance boisée et apaisante, coulée à la main en petite série. Mèche en coton, brûle 45h.",
  },
  {
    num: "02", cat: "bougies", label: "Bougie",
    name: "Bougie Terra", sub: "Cire naturelle · Patchouli & Figue",
    price: "36€", bg: "#3D2B1A",
    desc: "Une fragrance enveloppante aux accents de terre et de forêt. Contenant en grès recyclé réutilisable.",
  },
  {
    num: "03", cat: "floral", label: "Floral",
    name: "Composition Bulle", sub: "Fleurs séchées · Sur commande",
    price: "48€", bg: "#4A3530",
    desc: "Un bouquet de fleurs séchées sélectionnées pour leurs teintes terreuses et leur longévité. Livré dans une boîte kraft.",
  },
  {
    num: "04", cat: "floral", label: "Floral",
    name: "Couronne murale", sub: "Eucalyptus & Lavande",
    price: "62€", bg: "#5C4033",
    desc: "Une couronne décorative à suspendre, composée d'eucalyptus séché, lavande et bois flotté. Pièce unique.",
  },
  {
    num: "05", cat: "brumes", label: "Brume",
    name: "Brume Zénith", sub: "Spray 100ml · Fleur d'oranger",
    price: "24€", bg: "#3A2A22",
    desc: "Un voile parfumé léger à diffuser sur l'oreiller ou dans la pièce pour un endormissement apaisé. 100% naturel.",
  },
  {
    num: "06", cat: "mesure", label: "Sur mesure",
    name: "Coffret personnalisé", sub: "Composition libre · 3 pièces",
    price: "à partir de 75€", bg: "#2E1E18",
    desc: "Choisissez vos 3 créations préférées et je les arrange dans un coffret cadeau sur mesure avec message personnalisé.",
  },
]

const cats = [
  { key: "all", label: "Tout" },
  { key: "bougies", label: "Bougies" },
  { key: "floral", label: "Floral séché" },
  { key: "brumes", label: "Brumes" },
  { key: "mesure", label: "Sur mesure" },
]

export default function DecorationsPage() {
  const [cat, setCat] = useState("all")

  const visible = cat === "all" ? products : products.filter(p => p.cat === cat)

  return (
    <>
      {/* PAGE HEADER */}
      <section className="page-hero">
        <div className="wrap">
          <span className="eyebrow reveal">Créations décoratives</span>
          <h1 className="reveal reveal-d1">L&apos;âme de la bulle <span className="italic">dans votre maison.</span></h1>
          <p className="lede reveal reveal-d2">Bougies artisanales, compositions florales séchées, brumes d&apos;ambiance — des pièces pensées pour habiller votre intérieur d&apos;une énergie douce.</p>
        </div>
      </section>

      {/* CATALOG */}
      <section style={{ padding: "80px 0 120px" }}>
        <div className="wrap">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }} className="reveal">
            {cats.map(c => (
              <button
                key={c.key}
                className={`filter-btn ${cat === c.key ? "active" : ""}`}
                onClick={() => setCat(c.key)}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="catalog-grid">
            {visible.map((p, i) => (
              <div key={p.num} className={`catalog-card reveal ${i % 3 === 1 ? "reveal-d1" : i % 3 === 2 ? "reveal-d2" : ""}`}>
                <div style={{ background: p.bg, aspectRatio: "4/3" }} />
                <div className="card-body">
                  <div className="card-foot">
                    <div className="card-meta">
                      <span className="pill muted">{p.label}</span>
                    </div>
                    <div className="card-price">{p.price}</div>
                  </div>
                  <h3>{p.name}</h3>
                  <p style={{ fontSize: 12, letterSpacing: ".04em", color: "var(--mute)", marginBottom: 6 }}>{p.sub}</p>
                  <p className="card-desc">{p.desc}</p>
                  <a className="btn" href="mailto:contact@labulledevie.fr" style={{ width: "100%", justifyContent: "center", display: "flex" }}>
                    Commander <span className="arrow">→</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CUSTOM ORDER */}
      <section style={{ padding: "80px 0", background: "var(--cream)" }}>
        <div className="wrap">
          <div className="passion-grid">
            <div className="passion-copy reveal">
              <span className="eyebrow">Création sur mesure</span>
              <h2 style={{ marginTop: 18 }}>Une pièce <span className="italic">imaginée pour vous.</span></h2>
              <p>Vous avez une idée précise — une occasion spéciale, un intérieur particulier, une personne à qui offrir quelque chose d&apos;unique ? Je crée des pièces entièrement personnalisées sur commande.</p>
              <p style={{ marginTop: 12 }}>Couleurs, senteurs, dimensions, message intégré : tout est possible. Contactez-moi pour en discuter.</p>
              <div className="quote-mini">« Chaque pièce est une petite histoire — la vôtre. »</div>
              <div style={{ marginTop: 32, display: "flex", gap: 12, flexWrap: "wrap" }}>
                <a className="btn primary" href="mailto:contact@labulledevie.fr">Demander un devis <span className="arrow">→</span></a>
                <a className="btn" href="tel:0625486056">06 25 48 60 56</a>
              </div>
            </div>
            <div className="passion-media reveal reveal-d2">
              <div className="frame" style={{ background: "#3D2B1A", aspectRatio: "3/4", borderRadius: 20 }} />
              <div className="name-tag">
                <div className="n">Pièce unique</div>
                <div className="r">Créée avec soin · Livraison possible</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <div className="quote-bulle" style={{ width: 130, height: 130, top: -20, right: "10%" }} />
        <div className="wrap reveal">
          <span className="eyebrow">Offrir la bulle</span>
          <h2 style={{ marginTop: 18 }}>Un cadeau <span className="italic">qui touche vraiment.</span></h2>
          <p>Offrez un bon cadeau — soin massage ou coffret déco — à vos proches. Disponible en ligne ou à retirer sur place.</p>
          <div className="cta-row">
            <Link className="btn primary" href="/booking">Bon cadeau massage <span className="arrow">→</span></Link>
            <a className="btn" href="mailto:contact@labulledevie.fr">Coffret déco</a>
          </div>
        </div>
      </section>
    </>
  )
}
