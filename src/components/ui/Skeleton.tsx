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

// ── /soins/[id] — full-page soin detail skeleton ──────────────────
export function SoinPageSkeleton() {
  return (
    <>
      {/* Dark hero */}
      <div className="soin-hero">
        <div className="wrap">
          <div className="soin-hero-grid">
            <div>
              <Skeleton dark style={{ width: 120, height: 12, marginBottom: 20 }} />
              <Skeleton dark style={{ width: "70%", height: 80 }} />
              <Skeleton dark style={{ width: "50%", height: 80, marginTop: 8 }} />
              <div style={{ display: "flex", gap: 10, marginTop: 28 }}>
                {[90, 110, 80].map((w, i) => (
                  <Skeleton key={i} dark style={{ width: w, height: 34, borderRadius: 99 }} />
                ))}
              </div>
              <Skeleton dark style={{ width: "65%", height: 16, marginTop: 28 }} />
              <Skeleton dark style={{ width: "50%", height: 16, marginTop: 8 }} />
            </div>
            {/* Aside glass card */}
            <div style={{
              background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 16, padding: 28, display: "flex", flexDirection: "column", gap: 16,
            }}>
              {[100, 130, 90, 110].map((w, i) => (
                <Skeleton key={i} dark style={{ width: w, height: 14 }} />
              ))}
              <Skeleton dark style={{ width: "100%", height: 44, borderRadius: 10, marginTop: 8 }} />
            </div>
          </div>
        </div>
      </div>

      {/* Facts strip */}
      <div className="facts-row">
        <div className="wrap">
          <div className="facts-grid">
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <Skeleton style={{ width: 32, height: 32, borderRadius: 8 }} />
                <Skeleton style={{ width: "60%", height: 12 }} />
                <Skeleton style={{ width: "40%", height: 11 }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Body — 2-col layout */}
      <div className="soin-body">
        <div className="wrap">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 48 }}>
            {/* Main content */}
            <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
              {[["80%", "60%", "90%", "70%"], ["65%", "85%", "55%"]].map((lines, si) => (
                <div key={si} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <Skeleton style={{ width: "35%", height: 28, marginBottom: 6 }} />
                  {lines.map((w, li) => <Skeleton key={li} style={{ width: w, height: 14 }} />)}
                </div>
              ))}
            </div>
            {/* Aside */}
            <div style={{
              background: "#fff", border: "1px solid var(--line)",
              borderRadius: 16, padding: 28, display: "flex", flexDirection: "column", gap: 14,
            }}>
              <Skeleton style={{ width: "55%", height: 22 }} />
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Skeleton style={{ width: "45%", height: 13 }} />
                  <Skeleton style={{ width: "30%", height: 13 }} />
                </div>
              ))}
              <Skeleton style={{ width: "100%", height: 48, borderRadius: 10, marginTop: 8 }} />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ── /decorations — product catalog grid (6 dark cards) ────────────
export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="cat-grid">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="cat-card" aria-hidden style={{ opacity: 0.7 }}>
          {/* Dark shimmer fills the card; gradient overlaid to look like the real card */}
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(90deg, #1a110b 25%, #2A1A10 50%, #1a110b 75%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.6s ease infinite",
          }} />
        </div>
      ))}
    </div>
  )
}

// ── Booking wizard — travel fee inline shimmer ─────────────────────
export function TravelFeeSkeleton() {
  return <Skeleton style={{ width: 200, height: 13, borderRadius: 4, marginTop: 6 }} />
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
