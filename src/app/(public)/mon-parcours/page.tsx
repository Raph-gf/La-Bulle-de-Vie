"use client"
import { useState } from "react"
import Link from "next/link"
import Reveal from "@/components/animations/Reveal"
import AnimatedCounter from "@/components/animations/AnimatedCounter"

const timeline = [
  { year: "2014", title: "La révélation", body: "Première séance de massage reçue lors d'un voyage au Maroc. Une évidence : le toucher peut tout changer.", side: "left" },
  { year: "2017", title: "La formation", body: "Formation certifiante en massages bien-être à l'IFMT de Lyon. 300 heures de pratique intensive, anatomie, éthique professionnelle.", side: "right" },
  { year: "2019", title: "La naissance de La bulle", body: "Ouverture du cabinet à Lyon 6. Les premiers clients, les premières créations — et la certitude d'être à sa place.", side: "left" },
  { year: "2021", title: "Les créations", body: "Lancement de la gamme de bougies et compositions florales séchées. Une extension naturelle de la philosophie de la bulle.", side: "right" },
  { year: "2023", title: "Les soins énergétiques", body: "Certification en lithothérapie et bains sonores. Enrichissement de l'offre avec une dimension vibratoire et énergétique.", side: "left" },
  { year: "2026", title: "Aujourd'hui", body: "Plus de 240 séances par an, une clientèle fidèle, et l'envie toujours renouvelée d'offrir un espace de vrai lâcher-prise.", side: "right" },
]

const serviceTabs = [
  {
    key: "massage", label: "Massages",
    items: [
      { name: "Massage Bulle — signature", price: "90€", duration: "60 min" },
      { name: "Massage Californien", price: "105€", duration: "75 min" },
      { name: "Massage Suédois", price: "75€", duration: "50 min" },
    ],
  },
  {
    key: "energetique", label: "Énergétique",
    items: [
      { name: "Soin Lithothérapie", price: "110€", duration: "75 min" },
      { name: "Bain Sonore", price: "65€", duration: "45 min" },
    ],
  },
  {
    key: "creation", label: "Création",
    items: [
      { name: "Atelier Bougies sur mesure", price: "45€", duration: "2h" },
      { name: "Coffret Déco personnalisé", price: "dès 75€", duration: "—" },
    ],
  },
]

