"use client"
import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import Reveal from "@/components/animations/Reveal"
import { contactSchema } from "@/lib/validation"
import type { DayHours } from "@/app/api/opening-hours/route"

type ContactFormValues = z.infer<typeof contactSchema>

const SUBJECTS = [
  { value: "reservation", ico: "✿", label: "Réservation",  desc: "Question sur un RDV, dispo, modification" },
  { value: "soin",        ico: "♥", label: "Conseil soin", desc: "Quel rituel choisir, contre‑indications" },
  { value: "boutique",    ico: "⌘", label: "Boutique",     desc: "Tableau sur mesure, livraison" },
  { value: "autre",       ico: "❋", label: "Autre",        desc: "Carte cadeau, partenariat, presse…" },
] as const

const DAY_LABELS: Record<string, string> = {
  mon: "Lundi", tue: "Mardi", wed: "Mercredi", thu: "Jeudi",
  fri: "Vendredi", sat: "Samedi", sun: "Dimanche",
}

// "09:00" → "9h", "18:30" → "18h30"
function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number)
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`
}

// JS getDay(): 0=Sun…6=Sat → index in mon-first array
const todayIdx = (() => { const d = new Date().getDay(); return d === 0 ? 6 : d - 1 })()

// Shown while the real schedule is loading or if none is saved yet
const fallbackHours: DayHours[] = [
  { key: "mon", enabled: true,  start: "09:00", end: "19:00" },
  { key: "tue", enabled: true,  start: "09:00", end: "19:00" },
  { key: "wed", enabled: true,  start: "09:00", end: "19:00" },
  { key: "thu", enabled: true,  start: "11:00", end: "20:00" },
  { key: "fri", enabled: true,  start: "09:00", end: "18:00" },
  { key: "sat", enabled: true,  start: "10:00", end: "16:00" },
  { key: "sun", enabled: false, start: "09:00", end: "18:00" },
]

export default function ContactPage() {
  const [subject, setSubject] = useState<ContactFormValues["subject"]>("reservation")
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [sentEmail, setSentEmail] = useState("")
  const [msgLen, setMsgLen] = useState(0)
  const [fileName, setFileName] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [hours, setHours] = useState<DayHours[] | null>(null)

  useEffect(() => {
    fetch("/api/opening-hours")
      .then(r => r.json())
      .then(d => { if (d.hours) setHours(d.hours) })
      .catch(() => {})
  }, [])

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { subject: "reservation", gdpr: undefined },
  })

  async function onSubmit(data: ContactFormValues) {
    setSending(true)
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error()
      setSentEmail(data.email)
      setSent(true)
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch {
      toast.error("Erreur lors de l'envoi. Veuillez réessayer ou appeler directement.")
    } finally {
      setSending(false)
    }
  }

  function pickSubject(val: ContactFormValues["subject"]) {
    setSubject(val)
    setValue("subject", val)
  }

  return (
    <div className="ct-page">
      <div className="ct-grid">

        {/* ── LEFT: sidebar ─────────────────────────────────────── */}
        <aside className="ct-side">
          <Reveal>
            <span className="eyebrow">Nous écrire</span>
            <h1 style={{ marginTop: 14 }}>
              Un mot, <span className="italic" style={{ color: "var(--terra)" }}>une question.</span>
            </h1>
            <p className="lede">
              Je lis chaque message — et je réponds toujours sous 24h, du lundi au samedi.
              Pour les urgences, le téléphone reste le plus simple.
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="ct-meta">
              <a className="ct-meta-row" href="tel:+33625486056">
                <div className="ct-meta-ico">☎</div>
                <div>
                  <div className="ct-meta-l">Téléphone</div>
                  <div className="ct-meta-v">06 25 48 60 56</div>
                </div>
              </a>
              <a className="ct-meta-row" href="mailto:contact@labulledevie.fr">
                <div className="ct-meta-ico">✉</div>
                <div>
                  <div className="ct-meta-l">E‑mail</div>
                  <div className="ct-meta-v">contact@labulledevie.fr</div>
                </div>
              </a>
              <a
                className="ct-meta-row"
                href="https://maps.google.com/?q=12+rue+des+Capucins+Lyon"
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className="ct-meta-ico">⌖</div>
                <div>
                  <div className="ct-meta-l">Cabinet</div>
                  <div className="ct-meta-v">
                    12 rue des Capucins<br />
                    <span style={{ fontSize: 13, color: "var(--mute)" }}>69007 Lyon</span>
                  </div>
                </div>
              </a>
            </div>

            <div className="ct-hours">
              <h4>Horaires d&apos;ouverture</h4>
              {(hours ?? fallbackHours).map((h, i) => {
                const closed = !h.enabled
                const label = DAY_LABELS[h.key] ?? h.key
                const display = closed ? "Fermé" : `${fmtTime(h.start)} — ${fmtTime(h.end)}`
                return (
                  <div
                    key={h.key}
                    className={`ct-hour-row${i === todayIdx ? " today" : ""}`}
                    style={closed ? { opacity: 0.5 } : undefined}
                  >
                    <span>
                      {label}
                      {i === todayIdx && <> · <strong>aujourd&apos;hui</strong></>}
                    </span>
                    <span>{display}</span>
                  </div>
                )
              })}
            </div>
          </Reveal>
        </aside>

        {/* ── RIGHT: form card ──────────────────────────────────── */}
        <div>
          {sent ? (
            /* ── Success state ──────────────────────────────────── */
            <div className="ct-form-card ct-sent">
              <div className="check">✓</div>
              <span className="eyebrow" style={{ display: "inline-flex", justifyContent: "center" }}>Bien reçu</span>
              <h3 style={{ marginTop: 14 }}>
                Votre message <span className="italic" style={{ color: "var(--terra)" }}>est parti.</span>
              </h3>
              <p>
                Je vous réponds sous 24h ouvrées, à l&apos;adresse{" "}
                <strong style={{ color: "var(--terra)" }}>{sentEmail}</strong>.
                Pour les urgences, n&apos;hésitez pas à m&apos;appeler.
              </p>
              <Link
                href="/"
                className="ct-submit"
                style={{ maxWidth: 280, display: "inline-flex", textDecoration: "none" }}
              >
                <span>Retour à l&apos;accueil</span>
                <span className="arrow">→</span>
              </Link>
            </div>
          ) : (
            /* ── Form ────────────────────────────────────────────── */
            <div className="ct-form-card">
              <span className="eyebrow">Formulaire</span>
              <h2 style={{ marginTop: 8 }}>
                Écrivez‑moi{" "}
                <span className="italic" style={{ color: "var(--terra)" }}>en quelques mots.</span>
              </h2>
              <p className="sub">
                Plus c&apos;est précis, mieux je peux vous aider. Vous recevrez un accusé de réception immédiat.
              </p>

              {/* Subject picker */}
              <p style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--mute)", marginBottom: 12, fontWeight: 500 }}>
                Sujet du message
              </p>
              <div className="subj-pick">
                {SUBJECTS.map(s => (
                  <div
                    key={s.value}
                    className={`subj-opt${subject === s.value ? " selected" : ""}`}
                    onClick={() => pickSubject(s.value)}
                    role="radio"
                    aria-checked={subject === s.value}
                    tabIndex={0}
                    onKeyDown={e => e.key === "Enter" && pickSubject(s.value)}
                  >
                    <div className="subj-ico">{s.ico}</div>
                    <div>
                      <div className="subj-nm">{s.label}</div>
                      <div className="subj-desc">{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <div className="ct-form-grid">

                  <div className="ct-field">
                    <label htmlFor="ct-first">Prénom</label>
                    <input
                      id="ct-first"
                      type="text"
                      autoComplete="given-name"
                      className={errors.firstName ? "error" : ""}
                      {...register("firstName")}
                    />
                    {errors.firstName && <span className="ct-field-err">{errors.firstName.message}</span>}
                  </div>

                  <div className="ct-field">
                    <label htmlFor="ct-last">Nom</label>
                    <input
                      id="ct-last"
                      type="text"
                      autoComplete="family-name"
                      className={errors.lastName ? "error" : ""}
                      {...register("lastName")}
                    />
                    {errors.lastName && <span className="ct-field-err">{errors.lastName.message}</span>}
                  </div>

                  <div className="ct-field">
                    <label htmlFor="ct-email">E‑mail</label>
                    <input
                      id="ct-email"
                      type="email"
                      autoComplete="email"
                      className={errors.email ? "error" : ""}
                      {...register("email")}
                    />
                    {errors.email
                      ? <span className="ct-field-err">{errors.email.message}</span>
                      : <span className="ct-field-hint"><span>Pour ma réponse</span></span>
                    }
                  </div>

                  <div className="ct-field">
                    <label htmlFor="ct-phone">
                      Téléphone{" "}
                      <span style={{ textTransform: "none", letterSpacing: 0, color: "var(--mute)", fontWeight: 400 }}>
                        (facultatif)
                      </span>
                    </label>
                    <input
                      id="ct-phone"
                      type="tel"
                      autoComplete="tel"
                      {...register("phone")}
                    />
                  </div>

                  <div className="ct-field full">
                    <label htmlFor="ct-msg">Votre message</label>
                    <textarea
                      id="ct-msg"
                      placeholder="Dites‑moi ce dont vous avez besoin — je vous réponds vite."
                      className={errors.message ? "error" : ""}
                      {...register("message", {
                        onChange: e => setMsgLen(e.target.value.length),
                      })}
                    />
                    <div className="ct-field-hint">
                      <span>
                        {errors.message
                          ? <span style={{ color: "#B65555" }}>{errors.message.message}</span>
                          : "Soyez aussi précis·e que possible"
                        }
                      </span>
                      <span className={`cnt${msgLen > 720 ? " warn" : ""}`}>{msgLen} / 800</span>
                    </div>
                  </div>

                  <div className="ct-field full">
                    <label>
                      Joindre une photo{" "}
                      <span style={{ textTransform: "none", letterSpacing: 0, color: "var(--mute)", fontWeight: 400 }}>
                        (facultatif)
                      </span>
                    </label>
                    <div
                      className="ct-attach"
                      onClick={() => fileRef.current?.click()}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => e.key === "Enter" && fileRef.current?.click()}
                    >
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={e => setFileName(e.target.files?.[0]?.name ?? null)}
                      />
                      <span className="ct-attach-clip">⌬</span>
                      <span>
                        {fileName
                          ? `✓ ${fileName}`
                          : "Glisser un fichier ou cliquer pour parcourir · JPG/PNG · 5 Mo max"
                        }
                      </span>
                    </div>
                  </div>

                  <label className="ct-check-row" style={{ gridColumn: "span 2" }}>
                    <input type="checkbox" {...register("gdpr")} />
                    <span>
                      J&apos;accepte que mes informations soient utilisées pour me répondre. Elles ne seront jamais partagées.{" "}
                      <a href="#">En savoir plus</a>.
                    </span>
                  </label>
                  {errors.gdpr && (
                    <span className="ct-field-err" style={{ gridColumn: "span 2", marginTop: -8 }}>
                      {errors.gdpr.message}
                    </span>
                  )}

                  <button
                    type="submit"
                    className="ct-submit"
                    style={{ gridColumn: "span 2" }}
                    disabled={sending}
                  >
                    <span>{sending ? "Envoi en cours…" : "Envoyer mon message"}</span>
                    {!sending && <span className="arrow">→</span>}
                  </button>
                </div>

                <p className="ct-legal">
                  En soumettant, vous acceptez nos{" "}
                  <a href="#">CGU</a> et notre <a href="#">politique de confidentialité</a>.
                </p>
              </form>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
