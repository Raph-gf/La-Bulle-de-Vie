"use client"
import { useState, useEffect } from "react"
import { DEFAULT_TRAVEL_PRICING, TravelZone } from "@/lib/geo"

type TravelPricing = { zones: TravelZone[]; maxDistanceKm: number }
type TaxSettings = { servicesVatRate: number; productsVatRate: number }

const DEFAULT_TAX: TaxSettings = { servicesVatRate: 0, productsVatRate: 20 }

export default function ParametresPage() {
  const [cabinetAddress, setCabinetAddress] = useState("")
  const [cabinetLat, setCabinetLat] = useState<number | null>(null)
  const [cabinetLng, setCabinetLng] = useState<number | null>(null)
  const [travel, setTravel] = useState<TravelPricing>(DEFAULT_TRAVEL_PRICING)
  const [tax, setTax] = useState<TaxSettings>(DEFAULT_TAX)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  useEffect(() => {
    fetch("/api/dashboard/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.cabinetAddress) setCabinetAddress(d.cabinetAddress)
        if (d.cabinetLat) setCabinetLat(d.cabinetLat)
        if (d.cabinetLng) setCabinetLng(d.cabinetLng)
        if (d.travelPricing) setTravel(d.travelPricing as TravelPricing)
        if (d.taxSettings) setTax(d.taxSettings as TaxSettings)
      })
      .catch((err) => console.error("[parametres] fetch error:", err))
      .finally(() => setLoading(false))
  }, [])

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch("/api/dashboard/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cabinetAddress, travelPricing: travel, taxSettings: tax }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      if (data.cabinetLat) setCabinetLat(data.cabinetLat)
      if (data.cabinetLng) setCabinetLng(data.cabinetLng)

      if (data.geocodeStatus === "failed") {
        showToast("Paramètres enregistrés — adresse introuvable sur OpenStreetMap, vérifiez la saisie.", false)
      } else if (data.geocodeStatus === "ok") {
        showToast(`Paramètres enregistrés · Coordonnées : ${data.cabinetLat?.toFixed(4)}, ${data.cabinetLng?.toFixed(4)}`, true)
      } else {
        showToast("Paramètres enregistrés.", true)
      }
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Erreur inattendue", false)
    } finally {
      setSaving(false)
    }
  }

  function updateZone(i: number, patch: Partial<TravelZone>) {
    setTravel((t) => {
      const zones = [...t.zones]
      zones[i] = { ...zones[i], ...patch }
      return { ...t, zones }
    })
  }

  function addZone() {
    setTravel((t) => ({
      ...t,
      zones: [...t.zones, { maxKm: t.maxDistanceKm, feeInCents: 0 }],
    }))
  }

  function removeZone(i: number) {
    setTravel((t) => ({ ...t, zones: t.zones.filter((_, j) => j !== i) }))
  }

  if (loading) {
    return (
      <div className="view active">
        <div className="view-head"><h1>Paramètres</h1></div>
        <p style={{ color: "var(--mute)", fontStyle: "italic" }}>Chargement…</p>
      </div>
    )
  }

  const sortedZones = [...travel.zones].sort((a, b) => a.maxKm - b.maxKm)

  return (
    <div className="view active">
      <div className="view-head">
        <div>
          <h1>Paramètres</h1>
          <p className="lede">Configuration du cabinet, des frais de déplacement et de la TVA.</p>
        </div>
        <div className="actions">
          <button className="tbtn" onClick={handleSave} disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>

      <div className="row-2" style={{ gap: 18 }}>
        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Cabinet address */}
          <div className="card">
            <div className="card-head">
              <div>
                <h3>Adresse du cabinet</h3>
                <div className="sub">Utilisée comme point de départ pour calculer les frais de déplacement</div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input
                type="text"
                value={cabinetAddress}
                onChange={(e) => setCabinetAddress(e.target.value)}
                placeholder="12 rue de la Paix, 69007 Lyon"
                style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "10px 14px", fontFamily: "var(--sans)", fontSize: 14, width: "100%" }}
              />
              {cabinetLat && cabinetLng ? (
                <p style={{ fontSize: 12, color: "var(--mute)", margin: 0 }}>
                  Géolocalisé : {cabinetLat.toFixed(5)}, {cabinetLng.toFixed(5)} · <a href={`https://www.openstreetmap.org/?mlat=${cabinetLat}&mlon=${cabinetLng}&zoom=16`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--terra)" }}>Voir sur la carte</a>
                </p>
              ) : (
                <p style={{ fontSize: 12, color: "var(--mute)", margin: 0 }}>
                  Adresse non encore géolocalisée. Enregistrez pour valider.
                </p>
              )}
            </div>
          </div>

          {/* Travel zones */}
          <div className="card">
            <div className="card-head">
              <div>
                <h3>Zones de déplacement</h3>
                <div className="sub">Frais selon la distance en ligne droite depuis le cabinet</div>
              </div>
              <button
                className="tbtn ghost"
                style={{ fontSize: 12, padding: "5px 12px" }}
                onClick={addZone}
              >
                + Ajouter
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {sortedZones.map((zone, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 10, alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--mute)", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".08em" }}>
                      Jusqu'à (km)
                    </div>
                    <input
                      type="number"
                      min={1}
                      value={zone.maxKm}
                      onChange={(e) => updateZone(i, { maxKm: parseInt(e.target.value) || 0 })}
                      style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "7px 10px", fontFamily: "var(--sans)", fontSize: 14, width: "100%" }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--mute)", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".08em" }}>
                      Frais (€)
                    </div>
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={zone.feeInCents / 100}
                      onChange={(e) => updateZone(i, { feeInCents: Math.round(parseFloat(e.target.value) * 100) || 0 })}
                      style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "7px 10px", fontFamily: "var(--sans)", fontSize: 14, width: "100%" }}
                    />
                  </div>
                  <button
                    onClick={() => removeZone(i)}
                    disabled={travel.zones.length <= 1}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--mute)", padding: "4px 6px", marginTop: 20, fontSize: 18 }}
                    title="Supprimer"
                  >
                    ✕
                  </button>
                </div>
              ))}

              <div style={{ borderTop: "1px dashed var(--line)", paddingTop: 14, marginTop: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <label style={{ fontSize: 13, color: "var(--mute)", whiteSpace: "nowrap" }}>Distance max. (km)</label>
                  <input
                    type="number"
                    min={1}
                    value={travel.maxDistanceKm}
                    onChange={(e) => setTravel((t) => ({ ...t, maxDistanceKm: parseInt(e.target.value) || 0 }))}
                    style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "7px 10px", fontFamily: "var(--sans)", fontSize: 14, width: 90 }}
                  />
                  <span style={{ fontSize: 12, color: "var(--mute)" }}>Au-delà, la réservation domicile est refusée.</span>
                </div>
              </div>
            </div>

            {/* Zone preview */}
            <div style={{ marginTop: 18, background: "var(--cream)", borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".12em", color: "var(--mute)", marginBottom: 10 }}>Aperçu</div>
              {sortedZones.map((zone, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "5px 0", borderBottom: "1px dashed var(--line)" }}>
                  <span style={{ fontFamily: "var(--serif)", fontSize: 14 }}>
                    {i === 0 ? `0 – ${zone.maxKm} km` : `${sortedZones[i - 1].maxKm} – ${zone.maxKm} km`}
                  </span>
                  <span style={{ fontWeight: 600, color: zone.feeInCents === 0 ? "var(--mute)" : "var(--terra)" }}>
                    {zone.feeInCents === 0 ? "Gratuit" : `+${(zone.feeInCents / 100).toFixed(2).replace(".", ",")} €`}
                  </span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "5px 0" }}>
                <span style={{ fontFamily: "var(--serif)", fontSize: 14, color: "var(--mute)" }}>
                  Au-delà de {travel.maxDistanceKm} km
                </span>
                <span style={{ color: "var(--mute)" }}>Refusé</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* VAT */}
          <div className="card">
            <div className="card-head">
              <div>
                <h3>TVA</h3>
                <div className="sub">Les massages bien-être sont souvent exonérés en France</div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "var(--mute)", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".08em" }}>
                  Prestations (soins, massages)
                </label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {[0, 5.5, 10, 20].map((rate) => (
                    <button
                      key={rate}
                      className={`tab-mini${tax.servicesVatRate === rate ? " active" : ""}`}
                      onClick={() => setTax((t) => ({ ...t, servicesVatRate: rate }))}
                    >
                      {rate}%
                    </button>
                  ))}
                </div>
                {tax.servicesVatRate === 0 && (
                  <p style={{ fontSize: 12, color: "var(--mute)", marginTop: 6 }}>Exonéré — aucune TVA facturée sur les soins.</p>
                )}
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, color: "var(--mute)", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".08em" }}>
                  Produits (boutique)
                </label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {[0, 5.5, 10, 20].map((rate) => (
                    <button
                      key={rate}
                      className={`tab-mini${tax.productsVatRate === rate ? " active" : ""}`}
                      onClick={() => setTax((t) => ({ ...t, productsVatRate: rate }))}
                    >
                      {rate}%
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Info card */}
          <div className="card" style={{ background: "var(--cream)", border: "none" }}>
            <h3 style={{ marginBottom: 10 }}>Comment ça marche ?</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13, color: "var(--mute)" }}>
              <p style={{ margin: 0 }}>
                <strong style={{ color: "var(--ink)" }}>Zones de distance</strong><br />
                Quand un client choisit "À domicile", l'application calcule la distance en ligne droite entre son adresse et votre cabinet via OpenStreetMap.
              </p>
              <p style={{ margin: 0 }}>
                <strong style={{ color: "var(--ink)" }}>Tarification par zones</strong><br />
                La distance détermine la zone, qui fixe les frais supplémentaires automatiquement affichés au client avant confirmation.
              </p>
              <p style={{ margin: 0 }}>
                <strong style={{ color: "var(--ink)" }}>Distance max.</strong><br />
                Au-delà de la limite configurée, le client ne peut pas réserver une séance à domicile.
              </p>
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <div className={`toast show`} style={{ background: toast.ok ? "var(--ink)" : "var(--terra)" }}>
          <span className="ic">{toast.ok ? "✓" : "✕"}</span>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
