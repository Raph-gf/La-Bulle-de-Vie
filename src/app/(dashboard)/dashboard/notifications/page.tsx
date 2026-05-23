"use client"
import { useState, useEffect, useRef } from "react"
import { toast } from "sonner"

// ── Types ─────────────────────────────────────────────────────────────────────

type NotifPrefs = {
  onNewBooking:      boolean
  onCancellation:    boolean
  onNewReview:       boolean
  clientReminder24h: boolean
  clientReminder2h:  boolean
  clientSmsReminder: boolean
}

const DEFAULTS: NotifPrefs = {
  onNewBooking:      true,
  onCancellation:    true,
  onNewReview:       true,
  clientReminder24h: true,
  clientReminder2h:  false,
  clientSmsReminder: false,
}

// ── Toggle row ────────────────────────────────────────────────────────────────

function SettingRow({
  label,
  description,
  checked,
  onChange,
  saving,
  badge,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
  saving: boolean
  badge?: string
}) {
  return (
    <div className="setting-row">
      <div className="info">
        <div className="nm" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {label}
          {badge && (
            <span style={{
              fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase",
              padding: "2px 8px", borderRadius: 999, background: "var(--cream)",
              color: "var(--mute)", border: "1px solid var(--line)",
            }}>
              {badge}
            </span>
          )}
        </div>
        <div className="desc">{description}</div>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        disabled={saving}
        onClick={() => onChange(!checked)}
        className={`switch${checked ? " on" : ""}`}
        style={{ opacity: saving ? .5 : 1, cursor: saving ? "not-allowed" : "pointer" }}
      />
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const [prefs, setPrefs]     = useState<NotifPrefs>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const saveTimeout           = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch("/api/dashboard/notifications")
      .then((r) => r.json())
      .then((d) => { if (d.prefs) setPrefs(d.prefs) })
      .catch(() => toast.error("Impossible de charger les préférences"))
      .finally(() => setLoading(false))
  }, [])

  // Auto-save with 600 ms debounce — fires after the last toggle
  function toggle(key: keyof NotifPrefs, value: boolean) {
    const next = { ...prefs, [key]: value }
    setPrefs(next)

    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(async () => {
      setSaving(true)
      try {
        const res = await fetch("/api/dashboard/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(next),
        })
        if (!res.ok) throw new Error()
        toast.success("Préférences enregistrées.")
      } catch {
        toast.error("Erreur lors de la sauvegarde.")
        setPrefs(prefs) // revert on failure
      } finally {
        setSaving(false)
      }
    }, 600)
  }

  if (loading) {
    return (
      <div className="view active">
        <div className="view-head"><div><h1>Notifications</h1></div></div>
        <div style={{ color: "var(--mute)", fontSize: 13, padding: "60px 0", textAlign: "center" }}>
          Chargement…
        </div>
      </div>
    )
  }

  return (
    <div className="view active">
      {/* Header */}
      <div className="view-head">
        <div>
          <h1>Notifications</h1>
          <p className="lede">Choisissez quand vous souhaitez être alerté et quels rappels envoyer à vos clients.</p>
        </div>
        {saving && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--mute)" }}>
            <div className="img-spinner" />
            Sauvegarde…
          </div>
        )}
      </div>

      <div className="settings-grid">
        {/* ── Vos alertes ─────────────────────────────────────────── */}
        <div className="set-card">
          <h3>Vos alertes</h3>
          <p className="desc">Emails que vous recevez en tant que spécialiste.</p>

          <SettingRow
            label="Nouvelle réservation"
            description="Recevez un email dès qu'un client réserve un créneau."
            checked={prefs.onNewBooking}
            onChange={(v) => toggle("onNewBooking", v)}
            saving={saving}
          />
          <SettingRow
            label="Annulation"
            description="Recevez un email quand un client annule un rendez-vous."
            checked={prefs.onCancellation}
            onChange={(v) => toggle("onCancellation", v)}
            saving={saving}
          />
          <SettingRow
            label="Nouvel avis"
            description="Recevez un email quand un client dépose un avis en attente de modération."
            checked={prefs.onNewReview}
            onChange={(v) => toggle("onNewReview", v)}
            saving={saving}
          />
        </div>

        {/* ── Rappels clients ──────────────────────────────────────── */}
        <div className="set-card">
          <h3>Rappels clients</h3>
          <p className="desc">Notifications automatiques envoyées à vos clients avant leur séance.</p>

          <SettingRow
            label="Email 24h avant"
            description="Un email de rappel est envoyé au client la veille de son rendez-vous."
            checked={prefs.clientReminder24h}
            onChange={(v) => toggle("clientReminder24h", v)}
            saving={saving}
            badge="Resend"
          />
          <SettingRow
            label="Email 2h avant"
            description="Un second email de rappel est envoyé 2h avant le début de la séance."
            checked={prefs.clientReminder2h}
            onChange={(v) => toggle("clientReminder2h", v)}
            saving={saving}
            badge="Resend"
          />
          <SettingRow
            label="SMS 24h avant"
            description="Un SMS de rappel est envoyé via Twilio la veille du rendez-vous."
            checked={prefs.clientSmsReminder}
            onChange={(v) => toggle("clientSmsReminder", v)}
            saving={saving}
            badge="Twilio"
          />
        </div>
      </div>

      {/* Info banner */}
      <div className="alert info" style={{ marginTop: 18 }}>
        <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <div className="body">
          <strong>Email</strong> — les envois nécessitent une clé <code>RESEND_API_KEY</code> configurée dans votre environnement.{" "}
          <strong>SMS</strong> — les envois nécessitent un compte Twilio actif avec <code>TWILIO_ACCOUNT_SID</code>, <code>TWILIO_AUTH_TOKEN</code> et <code>TWILIO_PHONE_NUMBER</code>.
          Les toggles sont sauvegardés même si les services ne sont pas encore connectés.
        </div>
      </div>
    </div>
  )
}
