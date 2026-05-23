"use client"
import { useState, Fragment, type ReactNode } from "react"
import Link from "next/link"
import { useWeekAppointments, useAppointments, useConfirmAppointment, type Appt } from "@/lib/queries/appointments"
import { toast } from "sonner"

// ── Constants ───────────────────────────────────────────────────────
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
const ROW_H = 60           // px per hour — 1 px = 1 minute
const DOW_SHORT = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"]
const MONTHS_LONG = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"]
const MONTHS_SHORT = ["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."]

// ── Date helpers ────────────────────────────────────────────────────
function getMonday(d: Date): Date {
  const date = new Date(d); date.setHours(0, 0, 0, 0)
  const day = date.getDay()
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day))
  return date
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r
}
function toISO(d: Date): string { return d.toISOString().split("T")[0] }
function isToday(d: Date): boolean {
  const t = new Date()
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate()
}
function weekLabel(mon: Date): string {
  const sun = addDays(mon, 6)
  if (mon.getMonth() === sun.getMonth()) {
    return `${mon.getDate()} — ${sun.getDate()} ${MONTHS_LONG[mon.getMonth()]} ${mon.getFullYear()}`
  }
  return `${mon.getDate()} ${MONTHS_SHORT[mon.getMonth()]} — ${sun.getDate()} ${MONTHS_SHORT[sun.getMonth()]} ${sun.getFullYear()}`
}
function fmtDateKey(iso: string) {
  const d = new Date(iso.split("T")[0] + "T00:00:00")
  return `${DOW_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS_LONG[d.getMonth()]}`
}
function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number); return h * 60 + m
}
function fmtTime(t: string): string { return t.replace(":", "h") }

