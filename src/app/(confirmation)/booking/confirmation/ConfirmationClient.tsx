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
}

type PageStatus = "loading" | "confirmed" | "refunded"

const MONTHS = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"]

function fmtDateLong(iso: string) {
  const d = new Date(iso + "T12:00:00")
  const dow = ["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"][d.getDay()]
  return `${dow} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
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
    `LOCATION:${data.place === "cabinet" ? "Cabinet Lyon 7ème, Lyon" : data.address}`,
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
    location: data.place === "cabinet" ? "Cabinet Lyon 7ème, Lyon" : data.address,
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
      {/* Icon */}
      <div style={{
        width: 76,
        height: 76,
        borderRadius: "50%",
        background: "#FDF0EB",
        border: "2px solid #F4C8AE",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 32,
        fontSize: 32,
      }}>
        ⏱
      </div>

      <div style={{ maxWidth: 520, textAlign: "center" }}>
        <span style={{
          display: "inline-block",
          fontSize: 11,
          letterSpacing: ".22em",
          textTransform: "uppercase",
          color: "var(--mute)",
          marginBottom: 16,
        }}>
          Créneau non disponible
        </span>

        <h1 style={{
          fontFamily: "var(--serif)",
          fontSize: "clamp(32px, 5vw, 52px)",
          lineHeight: 1.05,
          fontWeight: 400,
          marginBottom: 20,
        }}>
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

        {/* Info box */}
        <div style={{
          background: "#fff8f5",
          border: "1px solid #F4C8AE",
          borderRadius: 14,
          padding: "20px 24px",
          marginBottom: 36,
          textAlign: "left",
          display: "flex",
          gap: 14,
          alignItems: "flex-start",
        }}>
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

      {/* Footer */}
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
  const MAX_ATTEMPTS = 8 // ~12 seconds (every 1.5s)

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
      // No PI ID to check — assume confirmed (direct URL visit)
      setStatus("confirmed")
      return
    }

    // Poll until webhook confirms or refunds
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
          // Webhook very delayed — assume confirmed (optimistic)
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

    checkStatus() // immediate first check
    pollRef.current = setInterval(checkStatus, 1500)

    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [params])

  const copyRef = useCallback(() => {
    if (!ref) return
    navigator.clipboard.writeText(ref).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
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
              position: "fixed",
              top: "40%",
              left: "50%",
              width: c.size,
              height: c.size,
              borderRadius: "50%",
              background: c.color,
              pointerEvents: "none",
              zIndex: 50,
              marginLeft: -c.size / 2,
              marginTop: -c.size / 2,
            }}
            initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
            animate={{
              x: Math.cos(rad) * c.dist,
              y: Math.sin(rad) * c.dist,
              scale: 0,
              opacity: 0,
            }}
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
              <div
                key={i}
                className="ray"
                style={{ ["--r" as string]: `${(360 / 14) * i}deg` }}
              />
            ))}
          </div>

          {/* Check circle */}
          <div className="check-wrap" style={{ marginBottom: 28 }}>
            <div className="check-rings">
              <span /><span /><span />
            </div>
            <div className="check-circle">
              <svg viewBox="0 0 24 24">
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          <div className="ok-head">
            <span className="ok-eyebrow">Réservation confirmée</span>
          </div>

          <h1 className="ok-title">
            <span className="word"><span>Votre bulle</span></span>{" "}
            <span className="word"><span>est</span></span>{" "}
            <span className="word"><span>posée.</span></span>
          </h1>

          <p className="ok-sub">
            Un e‑mail de confirmation vous a été envoyé.
            À très vite, et merci pour votre confiance.
          </p>

          {/* Reference pill */}
          <div className="ref-pill">
            <span className="l">Référence</span>
            <span className="v">{ref || "—"}</span>
            <button className="copy-btn" onClick={copyRef} title={copied ? "Copié !" : "Copier la référence"}>
              {copied ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <rect x="9" y="9" width="13" height="13" rx="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
              )}
            </button>
          </div>

          {/* Primary CTAs */}
          <div className="ok-cta">
            <Link href="/" className="btn primary">
              Retour à l'accueil <span className="arrow">→</span>
            </Link>
            <button className="btn" onClick={() => window.print()}>
              Imprimer la confirmation
            </button>
          </div>

          {/* Calendar add buttons */}
          {data && (
            <div className="cal-row">
              <a
                href={googleCalUrl(data)}
                target="_blank"
                rel="noopener noreferrer"
                className="cal-btn"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <rect x="3" y="4" width="18" height="18" rx="2"/>
                  <path d="M16 2v4M8 2v4M3 10h18"/>
                </svg>
                Google Agenda
              </a>
              <button className="cal-btn" onClick={downloadICS}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <rect x="3" y="4" width="18" height="18" rx="2"/>
                  <path d="M16 2v4M8 2v4M3 10h18"/>
                </svg>
                Apple Calendrier
              </button>
              <button className="cal-btn" onClick={downloadICS}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M12 2v9m0 0l-3-3m3 3l3-3M3 17l1.5 4h15L21 17"/>
                </svg>
                Fichier .ics
              </button>
            </div>
          )}
        </div>

        {/* Booking summary */}
        {data && (
          <div className="conf-summary">
            <div className="conf-summary-head">
              <div>
                <h3>Récapitulatif de votre réservation</h3>
                <div className="conf-summary-meta">
                  {data.serviceName} · {data.serviceDur} min
                </div>
              </div>
              <div className="paid-pill">Confirmé</div>
            </div>

            <div className="conf-booking">
              <div className="booking-main">
                <h2>{data.serviceName}</h2>
                <p className="booking-with">Avec La Bulle De Vie</p>
                <p style={{ color: "var(--mute)", fontSize: 14, marginBottom: 28, fontStyle: "italic" }}>
                  {data.serviceDur} min
                </p>
                <div className="info-list">
                  <div className="info-row">
                    <div className="ic-wrap">
                      <svg viewBox="0 0 24 24">
                        <rect x="3" y="4" width="18" height="18" rx="2"/>
                        <path d="M16 2v4M8 2v4M3 10h18"/>
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".18em", color: "var(--mute)" }}>Date</div>
                      <div style={{ fontFamily: "var(--serif)", fontSize: 18, marginTop: 2 }}>
                        {fmtDateLong(data.date)}
                      </div>
                    </div>
                  </div>
                  <div className="info-row">
                    <div className="ic-wrap">
                      <svg viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="9"/>
                        <path d="M12 7v5l3 2"/>
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".18em", color: "var(--mute)" }}>Heure</div>
                      <div style={{ fontFamily: "var(--serif)", fontSize: 18, marginTop: 2 }}>
                        {data.time.replace(":", "h")}
                      </div>
                    </div>
                  </div>
                  <div className="info-row">
                    <div className="ic-wrap">
                      <svg viewBox="0 0 24 24">
                        <path d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7z"/>
                        <circle cx="12" cy="9" r="2.5"/>
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".18em", color: "var(--mute)" }}>Lieu</div>
                      <div style={{ fontFamily: "var(--serif)", fontSize: 18, marginTop: 2 }}>
                        {data.place === "cabinet"
                          ? "Cabinet · Lyon 7ᵉ"
                          : `À domicile${data.address ? ` — ${data.address}` : ""}`}
                      </div>
                    </div>
                  </div>
                  <div className="info-row">
                    <div className="ic-wrap">
                      <svg viewBox="0 0 24 24">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".18em", color: "var(--mute)" }}>Client</div>
                      <div style={{ fontFamily: "var(--serif)", fontSize: 18, marginTop: 2 }}>
                        {data.firstName} {data.lastName}
                      </div>
                    </div>
                  </div>
                  {data.email && (
                    <div className="info-row">
                      <div className="ic-wrap">
                        <svg viewBox="0 0 24 24">
                          <rect x="2" y="4" width="20" height="16" rx="2"/>
                          <path d="m2 7 10 7 10-7"/>
                        </svg>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".18em", color: "var(--mute)" }}>Confirmation envoyée à</div>
                        <div style={{ fontFamily: "var(--serif)", fontSize: 16, marginTop: 2 }}>
                          {data.email}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="booking-side">
                <h4>Détail du paiement</h4>
                <div className="receipt">
                  <div className="receipt-row">
                    <span className="rl">{data.serviceName}</span>
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
                  Paiement confirmé
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Next steps */}
        <div className="next-steps">
          <h3>Et maintenant ?</h3>
          <p className="ns-sub">Quelques détails pour que votre séance soit parfaite.</p>
          <div className="steps-grid">
            <div className="conf-step">
              <div className="num">01.</div>
              <h4>E‑mail de confirmation</h4>
              <p>Un récapitulatif complet avec l'adresse du cabinet et toutes les infos vous attend dans votre boîte mail.</p>
            </div>
            <div className="conf-step">
              <div className="num">02.</div>
              <h4>Préparez-vous</h4>
              <p>Venez confortable, sans parfum. Prévoyez quelques minutes de marge — la séance commence à l'heure.</p>
            </div>
            <div className="conf-step">
              <div className="num">03.</div>
              <h4>Rappel SMS 24h avant</h4>
              <p>Vous recevrez un SMS la veille avec un lien pour confirmer ou annuler sans frais jusqu'à minuit.</p>
            </div>
          </div>
        </div>

        {/* Account CTA */}
        <div className="acc-cta">
          <h3>
            Gérez vos rendez-vous{" "}
            <span style={{ fontStyle: "italic", color: "var(--terra)" }}>en un clic.</span>
          </h3>
          <p>
            Créez un compte gratuit pour consulter vos réservations, annuler facilement et retrouver vos factures
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
          <p>
            <a href="mailto:contact@labulldevie.fr">contact@labulldevie.fr</a>
            {" · "}
            <Link href="/contact">Contact</Link>
            {" · "}
            La Bulle De Vie — Lyon 7ᵉ
          </p>
        </footer>
      </div>
    </div>
  )
}
