"use client"
import { useState } from "react"
import Link from "next/link"
import { useAppointments, type Appt } from "@/lib/queries/appointments"

type Tab = "today" | "tomorrow" | "week"

const TAB_LABELS: Record<Tab, string> = {
  today: "Aujourd'hui",
  tomorrow: "Demain",
  week: "Cette semaine",
}

function fmtTime(t: string) { return t.replace(":", "h") }
function fmtDur(min: number) {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60), m = min % 60
  return m > 0 ? `${h}h${m.toString().padStart(2, "0")}` : `${h}h`
}

function toISO(d: Date) { return d.toISOString().split("T")[0] }

function dateRangeForTab(tab: Tab): { from: string; to: string } {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  if (tab === "today") {
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
    return { from: toISO(today), to: toISO(tomorrow) }
  }
  if (tab === "tomorrow") {
    const from = new Date(today); from.setDate(from.getDate() + 1)
    const to = new Date(today); to.setDate(to.getDate() + 2)
    return { from: toISO(from), to: toISO(to) }
  }
  // week
  const to = new Date(today); to.setDate(to.getDate() + 7)
  return { from: toISO(today), to: toISO(to) }
}

interface Props {
  initialAppts: Appt[]
}

export default function TodayAgendaCard({ initialAppts }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("today")

  const { from, to } = dateRangeForTab(activeTab)
  const { data, isLoading, isFetching } = useAppointments(from, to)

  // On first render, use server-provided data to avoid a flash
  const appts: Appt[] = data ?? (activeTab === "today" ? initialAppts : [])
  const loading = isLoading && appts.length === 0

  const totalMinutes = appts.reduce((a, b) => a + b.service.durationMinutes, 0)

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <h3>Le programme du jour</h3>
          <div className="sub" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {appts.length > 0
              ? `${appts.length} séance${appts.length > 1 ? "s" : ""} · ${fmtDur(totalMinutes)} réservées`
              : "Rien de prévu — profitez-en !"}
            {isFetching && !isLoading && (
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--terra)", opacity: .6, flexShrink: 0 }} />
            )}
          </div>
        </div>
        <div className="tabs">
          {(["today", "tomorrow", "week"] as Tab[]).map(tab => (
            <button
              key={tab}
              className={`tab-mini${activeTab === tab ? " active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: "32px 0", textAlign: "center", color: "var(--mute)", fontStyle: "italic", fontSize: 13 }}>
          Chargement…
        </div>
      ) : appts.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 24px" }}>
          <p style={{ fontFamily: "var(--serif)", fontSize: 20, color: "var(--mute)", fontStyle: "italic", marginBottom: 16 }}>
            {activeTab === "today" ? "Aucune séance aujourd'hui." :
             activeTab === "tomorrow" ? "Aucune séance demain." :
             "Aucune séance cette semaine."}
          </p>
          <Link href="/dashboard/disponibilites" className="tbtn ghost" style={{ textDecoration: "none" }}>
            Configurer les disponibilités
          </Link>
        </div>
      ) : (
        <div className="agenda-list">
          {appts.map((appt) => {
            const clientName = appt.client?.fullName ?? appt.guestName ?? "Invité"
            const statusCls = appt.status === "confirmed" ? "confirmed" : appt.status === "pending" ? "pending" : "done"
            const pillLabel = appt.status === "confirmed" ? "Confirmé" : appt.status === "pending" ? "À confirmer" : appt.status
            return (
              <div key={appt.id} className={`appt ${statusCls}`}>
                <div className="time">
                  {fmtTime(appt.slot.startTime)}
                  <small>{fmtDur(appt.service.durationMinutes)}</small>
                </div>
                <div className="dot" />
                <div className="who">
                  <div className="nm">{clientName}</div>
                  <div className="what">
                    {appt.service.name}
                    <span className="sep">·</span>
                    {appt.location === "domicile" ? "Domicile" : "Cabinet"}
                    <span className="sep">·</span>
                    {(appt.service.price / 100).toFixed(0)}€
                    {appt.isFirstVisit && (
                      <><span className="sep">·</span><span style={{ color: "var(--terra)", fontSize: 11 }}>1ère visite</span></>
                    )}
                  </div>
                </div>
                <div className="pill">{pillLabel}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
