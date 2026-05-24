"use client"
import { useState } from "react"
import Link from "next/link"
import Reveal from "@/components/animations/Reveal"

export interface PublicService {
  id: string
  slug: string
  name: string
  tagline: string | null
  forWho: string | null
  shortDescription: string | null
  durationMinutes: number
  price: number
  category: string
  bgColor: string | null
  displayOrder: number
}

const CAT_LABELS: Record<string, string> = {
  massage: "Massages",
  energetique: "Énergétique",
  creation: "Création",
}

const cats = [
  { key: "all", label: "Tous" },
  { key: "massage", label: "Massages" },
  { key: "energetique", label: "Énergétique" },
  { key: "creation", label: "Création" },
]

const BG_FALLBACKS = ["#1C1209", "#2C1F14", "#3D2B1A", "#4A3530", "#221812", "#3A2A22"]

const STEPS = [
  { n: "01", t: "Accueil & écoute", b: "Un thé tiède, quelques minutes pour parler du jour, de ce qui pèse, de ce qu'on aimerait alléger." },
  { n: "02", t: "Le soin", b: "Gestes ajustés, pression à votre goût, silence ou musique. Tout est négociable, rien n'est imposé." },
  { n: "03", t: "Le retour", b: "On émerge en douceur, on prend un dernier verre d'eau, et l'on repart avec un petit rituel à garder." },
]

export default function PrestationsClient({ services }: { services: PublicService[] }) {
  const [cat, setCat] = useState("all")

  const visible = cat === "all" ? services : services.filter(s => s.category === cat)

  function catCount(key: string) {
    return key === "all" ? services.length : services.filter(s => s.category === key).length
  }

  return (
    <>
      {/* PAGE HERO */}
      <header className="page-hero">
        <div className="hero-media" style={{ background: "linear-gradient(160deg, #1a110b 0%, #2C1F14 60%, #4A3530 100%)" }} />
        <div className="wrap">
          <span className="eyebrow eyebrow-light">Prestations · Soins du corps</span>
          <h1 style={{ marginTop: 24 }}>Découvrez <span className="italic">les soins.</span></h1>
          <p className="lede">
            Six rituels pensés pour accueillir, apaiser et rééquilibrer. Chaque soin est sur‑mesure, ajusté à votre humeur et à votre intention du jour.
          </p>
        </div>
      </header>

      {/* BREADCRUMB + FILTERS */}
      <div className="wrap" style={{ paddingTop: 40 }}>
        <div className="crumb-row">
          <div>
            <Link href="/">Accueil</Link>
            <span className="sep">›</span>
            <span>Massages &amp; soins</span>
          </div>
          <div className="count">
            Résultats trouvés : <strong>{visible.length}</strong> soin{visible.length !== 1 ? "s" : ""}
          </div>
        </div>
        <div className="filters" style={{ marginTop: 0 }}>
          {cats.map(c => (
            <button
              key={c.key}
              className={`chip${cat === c.key ? " active" : ""}`}
              onClick={() => setCat(c.key)}
            >
              {c.label} <span className="ct">{catCount(c.key)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* CATALOG */}
      <section className="catalog">
        <div className="wrap">
          <div className="cat-grid">
            {visible.map((s, i) => {
              const bg = s.bgColor ?? BG_FALLBACKS[i % BG_FALLBACKS.length]
              const tag = s.tagline ?? CAT_LABELS[s.category] ?? s.category
              return (
                <article
                  key={s.id}
                  className="cat-card"
                  style={{ cursor: "pointer" }}
                  onClick={() => { window.location.href = `/soins/${s.slug}` }}
                >
                  <div style={{ width: "100%", height: "100%", background: bg }} />
                  <span className="tag">{tag}</span>
                  <span className="num">0{i + 1}</span>
                  <div className="cat-body">
                    <h3>
                      <Link
                        href={`/soins/${s.slug}`}
                        style={{ color: "inherit", textDecoration: "none" }}
                        onClick={e => e.stopPropagation()}
                      >
                        {s.name}
                      </Link>
                    </h3>
                    <p className="desc">{s.shortDescription ?? ""}</p>
                    <div className="cat-meta-row">
                      <span className="price">{(s.price / 100).toFixed(0)} €</span>
                      <span className="meta-pill">⏱ {s.durationMinutes} min</span>
                    </div>
                    <Link
                      className="cat-cta"
                      href={`/booking/${s.slug}`}
                      onClick={e => e.stopPropagation()}
                    >
                      <span className="lbl">Réserver</span>
                      <span className="arrow">→</span>
                    </Link>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <div className="marquee" aria-hidden="true">
        <div className="marquee-track">
          <span>Huiles bio &amp; locales</span>
          <span>Linge frais à chaque séance</span>
          <span>Ambiance sonore choisie</span>
          <span>Soins à domicile</span>
          <span>Cartes cadeaux disponibles</span>
          <span>Huiles bio &amp; locales</span>
          <span>Linge frais à chaque séance</span>
          <span>Ambiance sonore choisie</span>
          <span>Soins à domicile</span>
          <span>Cartes cadeaux disponibles</span>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <section className="ressource">
        <div className="wrap">
          <Reveal className="section-head">
            <div>
              <span className="eyebrow">Le déroulé</span>
              <h2 style={{ marginTop: 18 }}>
                Trois temps, <span className="italic">un seul rythme : le vôtre.</span>
              </h2>
            </div>
            <p className="lede">Chaque séance suit un fil simple. À vous de me dire, en chemin, ce qui vous fait du bien.</p>
          </Reveal>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32, marginTop: 48 }}>
            {STEPS.map((step, i) => (
              <Reveal key={step.n} delay={i * 0.1} style={{ borderTop: "1px solid var(--line)", paddingTop: 24 }}>
                <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 28, color: "var(--terra)" }}>
                  {step.n}
                </div>
                <h3 style={{ marginTop: 14 }}>{step.t}</h3>
                <p style={{ marginTop: 10, fontSize: 15 }}>{step.b}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <div className="quote-bulle" style={{ width: 160, height: 160, top: -30, left: "10%" }} />
        <div className="quote-bulle" style={{ width: 100, height: 100, bottom: -20, right: "14%" }} />
        <Reveal className="wrap">
          <span className="eyebrow">Réserver</span>
          <h2 style={{ marginTop: 18 }}>
            Une envie de soin <span className="italic">en particulier ?</span>
          </h2>
          <p>Dites‑moi en quelques mots ce dont vous avez besoin. Je vous propose le rituel le plus juste.</p>
          <div className="cta-row">
            <Link className="btn primary" href="/booking">Réserver une séance <span className="arrow">→</span></Link>
            <a className="btn" href="tel:0625486056">06 25 48 60 56</a>
          </div>
        </Reveal>
      </section>
    </>
  )
}