export default function MonParcoursPage() {
  const [activeTab, setActiveTab] = useState("massage")

  const currentPanel = serviceTabs.find(t => t.key === activeTab)!

  return (
    <>
      {/* BIO INTRO */}
      <section style={{ padding: "120px 0 80px" }}>
        <div className="wrap">
          <div className="bio-intro">
            <Reveal className="left">
              <span className="eyebrow">Mon parcours</span>
              <h1 style={{ marginTop: 18 }}>Laurence Valère, <span className="italic">praticienne.</span></h1>
              <p style={{ marginTop: 24, fontSize: 16, lineHeight: 1.75 }}>
                Depuis 2019, je crée un espace suspendu entre le corps et l&apos;esprit — un lieu où chaque personne peut venir poser ses tensions, respirer, et repartir différemment. La bulle de vie n&apos;est pas simplement un cabinet : c&apos;est une philosophie du soin.
              </p>
              <p style={{ marginTop: 16, fontSize: 15, color: "var(--mute)", lineHeight: 1.75 }}>
                Mon approche est intuitive et profondément personnalisée. Je ne pratique pas de protocoles figés — j&apos;écoute, j&apos;observe, j&apos;adapte. Chaque séance est une conversation entre mes mains et votre corps.
              </p>
              <div style={{ marginTop: 40, display: "flex", gap: 12, flexWrap: "wrap" }}>
                <Link className="btn primary" href="/booking">Réserver une séance <span className="arrow">→</span></Link>
                <a className="btn" href="tel:0625486056">Appeler</a>
              </div>
            </Reveal>
            <Reveal delay={0.15} style={{ position: "relative" }}>
              <div style={{ background: "#2C1F14", aspectRatio: "3/4", borderRadius: 20, width: "100%" }} />
              <div className="badge" style={{ bottom: -20, right: -20 }}>
                <span>Certifiée<br />· depuis 2019 ·</span>
              </div>
            </Reveal>
          </div>

          {/* Stats */}
          <Reveal style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 32, marginTop: 80, paddingTop: 48, borderTop: "1px solid var(--line)" }}>
            {[
              { value: 240, decimals: 0, suffix: "+", label: "Séances par an" },
              { value: 7, decimals: 0, suffix: "", label: "Soins proposés" },
              { value: 4.9, decimals: 1, suffix: "★", label: "Note Google" },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "var(--serif)", fontSize: "clamp(40px,4vw,64px)", lineHeight: 1, color: "var(--ink)" }}>
                  <AnimatedCounter value={s.value} decimals={s.decimals} suffix={s.suffix} />
                </div>
                <div style={{ fontSize: 12, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--mute)", marginTop: 10 }}>{s.label}</div>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* BANNER QUOTE */}
      <Reveal className="bio-banner">
        <em>« Chaque corps a sa propre vérité.</em> Mon rôle est de l&apos;écouter. »
      </Reveal>

      {/* TIMELINE */}
      <section style={{ padding: "120px 0", background: "var(--cream)" }}>
        <div className="wrap">
          <Reveal className="tl-head">
            <span className="eyebrow">Mon histoire</span>
            <h2 style={{ marginTop: 18 }}>De la révélation <span className="italic">à la vocation.</span></h2>
          </Reveal>
          <div style={{ position: "relative", maxWidth: 800, margin: "64px auto 0" }}>
            <div className="timeline">
              {timeline.map((item, i) => (
                <Reveal key={item.year} delay={(i % 2) * 0.1} className={`tl-item tl-${item.side}`}>
                  <div className="tl-year">{item.year}</div>
                  <div className="tl-dot" />
                  <div className="tl-content">
                    <h3>{item.title}</h3>
                    <p>{item.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES TABS */}
      <section style={{ padding: "120px 0" }}>
        <div className="wrap">
          <Reveal className="section-head">
            <div>
              <span className="eyebrow">Les soins</span>
              <h2 style={{ marginTop: 18 }}>Tout ce que <span className="italic">je propose.</span></h2>
            </div>
            <p className="lede">Massages, soins énergétiques, ateliers créatifs — une palette complète pour chaque besoin.</p>
          </Reveal>

          <Reveal>
            <div className="svc-tabs">
              {serviceTabs.map(t => (
                <button
                  key={t.key}
                  className={`svc-tab ${activeTab === t.key ? "active" : ""}`}
                  onClick={() => setActiveTab(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <ul className="svc-list">
              {currentPanel.items.map(item => (
                <li key={item.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 500, color: "var(--ink)" }}>{item.name}</div>
                    <div style={{ fontSize: 13, color: "var(--mute)", marginTop: 2 }}>{item.duration}</div>
                  </div>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 22, color: "var(--terra)" }}>{item.price}</div>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal style={{ textAlign: "center", marginTop: 48 }}>
            <Link className="btn primary" href="/prestations">Voir le détail des soins <span className="arrow">→</span></Link>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <div className="quote-bulle" style={{ width: 150, height: 150, top: -30, left: "8%" }} />
        <div className="quote-bulle" style={{ width: 90, height: 90, bottom: -10, right: "10%" }} />
        <Reveal className="wrap">
          <span className="eyebrow">Prenons rendez-vous</span>
          <h2 style={{ marginTop: 18 }}>Prêt·e à entrer <span className="italic">dans la bulle ?</span></h2>
          <p>Première séance — 20% offert sur votre soin Bulle signature. Réservez en ligne en quelques clics.</p>
          <div className="cta-row">
            <Link className="btn primary" href="/booking">Réserver maintenant <span className="arrow">→</span></Link>
            <a className="btn" href="tel:0625486056">06 25 48 60 56</a>
          </div>
        </Reveal>
      </section>
    </>
  )
}
