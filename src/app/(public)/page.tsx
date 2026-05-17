"use client"
import Link from "next/link"
import { useState } from "react"

const faqItems = [
  { q: "Faut‑il réserver à l'avance ?", a: "Idéalement oui — un délai de 3 à 5 jours permet d'organiser votre séance dans les meilleures conditions. Pour les soins de dernière minute, n'hésitez pas à m'appeler directement." },
  { q: "Dois‑je apporter quelque chose pour ma séance ?", a: "Tout est prévu sur place : linges, huiles, ambiance sonore. Apportez simplement une tenue confortable — et l'envie de lâcher prise." },
  { q: "Quelles créations proposez‑vous ?", a: "Bougies parfumées, compositions florales séchées, brumes d'ambiance, et pièces décoratives sur mesure pour votre intérieur." },
  { q: "Quels moyens de paiement acceptez‑vous ?", a: "Carte, espèces, virement et chèques-cadeaux La bulle de vie. Le paiement se règle en ligne lors de la réservation." },
  { q: "Proposez‑vous des séances à domicile ?", a: "Oui, sur Lyon et alentours (15 km). Un supplément déplacement de 15 à 25€ est appliqué selon la distance." },
]

export default function HomePage() {
  const [openFaq, setOpenFaq] = useState(0)
  const [newsletterDone, setNewsletterDone] = useState(false)

  return (
    <>
      {/* HERO */}
      <header className="hero">
        <div className="hero-media" style={{ background: "#1a110b" }} />
        <div className="wrap">
          <div className="hero-grid">
            <div>
              <span className="eyebrow" style={{ color: "#fff", opacity: 0.7, marginBottom: "32px", display: "inline-flex" }}>
                Massages &amp; créations bien‑être · Depuis 2019
              </span>
              <h1 style={{ marginTop: "24px" }}>
                <span className="word"><span>Offrez‑vous</span></span>{" "}
                <span className="word"><span>un</span></span>{" "}
                <span className="word"><span>instant</span></span>
                <br />
                <span className="word"><span>de</span></span>{" "}
                <span className="word"><span>douce</span></span>{" "}
                <span className="word"><span>sérénité.</span></span>
              </h1>
              <p className="hero-tag">Massages personnalisés, soins énergétiques et créations décoratives — un cocon pour harmoniser le corps, l&apos;esprit et la maison.</p>
              <div className="hero-cta">
                <Link className="btn primary" href="/prestations">Découvrir les soins <span className="arrow">→</span></Link>
                <Link className="btn light" href="/booking">Réserver une séance</Link>
              </div>
            </div>
            <div className="hero-meta">
              <div className="hero-meta-row"><div className="num">01</div><div><div className="label">Lieu</div><div className="val">Lyon &amp; Domicile</div></div></div>
              <div className="hero-meta-row"><div className="num">02</div><div><div className="label">Disponibilité</div><div className="val">Lundi → Samedi</div></div></div>
              <div className="hero-meta-row"><div className="num">03</div><div><div className="label">Première séance</div><div className="val">— 20% offert</div></div></div>
            </div>
          </div>
        </div>
        <div className="scroll-hint">défilez</div>
      </header>

      {/* MARQUEE */}
      <div className="marquee" aria-hidden="true">
        <div className="marquee-track">
          {["Massage suédois", "Soin énergétique", "Bain sonore", "Créations artisanales", "Massage californien", "Réflexologie", "Bougies parfumées",
            "Massage suédois", "Soin énergétique", "Bain sonore", "Créations artisanales", "Massage californien", "Réflexologie", "Bougies parfumées"
          ].map((t, i) => <span key={i}>{t}</span>)}
        </div>
      </div>

      {/* QUOTE */}
      <section className="quote">
        <div className="quote-bulle" style={{ width: 120, height: 120, top: "18%", left: "8%" }} />
        <div className="quote-bulle" style={{ width: 80, height: 80, bottom: "14%", right: "14%" }} />
        <div className="quote-bulle" style={{ width: 200, height: 200, top: "40%", right: "6%", opacity: 0.45 }} />
        <div className="wrap reveal">
          <span className="qmark">&ldquo;</span>
          <blockquote>La relaxation est le chemin<br />qui mène à la <em>paix intérieure.</em></blockquote>
          <cite>Lao Tzu</cite>
        </div>
      </section>

      {/* RESSOURCE */}
      <section className="ressource" id="parcours">
        <div className="wrap">
          <div className="ressource-grid">
            <div className="ressource-media reveal">
              <div className="a" style={{ background: "#2C1F14", borderRadius: 16 }} />
              <div className="b" style={{ background: "#3D2B1A", borderRadius: 16 }} />
              <div className="badge"><span>Pratique<br />certifiée<br />· depuis 2019 ·</span></div>
            </div>
            <div className="ressource-copy reveal reveal-d2">
              <span className="eyebrow">Le lieu</span>
              <h2 style={{ marginTop: 18 }}>Un cocon <span className="italic">pour se ressourcer.</span></h2>
              <p>Dans un monde où tout va vite, prenez le temps de vous reconnecter à l&apos;essentiel. Ici, chaque geste, chaque matière, chaque création est pensé pour apaiser, rééquilibrer et inspirer — un instant suspendu, pour vous.</p>
              <div className="ressource-stats">
                <div className="stat"><div className="n"><span data-count="240">0</span><span className="plus">+</span></div><div className="l">Séances par an</div></div>
                <div className="stat"><div className="n"><span data-count="7">0</span></div><div className="l">Soins signature</div></div>
                <div className="stat"><div className="n"><span data-count="4.9">0</span><span className="plus">★</span></div><div className="l">Note moyenne</div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRESTATIONS */}
      <section className="prestations" id="prestations">
        <div className="wrap">
          <div className="section-head reveal">
            <div>
              <span className="eyebrow">Nos prestations</span>
              <h2 style={{ marginTop: 18 }}>Des soins pensés <span className="italic">comme une parenthèse.</span></h2>
            </div>
            <p className="lede">Sept rituels uniques, à choisir selon votre humeur, votre rythme et l&apos;intention que vous souhaitez poser sur la séance.</p>
          </div>
          <div className="services">
            {[
              { num: "01", label: "Signature", name: "Massage Bulle", duration: "60 min · corps entier", price: "90€", bg: "#2C1F14" },
              { num: "02", label: "Énergétique", name: "Soin lithothérapie", duration: "75 min · pierres chaudes", price: "110€", bg: "#3D2B1A" },
              { num: "03", label: "Création", name: "Bougies sur mesure", duration: "Atelier · 2h", price: "45€", bg: "#4A3530" },
            ].map((s, i) => (
              <div key={s.num} className={`service reveal ${i > 0 ? `reveal-d${i}` : ""}`}>
                <div style={{ background: s.bg, aspectRatio: "4/3", borderRadius: "12px 12px 0 0" }} />
                <span className="pill">{s.label}</span>
                <div className="service-meta">
                  <div><div className="num">{s.num}</div><h3>{s.name}</h3><div className="duration">{s.duration}</div></div>
                  <div className="price">{s.price}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "center", marginTop: 48 }} className="reveal">
            <Link className="btn" href="/prestations">Voir l&apos;ensemble des soins <span className="arrow">→</span></Link>
          </div>
        </div>
      </section>

      {/* PASSION */}
      <section className="passion">
        <div className="quote-bulle" style={{ width: 140, height: 140, top: "10%", right: "12%" }} />
        <div className="quote-bulle" style={{ width: 90, height: 90, bottom: "14%", left: "8%" }} />
        <div className="wrap">
          <div className="passion-grid">
            <div className="passion-copy reveal">
              <span className="eyebrow">Mon parcours</span>
              <h2 style={{ marginTop: 18 }}>Une passion <span className="italic">au service de votre bien‑être.</span></h2>
              <p>Praticienne en massages et créatrice passionnée, j&apos;ai construit La bulle de vie comme un lieu d&apos;écoute. Mon approche est intuitive, douce, profondément humaine — chaque séance est sur‑mesure.</p>
              <div className="quote-mini">« Offrir un moment hors du temps, où le corps et l&apos;esprit se retrouvent en harmonie. »</div>
              <div className="signature">— Laurence Valère</div>
              <div style={{ marginTop: 32 }}><Link className="btn" href="/mon-parcours">Découvrir mon parcours <span className="arrow">→</span></Link></div>
            </div>
            <div className="passion-media reveal reveal-d2">
              <div className="frame" style={{ background: "#2C1F14", aspectRatio: "3/4", borderRadius: 20 }} />
              <div className="name-tag">
                <div className="n">Laurence Valère</div>
                <div className="r">Praticienne · Fondatrice</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="faq" id="faq">
        <div className="wrap">
          <div className="faq-grid">
            <div className="faq-side reveal">
              <span className="eyebrow">Questions fréquentes</span>
              <h2>Tout ce qu&apos;il faut <span className="italic">savoir.</span></h2>
              <p>Une question reste sans réponse ? N&apos;hésitez pas à m&apos;écrire — je reviens vers vous sous 24h.</p>
              <div className="faq-contact">
                <div className="faq-contact-row"><div className="ico">✆</div><div><div style={{ fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--mute)", marginBottom: 2 }}>Téléphone</div><div>06 25 48 60 56</div></div></div>
                <div className="faq-contact-row"><div className="ico">@</div><div><div style={{ fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--mute)", marginBottom: 2 }}>E‑mail</div><div>contact@labulledevie.fr</div></div></div>
              </div>
            </div>
            <div className="faq-list reveal reveal-d1">
              {faqItems.map((item, i) => (
                <div key={i} className={`faq-item ${openFaq === i ? "open" : ""}`}>
                  <div className="faq-q" onClick={() => setOpenFaq(openFaq === i ? -1 : i)} style={{ cursor: "pointer" }}>
                    {item.q}<span className="plus" />
                  </div>
                  {openFaq === i && (
                    <div className="faq-a"><div><p>{item.a}</p></div></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="testimonials">
        <div className="wrap">
          <span className="eyebrow reveal">Témoignages</span>
          <h2 className="reveal reveal-d1">Ils ont retrouvé <span className="italic" style={{ color: "var(--terra-soft)" }}>le sourire.</span></h2>
          <p className="lede reveal reveal-d2">Plus de 600 personnes ont franchi la porte de la bulle. Voici leurs mots.</p>
          <div className="t-track">
            {[
              { init: "S", name: "Sophie M.", service: "Massage Bulle", text: "Un moment magique. Je me suis sentie légère et apaisée pendant des jours — Laurence a un don.", delay: "reveal-d1" },
              { init: "L", name: "Laura P.", service: "Bougies sur mesure", text: "Les créations sont sublimes, elles apportent vraiment une énergie douce dans la maison.", delay: "reveal-d2" },
              { init: "C", name: "Camille R.", service: "Soin lithothérapie", text: "J'y retourne chaque mois. C'est devenu mon rituel — un vrai sas de décompression.", delay: "reveal-d3" },
            ].map(t => (
              <div key={t.name} className={`t-card reveal ${t.delay}`}>
                <div className="t-stars">★★★★★</div>
                <p>{t.text}</p>
                <div className="who"><div className="av">{t.init}</div><div><div className="n">{t.name}</div><div className="sub">{t.service}</div></div></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta" id="contact">
        <div className="quote-bulle" style={{ width: 160, height: 160, top: -30, left: "10%" }} />
        <div className="quote-bulle" style={{ width: 100, height: 100, bottom: -20, right: "14%" }} />
        <div className="wrap reveal">
          <span className="eyebrow">Réserver</span>
          <h2 style={{ marginTop: 18 }}>Prêt·e à entrer <span className="italic">dans la bulle ?</span></h2>
          <p>Première séance ? Je vous offre 20% sur votre soin signature. Réservez en ligne ou par téléphone.</p>
          <div className="cta-row">
            <Link className="btn primary" href="/booking">Réserver maintenant <span className="arrow">→</span></Link>
            <a className="btn" href="tel:0625486056">06 25 48 60 56</a>
          </div>
        </div>
      </section>
    </>
  )
}