// ── Main page ───────────────────────────────────────────────────────
export default function RendezVousPage() {
  const [view, setView] = useState<"semaine" | "liste">("semaine")
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()))
  const [selected, setSelected] = useState<Appt | null>(null)
  const gcalConnected = false // placeholder — will be wired to Google OAuth

  // TanStack Query — automatic caching, background refetch, no manual loading state
  const weekEnd = toISO(addDays(weekStart, 7))
  const weekQuery = useWeekAppointments(toISO(weekStart), weekEnd)
  const listQuery = useAppointments()

  const appts = view === "semaine"
    ? (weekQuery.data ?? [])
    : (listQuery.data ?? [])

  const loading = view === "semaine" ? weekQuery.isLoading : listQuery.isLoading

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  function getApptForCell(day: Date, hour: number): Appt[] {
    const dayISO = toISO(day)
    return appts.filter(a => {
      if (a.slot.date.split("T")[0] !== dayISO) return false
      return Math.floor(timeToMin(a.slot.startTime) / 60) === hour
    })
  }

  const grouped = appts.reduce<Record<string, Appt[]>>((acc, a) => {
    const key = a.slot.date.split("T")[0]
    if (!acc[key]) acc[key] = []
    acc[key].push(a)
    return acc
  }, {})

  return (
    <div className="view active">
      <div className="view-head">
        <div>
          <h1>Agenda</h1>
          <p className="lede">Vue d'ensemble de vos rendez-vous. Gérez vos disponibilités et confirmez en un clic.</p>
        </div>
        <div className="actions">
          <Link href="/dashboard/disponibilites" className="tbtn ghost">Disponibilités</Link>
          <Link href="/booking" className="tbtn">
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Nouveau RDV
          </Link>
        </div>
      </div>

      <div className="bigcal">

        {/* Header */}
        <div className="bigcal-head">
          <div className="mname">
            {view === "semaine" ? weekLabel(weekStart) : "Tous les rendez-vous à venir"}
          </div>
          {view === "semaine" && (
            <div className="arrows">
              <button onClick={() => setWeekStart(d => addDays(d, -7))} aria-label="Semaine précédente">‹</button>
              <button onClick={() => setWeekStart(d => addDays(d, 7))} aria-label="Semaine suivante">›</button>
            </div>
          )}
          <div className="view-tabs">
            <button className={`tab-mini${view === "semaine" ? " active" : ""}`} onClick={() => setView("semaine")}>Semaine</button>
            <button className={`tab-mini${view === "liste" ? " active" : ""}`} onClick={() => setView("liste")}>Liste</button>
          </div>
        </div>

        {/* Google Calendar connection banner */}
        {!gcalConnected && (
          <div style={{
            display: "flex", alignItems: "center", gap: 14,
            padding: "11px 22px", borderBottom: "1px solid var(--line)",
            background: "#FDFAF5", fontSize: 13.5,
          }}>
            <GoogleCalIcon />
            <span style={{ flex: 1, color: "var(--mute)" }}>
              <strong style={{ color: "var(--ink)" }}>Google Agenda</strong> — Connectez votre calendrier pour synchroniser automatiquement vos rendez-vous.
            </span>
            <button className="tbtn ghost" style={{ fontSize: 12, padding: "7px 14px", whiteSpace: "nowrap" }}>
              Connecter Google Agenda
            </button>
          </div>
        )}

        {/* ── WEEK VIEW ─────────────────────────────────────────── */}
        {view === "semaine" && (
          <>
            {loading ? (
              <div style={{ padding: "40px 24px", color: "var(--mute)", fontStyle: "italic" }}>Chargement…</div>
            ) : (
              /*
               * ONE flat .week grid — 8 columns (60px time col + 7 day cols).
               * All 104 children are direct grid items so nth-child(8n) works:
               *   children 1–8:   DOW header row (corner + Mon–Sun)
               *   children 9–16:  8h row (hcol + 7 cells)
               *   children 17–24: 9h row, etc.
               * Positions 8, 16, 24 … are always the Sun column → no right border.
               */
              <div className="week">
                {/* ── DOW header row (8 cells) ── */}
                <div className="dow" />
                {days.map((d, i) => (
                  <div key={i} className={`dow${isToday(d) ? " today" : ""}${i === 6 ? " dim" : ""}`}
                    style={i === 6 ? { color: "var(--mute)", opacity: .5 } : {}}>
                    {DOW_SHORT[d.getDay()]}
                    <span className="num">{d.getDate()}</span>
                  </div>
                ))}

                {/* ── Hour rows (12 hours × 8 cells = 96 cells) ── */}
                {HOURS.map(hour => (
                  <Fragment key={hour}>
                    {/* Time label — column 1 */}
                    <div className="hcol" style={{ height: ROW_H, paddingTop: 4 }}>{hour}h</div>

                    {/* Day cells — columns 2–8 */}
                    {days.map((day, di) => {
                      const cellAppts = getApptForCell(day, hour)
                      return (
                        <div key={di} className="cell" style={{ height: ROW_H, opacity: di === 6 ? .5 : 1 }}>
                          {cellAppts.map(appt => {
                            const startMin = timeToMin(appt.slot.startTime)
                            const topPct = (startMin % 60) / 60 * 100
                            const heightPct = appt.service.durationMinutes / 60 * 100 - 8
                            const cls = appt.status === "confirmed" ? "confirmed" : appt.status === "pending" ? "pending" : ""
                            const name = appt.client?.fullName ?? appt.guestName ?? "Invité"
                            return (
                              <div
                                key={appt.id}
                                className={`event${cls ? ` ${cls}` : ""}`}
                                style={{ top: `${topPct + 4}%`, height: `${heightPct}%`, cursor: "pointer" }}
                                onClick={() => setSelected(appt)}
                              >
                                <strong>{name}</strong>
                                {appt.service.name}
                              </div>
                            )
                          })}
                        </div>
                      )
                    })}
                  </Fragment>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── LIST VIEW ─────────────────────────────────────────── */}
        {view === "liste" && (
          <div style={{ padding: "24px 28px" }}>
            {loading && <p style={{ color: "var(--mute)", fontStyle: "italic" }}>Chargement…</p>}

            {!loading && appts.length === 0 && (
              <div style={{ textAlign: "center", padding: "60px 40px" }}>
                <p style={{ fontFamily: "var(--serif)", fontSize: 22, marginBottom: 10 }}>Aucun rendez-vous à venir.</p>
                <p style={{ color: "var(--mute)", fontSize: 14, marginBottom: 24 }}>
                  Configurez vos disponibilités pour recevoir des réservations.
                </p>
                <Link href="/dashboard/disponibilites" className="tbtn">Configurer les disponibilités</Link>
              </div>
            )}

            {!loading && appts.length > 0 && (
              <div className="split">
                <div>
                  {Object.entries(grouped).map(([dateKey, dayAppts]) => (
                    <div key={dateKey} style={{ marginBottom: 28 }}>
                      <div style={{
                        fontSize: 11, letterSpacing: ".2em", textTransform: "uppercase",
                        color: "var(--mute)", marginBottom: 10, paddingBottom: 8,
                        borderBottom: "1px solid var(--line)",
                      }}>
                        {fmtDateKey(dateKey)}
                      </div>
                      <div className="agenda-list">
                        {dayAppts.map(appt => {
                          const clientName = appt.client?.fullName ?? appt.guestName ?? "Invité"
                          const statusCls = appt.status === "confirmed" ? "confirmed" : appt.status === "pending" ? "pending" : "done"
                          const pillLabel = appt.status === "confirmed" ? "Confirmé" : appt.status === "pending" ? "En attente" : appt.status
                          return (
                            <div key={appt.id} className={`appt ${statusCls}`} onClick={() => setSelected(appt)}>
                              <div className="time">
                                {fmtTime(appt.slot.startTime)}
                                <small>{appt.service.durationMinutes} min</small>
                              </div>
                              <div className="dot" />
                              <div className="who">
                                <div className="nm">{clientName}</div>
                                <div className="what">
                                  {appt.service.name}
                                  <span className="sep">·</span>
                                  {appt.location === "domicile" ? "À domicile" : "Cabinet"}
                                  {appt.isFirstVisit && <><span className="sep">·</span><span style={{ color: "var(--terra)", fontSize: 11 }}>1ère visite</span></>}
                                </div>
                              </div>
                              <span className="pill">{pillLabel}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Detail panel */}
                <div className="client-detail card" style={{ alignSelf: "flex-start" }}>
                  {!selected
                    ? <p style={{ color: "var(--mute)", fontStyle: "italic", fontSize: 14 }}>Cliquez sur un rendez-vous pour voir les détails.</p>
                    : <DetailPanel appt={selected} onClose={() => setSelected(null)} />}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Week view detail panel — fixed right-side drawer */}
      {view === "semaine" && selected && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 40, background: "transparent" }}
            onClick={() => setSelected(null)}
          />
          <div style={{
            position: "fixed", top: 0, right: 0, bottom: 0, width: 400,
            background: "#fff", borderLeft: "1px solid var(--line)",
            boxShadow: "-12px 0 40px -20px #2218127a",
            zIndex: 50, padding: 28, overflowY: "auto",
            animation: "viewIn .3s ease forwards",
          }}>
            <button
              onClick={() => setSelected(null)}
              style={{ position: "absolute", top: 16, right: 16, background: "transparent", border: "none", cursor: "pointer", color: "var(--mute)", fontSize: 22, lineHeight: 1 }}
            >×</button>
            <DetailPanel appt={selected} onClose={() => setSelected(null)} />
          </div>
        </>
      )}
    </div>
  )
}

// ── Detail panel ────────────────────────────────────────────────────
function DetailPanel({ appt, onClose }: { appt: Appt; onClose: () => void }) {
  const name = appt.client?.fullName ?? appt.guestName ?? "Invité"
  const initials = name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
  const confirm = useConfirmAppointment()

  async function handleConfirm() {
    try {
      await confirm.mutateAsync(appt.id)
      toast.success("Rendez-vous confirmé.")
      onClose()
    } catch {
      toast.error("Impossible de confirmer ce rendez-vous.")
    }
  }

  const statusConfig = {
    pending:   { label: "En attente",  bg: "#FEF3C7", color: "#92400E" },
    confirmed: { label: "Confirmé",    bg: "#D1FAE5", color: "#065F46" },
    cancelled: { label: "Annulé",      bg: "#FEE2E2", color: "#991B1B" },
    completed: { label: "Effectué",    bg: "#EDE9FE", color: "#5B21B6" },
  }
  const sc = statusConfig[appt.status as keyof typeof statusConfig] ?? { label: appt.status, bg: "#F3F4F6", color: "#374151" }

  const locationLabel = appt.location === "domicile"
    ? `À domicile${appt.clientAddress ? ` · ${appt.clientAddress}` : ""}`
    : "Au cabinet"

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

      {/* ── Hero ─── */}
      <div style={{ paddingBottom: 20, borderBottom: "1px solid var(--line)", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <span style={{
            fontSize: 11, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase",
            padding: "4px 10px", borderRadius: 20,
            background: sc.bg, color: sc.color,
          }}>{sc.label}</span>
          {appt.isFirstVisit && (
            <span style={{
              fontSize: 11, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase",
              padding: "4px 10px", borderRadius: 20,
              background: "#FFF7ED", color: "#C2410C",
            }}>1ère visite</span>
          )}
        </div>
        <p style={{ fontFamily: "var(--serif)", fontSize: 22, fontWeight: 600, lineHeight: 1.25, marginBottom: 8 }}>
          {appt.service.name}
        </p>
        <p style={{ fontSize: 13.5, color: "var(--mute)", display: "flex", alignItems: "center", gap: 6 }}>
          <CalIcon />
          {fmtDateKey(appt.slot.date)} · {fmtTime(appt.slot.startTime)} · {appt.service.durationMinutes} min
        </p>
      </div>

      {/* ── Client ─── */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, paddingBottom: 20, borderBottom: "1px solid var(--line)", marginBottom: 20 }}>
        <div style={{
          width: 46, height: 46, borderRadius: "50%",
          background: "var(--cream)", border: "1.5px solid var(--line)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "var(--serif)", fontSize: 17, fontWeight: 600, color: "var(--bark)", flexShrink: 0,
        }}>{initials}</div>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{name}</p>
          {appt.guestEmail && (
            <p style={{ fontSize: 12.5, color: "var(--mute)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {appt.guestEmail}
            </p>
          )}
          {!appt.guestEmail && appt.client && (
            <p style={{ fontSize: 12.5, color: "var(--mute)" }}>Client enregistré</p>
          )}
        </div>
      </div>

      {/* ── Details grid ─── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 20px", marginBottom: 20 }}>
        <DetailItem icon={<PinIcon />} label="Lieu" value={locationLabel} />
        <DetailItem icon={<ClockIcon />} label="Durée" value={`${appt.service.durationMinutes} min`} />
        {appt.service.price != null && (
          <DetailItem icon={<EuroIcon />} label="Tarif" value={`${(appt.service.price / 100).toFixed(2)} €`} />
        )}
      </div>

      {/* ── Notes ─── */}
      {appt.notes && (
        <div style={{
          background: "#FAFAF8", border: "1px solid var(--line)", borderRadius: 10,
          padding: "14px 16px", marginBottom: 20,
        }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--mute)", marginBottom: 8 }}>Notes du client</p>
          <p style={{ fontSize: 13.5, color: "var(--ink)", lineHeight: 1.6 }}>{appt.notes}</p>
        </div>
      )}

      {/* ── Actions ─── */}
      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8, paddingTop: 20, borderTop: "1px solid var(--line)" }}>
        {appt.status === "pending" && (
          <button className="tbtn" onClick={handleConfirm} disabled={confirm.isPending} style={{ width: "100%", justifyContent: "center" }}>
            {confirm.isPending ? "Confirmation…" : "✓ Confirmer le rendez-vous"}
          </button>
        )}
        {appt.status === "confirmed" && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: "11px 16px", borderRadius: 10, background: "#D1FAE5", color: "#065F46",
            fontSize: 13.5, fontWeight: 600,
          }}>
            <svg width="15" height="15" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="#065F46" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Rendez-vous confirmé
          </div>
        )}
        <button className="tbtn ghost" onClick={onClose} style={{ width: "100%", justifyContent: "center" }}>Fermer</button>
      </div>
    </div>
  )
}

function DetailItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--mute)", marginBottom: 4, display: "flex", alignItems: "center", gap: 5 }}>
        {icon}{label}
      </p>
      <p style={{ fontSize: 13.5, color: "var(--ink)", fontWeight: 500 }}>{value}</p>
    </div>
  )
}

function CalIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
    </svg>
  )
}
function PinIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/>
    </svg>
  )
}
function ClockIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
    </svg>
  )
}
function EuroIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10h12M4 14h12M19.5 8a6.5 6.5 0 1 0 0 8"/>
    </svg>
  )
}

// ── Google Calendar icon ────────────────────────────────────────────
function GoogleCalIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <rect x="3" y="4" width="18" height="17" rx="2" stroke="#4285F4" strokeWidth="1.5"/>
      <path d="M3 9h18" stroke="#4285F4" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M8 2v4M16 2v4" stroke="#4285F4" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M8 13h3v3H8z" fill="#4285F4" opacity=".6"/>
    </svg>
  )
}
