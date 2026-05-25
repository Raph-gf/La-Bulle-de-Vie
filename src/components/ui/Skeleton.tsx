import type { CSSProperties } from "react"

const DOW = ["L", "M", "M", "J", "V", "S", "D"]

// ── Primitive ──────────────────────────────────────────────────────
interface SkProps { className?: string; style?: CSSProperties; dark?: boolean }

export function Skeleton({ className, style, dark }: SkProps) {
  const darkStyle: CSSProperties = dark ? {
    background: "linear-gradient(90deg, #2A1F18 25%, #3D2B1A 50%, #2A1F18 75%)",
    backgroundSize: "200% 100%",
  } : {}
  return (
    <div
      className={`sk${className ? ` ${className}` : ""}`}
      style={{ ...darkStyle, ...style }}
      aria-hidden
    />
  )
}

// ── Dashboard KPI grid (4 tiles: 1 dark featured + 3 light) ───────
export function KpiGridSkeleton() {
  return (
    <div className="kpi-grid">
      {/* Featured dark tile */}
      <div className="kpi feat">
        <Skeleton dark style={{ width: 80, height: 11 }} />
        <Skeleton dark style={{ width: 130, height: 42, marginTop: 14 }} />
        <Skeleton dark style={{ width: 70, height: 11, marginTop: 12 }} />
      </div>
      {/* 3 regular tiles */}
      {[0, 1, 2].map(i => (
        <div key={i} className="kpi">
          <Skeleton style={{ width: 72, height: 10 }} />
          <Skeleton style={{ width: 110, height: 36, marginTop: 14 }} />
          <Skeleton style={{ width: 56, height: 10, marginTop: 12 }} />
        </div>
      ))}
    </div>
  )
}

// ── Dashboard today-agenda rows (3 appt rows) ──────────────────────
export function AgendaRowsSkeleton() {
  return (
    <div className="agenda-list">
      {[0, 1, 2].map(i => (
        <div key={i} className="sk-appt">
          {/* time col */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Skeleton style={{ width: 52, height: 20 }} />
            <Skeleton style={{ width: 36, height: 10 }} />
          </div>
          {/* dot col */}
          <Skeleton style={{ width: 10, height: 10, borderRadius: "50%", justifySelf: "center" }} />
          {/* who col */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Skeleton style={{ width: "60%", height: 16 }} />
            <Skeleton style={{ width: "80%", height: 11 }} />
          </div>
          {/* pill col */}
          <Skeleton style={{ width: 72, height: 24, borderRadius: 99 }} />
        </div>
      ))}
    </div>
  )
}

// ── Booking wizard — calendar date cells ──────────────────────────
// DOW headers stay real; only the ~35 date cells shimmer
export function CalendarSkeleton({ days = 35 }: { days?: number }) {
  return (
    <div className="cal-grid">
      {DOW.map(d => (
        <div key={d} className="cal-dow">{d}</div>
      ))}
      {Array.from({ length: days }, (_, i) => (
        <Skeleton key={i} style={{ aspectRatio: "1", borderRadius: 6 }} />
      ))}
    </div>
  )
}

// ── Booking wizard — time slot pills ──────────────────────────────
export function SlotsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} style={{ height: 58, borderRadius: 8 }} />
      ))}
    </>
  )
}

// ── /compte — upcoming appointment cards ──────────────────────────
export function AppointmentCardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          style={{
            background: "#fff", border: "1px solid var(--line)", borderRadius: 12,
            padding: "16px 18px", display: "flex", gap: 14, alignItems: "center",
          }}
        >
          <Skeleton style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0 }} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
            <Skeleton style={{ width: "50%", height: 15 }} />
            <Skeleton style={{ width: "70%", height: 11 }} />
          </div>
          <Skeleton style={{ width: 80, height: 26, borderRadius: 99, flexShrink: 0 }} />
        </div>
      ))}
    </div>
  )
}
