"use client"
import { useState } from "react"
import Link from "next/link"
import Reveal from "@/components/animations/Reveal"

const services = [
  {
    num: "01", cat: "massage", label: "Signature",
    name: "Massage Bulle", duration: "60 min", detail: "Corps entier",
    price: "90€", bg: "#2C1F14",
    desc: "Notre soin signature — une fusion de techniques suédoises et californiennes pour relâcher les tensions et retrouver un équilibre profond.",
  },
  {
    num: "02", cat: "massage", label: "Détente",
    name: "Massage Californien", duration: "75 min", detail: "Enveloppant",
    price: "105€", bg: "#3D2B1A",
    desc: "Des effleurages lents et enveloppants qui invitent à un lâcher-prise total. Idéal pour les premières séances ou les moments de grande fatigue émotionnelle.",
  },
  {
    num: "03", cat: "massage", label: "Tonique",
    name: "Massage Suédois", duration: "50 min", detail: "Dos & épaules",
    price: "75€", bg: "#4A3530",
    desc: "Un massage tonique ciblé sur les zones de tension chroniques : nuque, épaules, lombaires. Parfait pour les personnes actives.",
  },
  {
    num: "04", cat: "energetique", label: "Énergétique",
    name: "Soin Lithothérapie", duration: "75 min", detail: "Pierres chaudes",
    price: "110€", bg: "#5C4033",
    desc: "Des pierres volcaniques chauffées placées sur les méridiens énergétiques pour libérer les blocages et rééquilibrer le flux vital.",
  },
  {
    num: "05", cat: "energetique", label: "Sonore",
    name: "Bain Sonore", duration: "45 min", detail: "Bols tibétains",
    price: "65€", bg: "#3A2A22",
    desc: "Les vibrations des bols tibétains pénètrent chaque cellule et induisent un état méditatif profond. Une expérience unique de régénération.",
  },
  {
    num: "06", cat: "creation", label: "Atelier",
    name: "Bougies sur mesure", duration: "2h", detail: "Groupe · 6 pers. max",
    price: "45€", bg: "#2E1E18",
    desc: "Créez vos propres bougies parfumées en cire naturelle. Choisissez vos senteurs, vos colorants, et repartez avec vos créations.",
  },
]

const cats = [
  { key: "all", label: "Tous" },
  { key: "massage", label: "Massages" },
  { key: "energetique", label: "Énergétique" },
  { key: "creation", label: "Création" },
]

const steps = [
  { num: "01", title: "Accueil & échange", body: "Un moment d'écoute pour comprendre vos besoins, vos tensions et l'intention que vous souhaitez poser sur la séance." },
  { num: "02", title: "Le soin", body: "Installez-vous, fermez les yeux. Chaque geste est adapté à votre corps et à votre état du moment, dans un espace chaleureux et apaisant." },
  { num: "03", title: "Retour & conseils", body: "Après la séance, un temps de transition pour revenir doucement. Je vous partage quelques conseils pour prolonger les bienfaits." },
]

export default function PrestationsPage() {
  const [cat, setCat] = useState("all")

  const visible = cat === "all" ? services : services.filter(s => s.cat === cat)

  return (
    <>
      {/* PAGE HEADER */}
      <section className="page-hero">
        <div className="wrap">
          <Reveal><span className="eyebrow">Nos prestations</span></Reveal>
          <Reveal delay={0.1}><h1>Des soins pensés <span className="italic">comme une parenthèse.</span></h1></Reveal>
          <Reveal delay={0.2}><p className="lede">Sept rituels uniques pour le corps, l&apos;énergie et la créativité — à choisir selon votre intention du moment.</p></Reveal>
        </div>
      </section>

      {/* CATALOG */}
      <section style={{ padding: "80px 0 120px" }}>
        <div className="wrap">
          <Reveal>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
          </Reveal>

          <div className="catalog-grid">
            {visible.map((s, i) => (
              <Reveal key={s.num} delay={(i % 3) * 0.1}>
                <div className="catalog-card">
                  <div style={{ background: s.bg, aspectRatio: "16/9" }} />
                  <div className="card-body">
                    <div className="card-foot">
                      <div className="card-meta">
                        <span className="pill muted">{s.label}</span>
                        <span className="pill muted">{s.duration}</span>
                      </div>
                      <div className="card-price">{s.price}</div>
                    </div>
                    <h3>{s.name}</h3>
                    <p className="card-desc">{s.desc}</p>
                    <Link className="btn" href="/booking" style={{ width: "100%", justifyContent: "center" }}>
                      Réserver <span className="arrow">→</span>
                    </Link>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* DEROULEMENT */}
      <section className="deroulement">
        <div className="wrap">
          <Reveal className="section-head">
            <div>
              <span className="eyebrow">Le déroulé</span>
              <h2 style={{ marginTop: 18 }}>Comment se passe <span className="italic">votre séance ?</span></h2>
            </div>
            <p className="lede">De votre arrivée à votre départ, chaque instant est pensé pour vous mettre à l&apos;aise et maximiser les bienfaits.</p>
          </Reveal>
          <div className="steps">
            {steps.map((s, i) => (
              <Reveal key={s.num} delay={i * 0.1} className="step">
                <div className="step-num">{s.num}</div>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <div className="quote-bulle" style={{ width: 140, height: 140, top: -20, left: "8%" }} />
        <div className="quote-bulle" style={{ width: 90, height: 90, bottom: -10, right: "12%" }} />
        <Reveal className="wrap">
          <span className="eyebrow">Première séance</span>
          <h2 style={{ marginTop: 18 }}>Prêt·e à entrer <span className="italic">dans la bulle ?</span></h2>
          <p>Réservez votre premier soin en ligne — 20% offert sur votre soin Bulle signature.</p>
          <div className="cta-row">
            <Link className="btn primary" href="/booking">Réserver maintenant <span className="arrow">→</span></Link>
            <a className="btn" href="tel:0625486056">06 25 48 60 56</a>
          </div>
        </Reveal>
      </section>
    </>
  )
}
