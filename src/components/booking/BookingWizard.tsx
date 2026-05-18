"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import { SOINS, SoinId } from "@/lib/soins"

type Svc = { id: SoinId; name: string; price: number; dur: number }
type Info = { first: string; last: string; email: string; phone: string; place: string; note: string }
type ConfettiPart = { size: number; left: number; dur: number; delay: number; cx: number }

const SOIN_ORDER: SoinId[] = ["visage", "sel", "galet", "mains", "corps", "jambes"]
const STEPS = ["Soin", "Date", "Heure", "Vos infos", "Confirmer"]
const MONTHS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"]
const DOW = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"]
const TIME_SLOTS = ["09:00","10:00","11:00","12:00","14:00","15:00","16:00","17:00","18:00","19:00"]

function fmtDate(d: Date | null) {
  if (!d) return "—"
  const dow = ["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"][d.getDay()]
  return `${dow} ${d.getDate()} ${MONTHS[d.getMonth()].toLowerCase()}`
}

interface Props {
  serviceId?: string
}

export default function BookingWizard({ serviceId }: Props) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [svc, setSvc] = useState<Svc | null>(null)
  const [date, setDate] = useState<Date | null>(null)
  const [time, setTime] = useState<string | null>(null)
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth())
  const [info, setInfo] = useState<Info>({ first: "", last: "", email: "", phone: "", place: "cabinet", note: "" })
  const [firstTime, setFirstTime] = useState(false)
  const [success, setSuccess] = useState(false)
  const [refCode, setRefCode] = useState("")
  const [confetti, setConfetti] = useState<ConfettiPart[]>([])

  useEffect(() => {
    const id = serviceId as SoinId | undefined
    if (id && SOINS[id]) {
      const s = SOINS[id]
      setSvc({ id, name: s.name, price: s.price, dur: parseInt(s.dur) })
    }
  }, [serviceId])

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const maxDate = new Date(today); maxDate.setDate(today.getDate() + 60)
  const minMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const curViewStart = new Date(viewYear, viewMonth, 1)
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1)
  const startOffset = (firstDayOfMonth.getDay() + 6) % 7
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

  const slots = date ? TIME_SLOTS.map(t => {
    const seed = (date.getDate() * 13 + parseInt(t)) % 7
    return { time: t, taken: seed === 0 || seed === 3 }
  }) : []

  function goTo(n: number) {
    setStep(n)
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50)
  }

  function calcTotal() {
    if (!svc) return 0
    let t = svc.price
    if (info.place === "domicile") t += 18
    if (firstTime && svc.id === "corps") t = Math.round(t * 0.8)
    return t
  }

  function handleConfirm() {
    setRefCode("BDV‑" + String(Math.floor(100000 + Math.random() * 900000)))
    setConfetti(Array.from({ length: 28 }, () => ({
      size: 6 + Math.random() * 14,
      left: Math.random() * 100,
      dur: 3 + Math.random() * 3,
      delay: Math.random() * 1.5,
      cx: (Math.random() * 200 - 100) | 0,
    })))
    setSuccess(true)
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50)
  }

  const isInfoValid = !!(
    info.first.trim() &&
    info.last.trim() &&
    /\S+@\S+\.\S+/.test(info.email) &&
    info.phone.trim().length >= 6
  )

  if (success) {
    return (
      <div className="resa-page">
        <div className="wrap">
          <div style={{ maxWidth: 780, margin: "0 auto", paddingBottom: 80 }}>
            <div className="success">
              <div className="confetti" aria-hidden>
                {confetti.map((c, i) => (
                  <span
                    key={i}
                    style={{
                      width: c.size,
                      height: c.size,
                      left: `${c.left}%`,
                      animationDuration: `${c.dur}s`,
                      animationDelay: `${c.delay}s`,
                      "--cx": `${c.cx}px`,
                    } as React.CSSProperties}
                  />
                ))}
              </div>
              <div className="check">✓</div>
              <span className="eyebrow" style={{ justifyContent: "center", display: "inline-flex" }}>Confirmation</span>
              <h2 style={{ marginTop: 14 }}>Votre bulle <span className="italic">est posée.</span></h2>
              <p>Je vous envoie un e‑mail de confirmation dans les minutes qui viennent. À très vite, et merci pour votre confiance.</p>
              <div className="ref">
                <small>Référence</small>
                <span>{refCode}</span>
              </div>
              <div className="success-actions">
                <Link className="btn primary" href="/">Retour à l'accueil <span className="arrow">→</span></Link>
                <button className="btn" onClick={() => window.print()}>Imprimer la confirmation</button>
              </div>
            </div>

            {/* Guest account CTA */}
            <div style={{
              marginTop: 32,
              background: "var(--cream)",
              border: "1px solid var(--line)",
              borderRadius: 16,
              padding: "32px 36px",
              textAlign: "center",
            }}>
              <p style={{ fontFamily: "var(--serif)", fontSize: "1.25rem", margin: "0 0 8px" }}>
                Gérez vos rendez-vous <span className="italic">en un clic.</span>
              </p>
              <p style={{ color: "var(--mute)", fontSize: "0.9rem", margin: "0 0 24px" }}>
                Créez un compte pour consulter vos réservations, annuler facilement et retrouver vos factures — sans jamais ressaisir vos informations.
              </p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                <Link href="/register" className="btn primary">Créer un compte gratuit <span className="arrow">→</span></Link>
                <Link href="/login" className="btn" style={{ opacity: 0.7 }}>J'ai déjà un compte</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="resa-page">
      <div className="wrap">
        <div className="resa-header">
          <span className="eyebrow" style={{ justifyContent: "center", display: "inline-flex" }}>Réservation</span>
          <h1 style={{ marginTop: 18 }}>Entrez <span className="italic">dans la bulle.</span></h1>
          <p>Quatre étapes, deux minutes. Confirmation par e‑mail sous 24h.</p>
        </div>

        {/* Stepper */}
        <div className="stepper">
          {STEPS.map((label, i) => (
            <span key={label} style={{ display: "contents" }}>
              {i > 0 && <span className="step-sep" />}
              <div
                className={`step${i === step ? " active" : ""}${i < step ? " done" : ""}`}
                onClick={() => { if (i < step) goTo(i) }}
                style={{ cursor: i < step ? "pointer" : "default" }}
              >
                <span className="ix"><span>{i + 1}</span></span>
                {label}
              </div>
            </span>
          ))}
        </div>

        <div className="resa-grid">
          {/* Left: step panels */}
          <div className="panel-stack">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.25 }}
              >
                {/* ── Step 0: Soin ── */}
                {step === 0 && (
                  <div className="panel">
                    <span className="eyebrow">Étape 1</span>
                    <h2 style={{ marginTop: 12 }}>Quel soin <span className="italic">vous appelle ?</span></h2>
                    <p className="panel-sub">Choisissez la prestation. Vous pourrez encore changer d'avis avant de confirmer.</p>
                    <div className="svc-grid">
                      {SOIN_ORDER.map(id => {
                        const s = SOINS[id]
                        return (
                          <button
                            key={id}
                            className={`svc${svc?.id === id ? " selected" : ""}`}
                            onClick={() => setSvc({ id, name: s.name, price: s.price, dur: parseInt(s.dur) })}
                          >
                            <div className="row">
                              <div className="nm">{s.name}</div>
                              <div className="pr">{s.price}€</div>
                            </div>
                            <div className="dur">{s.dur}</div>
                            <div className="meta">{s.lede.slice(0, 65).trimEnd()}…</div>
                          </button>
                        )
                      })}
                    </div>
                    <div className="step-nav">
                      <button className="ghost" onClick={() => router.back()}>← Retour</button>
                      <button className="btn primary" disabled={!svc} onClick={() => svc && goTo(1)}>
                        Continuer <span className="arrow">→</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Step 1: Date ── */}
                {step === 1 && (
                  <div className="panel">
                    <span className="eyebrow">Étape 2</span>
                    <h2 style={{ marginTop: 12 }}>Choisissez <span className="italic">une date.</span></h2>
                    <p className="panel-sub">Disponibilités du lundi au samedi. Le dimanche, la bulle se repose.</p>
                    <div className="cal">
                      <div className="cal-head">
                        <div className="mname">{MONTHS[viewMonth]} {viewYear}</div>
                        <div className="cal-nav">
                          <button
                            className="cal-btn"
                            disabled={curViewStart.getTime() <= minMonth.getTime()}
                            onClick={() => {
                              if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
                              else setViewMonth(m => m - 1)
                            }}
                            aria-label="Mois précédent"
                          >‹</button>
                          <button
                            className="cal-btn"
                            onClick={() => {
                              if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
                              else setViewMonth(m => m + 1)
                            }}
                            aria-label="Mois suivant"
                          >›</button>
                        </div>
                      </div>
                      <div className="cal-grid">
                        {DOW.map(d => <div key={d} className="cal-dow">{d}</div>)}
                        {Array.from({ length: startOffset }, (_, i) => (
                          <div key={`e${i}`} className="cal-cell empty" />
                        ))}
                        {Array.from({ length: daysInMonth }, (_, i) => {
                          const day = i + 1
                          const d = new Date(viewYear, viewMonth, day)
                          const disabled = d < today || d.getDay() === 0 || d > maxDate
                          const isToday = d.getTime() === today.getTime()
                          const isSelected = date ? d.getTime() === date.getTime() : false
                          let cls = "cal-cell"
                          if (disabled) cls += " disabled"
                          else {
                            cls += " available"
                            if (isToday) cls += " today"
                            if (isSelected) cls += " selected"
                          }
                          return (
                            <div
                              key={day}
                              className={cls}
                              onClick={() => { if (!disabled) { setDate(d); setTime(null) } }}
                            >
                              {day}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                    <div className="step-nav">
                      <button className="ghost" onClick={() => goTo(0)}>← Retour</button>
                      <button className="btn primary" disabled={!date} onClick={() => date && goTo(2)}>
                        Continuer <span className="arrow">→</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Step 2: Heure ── */}
                {step === 2 && (
                  <div className="panel">
                    <span className="eyebrow">Étape 3</span>
                    <h2 style={{ marginTop: 12 }}>À quelle heure <span className="italic">vous attendre ?</span></h2>
                    <p className="panel-sub">Les créneaux affichés sont disponibles pour la date choisie.</p>
                    <div className="slots">
                      {slots.map(({ time: t, taken }) => (
                        <button
                          key={t}
                          className={`slot${time === t ? " selected" : ""}`}
                          disabled={taken}
                          onClick={() => { if (!taken) setTime(t) }}
                        >
                          <span>{t.replace(":", "h")}</span>
                          <small>{taken ? "complet" : `${svc?.dur || 60} min`}</small>
                        </button>
                      ))}
                    </div>
                    <div className="step-nav">
                      <button className="ghost" onClick={() => goTo(1)}>← Retour</button>
                      <button className="btn primary" disabled={!time} onClick={() => time && goTo(3)}>
                        Continuer <span className="arrow">→</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Step 3: Vos infos ── */}
                {step === 3 && (
                  <div className="panel">
                    <span className="eyebrow">Étape 4</span>
                    <h2 style={{ marginTop: 12 }}>Faisons <span className="italic">connaissance.</span></h2>
                    <p className="panel-sub">Vos coordonnées pour la confirmation. Rien d'autre.</p>
                    <div className="form-grid">
                      <div className="field">
                        <label>Prénom</label>
                        <input
                          type="text"
                          value={info.first}
                          onChange={e => setInfo(v => ({ ...v, first: e.target.value }))}
                          autoComplete="given-name"
                        />
                      </div>
                      <div className="field">
                        <label>Nom</label>
                        <input
                          type="text"
                          value={info.last}
                          onChange={e => setInfo(v => ({ ...v, last: e.target.value }))}
                          autoComplete="family-name"
                        />
                      </div>
                      <div className="field">
                        <label>E‑mail</label>
                        <input
                          type="email"
                          value={info.email}
                          onChange={e => setInfo(v => ({ ...v, email: e.target.value }))}
                          autoComplete="email"
                        />
                      </div>
                      <div className="field">
                        <label>Téléphone</label>
                        <input
                          type="tel"
                          value={info.phone}
                          onChange={e => setInfo(v => ({ ...v, phone: e.target.value }))}
                          autoComplete="tel"
                          placeholder="06 …"
                        />
                      </div>
                      <div className="field full">
                        <label>Lieu de la séance</label>
                        <select
                          value={info.place}
                          onChange={e => setInfo(v => ({ ...v, place: e.target.value }))}
                        >
                          <option value="cabinet">Au cabinet — Lyon 7ᵉ</option>
                          <option value="domicile">À mon domicile (+18€ selon distance)</option>
                        </select>
                      </div>
                      <div className="field full">
                        <label>Un mot pour préparer la séance ?</label>
                        <textarea
                          value={info.note}
                          onChange={e => setInfo(v => ({ ...v, note: e.target.value }))}
                          placeholder="Tensions du moment, allergies, ambiance souhaitée…"
                        />
                        <span className="hint">Optionnel — mais souvent utile.</span>
                      </div>
                      <label className="check-row full">
                        <input
                          type="checkbox"
                          checked={firstTime}
                          onChange={e => setFirstTime(e.target.checked)}
                        />
                        <span>
                          <strong>C'est ma première bulle.</strong>{" "}
                          Profitez de 20 % offerts sur votre soin signature.
                        </span>
                      </label>
                    </div>
                    <div className="step-nav">
                      <button className="ghost" onClick={() => goTo(2)}>← Retour</button>
                      <button
                        className="btn primary"
                        disabled={!isInfoValid}
                        onClick={() => isInfoValid && goTo(4)}
                      >
                        Vérifier ma réservation <span className="arrow">→</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Step 4: Confirmer ── */}
                {step === 4 && (
                  <div className="panel">
                    <span className="eyebrow">Étape 5</span>
                    <h2 style={{ marginTop: 12 }}>Tout est bon ? <span className="italic">On confirme.</span></h2>
                    <p className="panel-sub">Un dernier coup d'œil avant l'envoi. Vous pouvez modifier chaque étape.</p>
                    <div className="review">
                      {([
                        { label: "Soin", value: svc?.name ?? "—", editStep: 0 },
                        { label: "Date", value: fmtDate(date), editStep: 1 },
                        { label: "Heure", value: time ? time.replace(":", "h") : "—", editStep: 2 },
                        { label: "Vous", value: `${info.first} ${info.last}`, editStep: 3 },
                        { label: "Coordonnées", value: `${info.email} · ${info.phone}`, editStep: 3 },
                        { label: "Lieu", value: info.place === "domicile" ? "À votre domicile" : "Au cabinet · Lyon 7ᵉ", editStep: 3 },
                        ...(info.note ? [{ label: "Note", value: info.note, editStep: 3 }] : []),
                      ] as { label: string; value: string; editStep: number }[]).map(row => (
                        <div key={row.label} className="review-row">
                          <div>
                            <div className="lbl">{row.label}</div>
                            <div className="val">{row.value}</div>
                          </div>
                          <button className="edit" onClick={() => goTo(row.editStep)}>Modifier</button>
                        </div>
                      ))}
                    </div>
                    <div className="step-nav">
                      <button className="ghost" onClick={() => goTo(3)}>← Retour</button>
                      <button className="btn primary" onClick={handleConfirm}>
                        Confirmer la réservation <span className="arrow">→</span>
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right: summary sidebar */}
          <aside className="summary">
            <div className="summary-card">
              <span className="eyebrow" style={{ color: "#ffffff99" }}>Votre réservation</span>
              <h3 style={{ marginTop: 14, color: "#fff", fontStyle: "italic" }}>En un coup d'œil</h3>
              <div className="summary-list">
                {([
                  ["Soin", svc?.name ?? null, "À choisir"],
                  ["Date", date ? fmtDate(date) : null, "—"],
                  ["Heure", time ? time.replace(":", "h") : null, "—"],
                  ["Durée", svc ? `${svc.dur} min` : null, "—"],
                ] as [string, string | null, string][]).map(([label, val, placeholder]) => (
                  <div key={label} className="summary-row">
                    <div>
                      <div className="l">{label}</div>
                      <div className={`v${!val ? " muted" : ""}`}>{val ?? placeholder}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="summary-total">
                <div className="l">Total</div>
                <div className="v">{svc ? `${calcTotal()}€` : "—"}</div>
              </div>
              <div className="summary-perks">
                <span className="ic">❋</span>
                <div>Paiement à l'issue de la séance. Annulation gratuite jusqu'à 24h avant.</div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
