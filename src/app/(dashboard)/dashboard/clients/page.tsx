"use client"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import {
  useClients,
  useClientDetail,
  useUpdateClientNotes,
  type ClientSummary,
  type ClientSortKey,
} from "@/lib/queries/clients"

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function fmtPrice(cents: number) {
  return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })
}

function fmtDuration(min: number) {
  return min >= 60
    ? `${Math.floor(min / 60)}h${min % 60 ? min % 60 : ""}`
    : `${min} min`
}

const STATUS: Record<string, { label: string; cls: string }> = {
  confirmed: { label: "Confirmé", cls: "ok" },
  completed: { label: "Terminé", cls: "muted" },
  pending:   { label: "En attente", cls: "pending" },
  cancelled: { label: "Annulé", cls: "danger" },
}

// ── KPI bar ───────────────────────────────────────────────────────────────────

function KpiBar({ clients }: { clients: ClientSummary[] }) {
  const totalSessions  = clients.reduce((s, c) => s + c.totalSessions, 0)
  const totalRevenue   = clients.reduce((s, c) => s + c.totalSpentCents, 0)
  const monthStart     = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
  const newThisMonth   = clients.filter((c) => new Date(c.joinedAt) >= monthStart).length

  return (
    <div className="prest-kpis">
      <div className="prest-kpi feat">
        <div className="num">{clients.length}</div>
        <div className="meta">
          <div className="lbl">Clients</div>
          <div className="sub">au total</div>
        </div>
      </div>
      <div className="prest-kpi">
        <div className="num">{totalSessions}</div>
        <div className="meta">
          <div className="lbl">Séances</div>
          <div className="sub">confirmées</div>
        </div>
      </div>
      <div className="prest-kpi">
        <div className="num" style={{ fontSize: 24 }}>{fmtPrice(totalRevenue)}</div>
        <div className="meta">
          <div className="lbl">CA total</div>
          <div className="sub">hors remises</div>
        </div>
      </div>
      <div className="prest-kpi">
        <div className="num">{newThisMonth}</div>
        <div className="meta">
          <div className="lbl">Nouveaux</div>
          <div className="sub">ce mois-ci</div>
        </div>
      </div>
    </div>
  )
}

// ── Detail panel ──────────────────────────────────────────────────────────────

function DetailPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, isLoading } = useClientDetail(id)
  const updateNotes = useUpdateClientNotes()
  const [notes, setNotes] = useState("")
  const [dirty, setDirty] = useState(false)

  // Sync notes when a different client is loaded
  useEffect(() => {
    if (data) {
      setNotes(data.specialistNotes ?? "")
      setDirty(false)
    }
  }, [data?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    try {
      await updateNotes.mutateAsync({ id, notes })
      toast.success("Notes sauvegardées.")
      setDirty(false)
    } catch {
      toast.error("Erreur lors de la sauvegarde.")
    }
  }

  return (
    <div className="card client-detail">
      {isLoading ? (
        <div style={{ color: "var(--mute)", fontSize: 13, textAlign: "center", padding: "48px 0" }}>
          Chargement…
        </div>
      ) : !data ? null : (
        <>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <div className="av-lg">{initials(data.fullName)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ marginTop: 0, marginBottom: 0 }}>
                {data.fullName}
                {data.totalSessions >= 5 && (
                  <span className="flag-vip">Fidèle</span>
                )}
              </h3>
              <div className="meta">
                {data.phone && <span>{data.phone}</span>}
                {data.preferredLocation && (
                  <span>
                    {data.preferredLocation === "cabinet" ? "Cabinet" : "Domicile"}
                  </span>
                )}
                <span>Client depuis {fmtDate(data.createdAt)}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="slideover-close"
              aria-label="Fermer le panneau"
            >
              ✕
            </button>
          </div>

          {/* Stats */}
          <div className="stats">
            <div>
              <div className="n">{data.totalSessions}</div>
              <div className="l">Séances</div>
            </div>
            <div>
              <div className="n" style={{ fontSize: 20 }}>{fmtPrice(data.totalSpentCents)}</div>
              <div className="l">Dépensé</div>
            </div>
            {data.firstVisitDate && (
              <div>
                <div className="n" style={{ fontSize: 16, lineHeight: 1.3 }}>
                  {fmtDate(data.firstVisitDate)}
                </div>
                <div className="l">1ère visite</div>
              </div>
            )}
          </div>

          {/* Private notes */}
          <div style={{ marginTop: 20 }}>
            <div
              style={{
                fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase",
                color: "var(--mute)", marginBottom: 8,
              }}
            >
              Notes privées
            </div>
            <textarea
              className="so-textarea"
              rows={4}
              placeholder="Préférences, contre-indications, observations…"
              value={notes}
              onChange={(e) => { setNotes(e.target.value); setDirty(true) }}
              style={{ background: "#FFF9EE", border: "1px dashed #E9D5B5" }}
            />
            {dirty && (
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
                <button
                  className="tbtn"
                  onClick={handleSave}
                  disabled={updateNotes.isPending}
                  style={{ fontSize: 12, padding: "7px 14px" }}
                >
                  {updateNotes.isPending ? "Sauvegarde…" : "Sauvegarder"}
                </button>
              </div>
            )}
          </div>

          {/* Appointment history */}
          <div className="history">
            <h4>Historique ({data.appointments.length})</h4>
            {data.appointments.length === 0 ? (
              <div style={{ color: "var(--mute)", fontSize: 13, fontStyle: "italic" }}>
                Aucun rendez-vous.
              </div>
            ) : (
              data.appointments.slice(0, 10).map((appt) => {
                const st = STATUS[appt.status] ?? { label: appt.status, cls: "" }
                return (
                  <div className="history-row" key={appt.id}>
                    <div>
                      <div style={{ fontFamily: "var(--serif)", fontSize: 15 }}>
                        {appt.service.name}
                        {appt.isFirstVisit && (
                          <span
                            style={{
                              fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase",
                              color: "var(--terra)", marginLeft: 8,
                            }}
                          >
                            1ère fois
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--mute)", marginTop: 3 }}>
                        {fmtDate(appt.slot.date)} · {appt.slot.startTime}
                        {" · "}{fmtDuration(appt.service.durationMinutes)}
                      </div>
                      {appt.review && (
                        <div style={{ fontSize: 12, color: "#C4956A", marginTop: 3 }}>
                          {"★".repeat(appt.review.stars)}{"☆".repeat(5 - appt.review.stars)}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                      <span className={`status ${st.cls}`}>{st.label}</span>
                      {appt.amountPaid != null && appt.amountPaid > 0 && (
                        <span style={{ fontSize: 12, color: "var(--mute)" }}>
                          {fmtPrice(appt.amountPaid)}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ClientsPage() {
  const [search, setSearch]           = useState("")
  const [debouncedSearch, setDebounced] = useState("")
  const [sort, setSort]               = useState<ClientSortKey>("lastVisit")
  const [selectedId, setSelectedId]   = useState<string | null>(null)

  // 300 ms debounce on search input
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const { data: clients = [], isLoading, isError } = useClients(debouncedSearch, sort)

  function handleRowClick(id: string) {
    setSelectedId((prev) => (prev === id ? null : id))
  }

  return (
    <div className="view active">
      {/* Page header */}
      <div className="view-head">
        <div>
          <h1>Clients</h1>
          <p className="lede">Historique des séances, notes privées et suivi de vos clients.</p>
        </div>
      </div>

      {/* KPI bar — computed from loaded list */}
      {!isLoading && !isError && <KpiBar clients={clients} />}

      {/* Filter bar */}
      <div className="filter-bar">
        <span className="lbl">Rechercher</span>
        <input
          type="search"
          placeholder="Nom ou téléphone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="spacer" />
        <span className="lbl">Trier par</span>
        <select value={sort} onChange={(e) => setSort(e.target.value as ClientSortKey)}>
          <option value="lastVisit">Dernière visite</option>
          <option value="name">Nom</option>
          <option value="sessions">Séances</option>
          <option value="totalSpent">Montant dépensé</option>
        </select>
      </div>

      {/* Body: table + optional detail panel */}
      <div className={selectedId ? "split" : ""}>
        {/* Left — client table */}
        <div>
          {isLoading && (
            <div style={{ color: "var(--mute)", fontSize: 13, padding: "48px 0", textAlign: "center" }}>
              Chargement des clients…
            </div>
          )}
          {isError && (
            <div style={{ color: "var(--terra)", fontSize: 13, padding: "48px 0", textAlign: "center" }}>
              Erreur lors du chargement. Rechargez la page.
            </div>
          )}
          {!isLoading && !isError && clients.length === 0 && (
            <div className="rev-empty">
              <div className="ic" style={{ fontSize: 36, marginBottom: 14, opacity: .4 }}>👤</div>
              <p>Aucun client trouvé.</p>
              {debouncedSearch && (
                <div className="sub">Essayez un autre nom ou numéro de téléphone.</div>
              )}
            </div>
          )}
          {!isLoading && !isError && clients.length > 0 && (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Séances</th>
                    <th>Dernière visite</th>
                    <th>Dépensé</th>
                    <th style={{ width: 40 }} />
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => handleRowClick(c.id)}
                      style={{
                        background: c.id === selectedId ? "var(--cream)" : undefined,
                        outline: c.id === selectedId ? "2px solid var(--terra-soft)" : undefined,
                        outlineOffset: -1,
                      }}
                    >
                      <td>
                        <div className="avname">
                          <div className="av">{initials(c.fullName)}</div>
                          <div>
                            <div>{c.fullName}</div>
                            {c.phone && <div className="em">{c.phone}</div>}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontFamily: "var(--serif)", fontSize: 18 }}>
                          {c.totalSessions}
                        </span>
                        {c.totalSessions >= 5 && (
                          <span className="flag-vip" style={{ marginLeft: 8 }}>Fidèle</span>
                        )}
                      </td>
                      <td style={{ color: "var(--mute)", fontSize: 13 }}>
                        {c.lastVisitDate ? fmtDate(c.lastVisitDate) : "—"}
                      </td>
                      <td style={{ fontFamily: "var(--serif)", fontSize: 15 }}>
                        {fmtPrice(c.totalSpentCents)}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {c.hasNotes && (
                          <span
                            title="Note privée existante"
                            style={{ color: "var(--terra)", fontSize: 14, opacity: .7 }}
                          >
                            ✏
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right — sticky detail panel */}
        {selectedId && (
          <DetailPanel id={selectedId} onClose={() => setSelectedId(null)} />
        )}
      </div>
    </div>
  )
}
