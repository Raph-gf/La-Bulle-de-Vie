"use client"
import { useState } from "react"
import { toast } from "sonner"
import {
  useBoutique,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useUpdateOrderStatus,
  type BoutiqueProduct,
  type BoutiqueOrder,
  type ProductInput,
} from "@/lib/queries/boutique"

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtPrice(cents: number) {
  return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
}

function shortId(id: string) {
  return id.slice(-6).toUpperCase()
}

// ── Order status config ───────────────────────────────────────────────────────

const ORDER_STATUS: Record<BoutiqueOrder["status"], { label: string; color: string; bg: string }> = {
  pending:   { label: "En attente", color: "#7A5C2A", bg: "#F9F1E5" },
  paid:      { label: "Payée",      color: "#1E4E8C", bg: "#E8F0FB" },
  shipped:   { label: "Expédiée",   color: "#3D6346", bg: "#EAF1E8" },
  cancelled: { label: "Annulée",    color: "var(--mute)", bg: "var(--cream)" },
}

// ── Product modal ─────────────────────────────────────────────────────────────

interface ProductModalProps {
  product: BoutiqueProduct | null
  onClose: () => void
}

function ProductModal({ product, onClose }: ProductModalProps) {
  const isEdit = product !== null
  const create = useCreateProduct()
  const update = useUpdateProduct()

  const [uploading, setUploading] = useState(false)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/dashboard/upload", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? "Erreur upload"); return }
      set("imageUrl", data.url)
    } catch {
      toast.error("Erreur lors de l'upload")
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  const [form, setForm] = useState<ProductInput>({
    name: product?.name ?? "",
    description: product?.description ?? "",
    price: product ? product.price / 100 : 0,
    stock: product?.stock ?? 0,
    medium: product?.medium ?? "",
    dimensions: product?.dimensions ?? "",
    vatRate: product?.vatRate ?? 20,
    imageUrl: product?.imageUrl ?? null,
  })
  const [errors, setErrors] = useState<Partial<Record<keyof ProductInput, string>>>({})

  function set<K extends keyof ProductInput>(key: K, value: ProductInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function validate(): boolean {
    const e: Partial<Record<keyof ProductInput, string>> = {}
    if (!form.name.trim()) e.name = "Nom requis"
    if (!form.description.trim()) e.description = "Description requise"
    if (form.price < 0) e.price = "Prix invalide"
    if (form.stock < 0) e.stock = "Stock invalide"
    if (!form.medium.trim()) e.medium = "Médium requis"
    if (!form.dimensions.trim()) e.dimensions = "Dimensions requises"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    try {
      if (isEdit) {
        await update.mutateAsync({ id: product.id, data: form })
        toast.success("Produit mis à jour.")
      } else {
        await create.mutateAsync(form)
        toast.success("Produit créé avec succès.")
      }
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue.")
    }
  }

  const isPending = create.isPending || update.isPending

  return (
    <>
      <div className="slideover-backdrop" onClick={onClose} />
      <div className="slideover" style={{ width: "min(480px, 100vw)" }}>
        <div className="slideover-head">
          <h2>{isEdit ? "Modifier le produit" : "Nouveau produit"}</h2>
          <button className="slideover-close" onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="slideover-body" noValidate>
          <div className="so-section">
            <div className="so-section-title">Informations générales</div>

            <div className="so-field full">
              <label className="so-label" htmlFor="p-name">Nom de l'œuvre</label>
              <input
                id="p-name"
                className="so-input"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Ex : Aurore bleue"
              />
              {errors.name && <span className="so-error">{errors.name}</span>}
            </div>

            <div className="so-field full">
              <label className="so-label" htmlFor="p-desc">Description</label>
              <textarea
                id="p-desc"
                className="so-textarea"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Décrivez cette œuvre : technique, inspiration, émotions…"
                rows={4}
              />
              {errors.description && <span className="so-error">{errors.description}</span>}
            </div>
          </div>

          <div className="so-section">
            <div className="so-section-title">Détails techniques</div>

            <div className="so-row">
              <div className="so-field">
                <label className="so-label" htmlFor="p-medium">Médium</label>
                <input
                  id="p-medium"
                  className="so-input"
                  value={form.medium}
                  onChange={(e) => set("medium", e.target.value)}
                  placeholder="Acrylique sur toile"
                />
                {errors.medium && <span className="so-error">{errors.medium}</span>}
              </div>
              <div className="so-field">
                <label className="so-label" htmlFor="p-dim">Dimensions</label>
                <input
                  id="p-dim"
                  className="so-input"
                  value={form.dimensions}
                  onChange={(e) => set("dimensions", e.target.value)}
                  placeholder="40 × 50 cm"
                />
                {errors.dimensions && <span className="so-error">{errors.dimensions}</span>}
              </div>
            </div>
          </div>

          <div className="so-section">
            <div className="so-section-title">Prix & stock</div>

            <div className="so-row">
              <div className="so-field">
                <label className="so-label" htmlFor="p-price">
                  Prix <span className="hint">(€)</span>
                </label>
                <input
                  id="p-price"
                  className="so-input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => set("price", parseFloat(e.target.value) || 0)}
                />
                {errors.price && <span className="so-error">{errors.price}</span>}
              </div>
              <div className="so-field">
                <label className="so-label" htmlFor="p-stock">Stock</label>
                <input
                  id="p-stock"
                  className="so-input"
                  type="number"
                  min="0"
                  step="1"
                  value={form.stock}
                  onChange={(e) => set("stock", parseInt(e.target.value, 10) || 0)}
                />
                {errors.stock && <span className="so-error">{errors.stock}</span>}
              </div>
            </div>

            <div className="so-row">
              <div className="so-field">
                <label className="so-label" htmlFor="p-vat">
                  TVA <span className="hint">(%)</span>
                </label>
                <input
                  id="p-vat"
                  className="so-input"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={form.vatRate}
                  onChange={(e) => set("vatRate", parseInt(e.target.value, 10) || 0)}
                />
              </div>
            </div>
          </div>

          <div className="so-section">
            <div className="so-section-title">Image</div>
            <div className="so-field full">
              {form.imageUrl ? (
                <div style={{ position: "relative", width: "100%", height: 180, borderRadius: 10, overflow: "hidden", border: "1px solid var(--line)" }}>
                  <img src={form.imageUrl} alt="Aperçu" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, #00000066, transparent)", display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "10px 12px" }}>
                    <label style={{
                      cursor: "pointer", padding: "6px 12px", borderRadius: 6,
                      background: "#ffffffcc", color: "var(--ink)", fontSize: 12, fontWeight: 500,
                    }}>
                      Changer
                      <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" style={{ display: "none" }} onChange={handleFileChange} disabled={uploading} />
                    </label>
                    <button
                      type="button"
                      onClick={() => set("imageUrl", null)}
                      style={{ padding: "6px 12px", borderRadius: 6, background: "#ffffffcc", color: "#c95555", fontSize: 12, fontWeight: 500, border: "none", cursor: "pointer" }}
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ) : (
                <label style={{
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  gap: 10, width: "100%", height: 150, borderRadius: 10,
                  border: "2px dashed var(--line)", cursor: uploading ? "not-allowed" : "pointer",
                  background: "var(--paper)", transition: "border-color .25s",
                  opacity: uploading ? 0.7 : 1,
                }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--ink)")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--line)")}
                >
                  {uploading ? (
                    <>
                      <div style={{ width: 28, height: 28, border: "2.5px solid var(--line)", borderTopColor: "var(--terra)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                      <span style={{ fontSize: 13, color: "var(--mute)" }}>Upload en cours…</span>
                    </>
                  ) : (
                    <>
                      <svg width="28" height="28" fill="none" stroke="var(--mute)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                      <span style={{ fontSize: 13, color: "var(--mute)", textAlign: "center" }}>
                        Cliquez pour uploader<br />
                        <span style={{ fontSize: 11 }}>JPEG, PNG, WebP, AVIF — max 5 Mo</span>
                      </span>
                    </>
                  )}
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" style={{ display: "none" }} onChange={handleFileChange} disabled={uploading} />
                </label>
              )}
            </div>
          </div>
        </form>

        <div className="slideover-foot">
          <button className="tbtn ghost" onClick={onClose} type="button">Annuler</button>
          <button
            className="tbtn"
            onClick={handleSubmit as unknown as React.MouseEventHandler}
            disabled={isPending}
            type="submit"
          >
            {isPending ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer"}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Delete confirm dialog ─────────────────────────────────────────────────────

function DeleteDialog({ product, onCancel, onConfirm, isPending }: {
  product: BoutiqueProduct
  onCancel: () => void
  onConfirm: () => void
  isPending: boolean
}) {
  return (
    <div className="dialog-backdrop">
      <div className="dialog">
        <h3>Supprimer ce produit ?</h3>
        <p>
          Vous êtes sur le point de supprimer <strong>«{product.name}»</strong>. Cette action est
          irréversible. Si des commandes sont associées à ce produit, la suppression sera bloquée.
        </p>
        <div className="btns">
          <button className="tbtn ghost" onClick={onCancel} disabled={isPending}>Annuler</button>
          <button
            className="tbtn"
            onClick={onConfirm}
            disabled={isPending}
            style={{ background: "var(--terra)" }}
          >
            {isPending ? "Suppression…" : "Supprimer"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Products table ────────────────────────────────────────────────────────────

function ProductsTab({
  products,
  onEdit,
}: {
  products: BoutiqueProduct[]
  onEdit: (p: BoutiqueProduct) => void
}) {
  const update = useUpdateProduct()
  const del = useDeleteProduct()
  const [deleteTarget, setDeleteTarget] = useState<BoutiqueProduct | null>(null)

  async function handleToggle(p: BoutiqueProduct) {
    try {
      await update.mutateAsync({ id: p.id, data: { isPublished: !p.isPublished } })
      toast.success(p.isPublished ? "Produit dépublié." : "Produit publié.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors du changement de statut.")
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await del.mutateAsync(deleteTarget.id)
      toast.success("Produit supprimé.")
      setDeleteTarget(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Suppression impossible.")
      setDeleteTarget(null)
    }
  }

  function stockStyle(stock: number): React.CSSProperties {
    if (stock === 0) return { color: "#B65555", fontWeight: 700 }
    if (stock <= 3) return { color: "#A0713A" }
    return { color: "#3D6346" }
  }

  if (products.length === 0) {
    return (
      <div className="rev-empty">
        <div className="ic" style={{ fontSize: 36, marginBottom: 14, opacity: 0.4 }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <path d="M3 9h18M9 21V9"/>
          </svg>
        </div>
        <p>Aucun produit — ajoutez votre première œuvre.</p>
      </div>
    )
  }

  return (
    <>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Image</th>
              <th>Nom</th>
              <th>Prix</th>
              <th>Stock</th>
              <th>TVA</th>
              <th>Statut</th>
              <th style={{ width: 80 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} style={{ cursor: "default" }}>
                <td>
                  {p.imageUrl ? (
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      style={{
                        width: 40, height: 40, objectFit: "cover",
                        borderRadius: 6, border: "1px solid var(--line)",
                        display: "block",
                      }}
                    />
                  ) : (
                    <div style={{
                      width: 40, height: 40, borderRadius: 6,
                      background: "var(--cream)", border: "1px solid var(--line)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "var(--mute)", fontSize: 16,
                    }}>
                      ◻
                    </div>
                  )}
                </td>
                <td>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 15 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: "var(--mute)", marginTop: 2 }}>
                    {p.medium} · {p.dimensions}
                  </div>
                </td>
                <td style={{ fontFamily: "var(--serif)", fontSize: 15, whiteSpace: "nowrap" }}>
                  {fmtPrice(p.price)}
                </td>
                <td style={{ fontWeight: 600, ...stockStyle(p.stock) }}>
                  {p.stock}
                </td>
                <td style={{ color: "var(--mute)", fontSize: 13 }}>{p.vatRate} %</td>
                <td>
                  <label
                    style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
                    title={p.isPublished ? "Cliquer pour dépublier" : "Cliquer pour publier"}
                  >
                    <div
                      className={`card-toggle`}
                      style={{ margin: 0 }}
                      onClick={() => handleToggle(p)}
                    >
                      <div className={`sw-wrap ${p.isPublished ? "on" : ""}`} />
                    </div>
                    <span style={{ fontSize: 12, color: p.isPublished ? "#3D6346" : "var(--mute)" }}>
                      {p.isPublished ? "Publié" : "Brouillon"}
                    </span>
                  </label>
                </td>
                <td>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={() => onEdit(p)}
                      title="Modifier"
                      style={{
                        width: 30, height: 30, borderRadius: 6,
                        border: "1px solid var(--line)", background: "#fff",
                        cursor: "pointer", display: "flex", alignItems: "center",
                        justifyContent: "center", color: "var(--ink)",
                        transition: "all .2s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--ink)"; e.currentTarget.style.color = "#fff" }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "var(--ink)" }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => setDeleteTarget(p)}
                      title="Supprimer"
                      style={{
                        width: 30, height: 30, borderRadius: 6,
                        border: "1px solid var(--line)", background: "#fff",
                        cursor: "pointer", display: "flex", alignItems: "center",
                        justifyContent: "center", color: "var(--mute)",
                        transition: "all .2s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--terra)"; e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "var(--terra)" }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "var(--mute)"; e.currentTarget.style.borderColor = "var(--line)" }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                        <path d="M10 11v6M14 11v6"/>
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {deleteTarget && (
        <DeleteDialog
          product={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          isPending={del.isPending}
        />
      )}
    </>
  )
}

// ── Orders table ──────────────────────────────────────────────────────────────

function OrdersTab({ orders }: { orders: BoutiqueOrder[] }) {
  const updateStatus = useUpdateOrderStatus()

  async function handleStatusChange(id: string, status: BoutiqueOrder["status"]) {
    try {
      await updateStatus.mutateAsync({ id, status })
      toast.success("Statut de la commande mis à jour.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la mise à jour.")
    }
  }

  if (orders.length === 0) {
    return (
      <div className="rev-empty">
        <div className="ic" style={{ fontSize: 36, marginBottom: 14, opacity: 0.4 }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
        </div>
        <p>Aucune commande pour le moment.</p>
      </div>
    )
  }

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <table className="tbl">
        <thead>
          <tr>
            <th># Commande</th>
            <th>Client</th>
            <th>Produits</th>
            <th>Total</th>
            <th>Statut</th>
            <th>Date</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => {
            const clientName = o.client?.fullName ?? o.guestName ?? "Client inconnu"
            const productNames = o.items.map((i) => i.product.name).join(", ") || "—"
            const cfg = ORDER_STATUS[o.status]
            const isCancelled = o.status === "cancelled"

            return (
              <tr key={o.id} style={{ cursor: "default" }}>
                <td>
                  <span style={{ fontFamily: "var(--serif)", fontSize: 14, letterSpacing: ".06em" }}>
                    #{shortId(o.id)}
                  </span>
                </td>
                <td>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 14 }}>{clientName}</div>
                  {o.guestEmail && (
                    <div style={{ fontSize: 11, color: "var(--mute)", marginTop: 2 }}>{o.guestEmail}</div>
                  )}
                </td>
                <td>
                  <div style={{ fontSize: 13, color: "var(--mute)", maxWidth: 200 }}>{productNames}</div>
                </td>
                <td style={{ fontFamily: "var(--serif)", fontSize: 14, whiteSpace: "nowrap" }}>
                  {fmtPrice(o.amountPaid ?? o.total)}
                </td>
                <td>
                  <span
                    className="pill"
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "4px 10px", borderRadius: 999, fontSize: 11.5,
                      background: cfg.bg, color: cfg.color, fontWeight: 500,
                    }}
                  >
                    {cfg.label}
                  </span>
                </td>
                <td style={{ fontSize: 13, color: "var(--mute)", whiteSpace: "nowrap" }}>
                  {fmtDate(o.createdAt)}
                </td>
                <td>
                  <select
                    value={o.status}
                    disabled={isCancelled || updateStatus.isPending}
                    onChange={(e) => handleStatusChange(o.id, e.target.value as BoutiqueOrder["status"])}
                    style={{
                      border: "1px solid var(--line)", borderRadius: 8,
                      padding: "5px 8px", fontSize: 12,
                      background: "#fff", fontFamily: "var(--sans)",
                      color: "var(--ink)", cursor: isCancelled ? "not-allowed" : "pointer",
                      opacity: isCancelled ? 0.5 : 1,
                    }}
                  >
                    <option value="pending">En attente</option>
                    <option value="paid">Payée</option>
                    <option value="shipped">Expédiée</option>
                    <option value="cancelled">Annulée</option>
                  </select>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── KPI bar ───────────────────────────────────────────────────────────────────

function KpiBar({
  totalRevenue,
  totalOrders,
  pendingOrders,
  lowStockCount,
  isLoading,
}: {
  totalRevenue: number
  totalOrders: number
  pendingOrders: number
  lowStockCount: number
  isLoading: boolean
}) {
  const v = isLoading ? "—" : undefined

  return (
    <div className="kpi-grid">
      <div className="kpi feat">
        <div className="lbl">Chiffre d'affaires</div>
        <div className="v" style={{ fontSize: 30 }}>
          {v ?? fmtPrice(totalRevenue)}
        </div>
        <div className="delta up">commandes payées + expédiées</div>
      </div>
      <div className="kpi">
        <div className="lbl">Commandes</div>
        <div className="v">{v ?? totalOrders}</div>
      </div>
      <div className="kpi" style={pendingOrders > 0 ? { borderColor: "#E9D5B5" } : {}}>
        <div className="lbl" style={pendingOrders > 0 ? { color: "#A0713A" } : {}}>
          En attente
        </div>
        <div className="v" style={pendingOrders > 0 ? { color: "#A0713A" } : {}}>
          {v ?? pendingOrders}
        </div>
        {pendingOrders > 0 && <div className="delta" style={{ color: "#A0713A" }}>à traiter</div>}
      </div>
      <div className="kpi" style={lowStockCount > 0 ? { borderColor: "#E9D5B5", background: "#FDF9EF" } : {}}>
        <div className="lbl" style={lowStockCount > 0 ? { color: "#A0713A" } : {}}>Stock faible</div>
        <div className="v" style={lowStockCount > 0 ? { color: "#A0713A" } : {}}>
          {v ?? lowStockCount}
        </div>
        {lowStockCount > 0 && (
          <div className="delta" style={{ color: "#A0713A" }}>
            produit{lowStockCount > 1 ? "s" : ""} ≤ 3 exemplaire{lowStockCount > 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

type Tab = "produits" | "commandes"

export default function BoutiquePage() {
  const [tab, setTab] = useState<Tab>("produits")
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<BoutiqueProduct | null>(null)

  const { data, isLoading, isError } = useBoutique()

  const products = data?.products ?? []
  const orders = data?.orders ?? []
  const kpis = data?.kpis ?? { totalRevenue: 0, totalOrders: 0, pendingOrders: 0, lowStockCount: 0 }

  function openCreate() {
    setEditTarget(null)
    setModalOpen(true)
  }

  function openEdit(p: BoutiqueProduct) {
    setEditTarget(p)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditTarget(null)
  }

  return (
    <div className="view active">
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div className="view-head">
        <div>
          <h1>Boutique</h1>
          <p className="lede">Gérez vos œuvres et suivez les commandes de vos clients.</p>
        </div>
        {tab === "produits" && (
          <div className="actions">
            <button className="tbtn" onClick={openCreate}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Nouveau produit
            </button>
          </div>
        )}
      </div>

      <KpiBar
        totalRevenue={kpis.totalRevenue}
        totalOrders={kpis.totalOrders}
        pendingOrders={kpis.pendingOrders}
        lowStockCount={kpis.lowStockCount}
        isLoading={isLoading}
      />

      <div className="filter-bar" style={{ marginBottom: 18 }}>
        <span className="lbl">Afficher</span>
        {(["produits", "commandes"] as Tab[]).map((t) => (
          <button
            key={t}
            className={`tab-mini ${tab === t ? "active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t === "produits" ? `Produits (${products.length})` : `Commandes (${orders.length})`}
          </button>
        ))}
      </div>

      {isLoading && (
        <div style={{ color: "var(--mute)", fontSize: 13, padding: "48px 0", textAlign: "center" }}>
          Chargement…
        </div>
      )}

      {isError && (
        <div style={{ color: "var(--terra)", fontSize: 13, padding: "48px 0", textAlign: "center" }}>
          Erreur lors du chargement. Rechargez la page.
        </div>
      )}

      {!isLoading && !isError && tab === "produits" && (
        <ProductsTab products={products} onEdit={openEdit} />
      )}

      {!isLoading && !isError && tab === "commandes" && (
        <OrdersTab orders={orders} />
      )}

      {modalOpen && (
        <ProductModal product={editTarget} onClose={closeModal} />
      )}
    </div>
  )
}
