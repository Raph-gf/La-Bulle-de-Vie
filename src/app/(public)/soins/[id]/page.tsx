"use client"
import { useParams } from "next/navigation"
import Link from "next/link"
import { useState, useRef, useEffect } from "react"
import { motion } from "motion/react"
import { useInView } from "motion/react"
import Reveal from "@/components/animations/Reveal"

// ── Types (DB format) ─────────────────────────────────────────────────
interface DbReview {
  id: string
  stars: number
  body: string
  specialistReply: string | null
  createdAt: string
  client: { fullName: string }
}

interface Benefit { title: string; description: string }

interface RelatedService {
  id: string; slug: string; name: string; tagline: string | null
  durationMinutes: number; price: number; bgColor: string | null; category: string
}

interface ServiceData {
  id: string; slug: string; name: string; tagline: string | null
  forWho: string | null; shortDescription: string | null; longDescription: string | null
  ritualCore: string | null; ritualCoreDuration: string | null
  benefits: Benefit[] | null; relatedSlugs: string[]
  bgColor: string | null; imageUrls: string[]; durationMinutes: number; price: number; category: string
  reviews: DbReview[]
  _count: { reviews: number }
}

interface ApiResponse {
  service: ServiceData
  relatedServices: RelatedService[]
  avgStars: number
  starBars: number[]
}

function starsStr(n: number) { return "★★★★★☆☆☆☆☆".slice(5 - n, 10 - n) }

function timeAgo(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (d === 0) return "aujourd'hui"
  if (d === 1) return "hier"
  if (d < 7) return `il y a ${d} jours`
  if (d < 30) return `il y a ${Math.floor(d / 7)} sem.`
  if (d < 365) return `il y a ${Math.floor(d / 30)} mois`
  return `il y a ${Math.floor(d / 365)} an${Math.floor(d / 365) > 1 ? "s" : ""}`
}

// ── Rating bar ────────────────────────────────────────────────────────
function RatingBar({ star, pct }: { star: number; pct: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true })
  return (
    <div className="rev-bar" ref={ref}>
      <span style={{ color: "var(--mute)", fontSize: 13 }}>{star}★</span>
      <div className="track">
        <div className="fill" style={{ width: inView ? `${pct}%` : "0%" }} />
      </div>
      <span className="n">{pct}%</span>
    </div>
  )
}

// ── Review card ───────────────────────────────────────────────────────
function RevCard({ r }: { r: DbReview }) {
  const initial = r.client.fullName.charAt(0).toUpperCase()
  return (
    <article className="rev-card">
      <div className="head">
        <div className="av">{initial}</div>
        <div>
          <div className="nm">
            {r.client.fullName}
            <span className="verified">✓ Vérifié</span>
          </div>
        </div>
        <div className="when">{timeAgo(r.createdAt)}</div>
      </div>
      <div className="rev-stars">{starsStr(r.stars)}</div>
      <p className="quote">« {r.body} »</p>
      {r.specialistReply && (
        <div className="reply">
          <span className="by">— Réponse du praticien</span>
          {r.specialistReply}
        </div>
      )}
    </article>
  )
}

