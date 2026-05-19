"use client"
import { useState, Fragment } from "react"
import Link from "next/link"
import { useWeekAppointments, useAppointments, type Appt } from "@/lib/queries/appointments"

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
  const d = new Date(iso + "T00:00:00")
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
            position: "fixed", top: 0, right: 0, bottom: 0, width: 360,
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
  return (
    <>
      <div className="av-lg">{name.charAt(0).toUpperCase()}</div>
      <h3 style={{ marginTop: 14 }}>{name}</h3>
      {appt.guestEmail && <p style={{ fontSize: 13, color: "var(--mute)", marginTop: 4 }}>{appt.guestEmail}</p>}
      <div className="meta" style={{ marginTop: 10 }}>
        <span><strong>Date :</strong> {fmtDateKey(appt.slot.date)} à {fmtTime(appt.slot.startTime)}</span>
        <span><strong>Soin :</strong> {appt.service.name} ({appt.service.durationMinutes} min)</span>
        <span><strong>Lieu :</strong> {appt.location === "domicile" ? `À domicile${appt.clientAddress ? ` — ${appt.clientAddress}` : ""}` : "Cabinet"}</span>
        <span>
          <strong>Statut : </strong>
          <span className={`status ${appt.status === "confirmed" ? "ok" : appt.status === "pending" ? "pending" : ""}`} style={{ display: "inline-flex" }}>
            {appt.status === "confirmed" ? "Confirmé" : appt.status === "pending" ? "En attente" : appt.status}
          </span>
        </span>
        {appt.isFirstVisit && <span style={{ color: "var(--terra)" }}>⭐ Première visite</span>}
      </div>
      {appt.notes && (
        <div className="notes" style={{ marginTop: 16 }}>
          <span className="ico">✎</span><em>{appt.notes}</em>
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
        <button className="tbtn" style={{ flex: 1 }}>Confirmer</button>
        <button className="tbtn ghost" onClick={onClose}>Fermer</button>
      </div>
    </>
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
