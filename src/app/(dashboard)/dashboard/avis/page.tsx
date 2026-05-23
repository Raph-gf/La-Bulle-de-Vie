"use client"
import { useState } from "react"
import { toast } from "sonner"
import { useReviews, useApproveReview, useHideReview, useReplyReview, type Review } from "@/lib/queries/reviews"

// ── Helpers ──────────────────────────────────────────────────────────
function Stars({ n }: { n: number }) {
  return (
    <div className="rev-stars" aria-label={`${n} étoiles sur 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={`rev-star ${i < n ? "filled" : "empty"}`}>★</span>
      ))}
    </div>
  )
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const d = Math.floor(diff / 86400000)
  if (d === 0) return "aujourd'hui"
  if (d === 1) return "hier"
  if (d < 7) return `il y a ${d} jours`
  if (d < 30) return `il y a ${Math.floor(d / 7)} sem.`
  if (d < 365) return `il y a ${Math.floor(d / 30)} mois`
  return `il y a ${Math.floor(d / 365)} an${Math.floor(d / 365) > 1 ? "s" : ""}`
}

// ── Review card ──────────────────────────────────────────────────────
function ReviewCard({ review }: { review: Review }) {
  const [replyOpen, setReplyOpen] = useState(false)
  const [replyText, setReplyText] = useState(review.specialistReply ?? "")
  const approve = useApproveReview()
  const hide = useHideReview()
  const reply = useReplyReview()

  const initial = review.client.fullName.charAt(0).toUpperCase()

  async function handleApprove() {
    await approve.mutateAsync(review.id)
    toast.success("Avis approuvé — il est maintenant visible publiquement.")
  }

  async function handleHide() {
    await hide.mutateAsync(review.id)
    toast.success("Avis masqué.")
  }

  async function handleReply() {
    if (!replyText.trim()) return
    await reply.mutateAsync({ id: review.id, reply: replyText.trim() })
    toast.success("Réponse publiée.")
    setReplyOpen(false)
  }

  return (
    <div className={`rev-card ${review.approved ? "approved" : "pending"}`}>
      <div className="rev-inner">
        {/* Top row */}
        <div className="rev-top">
          <div className="rev-avatar" aria-hidden="true">{initial}</div>
          <div className="rev-meta">
            <div className="rev-name">{review.client.fullName}</div>
            <div className="rev-sub">
              <span className="rev-service">{review.service.name}</span>
              <span className="rev-date">{timeAgo(review.createdAt)}</span>
            </div>
            <Stars n={review.stars} />
          </div>
          <span className={`rev-status ${review.approved ? "approved" : "pending"}`}>
            {review.approved ? "Approuvé" : "En attente"}
          </span>
        </div>

        {/* Body */}
        <p className="rev-body">"{review.body}"</p>

        {/* Existing reply */}
        {review.specialistReply && !replyOpen && (
          <div className="rev-reply-block">
            <div className="label">Réponse du praticien</div>
            <p>{review.specialistReply}</p>
          </div>
        )}

        {/* Actions */}
        <div className="rev-actions">
          {!review.approved && (
            <button
              className="rev-btn approve"
              onClick={handleApprove}
              disabled={approve.isPending}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Approuver
            </button>
          )}
          <button
            className="rev-btn hide"
            onClick={handleHide}
            disabled={hide.isPending}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
              <line x1="1" y1="1" x2="23" y2="23"/>
            </svg>
            Masquer
          </button>
          <button
            className={`rev-btn reply-toggle ${replyOpen ? "open" : ""}`}
            onClick={() => setReplyOpen(o => !o)}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            {review.specialistReply ? "Modifier la réponse" : "Répondre"}
          </button>
        </div>

        {/* Reply area */}
        {replyOpen && (
          <div className="rev-reply-area">
            <textarea
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder="Rédigez votre réponse publique…"
              rows={3}
              autoFocus
            />
            <div className="send-row">
              <button className="rev-btn" onClick={() => setReplyOpen(false)}>Annuler</button>
              <button
                className="rev-btn approve"
                onClick={handleReply}
                disabled={reply.isPending || !replyText.trim()}
              >
                {reply.isPending ? "Envoi…" : "Publier la réponse"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────
type Tab = "pending" | "approved" | "all"

export default function AvisPage() {
  const [tab, setTab] = useState<Tab>("pending")
  const { data, isLoading } = useReviews()

  const reviews = data?.reviews ?? []
  const stats = data?.stats ?? { total: 0, approved: 0, pending: 0, avgStars: 0 }

  const filtered = reviews.filter(r => {
    if (tab === "pending") return !r.approved
    if (tab === "approved") return r.approved
    return true
  })

  const avgDisplay = stats.avgStars > 0 ? stats.avgStars.toFixed(1) : "—"

  return (
    <div className="view active">
      {/* Page header */}
      <div className="view-head">
        <div>
          <h1>Avis clients</h1>
          <p className="lede">Modérez et répondez aux avis laissés après chaque séance.</p>
        </div>
      </div>

      {/* KPI bar */}
      <div className="kpi-grid">
        <div className="kpi feat">
          <div className="lbl">Note moyenne</div>
          <div className="v">
            {avgDisplay}
            <small> / 5</small>
          </div>
          <div className="delta up">
            {Array.from({ length: 5 }, (_, i) => (
              <span key={i} style={{ fontSize: 12, color: i < Math.round(stats.avgStars) ? "var(--terra-soft)" : "#ffffff44" }}>★</span>
            ))}
          </div>
        </div>
        <div className="kpi">
          <div className="lbl">Total avis</div>
          <div className="v">{isLoading ? "—" : stats.total}</div>
        </div>
        <div className="kpi">
          <div className="lbl" style={{ color: stats.pending > 0 ? "#A0713A" : undefined }}>
            En attente
          </div>
          <div className="v" style={{ color: stats.pending > 0 ? "#A0713A" : undefined }}>
            {isLoading ? "—" : stats.pending}
          </div>
          {stats.pending > 0 && <div className="delta">à modérer</div>}
        </div>
        <div className="kpi">
          <div className="lbl" style={{ color: "#4A7A50" }}>Approuvés</div>
          <div className="v" style={{ color: "#4A7A50" }}>{isLoading ? "—" : stats.approved}</div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="rev-tabs">
        {([
          { key: "pending", label: "En attente", count: stats.pending },
          { key: "approved", label: "Approuvés", count: stats.approved },
          { key: "all", label: "Tous", count: stats.total },
        ] as const).map(t => (
          <button
            key={t.key}
            className={`rev-tab ${tab === t.key ? "active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {!isLoading && <span className="count">{t.count}</span>}
          </button>
        ))}
      </div>

      {/* Review list */}
      {isLoading ? (
        <div className="rev-empty">
          <div className="ic">⋯</div>
          <p>Chargement des avis…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rev-empty">
          <div className="ic">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: .35 }}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <p>
            {tab === "pending" ? "Aucun avis en attente" :
             tab === "approved" ? "Aucun avis approuvé" :
             "Aucun avis pour le moment"}
          </p>
          <p className="sub">
            {tab === "pending"
              ? "Tous les avis ont été traités — bravo !"
              : "Les avis apparaîtront ici après chaque séance terminée."}
          </p>
        </div>
      ) : (
        <div className="rev-list">
          {filtered.map(r => <ReviewCard key={r.id} review={r} />)}
        </div>
      )}
    </div>
  )
}