// ── Page ──────────────────────────────────────────────────────────────
export default function SoinPage() {
  const { id } = useParams<{ id: string }>()

  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [openFaq, setOpenFaq] = useState(0)
  const [revFilter, setRevFilter] = useState("all")

  useEffect(() => {
    setLoading(true)
    setNotFound(false)
    window.scrollTo(0, 0)
    fetch(`/api/services/${id}`)
      .then(r => {
        if (r.status === 404) { setNotFound(true); return null }
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(json => { if (json) setData(json) })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 22, color: "var(--mute)" }}>Chargement…</p>
      </div>
    )
  }

  if (notFound || !data) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <p style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 22, color: "var(--mute)" }}>Soin introuvable.</p>
        <Link href="/prestations" className="btn">← Retour aux prestations</Link>
      </div>
    )
  }

  const { service, relatedServices, avgStars, starBars } = data
  const priceEur = service.price / 100
  const dur = `${service.durationMinutes} min`
  const bookingHref = `/booking/${service.slug}`
  const benefits = service.benefits ?? []

  const revFilters = [
    { key: "all", label: "Tous les avis" },
    { key: "5", label: "★★★★★" },
    { key: "4", label: "★★★★☆" },
    { key: "3", label: "★★★☆☆ et moins" },
  ]

  const filteredReviews = service.reviews.filter(r => {
    if (revFilter === "5") return r.stars === 5
    if (revFilter === "4") return r.stars === 4
    if (revFilter === "3") return r.stars <= 3
    return true
  })

  const faqs = [
    { q: "Que dois‑je apporter ?", a: "Rien de particulier. Linge, huiles, ambiance sonore — tout est prévu. Venez en tenue confortable, c'est largement suffisant." },
    { q: "Le soin est‑il adapté à la grossesse ?", a: "À partir du second trimestre uniquement, et avec une adaptation de la pression et des zones travaillées. N'hésitez pas à me prévenir lors de la prise de rendez‑vous." },
    { q: "Combien de temps avant je peux ressentir les effets ?", a: "Dès la fin de la séance, le corps se détend. L'effet profond s'installe sur 24 à 72h. Beaucoup de clientes décrivent un sommeil plus profond la nuit suivante." },
    { q: "Puis‑je réserver ce soin en cadeau ?", a: "Oui, sous forme de carte cadeau valable un an. Contactez‑moi directement par mail pour la personnaliser." },
  ]

  const titleParts = service.name.split(" ")
  const titleEnd = titleParts.pop()

  return (
    <>
      {/* HERO */}
      <header className="soin-hero">
        <div className="hero-media" />
        <div className="wrap">
          <div className="soin-hero-grid">
            <div>
              <div className="crumb">
                <Link href="/">Accueil</Link>
                <span className="sep">›</span>
                <Link href="/prestations">Prestations</Link>
                <span className="sep">›</span>
                <span>{service.tagline ?? service.name}</span>
              </div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
                <span className="eyebrow eyebrow-light">{service.tagline}</span>
                <h1 style={{ marginTop: 18 }}>
                  {titleParts.join(" ")} <span className="italic">{titleEnd}</span>
                </h1>
                <p className="lede">{service.shortDescription}</p>
                <div className="meta-pills">
                  <span className="pill-lg"><span className="ic">⏱</span> {dur}</span>
                  <span className="pill-lg"><span className="ic">◐</span> Cabinet ou domicile</span>
                  {service.tagline && <span className="pill-lg"><span className="ic">❋</span> {service.tagline}</span>}
                  <span className="pill-lg"><span className="ic">✓</span> Confirmation sous 24h</span>
                </div>
              </motion.div>
            </div>

            {/* Glass card */}
            <motion.aside className="hero-card" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.25 }}>
              <div className="rating">
                <div>
                  <div className="num">{avgStars > 0 ? avgStars.toFixed(1) : "—"}</div>
                  <div className="label">{service._count.reviews} avis vérifiés</div>
                </div>
                {avgStars > 0 && (
                  <div>
                    <div className="stars">{starsStr(Math.round(avgStars))}</div>
                    <div className="label">Note vérifiée</div>
                  </div>
                )}
              </div>
              <div className="price-row">
                <div>
                  <div className="l">À partir de</div>
                  <div className="v">{priceEur}<small>€</small></div>
                </div>
                <div className="dur">{dur}</div>
              </div>
              <div className="actions">
                <Link className="btn primary" href={bookingHref}>Réserver ce soin <span className="arrow">→</span></Link>
                <a className="btn" href="tel:0625486056">06 25 48 60 56</a>
              </div>
            </motion.aside>
          </div>
        </div>
      </header>

      {/* FACTS ROW */}
      <section className="facts-row">
        <div className="wrap">
          <div className="facts-grid">
            {[
              { ic: "◐", l: "Durée", v: dur },
              { ic: "❋", l: "Idéal pour", v: service.forWho ?? "Tous profils" },
              { ic: "✿", l: "Produits", v: "Huiles bio & locales" },
              { ic: "✓", l: "Annulation", v: "Gratuite jusqu'à 24h" },
            ].map(f => (
              <div key={f.l} className="fact">
                <div className="ic-wrap">{f.ic}</div>
                <div><div className="l">{f.l}</div><div className="v">{f.v}</div></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BODY */}
      <section className="soin-body">
        <div className="wrap">
          <div className="body-grid">
            <div>
              {/* Description */}
              <Reveal className="section-block">
                <span className="eyebrow">À propos du soin</span>
                <h2 style={{ marginTop: 14 }}>Une parenthèse <span className="italic">à votre rythme.</span></h2>
                <p className="lede">{service.shortDescription}</p>
                {service.longDescription && <p>{service.longDescription}</p>}
              </Reveal>

              {/* Gallery */}
              <Reveal>
                <div className="soin-gallery">
                  {[0, 1, 2].map(i => (
                    service.imageUrls[i]
                      ? <div key={i} className="g"><img src={service.imageUrls[i]} alt={`${service.name} ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /></div>
                      : <div key={i} className="g" style={{ background: i === 0 ? (service.bgColor ?? "#2C1F14") : i === 1 ? "#3D2B1A" : "#4A3530" }} />
                  ))}
                </div>
              </Reveal>

              {/* Ritual */}
              {(service.ritualCore || service.ritualCoreDuration) && (
                <Reveal className="section-block" style={{ marginTop: 80 }}>
                  <span className="eyebrow">Le déroulé</span>
                  <h2 style={{ marginTop: 14 }}>Trois temps, <span className="italic">comme un fil tendu doucement.</span></h2>
                  <div className="ritual">
                    {[
                      { num: "01", title: "Accueil & écoute", body: "Une tisane tiède, quelques minutes pour parler du jour, de vos tensions, de ce que vous aimeriez alléger.", dur: "~ 5 minutes" },
                      { num: "02", title: "Le soin", body: service.ritualCore ?? "", dur: service.ritualCoreDuration ?? "" },
                      { num: "03", title: "Le retour", body: "On émerge en douceur, un verre d'eau, un petit rituel à garder, et l'on se quitte sans précipitation.", dur: "~ 5 minutes" },
                    ].map((step, i) => (
                      <Reveal key={step.num} delay={i * 0.1} className="ritual-step">
                        <div className="num">{step.num}</div>
                        <h3>{step.title}</h3>
                        <p>{step.body}</p>
                        {step.dur && <div className="dur">{step.dur}</div>}
                      </Reveal>
                    ))}
                  </div>
                </Reveal>
              )}

              {/* Benefits */}
              {benefits.length > 0 && (
                <Reveal className="section-block">
                  <span className="eyebrow">Les bienfaits</span>
                  <h2 style={{ marginTop: 14 }}>Ce que <span className="italic">vous emportez avec vous.</span></h2>
                  <div className="benefits">
                    {benefits.map(b => (
                      <div key={b.title} className="benefit">
                        <span className="ic">✦</span>
                        <div className="body">
                          <strong>{b.title}</strong>
                          {b.description}
                        </div>
                      </div>
                    ))}
                  </div>
                </Reveal>
              )}

              {/* FAQ */}
              <Reveal className="section-block">
                <span className="eyebrow">Bon à savoir</span>
                <h2 style={{ marginTop: 14 }}>Quelques <span className="italic">précisions.</span></h2>
                <div className="faq-list">
                  {faqs.map((item, i) => (
                    <div key={i} className={`faq-item ${openFaq === i ? "open" : ""}`}>
                      <div className="faq-q" style={{ cursor: "pointer" }} onClick={() => setOpenFaq(openFaq === i ? -1 : i)}>
                        {item.q}<span className="plus" />
                      </div>
                      {openFaq === i && (
                        <div className="faq-a"><div><p>{item.a}</p></div></div>
                      )}
                    </div>
                  ))}
                </div>
              </Reveal>
            </div>

            {/* RIGHT — sticky aside */}
            <aside className="body-aside">
              <div className="info-card">
                <h4>En pratique</h4>
                <div className="row"><span className="l">Tarif</span><span className="v">{priceEur}€</span></div>
                <div className="row"><span className="l">Durée</span><span className="v">{dur}</span></div>
                <div className="row"><span className="l">Lieu</span><span className="v">Lyon 7ᵉ ou domicile</span></div>
                <div className="row"><span className="l">Acompte</span><span className="v">30%</span></div>
                <div className="row"><span className="l">Confirmation</span><span className="v">Sous 24h</span></div>
                <div className="note">
                  <strong>Première séance ?</strong> Profitez de 20 % offerts sur le Soin du corps signature en cochant la case à la dernière étape de la réservation.
                </div>
                <Link className="btn primary" href={bookingHref} style={{ marginTop: 18, width: "100%", justifyContent: "center" }}>
                  Réserver maintenant <span className="arrow">→</span>
                </Link>
              </div>

              <div className="info-card" style={{ marginTop: 18, background: "var(--paper)", border: "1px solid var(--line)" }}>
                <h4>Une question ?</h4>
                <p style={{ fontSize: 14, lineHeight: 1.55, color: "var(--ink-soft)" }}>Le plus simple, c&apos;est encore de m&apos;écrire ou m&apos;appeler — je reviens vers vous sous 24h.</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
                  <a href="tel:0625486056" style={{ textDecoration: "none", color: "var(--ink)", fontFamily: "var(--serif)", fontSize: 18 }}>☎ 06 25 48 60 56</a>
                  <a href="mailto:contact@labulledevie.fr" style={{ textDecoration: "none", color: "var(--ink)", fontSize: 14 }}>✉ contact@labulledevie.fr</a>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* REVIEWS */}
      <section className="reviews-section">
        <div className="quote-bulle" style={{ width: 160, height: 160, top: "8%", right: "6%" }} />
        <div className="quote-bulle" style={{ width: 100, height: 100, bottom: "10%", left: "6%" }} />
        <div className="wrap">
          <div className="rev-grid">
            <Reveal>
              <aside className="rev-summary">
                <span className="eyebrow">Avis vérifiés</span>
                <h2 style={{ marginTop: 14 }}>Ce que d&apos;autres <span className="italic">en disent.</span></h2>
                {service._count.reviews > 0 ? (
                  <>
                    <div className="rev-score">
                      <div className="big">{avgStars.toFixed(1)}<small>/5</small></div>
                      <div>
                        <div className="stars">{starsStr(Math.round(avgStars))}</div>
                        <div className="count">Sur {service._count.reviews} avis vérifiés</div>
                      </div>
                    </div>
                    <div className="rev-bars">
                      {starBars.map((pct, i) => <RatingBar key={i} star={5 - i} pct={pct} />)}
                    </div>
                  </>
                ) : (
                  <p style={{ color: "var(--mute)", fontFamily: "var(--serif)", fontStyle: "italic", marginTop: 20 }}>
                    Soyez le premier à laisser un avis après votre séance.
                  </p>
                )}
                <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid var(--line)", fontSize: 13, color: "var(--mute)", lineHeight: 1.55 }}>
                  Les avis sont publiés après une séance réelle confirmée. Aucun avis n&apos;est trié ni modifié.
                </div>
              </aside>
            </Reveal>

            <div>
              {service._count.reviews > 0 && (
                <Reveal>
                  <div className="rev-filters">
                    {revFilters.map(f => (
                      <button key={f.key} className={`rev-filter ${revFilter === f.key ? "active" : ""}`} onClick={() => setRevFilter(f.key)}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                </Reveal>
              )}
              <div className="rev-list">
                {filteredReviews.length > 0
                  ? filteredReviews.map((r, i) => (
                    <Reveal key={r.id} delay={i * 0.05}><RevCard r={r} /></Reveal>
                  ))
                  : service._count.reviews > 0
                    ? (
                      <div className="rev-card" style={{ textAlign: "center", padding: 48 }}>
                        <p style={{ color: "var(--mute)", fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 18 }}>
                          Aucun avis ne correspond à ce filtre.
                        </p>
                      </div>
                    ) : null
                }
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* RELATED */}
      {relatedServices.length > 0 && (
        <section className="related-section">
          <div className="wrap">
            <Reveal className="section-head">
              <div>
                <span className="eyebrow">D&apos;autres rituels</span>
                <h2 style={{ marginTop: 14 }}>À découvrir <span className="italic">aussi.</span></h2>
              </div>
              <p className="lede">Trois soins qui se marient bien avec celui‑ci.</p>
            </Reveal>
            <div className="cat-grid">
              {relatedServices.map((r, i) => (
                <Reveal key={r.id} delay={i * 0.1}>
                  <Link href={`/soins/${r.slug}`} style={{ textDecoration: "none" }}>
                    <article className="cat-card">
                      <div style={{ position: "absolute", inset: 0, background: r.bgColor ?? "#2C1F14" }} />
                      <span className="tag">{r.tagline ?? r.category}</span>
                      <span className="num">0{i + 1}</span>
                      <div className="cat-body">
                        <h3>{r.name}</h3>
                        <p className="desc">{(r.price / 100).toFixed(0)}€ · {r.durationMinutes} min</p>
                        <div className="cat-meta-row">
                          <span className="price">{(r.price / 100).toFixed(0)}€</span>
                          <span className="meta-pill">⏱ {r.durationMinutes} min</span>
                        </div>
                        <span className="cat-cta">
                          <span className="lbl">Découvrir</span>
                          <span className="arrow">→</span>
                        </span>
                      </div>
                    </article>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="cta">
        <div className="quote-bulle" style={{ width: 160, height: 160, top: -30, left: "10%" }} />
        <div className="quote-bulle" style={{ width: 100, height: 100, bottom: -20, right: "14%" }} />
        <Reveal className="wrap">
          <span className="eyebrow">Réserver</span>
          <h2 style={{ marginTop: 18 }}>Prêt·e pour <span className="italic">{service.name.toLowerCase()} ?</span></h2>
          <p>Première séance ? 20 % offerts sur votre soin signature.</p>
          <div className="cta-row">
            <Link className="btn primary" href={bookingHref}>Réserver maintenant <span className="arrow">→</span></Link>
            <a className="btn" href="tel:0625486056">06 25 48 60 56</a>
          </div>
        </Reveal>
      </section>

      {/* MOBILE STICKY BAR */}
      <div className="sticky-cta">
        <div className="pinfo">
          <div className="pname">{service.name}</div>
          <div className="pprice">{priceEur}€ · {dur}</div>
        </div>
        <Link className="btn" href={bookingHref}>Réserver →</Link>
      </div>
    </>
  )
}
