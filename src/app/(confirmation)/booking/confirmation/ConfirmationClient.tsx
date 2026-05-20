"use client"
import { useEffect, useState, useCallback, useRef } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { motion } from "motion/react"

type BookingData = {
  ref: string
  paymentIntentId?: string
  serviceName: string
  serviceDur: number
  date: string
  time: string
  place: "cabinet" | "domicile"
  address: string
  firstName: string
  lastName: string
  email: string
  phone: string
  amountInCents: number
  travelFee: number | null
  isFirstTime: boolean
  cardBrand?: string
  cardLast4?: string
}

type PageStatus = "loading" | "confirmed" | "refunded"

const MONTHS = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"]
const SPECIALIST_PHONE = "06 25 48 60 56"
const CABINET_ADDRESS = "12 rue des Capucins, 69007 Lyon"
const CABINET_MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CABINET_ADDRESS)}`

function fmtDateLong(iso: string) {
  const d = new Date(iso + "T12:00:00")
  const dow = ["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"][d.getDay()]
  return `${dow} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

function fmtTime(t: string) {
  return t.replace(":", "h")
}

function endTime(time: string, dur: number): string {
  const [h, m] = time.split(":").map(Number)
  const total = h * 60 + m + dur
  return `${Math.floor(total / 60)}h${String(total % 60).padStart(2, "0")}`
}

function makeICS(data: BookingData): string {
  const d = new Date(data.date + "T" + data.time + ":00")
  const end = new Date(d.getTime() + data.serviceDur * 60 * 1000)
  const fmt = (dt: Date) => dt.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//La Bulle De Vie//FR",
    "BEGIN:VEVENT",
    `UID:${data.ref}@labulldevie.fr`,
    `DTSTART:${fmt(d)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${data.serviceName} — La Bulle De Vie`,
    `DESCRIPTION:Référence : ${data.ref}\\nE-mail de confirmation envoyé à ${data.email}`,
    `LOCATION:${data.place === "cabinet" ? CABINET_ADDRESS : data.address}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n")
}

function googleCalUrl(data: BookingData): string {
  const d = new Date(data.date + "T" + data.time + ":00")
  const end = new Date(d.getTime() + data.serviceDur * 60 * 1000)
  const fmt = (dt: Date) => dt.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: `${data.serviceName} — La Bulle De Vie`,
    dates: `${fmt(d)}/${fmt(end)}`,
    details: `Référence : ${data.ref}`,
    location: data.place === "cabinet" ? CABINET_ADDRESS : data.address,
  })
  return `https://calendar.google.com/calendar/render?${p.toString()}`
}

// Ambient bubbles (stable across renders)
const AMBIENT = Array.from({ length: 12 }, (_, i) => ({
  size: 28 + (i * 17) % 60,
  left: (i * 8.3 + 5) % 100,
  dur: 18 + (i * 3.7) % 14,
  delay: -(i * 2.1) % 16,
  dx: ((i % 4) - 1.5) * 28,
}))

// Confetti (stable across renders)
const CONFETTI = Array.from({ length: 22 }, (_, i) => ({
  angle: (360 / 22) * i + (i % 3) * 8 - 4,
  dist: 100 + (i % 5) * 30,
  size: 6 + (i % 4) * 4,
  delay: (i % 6) * 0.06,
  color: i % 3 === 0 ? "#D89175" : i % 3 === 1 ? "#F5C5A3" : "#E8DDD5",
}))

// ── Loading screen ───────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #F9F2EB 0%, #F1E6D8 50%, #EBD9C6 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 24,
    }}>
      <div style={{
        width: 56,
        height: 56,
        borderRadius: "50%",
        border: "3px solid #E8DDD5",
        borderTopColor: "#D89175",
        animation: "spin 0.9s linear infinite",
      }} />
      <p style={{ fontFamily: "var(--serif)", fontSize: 20, fontStyle: "italic", color: "var(--ink)", opacity: 0.7 }}>
        Confirmation de votre réservation…
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

