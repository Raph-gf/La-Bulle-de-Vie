"use client"
import { useState } from "react"
import { KpiGridSkeleton } from "@/components/ui/Skeleton"
import {
  useFinances,
  type MonthlyBucket,
  type TopService,
  type FinanceTransaction,
  type RefundItem,
  type StripePayout,
} from "@/lib/queries/finances"

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtPrice(cents: number) {
  return (cents / 100).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  })
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function fmtUnix(ts: number) {
  return new Date(ts * 1000).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function fmtMonthLabel(m: string) {
  const [y, mo] = m.split("-").map(Number)
  return new Date(y, mo - 1).toLocaleDateString("fr-FR", { month: "short" })
}

const REFUND_STATUS: Record<string, { label: string; cls: string }> = {
  none:      { label: "OK",             cls: "ok" },
  requested: { label: "Remb. demandé", cls: "pending" },
  refunded:  { label: "Remboursé",     cls: "danger" },
}

const PAYOUT_STATUS: Record<string, { label: string; cls: string }> = {
  paid:       { label: "Viré",       cls: "ok" },
  pending:    { label: "En transit", cls: "pending" },
  in_transit: { label: "En transit", cls: "pending" },
  failed:     { label: "Échoué",     cls: "danger" },
  canceled:   { label: "Annulé",     cls: "danger" },
}

// ── Bar chart ─────────────────────────────────────────────────────────────────

function RevenueChart({ data }: { data: MonthlyBucket[] }) {
  const [hovered, setHovered] = useState<number | null>(null)

  const W = 600, H = 220
  const PAD = { left: 60, right: 8, top: 28, bottom: 28 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom
  const maxValue = Math.max(...data.map((d) => d.totalCents), 100)
  const barW = chartW / data.length
  const GAP = 8

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
        {/* Grid lines */}
        <g className="chart-grid">
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
            const y = PAD.top + chartH * (1 - pct)
            return <line key={pct} x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} />
          })}
        </g>

        {/* Y-axis labels */}
        <g className="chart-axis">
          {[0, 0.5, 1].map((pct) => {
            const y = PAD.top + chartH * (1 - pct)
            return (
              <text key={pct} x={PAD.left - 8} y={y + 4} textAnchor="end">
                {fmtPrice(maxValue * pct)}
              </text>
            )
          })}
        </g>

        {/* Bars + labels */}
        {data.map((d, i) => {
          const barH = Math.max((d.totalCents / maxValue) * chartH, d.totalCents > 0 ? 3 : 0)
          const x = PAD.left + i * barW + GAP / 2
          const y = PAD.top + chartH - barH
          const w = barW - GAP
          const isHov = hovered === i

          return (
            <g key={d.month}>
              <rect
                x={x} y={y} width={w} height={Math.max(barH, 1)}
                className="chart-bar"
                rx={3}
                style={isHov ? { fill: "var(--terra)" } : undefined}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />
              {/* X-axis label */}
              <text
                x={x + w / 2} y={H - 4}
                textAnchor="middle" fontSize={9}
                fontFamily="var(--sans)" fill="var(--mute)"
              >
                {fmtMonthLabel(d.month)}
              </text>
              {/* Hover tooltip */}
              {isHov && (
                <g>
                  <rect x={x + w / 2 - 38} y={y - 28} width={76} height={22} rx={4} fill="var(--ink)" />
                  <text
                    x={x + w / 2} y={y - 12}
                    textAnchor="middle" fontSize={11}
                    fontFamily="var(--serif)" fill="#fff"
                  >
                    {d.totalCents > 0 ? fmtPrice(d.totalCents) : "—"}
                  </text>
                </g>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ── Top services ──────────────────────────────────────────────────────────────

function TopServicesCard({ services, totalCents }: { services: TopService[]; totalCents: number }) {
  return (
    <div className="card">
      <div className="card-head">
        <div>
          <h3>Top prestations</h3>
          <div className="sub">12 derniers mois</div>
        </div>
      </div>
      {services.length === 0 ? (
        <div style={{ color: "var(--mute)", fontSize: 13, fontStyle: "italic" }}>Aucune donnée.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {services.map((s, i) => {
            const pct = totalCents > 0 ? (s.totalCents / totalCents) * 100 : 0
            return (
              <div key={s.name}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 13 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: "var(--serif)", fontSize: 16, color: "var(--terra)", minWidth: 14 }}>
                      {i + 1}
                    </span>
                    {s.name}
                  </span>
                  <span style={{ fontFamily: "var(--serif)", fontSize: 15 }}>{fmtPrice(s.totalCents)}</span>
                </div>
                <div style={{ height: 4, background: "var(--cream)", borderRadius: 2 }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: "var(--terra)", borderRadius: 2, transition: "width .6s ease" }} />
                </div>
                <div style={{ fontSize: 11, color: "var(--mute)", marginTop: 3 }}>
                  {s.count} séance{s.count > 1 ? "s" : ""}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Stripe payouts ────────────────────────────────────────────────────────────

function PayoutsCard({ payouts }: { payouts: StripePayout[] }) {
  return (
    <div className="card">
      <div className="card-head">
        <div>
          <h3>Virements Stripe</h3>
          <div className="sub">Transferts vers votre banque</div>
        </div>
      </div>
      {payouts.length === 0 ? (
        <div style={{ color: "var(--mute)", fontSize: 13, fontStyle: "italic" }}>
          Aucun virement — mode test actif.
        </div>
      ) : (
        <div>
          {payouts.map((p, idx) => {
            const st = PAYOUT_STATUS[p.status] ?? { label: p.status, cls: "" }
            return (
              <div
                key={p.id}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 0",
                  borderBottom: idx < payouts.length - 1 ? "1px dashed var(--line)" : "none",
                }}
              >
                <div>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 16 }}>{fmtPrice(p.amountCents)}</div>
                  <div style={{ fontSize: 11, color: "var(--mute)", marginTop: 2 }}>
                    Arrivée : {fmtUnix(p.arrivalDate)}
                  </div>
                </div>
                <span className={`status ${st.cls}`}>{st.label}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Transactions table ────────────────────────────────────────────────────────

function TransactionsTable({ transactions }: { transactions: FinanceTransaction[] }) {
  const [filter, setFilter] = useState<"all" | "refunded">("all")

  const visible = filter === "refunded"
    ? transactions.filter((t) => t.refundStatus !== "none")
    : transactions

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h3 style={{ fontFamily: "var(--serif)", fontSize: 22, margin: 0 }}>Transactions</h3>
        <div style={{ display: "flex", gap: 6 }}>
          {(["all", "refunded"] as const).map((f) => (
            <button key={f} className={`tab-mini${filter === f ? " active" : ""}`} onClick={() => setFilter(f)}>
              {f === "all" ? "Toutes" : "Remboursées"}
            </button>
          ))}
        </div>
      </div>
      {visible.length === 0 ? (
        <div style={{ color: "var(--mute)", fontSize: 13, fontStyle: "italic", padding: "28px 22px" }}>
          Aucune transaction.
        </div>
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th>Date</th>
              <th>Client</th>
              <th>Prestation</th>
              <th>Montant</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((t) => {
              const st = REFUND_STATUS[t.refundStatus] ?? { label: t.refundStatus, cls: "" }
              return (
                <tr key={t.id}>
                  <td style={{ color: "var(--mute)", fontSize: 13, whiteSpace: "nowrap" }}>
                    {fmtDate(t.date)}
                    <span style={{ display: "block", fontSize: 11 }}>{t.startTime}</span>
                  </td>
                  <td>
                    {t.clientName}
                    {t.isFirstVisit && (
                      <span style={{ marginLeft: 6, fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--terra)" }}>
                        1ère
                      </span>
                    )}
                  </td>
                  <td style={{ color: "var(--mute)", fontSize: 13 }}>{t.serviceName}</td>
                  <td>
                    <span style={{ fontFamily: "var(--serif)", fontSize: 16 }}>
                      {t.amountPaid != null ? fmtPrice(t.amountPaid) : "—"}
                    </span>
                    {t.discountAmount > 0 && (
                      <span style={{ display: "block", fontSize: 11, color: "var(--terra)" }}>
                        −{fmtPrice(t.discountAmount)} remise
                      </span>
                    )}
                    {t.travelFee > 0 && (
                      <span style={{ display: "block", fontSize: 11, color: "var(--mute)" }}>
                        +{fmtPrice(t.travelFee)} déplacement
                      </span>
                    )}
                  </td>
                  <td><span className={`status ${st.cls}`}>{st.label}</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ── Refunds card ──────────────────────────────────────────────────────────────

function RefundsCard({ refunds }: { refunds: RefundItem[] }) {
  if (refunds.length === 0) return null
  return (
    <div className="card">
      <div className="card-head">
        <div>
          <h3>Remboursements</h3>
          <div className="sub">{refunds.length} dossier{refunds.length > 1 ? "s" : ""}</div>
        </div>
      </div>
      <table className="tbl" style={{ marginTop: -4 }}>
        <thead>
          <tr>
            <th>Date</th><th>Client</th><th>Prestation</th><th>Montant</th><th>Statut</th>
          </tr>
        </thead>
        <tbody>
          {refunds.map((r) => {
            const st = REFUND_STATUS[r.refundStatus] ?? { label: r.refundStatus, cls: "" }
            return (
              <tr key={r.id}>
                <td style={{ color: "var(--mute)", fontSize: 13 }}>{fmtDate(r.date)}</td>
                <td>{r.clientName}</td>
                <td style={{ color: "var(--mute)", fontSize: 13 }}>{r.serviceName}</td>
                <td style={{ fontFamily: "var(--serif)", fontSize: 16 }}>
                  {r.amountPaid != null ? fmtPrice(r.amountPaid) : "—"}
                </td>
                <td><span className={`status ${st.cls}`}>{st.label}</span></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function FinancesPage() {
  const { data, isLoading, isError } = useFinances()

  if (isLoading) {
    return (
      <div className="view active">
        <div className="view-head"><div><h1>Finances</h1></div></div>
        <KpiGridSkeleton />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginTop: 18 }}>
          <div className="card">
            <div className="sk" style={{ width: 120, height: 18, marginBottom: 24 }} />
            <div className="sk" style={{ width: "100%", height: 180, borderRadius: 10 }} />
          </div>
          <div className="card">
            <div className="sk" style={{ width: 100, height: 18, marginBottom: 24 }} />
            {[0,1,2,3].map(i => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <div className="sk" style={{ width: 130, height: 12 }} />
                <div className="sk" style={{ flex: 1, height: 8, borderRadius: 99 }} />
                <div className="sk" style={{ width: 50, height: 12 }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="view active">
        <div className="view-head"><div><h1>Finances</h1></div></div>
        <div style={{ color: "var(--terra)", fontSize: 13, padding: "60px 0", textAlign: "center" }}>
          Erreur lors du chargement. Rechargez la page.
        </div>
      </div>
    )
  }

  const { kpis, monthly, transactions, topServices, refunds, payouts } = data
  const totalLast12 = monthly.reduce((s, m) => s + m.totalCents, 0)
  const hasStripe = kpis.availableBalance !== null

  return (
    <div className="view active">
      {/* Header */}
      <div className="view-head">
        <div>
          <h1>Finances</h1>
          <p className="lede">Revenus, transactions et virements Stripe.</p>
        </div>
      </div>

      {/* 4 main KPI tiles */}
      <div className="kpi-grid" style={{ marginBottom: 18 }}>
        <div className="kpi feat">
          <div className="lbl">Chiffre d'affaires</div>
          <div className="v">{fmtPrice(kpis.allTimeCents)}</div>
          <div className="delta up">
            <span className="arr">↑</span>
            {kpis.allTimeCount} séance{kpis.allTimeCount !== 1 ? "s" : ""} payée{kpis.allTimeCount !== 1 ? "s" : ""}
          </div>
        </div>
        <div className="kpi">
          <div className="lbl">Ce mois-ci</div>
          <div className="v" style={{ fontSize: 34 }}>{fmtPrice(kpis.thisMonthCents)}</div>
          <div className="delta" style={{ color: "var(--mute)", fontSize: 12 }}>mois en cours</div>
        </div>
        <div className="kpi">
          <div className="lbl">7 derniers jours</div>
          <div className="v" style={{ fontSize: 34 }}>{fmtPrice(kpis.thisWeekCents)}</div>
          <div className="delta" style={{ color: "var(--mute)", fontSize: 12 }}>glissant</div>
        </div>
        <div className="kpi">
          <div className="lbl">Panier moyen</div>
          <div className="v" style={{ fontSize: 34 }}>{fmtPrice(kpis.avgPerSessionCents)}</div>
          <div className="delta" style={{ color: "var(--mute)", fontSize: 12 }}>par séance</div>
        </div>
      </div>

      {/* Stripe balance row */}
      <div className="row-2-eq" style={{ marginBottom: 18 }}>
        <div className="kpi" style={{ borderLeft: "3px solid #5C8262" }}>
          <div className="lbl">Solde disponible · Stripe</div>
          <div className="v" style={{ fontSize: 34 }}>
            {hasStripe ? fmtPrice(kpis.availableBalance!) : "—"}
          </div>
          <div className="delta" style={{ color: "var(--mute)", fontSize: 12 }}>
            {hasStripe ? "Prêt à virer vers votre banque" : "Mode test — aucune donnée réelle"}
          </div>
        </div>
        <div className="kpi" style={{ borderLeft: "3px solid #C9923F" }}>
          <div className="lbl">Solde en attente · Stripe</div>
          <div className="v" style={{ fontSize: 34 }}>
            {hasStripe ? fmtPrice(kpis.pendingBalance!) : "—"}
          </div>
          <div className="delta" style={{ color: "var(--mute)", fontSize: 12 }}>
            {hasStripe ? "Paiements récents en cours de traitement" : "Disponible en production"}
          </div>
        </div>
      </div>

      {/* Chart + right column */}
      <div className="row-2" style={{ marginBottom: 18 }}>
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Revenus mensuels</h3>
              <div className="sub">12 derniers mois · {fmtPrice(totalLast12)} au total</div>
            </div>
          </div>
          <RevenueChart data={monthly} />
        </div>
        <div className="col-stack">
          <TopServicesCard services={topServices} totalCents={totalLast12} />
          <PayoutsCard payouts={payouts} />
        </div>
      </div>

      {/* Transactions */}
      <div style={{ marginBottom: 18 }}>
        <TransactionsTable transactions={transactions} />
      </div>

      {/* Refunds — only shown when there are some */}
      <RefundsCard refunds={refunds} />
    </div>
  )
}
