"use client"
import { useState, useEffect } from "react"
import { toast } from "sonner"

type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun"
type DaySchedule = { enabled: boolean; start: string; end: string }
type WeeklySchedule = Record<DayKey, DaySchedule> & {
  slotDurationMin: number
  lunchStart: string
  lunchEnd: string
  lunchEnabled: boolean
}

const DAY_LABELS: Record<DayKey, string> = {
  mon: "Lundi", tue: "Mardi", wed: "Mercredi",
  thu: "Jeudi", fri: "Vendredi", sat: "Samedi", sun: "Dimanche",
}
const DAYS: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
const DURATIONS = [30, 45, 60, 90]

const DEFAULT: WeeklySchedule = {
  mon: { enabled: true, start: "09:00", end: "18:00" },
  tue: { enabled: true, start: "09:00", end: "18:00" },
  wed: { enabled: true, start: "09:00", end: "18:00" },
  thu: { enabled: true, start: "09:00", end: "18:00" },
  fri: { enabled: true, start: "09:00", end: "18:00" },
  sat: { enabled: false, start: "09:00", end: "13:00" },
  sun: { enabled: false, start: "09:00", end: "13:00" },
  slotDurationMin: 60,
  lunchEnabled: true,
  lunchStart: "12:00",
  lunchEnd: "13:00",
}