// ── Refund error screen ──────────────────────────────────────────────
function RefundedScreen({ data }: { data: BookingData | null }) {
  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #F9F2EB 0%, #F1E6D8 50%, #EBD9C6 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 24px",
    }}>
      <div style={{
        width: 76, height: 76, borderRadius: "50%",
        background: "#FDF0EB", border: "2px solid #F4C8AE",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 32, fontSize: 32,
      }}>
        ⏱
      </div>
      <div style={{ maxWidth: 520, textAlign: "center" }}>
        <span style={{ display: "inline-block", fontSize: 11, letterSpacing: ".22em", textTransform: "uppercase", color: "var(--mute)", marginBottom: 16 }}>
          Créneau non disponible
        </span>
        <h1 style={{ fontFamily: "var(--serif)", fontSize: "clamp(32px, 5vw, 52px)", lineHeight: 1.05, fontWeight: 400, marginBottom: 20 }}>
          Ce créneau vient<br />
          <span style={{ fontStyle: "italic", color: "var(--terra)" }}>d'être pris.</span>
        </h1>
        <p style={{ color: "var(--mute)", fontSize: 16, lineHeight: 1.65, marginBottom: 12 }}>
          Une autre réservation a été confirmée sur ce créneau au même moment que la vôtre.
          Votre paiement a été intégralement remboursé — aucun montant ne sera débité.
        </p>
        {data && (
          <p style={{ color: "var(--mute)", fontSize: 14, marginBottom: 36 }}>
            Le remboursement de{" "}
            <strong style={{ color: "var(--ink)" }}>
              {(data.amountInCents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
            </strong>{" "}
            apparaîtra sur votre relevé bancaire sous 3 à 5 jours ouvrés.
          </p>
        )}
        <div style={{ background: "#fff8f5", border: "1px solid #F4C8AE", borderRadius: 14, padding: "20px 24px", marginBottom: 36, textAlign: "left", display: "flex", gap: 14, alignItems: "flex-start" }}>
          <span style={{ color: "var(--terra)", fontSize: 20, lineHeight: 1, flexShrink: 0 }}>ℹ</span>
          <p style={{ fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.6, margin: 0 }}>
            Retournez sur la page de réservation pour choisir un autre créneau disponible.
            Vos informations personnelles seront pré-remplies.
          </p>
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/booking" className="btn primary">
            Choisir un autre créneau <span className="arrow">→</span>
          </Link>
          <Link href="/" className="btn" style={{ opacity: 0.75 }}>
            Retour à l'accueil
          </Link>
        </div>
      </div>
      <p style={{ marginTop: 48, fontSize: 12, color: "var(--mute)" }}>
        Une question ?{" "}
        <a href="mailto:contact@labulldevie.fr" style={{ color: "var(--terra)", textDecoration: "none" }}>
          contact@labulldevie.fr
        </a>
      </p>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────
export default function ConfirmationClient() {
  const params = useSearchParams()
  const [data, setData] = useState<BookingData | null>(null)
  const [ref, setRef] = useState("")
  const [copied, setCopied] = useState(false)
  const [status, setStatus] = useState<PageStatus>("loading")
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const attemptsRef = useRef(0)
  const MAX_ATTEMPTS = 8

  useEffect(() => {
    const urlRef = params.get("ref") ?? ""
    let piId = ""

    try {
      const raw = sessionStorage.getItem("booking_confirmation")
      if (raw) {
        const parsed = JSON.parse(raw) as BookingData
        setData(parsed)
        setRef(parsed.ref || urlRef)
        piId = parsed.paymentIntentId ?? ""
        sessionStorage.removeItem("booking_confirmation")
      } else {
        setRef(urlRef)
      }
    } catch {
      setRef(urlRef)
    }

    if (!piId) {
      setStatus("confirmed")
      return
    }

    async function checkStatus() {
      attemptsRef.current += 1
      try {
        const res = await fetch(`/api/booking/status?pi=${piId}`)
        const json = await res.json() as { status: string }
        if (json.status === "confirmed") {
          clearInterval(pollRef.current!)
          setStatus("confirmed")
        } else if (json.status === "refunded") {
          clearInterval(pollRef.current!)
          setStatus("refunded")
        } else if (attemptsRef.current >= MAX_ATTEMPTS) {
          clearInterval(pollRef.current!)
          setStatus("confirmed")
        }
      } catch {
        if (attemptsRef.current >= MAX_ATTEMPTS) {
          clearInterval(pollRef.current!)
          setStatus("confirmed")
        }
      }
    }

    checkStatus()
    pollRef.current = setInterval(checkStatus, 1500)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [params])

  const copyRef = useCallback(() => {
    if (!ref) return
    navigator.clipboard.writeText(ref).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }, [ref])

  function downloadICS() {
    if (!data) return
    const ics = makeICS(data)
    const blob = new Blob([ics], { type: "text/calendar" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `bulle-${data.ref}.ics`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Render states ──────────────────────────────────────────────────
  if (status === "loading") return <LoadingScreen />
  if (status === "refunded") return <RefundedScreen data={data} />

  const totalEur = data ? Math.round(data.amountInCents / 100) : 0
  const travelFeeEur = data?.travelFee ? Math.round(data.travelFee / 100) : 0
  const basePrice = data
    ? data.isFirstTime
      ? Math.round(data.amountInCents / 100 / 0.8)
      : Math.round(data.amountInCents / 100) - travelFeeEur
    : 0
  const discount = data?.isFirstTime ? Math.round(basePrice * 0.2) : 0

  const lieuDisplay = data
    ? data.place === "cabinet"
      ? `Cabinet · ${CABINET_ADDRESS}`
      : `À domicile${data.address ? ` — ${data.address}` : ""}`
    : "Cabinet · Lyon 7ᵉ"

  const lieuMapsUrl = data
    ? data.place === "cabinet"
      ? CABINET_MAPS_URL
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.address)}`
    : CABINET_MAPS_URL

  const paidPillLabel = data?.cardBrand && data?.cardLast4
    ? `Payé · ${data.cardBrand} •• ${data.cardLast4}`
    : "Paiement confirmé"

  return (
    <div className="ok-bg">
      {/* Ambient bubble field */}
      <div className="bub-field" aria-hidden>
        {AMBIENT.map((b, i) => (
          <div
            key={i}
            className="bub"
            style={{
              width: b.size,
              height: b.size,
              left: `${b.left}%`,
              animationDuration: `${b.dur}s, 5s`,
              animationDelay: `${b.delay}s, ${b.delay * 0.5}s`,
              ["--dx" as string]: `${b.dx}px`,
            }}
          />
        ))}
      </div>

      {/* Confetti burst */}
      {CONFETTI.map((c, i) => {
        const rad = (c.angle * Math.PI) / 180
        return (
          <motion.div
            key={i}
            style={{
              position: "fixed", top: "40%", left: "50%",
              width: c.size, height: c.size,
              borderRadius: "50%", background: c.color,
              pointerEvents: "none", zIndex: 50,
              marginLeft: -c.size / 2, marginTop: -c.size / 2,
            }}
            initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
            animate={{ x: Math.cos(rad) * c.dist, y: Math.sin(rad) * c.dist, scale: 0, opacity: 0 }}
            transition={{ duration: 1.4, delay: c.delay, ease: [0.2, 0.7, 0.4, 1] }}
          />
        )
      })}

      {/* Minimal header */}
      <header className="ok-top">
        <Link href="/" className="ok-brand">
          <span className="dot" />
          La bulle de vie
        </Link>
      </header>

      <div className="ok-page">
        {/* Main celebration card */}
        <div className="ok-card">
          {/* Ray burst */}
          <div className="burst" aria-hidden>
            {Array.from({ length: 14 }, (_, i) => (
              <div key={i} className="ray" style={{ ["--r" as string]: `${(360 / 14) * i}deg` }} />
            ))}
          </div>

          {/* Check circle + eyebrow (side-by-side) */}
          <div className="ok-head" style={{ marginBottom: 40 }}>
            <div className="check-wrap">
              <div className="check-rings"><span /><span /><span /></div>
              <div className="check-circle">
                <svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" /></svg>
              </div>
            </div>
            <span className="ok-eyebrow">Confirmation</span>
          </div>

          {/* Title */}
          <h1 className="ok-title">
            <span className="word"><span>Votre</span></span>{" "}
            <span className="word"><span>bulle</span></span>{" "}
            <span className="word"><span>est&nbsp;posée.</span></span>
          </h1>

          {/* Subtitle with inline email */}
          <p className="ok-sub">
            Un e‑mail de confirmation vient de partir à{" "}
            {data?.email
              ? <strong style={{ color: "var(--ink)", fontWeight: 500 }}>{data.email}</strong>
              : "votre adresse"
            }.{" "}
            À très vite, et merci pour votre confiance.
          </p>

          {/* Reference pill */}
          <div className="ref-pill">
            <span className="l">Référence</span>
            <span className="v">{ref || "—"}</span>
            <button
              className={`copy-btn${copied ? " copied" : ""}`}
              onClick={copyRef}
              title={copied ? "Copié !" : "Copier la référence"}
            >
              {copied ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="11" height="11" rx="2"/>
                  <path d="M5 15V5a2 2 0 0 1 2-2h10"/>
                </svg>
              )}
            </button>
            <span className={`copy-flash${copied ? " show" : ""}`}>Copié ✓</span>
          </div>

          {/* Primary CTAs */}
          <div className="ok-cta">
            <Link href="/compte" className="btn primary">
              Voir mon espace <span className="arrow">→</span>
            </Link>
            <button className="btn" onClick={() => window.print()}>
              Imprimer la confirmation
            </button>
          </div>

          {/* Calendar add buttons */}
          {data && (
            <div className="cal-row">
              <a href={googleCalUrl(data)} target="_blank" rel="noopener noreferrer" className="cal-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                  <rect x="3" y="5" width="18" height="16" rx="2"/>
                  <path d="M3 10h18M8 3v4M16 3v4"/>
                </svg>
                Ajouter à Google Calendar
              </a>
              <button className="cal-btn" onClick={downloadICS}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                  <rect x="3" y="5" width="18" height="16" rx="2"/>
                  <path d="M3 10h18M8 3v4M16 3v4"/>
                </svg>
                Ajouter à Apple Calendar
              </button>
              <button className="cal-btn" onClick={downloadICS}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 4v12M7 11l5 5 5-5M5 20h14"/>
                </svg>
                Télécharger .ics
              </button>
            </div>
          )}
        </div>

        {/* ── Booking summary ── */}
        {data && (
          <div className="conf-summary">
            <div className="conf-summary-head">
              <div>
                <h3>Détails de votre séance</h3>
                <div className="conf-summary-meta">Réservation confirmée · paiement reçu</div>
              </div>
              <div className="paid-pill">Confirmé</div>
            </div>

            <div className="conf-booking">
              <div className="booking-main">
                <h2>{data.serviceName}</h2>
                <p className="booking-with">avec La Bulle De Vie</p>
                <p style={{ color: "var(--mute)", fontSize: 14, marginBottom: 28, fontStyle: "italic" }}>
                  {data.serviceDur} min
                </p>
                <div className="info-list">
                  {/* Date */}
                  <div className="info-row">
                    <div className="ic-wrap">
                      <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".18em", color: "var(--mute)" }}>Date</div>
                      <div style={{ fontFamily: "var(--serif)", fontSize: 18, marginTop: 2 }}>
                        {fmtDateLong(data.date)}
                      </div>
                    </div>
                  </div>

                  {/* Heure · Durée (combined) */}
                  <div className="info-row">
                    <div className="ic-wrap">
                      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".18em", color: "var(--mute)" }}>Heure · Durée</div>
                      <div style={{ fontFamily: "var(--serif)", fontSize: 18, marginTop: 2 }}>
                        {fmtTime(data.time)} — {endTime(data.time, data.serviceDur)}{" "}
                        <span style={{ color: "var(--mute)", fontSize: 13 }}>({data.serviceDur} min)</span>
                      </div>
                    </div>
                  </div>

                  {/* Lieu with map link */}
                  <div className="info-row">
                    <div className="ic-wrap">
                      <svg viewBox="0 0 24 24"><path d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".18em", color: "var(--mute)" }}>Lieu</div>
                      <div style={{ fontFamily: "var(--serif)", fontSize: 18, marginTop: 2 }}>
                        {lieuDisplay}
                        {data.place === "cabinet" && (
                          <>
                            {" — "}
                            <a
                              href={lieuMapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: "var(--terra)", textDecoration: "none", fontStyle: "italic" }}
                            >
                              Voir le plan
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Phone contact */}
                  <div className="info-row">
                    <div className="ic-wrap">
                      <svg viewBox="0 0 24 24"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".18em", color: "var(--mute)" }}>Une question ?</div>
                      <div style={{ fontFamily: "var(--serif)", fontSize: 18, marginTop: 2 }}>
                        <a
                          href={`tel:${SPECIALIST_PHONE.replace(/\s/g, "")}`}
                          style={{ color: "var(--terra)", textDecoration: "none", fontStyle: "italic" }}
                        >
                          {SPECIALIST_PHONE}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="booking-side">
                <h4>Récapitulatif</h4>
                <div className="receipt">
                  <div className="receipt-row">
                    <span className="rl">{data.serviceName} · {data.serviceDur} min</span>
                    <span className="rv">{basePrice} €</span>
                  </div>
                  {travelFeeEur > 0 && (
                    <div className="receipt-row">
                      <span className="rl">Déplacement</span>
                      <span className="rv">+{travelFeeEur} €</span>
                    </div>
                  )}
                  {discount > 0 && (
                    <div className="receipt-row disc">
                      <span className="rl">Remise 1ère visite (−20 %)</span>
                      <span className="rv">−{discount} €</span>
                    </div>
                  )}
                </div>
                <div className="receipt-total">
                  <span className="rl">Total payé</span>
                  <span className="rv">{totalEur}<small style={{ fontSize: "0.55em", marginLeft: 2 }}>€</small></span>
                </div>
                <div className="paid-pill" style={{ marginTop: 14 }}>
                  {paidPillLabel}
                </div>
                <a
                  href="#"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    marginTop: 18, fontSize: 13, color: "var(--terra)", textDecoration: "none",
                  }}
                  onClick={(e) => e.preventDefault()}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 4v12M7 11l5 5 5-5M5 20h14"/>
                  </svg>
                  Télécharger la facture PDF
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ── Next steps ── */}
        <div className="next-steps">
          <h3>Et maintenant ?</h3>
          <p className="ns-sub">Trois petites choses pour préparer votre séance en douceur.</p>
          <div className="steps-grid">
            <div className="conf-step">
              <div className="num">01.</div>
              <h4>Lisez vos préférences</h4>
              <p>Allergies, pression préférée, ambiance souhaitée — nous les relisons toujours avant la séance. Mettez‑les à jour si besoin.</p>
            </div>
            <div className="conf-step">
              <div className="num">02.</div>
              <h4>Pensez à hydrater</h4>
              <p>Buvez un grand verre d'eau au réveil et venez en tenue confortable. Pour le reste, tout est prévu sur place.</p>
            </div>
            <div className="conf-step">
              <div className="num">03.</div>
              <h4>Arrivez 5 minutes avant</h4>
              <p>Pour vous installer doucement, échanger un mot, et laisser tomber les épaules avant que la bulle commence.</p>
            </div>
          </div>
        </div>

        {/* ── Account CTA ── */}
        <div className="acc-cta">
          <h3>
            Gérez vos rendez‑vous{" "}
            <span style={{ fontStyle: "italic", color: "var(--terra)" }}>en un clic.</span>
          </h3>
          <p>
            Créez un compte pour consulter vos réservations, annuler facilement et retrouver vos factures
            — sans jamais ressaisir vos informations.
          </p>
          <div className="acc-cta-row">
            <Link href="/register" className="btn primary">
              Créer un compte gratuit <span className="arrow">→</span>
            </Link>
            <Link href="/login" className="btn" style={{ opacity: 0.8 }}>
              J'ai déjà un compte
            </Link>
          </div>
        </div>

        <footer className="ok-foot">
          Besoin d'aide ? Écrivez à{" "}
          <a href="mailto:contact@labulldevie.fr">contact@labulldevie.fr</a>
          {" "}ou appelez le{" "}
          <a href={`tel:${SPECIALIST_PHONE.replace(/\s/g, "")}`}>{SPECIALIST_PHONE}</a>.
          <br />
          © 2026 La bulle de vie — Tous droits réservés.
        </footer>
      </div>
    </div>
  )
}