export default function DisponibilitesPage() {
  const [schedule, setSchedule] = useState<WeeklySchedule>(DEFAULT)
  const [upcomingCount, setUpcomingCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/dashboard/availability")
      .then(async (r) => {
        const text = await r.text()
        if (!text) throw new Error(`Empty response (${r.status})`)
        return JSON.parse(text)
      })
      .then((data) => {
        if (data.weeklySchedule) setSchedule({ ...DEFAULT, ...data.weeklySchedule } as WeeklySchedule)
        setUpcomingCount(data.upcomingSlotCount ?? 0)
      })
      .catch((err) => {
        console.error("[disponibilites] fetch error:", err)
        toast.error("Impossible de charger les disponibilités")
      })
      .finally(() => setLoading(false))
  }, [])

  function setDay(key: DayKey, patch: Partial<DaySchedule>) {
    setSchedule((s) => ({ ...s, [key]: { ...s[key], ...patch } }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const body = { ...schedule }
      if (!body.lunchEnabled) { body.lunchStart = ""; body.lunchEnd = "" }
      const res = await fetch("/api/dashboard/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setUpcomingCount(data.generated)
      toast.success(`${data.generated} créneaux générés pour les 60 prochains jours`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur inattendue")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="view active">
        <div className="view-head"><h1>Disponibilités</h1></div>
        <p style={{ color: "var(--mute)", fontFamily: "var(--serif)", fontStyle: "italic" }}>Chargement…</p>
      </div>
    )
  }

  return (
    <div className="view active">
      <div className="view-head">
        <div>
          <h1>Disponibilités</h1>
          <p className="lede">Définissez vos horaires de travail hebdomadaires. Les créneaux seront générés automatiquement pour les 60 prochains jours.</p>
        </div>
        <div className="actions">
          {upcomingCount !== null && (
            <span style={{ fontSize: 13, color: "var(--mute)" }}>
              {upcomingCount} créneau{upcomingCount !== 1 ? "x" : ""} à venir
            </span>
          )}
          <button className="tbtn" onClick={handleSave} disabled={saving}>
            {saving ? "Génération…" : "Générer les créneaux"}
          </button>
        </div>
      </div>

      <div className="row-2" style={{ gap: 18 }}>
        {/* Weekly schedule */}
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Horaires hebdomadaires</h3>
              <div className="sub">Activez les jours travaillés et définissez les heures</div>
            </div>
          </div>

          <div>
            {DAYS.map((key) => {
              const day = schedule[key]
              return (
                <div key={key} className="hours-row">
                  <div className="day">{DAY_LABELS[key]}</div>
                  <label
                    className={`switch${day.enabled ? " on" : ""}`}
                    onClick={() => setDay(key, { enabled: !day.enabled })}
                    aria-label={`Activer ${DAY_LABELS[key]}`}
                  />
                  {day.enabled ? (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input
                          type="time"
                          value={day.start}
                          onChange={(e) => setDay(key, { start: e.target.value })}
                          style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "5px 10px", fontFamily: "var(--sans)", fontSize: 13 }}
                        />
                        <span style={{ color: "var(--mute)" }}>→</span>
                        <input
                          type="time"
                          value={day.end}
                          onChange={(e) => setDay(key, { end: e.target.value })}
                          style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "5px 10px", fontFamily: "var(--sans)", fontSize: 13 }}
                        />
                      </div>
                      <span style={{ fontSize: 12, color: "var(--mute)", whiteSpace: "nowrap" }}>
                        {countSlots(day.start, day.end, schedule.slotDurationMin, schedule.lunchEnabled ? schedule.lunchStart : undefined, schedule.lunchEnabled ? schedule.lunchEnd : undefined)} créneaux
                      </span>
                    </>
                  ) : (
                    <span style={{ fontSize: 13, color: "var(--mute)", fontStyle: "italic", gridColumn: "3 / -1" }}>Repos</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Settings */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="card">
            <div className="card-head">
              <div>
                <h3>Durée des créneaux</h3>
                <div className="sub">Durée par défaut pour chaque rendez-vous</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => setSchedule((s) => ({ ...s, slotDurationMin: d }))}
                  className={`tab-mini${schedule.slotDurationMin === d ? " active" : ""}`}
                >
                  {d} min
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div>
                <h3>Pause déjeuner</h3>
                <div className="sub">Bloquer une plage horaire sans créneaux</div>
              </div>
              <label
                className={`switch${schedule.lunchEnabled ? " on" : ""}`}
                onClick={() => setSchedule((s) => ({ ...s, lunchEnabled: !s.lunchEnabled }))}
              />
            </div>
            {schedule.lunchEnabled && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
                <input
                  type="time"
                  value={schedule.lunchStart}
                  onChange={(e) => setSchedule((s) => ({ ...s, lunchStart: e.target.value }))}
                  style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "5px 10px", fontFamily: "var(--sans)", fontSize: 13 }}
                />
                <span style={{ color: "var(--mute)" }}>→</span>
                <input
                  type="time"
                  value={schedule.lunchEnd}
                  onChange={(e) => setSchedule((s) => ({ ...s, lunchEnd: e.target.value }))}
                  style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "5px 10px", fontFamily: "var(--sans)", fontSize: 13 }}
                />
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-head">
              <div>
                <h3>Résumé</h3>
                <div className="sub">Créneaux générés par votre planning</div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {DAYS.filter((k) => schedule[k].enabled).map((k) => {
                const count = countSlots(
                  schedule[k].start, schedule[k].end, schedule.slotDurationMin,
                  schedule.lunchEnabled ? schedule.lunchStart : undefined,
                  schedule.lunchEnabled ? schedule.lunchEnd : undefined
                )
                return (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0", borderBottom: "1px dashed var(--line)" }}>
                    <span style={{ fontFamily: "var(--serif)", fontSize: 15 }}>{DAY_LABELS[k]}</span>
                    <span style={{ color: "var(--terra)" }}>{count} cr.</span>
                  </div>
                )
              })}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, paddingTop: 8, fontWeight: 600 }}>
                <span>Par semaine</span>
                <span style={{ fontFamily: "var(--serif)", fontSize: 18, color: "var(--ink)" }}>
                  {DAYS.filter((k) => schedule[k].enabled).reduce((acc, k) =>
                    acc + countSlots(schedule[k].start, schedule[k].end, schedule.slotDurationMin,
                      schedule.lunchEnabled ? schedule.lunchStart : undefined,
                      schedule.lunchEnabled ? schedule.lunchEnd : undefined), 0)} créneaux
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}

function countSlots(start: string, end: string, dur: number, lunchStart?: string, lunchEnd?: string) {
  if (!start || !end) return 0
  const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m }
  let cur = toMin(start)
  const endMin = toMin(end)
  const lS = lunchStart ? toMin(lunchStart) : null
  const lE = lunchEnd ? toMin(lunchEnd) : null
  let count = 0
  while (cur + dur <= endMin) {
    const slotEnd = cur + dur
    if (lS !== null && lE !== null && cur < lE && slotEnd > lS) { cur = lE; continue }
    count++; cur += dur
  }
  return count
}
