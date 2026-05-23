"use client"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import {
  useServices, useCreateService, useUpdateService,
  useDeleteService, useToggleService, useDuplicateService,
  type Service, type Benefit, type ServiceInput,
} from "@/lib/queries/services"

// ── Helpers ───────────────────────────────────────────────────────────
const CAT_LABELS: Record<string, string> = { massage: "Massage", energetique: "Énergétique", creation: "Création" }
const CATS = ["massage", "energetique", "creation"] as const

function fmtPrice(cents: number) {
  return `${(cents / 100).toFixed(0)} €`
}

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

// ── Empty form ────────────────────────────────────────────────────────
const EMPTY_FORM: ServiceInput = {
  name: "", slug: "", tagline: "", forWho: "", shortDescription: "",
  longDescription: "", ritualCore: "", ritualCoreDuration: "",
  benefits: [], relatedSlugs: [], bgColor: "#2C1F14",
  displayOrder: 0, description: "", durationMinutes: 60,
  price: 10000, category: "massage", isPublished: false,
  imageUrl: null, vatRate: 0,
}

// ── Service card ──────────────────────────────────────────────────────
function ServiceCard({
  service, allSlugs, onEdit, onDelete, onDuplicate, onMoveUp, onMoveDown, isFirst, isLast,
}: {
  service: Service
  allSlugs: string[]
  onEdit: () => void
  onDelete: () => void
  onDuplicate: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  isFirst: boolean
  isLast: boolean
}) {
  const toggle = useToggleService()

  async function handleToggle(e: React.MouseEvent) {
    e.stopPropagation()
    try {
      const result = await toggle.mutateAsync(service.id)
      toast.success(result.isPublished ? "Prestation publiée." : "Prestation dépubliée.")
    } catch {
      toast.error("Impossible de changer le statut.")
    }
  }

  return (
    <div className="mgr-card">
      <div className="color-band" style={{ background: service.bgColor ?? "#2C1F14" }} />
      <div className="pic-placeholder">
        {service.imageUrl
          ? <img src={service.imageUrl} alt={service.name} />
          : <div className="no-img"><span style={{ fontSize: 28, opacity: .35 }}>✦</span><span>{service.tagline ?? service.name}</span></div>
        }
        <span className={`pill-tag ${service.isPublished ? "published" : "draft"}`}>
          {service.isPublished ? "Publié" : "Brouillon"}
        </span>
        <div className="order-btns">
          <button onClick={(e) => { e.stopPropagation(); onMoveUp() }} disabled={isFirst} title="Monter">↑</button>
          <button onClick={(e) => { e.stopPropagation(); onMoveDown() }} disabled={isLast} title="Descendre">↓</button>
        </div>
      </div>
      <div className="body">
        <div className="cat-tag">{CAT_LABELS[service.category] ?? service.category}</div>
        <h4>{service.name}</h4>
        <div className="row">
          <div className="meta-row">
            <span>⏱ {service.durationMinutes} min</span>
            <span style={{ marginLeft: 8 }}>·</span>
            <span>{service.vatRate > 0 ? `TVA ${service.vatRate}%` : "Exonéré TVA"}</span>
          </div>
          <div className="price">{fmtPrice(service.price)}</div>
        </div>
        {service._count && (
          <div className="counts">
            <span>📅 {service._count.appointments} RDV</span>
            <span>★ {service._count.reviews} avis</span>
          </div>
        )}
        <div className="card-toggle" onClick={handleToggle} role="button" aria-label="Basculer publication">
          <div className={`sw-wrap ${service.isPublished ? "on" : ""}`} />
          <span>{service.isPublished ? "En ligne" : "Hors ligne"}</span>
        </div>
        <div className="controls">
          <button onClick={onEdit}>Modifier</button>
          <button onClick={onDuplicate}>Dupliquer</button>
          <button className="danger" onClick={onDelete}>Supprimer</button>
        </div>
      </div>
    </div>
  )
}

// ── Benefits editor ───────────────────────────────────────────────────
function BenefitsEditor({ value, onChange }: { value: Benefit[]; onChange: (v: Benefit[]) => void }) {
  function update(i: number, field: keyof Benefit, val: string) {
    const next = value.map((b, idx) => idx === i ? { ...b, [field]: val } : b)
    onChange(next)
  }
  function remove(i: number) { onChange(value.filter((_, idx) => idx !== i)) }
  function add() { onChange([...value, { title: "", description: "" }]) }

  return (
    <div className="so-field full">
      <span className="so-label">Bénéfices <span className="hint">({value.length}/8)</span></span>
      <div className="benefits-list">
        {value.map((b, i) => (
          <div key={i} className="benefit-row">
            <input className="so-input" placeholder="Titre" value={b.title} onChange={e => update(i, "title", e.target.value)} />
            <input className="so-input" placeholder="Description" value={b.description} onChange={e => update(i, "description", e.target.value)} />
            <button onClick={() => remove(i)} title="Supprimer">×</button>
          </div>
        ))}
      </div>
      {value.length < 8 && (
        <button className="add-benefit-btn" onClick={add} type="button">
          <span>+</span> Ajouter un bénéfice
        </button>
      )}
    </div>
  )
}

// ── Service modal ─────────────────────────────────────────────────────
function ServiceModal({
  service, allServices, onClose, onSaved,
}: {
  service: Service | null
  allServices: Service[]
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = !!service
  const create = useCreateService()
  const update = useUpdateService()

  const [form, setForm] = useState<ServiceInput>(
    service ? {
      name: service.name, slug: service.slug, tagline: service.tagline ?? "",
      forWho: service.forWho ?? "", shortDescription: service.shortDescription ?? "",
      longDescription: service.longDescription ?? "", ritualCore: service.ritualCore ?? "",
      ritualCoreDuration: service.ritualCoreDuration ?? "",
      benefits: (service.benefits as Benefit[]) ?? [],
      relatedSlugs: service.relatedSlugs, bgColor: service.bgColor ?? "#2C1F14",
      displayOrder: service.displayOrder, description: service.description,
      durationMinutes: service.durationMinutes, price: service.price / 100,
      category: service.category, isPublished: service.isPublished,
      imageUrl: service.imageUrl, vatRate: service.vatRate,
    } : { ...EMPTY_FORM }
  )
  const [slugManual, setSlugManual] = useState(isEdit)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  function set<K extends keyof ServiceInput>(k: K, v: ServiceInput[K]) {
    setForm(f => ({ ...f, [k]: v }))
    if (errors[k]) setErrors(e => { const n = { ...e }; delete n[k]; return n })
  }

  function handleNameChange(val: string) {
    set("name", val)
    if (!slugManual) set("slug", slugify(val))
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = "Nom requis"
    if (!form.slug.trim()) e.slug = "Slug requis"
    if (!/^[a-z0-9-]+$/.test(form.slug)) e.slug = "Lettres minuscules, chiffres, tirets uniquement"
    if (!form.description.trim()) e.description = "Description requise"
    if (!form.price || form.price < 1) e.price = "Prix invalide (min 1 €)"
    if (!form.durationMinutes || form.durationMinutes < 5) e.durationMinutes = "Durée invalide (min 5 min)"
    if (form.bgColor && !/^#[0-9a-fA-F]{6}$/.test(form.bgColor)) e.bgColor = "Couleur hex invalide"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    try {
      const payload: ServiceInput = {
        ...form,
        price: Math.round(form.price * 100),
        tagline: form.tagline || null,
        forWho: form.forWho || null,
        shortDescription: form.shortDescription || null,
        longDescription: form.longDescription || null,
        ritualCore: form.ritualCore || null,
        ritualCoreDuration: form.ritualCoreDuration || null,
        bgColor: form.bgColor || null,
        imageUrl: form.imageUrl || null,
      }
      if (isEdit) {
        await update.mutateAsync({ id: service!.id, data: payload })
        toast.success("Prestation mise à jour.")
      } else {
        await create.mutateAsync(payload)
        toast.success("Prestation créée.")
      }
      onSaved()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue"
      if (msg.includes("slug")) {
        setErrors(e => ({ ...e, slug: "Ce slug est déjà utilisé" }))
      } else {
        toast.error(msg)
      }
    } finally {
      setSaving(false)
    }
  }

  const otherServices = allServices.filter(s => s.id !== service?.id)

  return (
    <>
      <div className="slideover-backdrop" onClick={onClose} />
      <div className="slideover" role="dialog" aria-modal="true">
        <div className="slideover-head">
          <h2>{isEdit ? "Modifier la prestation" : "Nouvelle prestation"}</h2>
          <button className="slideover-close" onClick={onClose} aria-label="Fermer">×</button>
        </div>

        <div className="slideover-body">
          {/* Infos de base */}
          <div className="so-section">
            <div className="so-section-title">Informations de base</div>
            <div className="so-row">
              <div className="so-field">
                <label className="so-label">Nom *</label>
                <input className="so-input" value={form.name} onChange={e => handleNameChange(e.target.value)} placeholder="Soin du corps" />
                {errors.name && <span className="so-error">{errors.name}</span>}
              </div>
              <div className="so-field">
                <label className="so-label">Slug * <span className="hint">URL publique</span></label>
                <input className="so-input" value={form.slug}
                  onChange={e => { setSlugManual(true); set("slug", e.target.value) }}
                  placeholder="soin-du-corps" />
                {errors.slug && <span className="so-error">{errors.slug}</span>}
              </div>
              <div className="so-field">
                <label className="so-label">Tagline <span className="hint">ex: Signature</span></label>
                <input className="so-input" value={form.tagline ?? ""} onChange={e => set("tagline", e.target.value)} placeholder="Signature" maxLength={50} />
              </div>
              <div className="so-field">
                <label className="so-label">Pour qui ?</label>
                <input className="so-input" value={form.forWho ?? ""} onChange={e => set("forWho", e.target.value)} placeholder="Tensions, fatigue accumulée" maxLength={200} />
              </div>
              <div className="so-field">
                <label className="so-label">Catégorie *</label>
                <select className="so-select" value={form.category} onChange={e => set("category", e.target.value as ServiceInput["category"])}>
                  {CATS.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
                </select>
              </div>
              <div className="so-field">
                <label className="so-label">Statut</label>
                <select className="so-select" value={form.isPublished ? "true" : "false"} onChange={e => set("isPublished", e.target.value === "true")}>
                  <option value="false">Brouillon</option>
                  <option value="true">Publié</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tarif & durée */}
          <div className="so-section">
            <div className="so-section-title">Tarif & durée</div>
            <div className="so-row">
              <div className="so-field">
                <label className="so-label">Prix (€) *</label>
                <input className="so-input" type="number" min="1" step="0.5" value={form.price} onChange={e => set("price", parseFloat(e.target.value) || 0)} />
                {errors.price && <span className="so-error">{errors.price}</span>}
              </div>
              <div className="so-field">
                <label className="so-label">Durée (min) *</label>
                <input className="so-input" type="number" min="5" step="5" value={form.durationMinutes} onChange={e => set("durationMinutes", parseInt(e.target.value) || 0)} />
                {errors.durationMinutes && <span className="so-error">{errors.durationMinutes}</span>}
              </div>
              <div className="so-field">
                <label className="so-label">TVA (%)</label>
                <select className="so-select" value={form.vatRate} onChange={e => set("vatRate", parseInt(e.target.value))}>
                  <option value="0">0% — Exonéré</option>
                  <option value="5.5">5,5%</option>
                  <option value="10">10%</option>
                  <option value="20">20%</option>
                </select>
              </div>
              <div className="so-field">
                <label className="so-label">Ordre d'affichage</label>
                <input className="so-input" type="number" min="0" step="1" value={form.displayOrder} onChange={e => set("displayOrder", parseInt(e.target.value) || 0)} />
              </div>
            </div>
          </div>

          {/* Contenu */}
          <div className="so-section">
            <div className="so-section-title">Contenu</div>
            <div className="so-row">
              <div className="so-field full">
                <label className="so-label">Description courte <span className="hint">accroche visible sur la carte</span></label>
                <textarea className="so-textarea" value={form.shortDescription ?? ""} onChange={e => set("shortDescription", e.target.value)} placeholder="Un massage complet aux huiles tièdes..." maxLength={500} />
              </div>
              <div className="so-field full">
                <label className="so-label">Description longue <span className="hint">détail affiché dans la page du soin</span></label>
                <textarea className="so-textarea" rows={4} value={form.longDescription ?? ""} onChange={e => set("longDescription", e.target.value)} placeholder="Détails du soin, ingrédients, technique..." maxLength={2000} />
              </div>
              <div className="so-field full">
                <label className="so-label">Description (champ principal) *</label>
                <textarea className="so-textarea" rows={3} value={form.description} onChange={e => set("description", e.target.value)} placeholder="Description principale" maxLength={2000} />
                {errors.description && <span className="so-error">{errors.description}</span>}
              </div>
              <div className="so-field">
                <label className="so-label">Rituel — étapes</label>
                <textarea className="so-textarea" value={form.ritualCore ?? ""} onChange={e => set("ritualCore", e.target.value)} placeholder="Modelage complet du corps aux huiles..." maxLength={500} />
              </div>
              <div className="so-field">
                <label className="so-label">Durée du rituel</label>
                <input className="so-input" value={form.ritualCoreDuration ?? ""} onChange={e => set("ritualCoreDuration", e.target.value)} placeholder="~ 50 minutes" maxLength={50} />
              </div>
            </div>
          </div>

          {/* Bénéfices */}
          <div className="so-section">
            <div className="so-section-title">Bénéfices</div>
            <BenefitsEditor value={(form.benefits as Benefit[]) ?? []} onChange={v => set("benefits", v)} />
          </div>

          {/* Soins liés */}
          <div className="so-section">
            <div className="so-section-title">Soins associés</div>
            <div className="so-field full">
              <span className="so-label">Sélectionnez jusqu'à 4 soins à afficher en bas de la page</span>
              <div className="related-grid" style={{ marginTop: 8 }}>
                {otherServices.map(s => (
                  <button key={s.slug} type="button"
                    className={`related-pill ${form.relatedSlugs.includes(s.slug) ? "active" : ""}`}
                    onClick={() => {
                      const cur = form.relatedSlugs
                      if (cur.includes(s.slug)) set("relatedSlugs", cur.filter(x => x !== s.slug))
                      else if (cur.length < 4) set("relatedSlugs", [...cur, s.slug])
                    }}>
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Visuel */}
          <div className="so-section">
            <div className="so-section-title">Visuel</div>
            <div className="so-row">
              <div className="so-field">
                <label className="so-label">Couleur de fond <span className="hint">carte & page</span></label>
                <div className="color-row">
                  <input type="color" className="color-preview" value={form.bgColor ?? "#2C1F14"} onChange={e => set("bgColor", e.target.value)} title="Choisir une couleur" />
                  <input className="so-input" value={form.bgColor ?? ""} onChange={e => set("bgColor", e.target.value)} placeholder="#2C1F14" maxLength={7} />
                </div>
                {errors.bgColor && <span className="so-error">{errors.bgColor}</span>}
              </div>
              <div className="so-field">
                <label className="so-label">URL image <span className="hint">optionnel</span></label>
                <input className="so-input" value={form.imageUrl ?? ""} onChange={e => set("imageUrl", e.target.value || null)} placeholder="https://..." />
              </div>
            </div>
          </div>
        </div>

        <div className="slideover-foot">
          <button className="tbtn ghost" onClick={onClose} disabled={saving}>Annuler</button>
          <button className="tbtn" onClick={handleSave} disabled={saving}>
            {saving ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer la prestation"}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Delete dialog ─────────────────────────────────────────────────────
function DeleteDialog({ service, onClose, onDeleted }: { service: Service; onClose: () => void; onDeleted: () => void }) {
  const del = useDeleteService()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      await del.mutateAsync(service.id)
      toast.success(`"${service.name}" supprimée.`)
      onDeleted()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Suppression impossible.")
      onClose()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="dialog-backdrop">
      <div className="dialog">
        <h3>Supprimer la prestation ?</h3>
        <p>
          Vous êtes sur le point de supprimer <strong>"{service.name}"</strong>.
          Cette action est irréversible. Les rendez-vous existants liés à ce soin empêcheront la suppression.
        </p>
        <div className="btns">
          <button className="tbtn ghost" onClick={onClose} disabled={deleting}>Annuler</button>
          <button className="tbtn" style={{ background: "var(--terra)" }} onClick={handleDelete} disabled={deleting}>
            {deleting ? "Suppression…" : "Supprimer"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────
export default function PrestationsPage() {
  const { data, isLoading, isError } = useServices()
  const update = useUpdateService()
  const duplicate = useDuplicateService()

  const [editingService, setEditingService] = useState<Service | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null)
  const [search, setSearch] = useState("")
  const [catFilter, setCatFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  const services = data?.services ?? []

  const filtered = services
    .filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.tagline?.toLowerCase().includes(search.toLowerCase()))
    .filter(s => catFilter === "all" || s.category === catFilter)
    .filter(s => statusFilter === "all" || (statusFilter === "published" ? s.isPublished : !s.isPublished))

  const published = services.filter(s => s.isPublished).length
  const draft = services.length - published

  async function handleMoveUp(service: Service) {
    const idx = services.findIndex(s => s.id === service.id)
    if (idx <= 0) return
    const prev = services[idx - 1]
    try {
      await Promise.all([
        update.mutateAsync({ id: service.id, data: { displayOrder: prev.displayOrder } }),
        update.mutateAsync({ id: prev.id, data: { displayOrder: service.displayOrder } }),
      ])
    } catch { toast.error("Erreur lors du réordonnancement.") }
  }

  async function handleMoveDown(service: Service) {
    const idx = services.findIndex(s => s.id === service.id)
    if (idx >= services.length - 1) return
    const next = services[idx + 1]
    try {
      await Promise.all([
        update.mutateAsync({ id: service.id, data: { displayOrder: next.displayOrder } }),
        update.mutateAsync({ id: next.id, data: { displayOrder: service.displayOrder } }),
      ])
    } catch { toast.error("Erreur lors du réordonnancement.") }
  }

  async function handleDuplicate(service: Service) {
    try {
      const result = await duplicate.mutateAsync(service.id)
      toast.success(`"${result.name}" créée en brouillon.`)
    } catch { toast.error("Duplication échouée.") }
  }

  return (
    <div className="view active">
      <div className="view-head">
        <div>
          <h1>Prestations</h1>
          <p className="lede">Gérez votre catalogue de soins — créez, modifiez, publiez.</p>
        </div>
        <div className="actions">
          <a className="tbtn ghost" href="/prestations" target="_blank" rel="noopener noreferrer">
            Voir le catalogue ↗
          </a>
          <button className="tbtn" onClick={() => setIsCreating(true)}>
            + Nouvelle prestation
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="prest-kpis">
        <div className="prest-kpi feat">
          <div className="num">{services.length}</div>
          <div className="meta"><span className="lbl">Total</span><span className="sub">prestations</span></div>
        </div>
        <div className="prest-kpi">
          <div className="num" style={{ color: "#3D6346" }}>{published}</div>
          <div className="meta"><span className="lbl">Publiées</span><span className="sub">visibles publiquement</span></div>
        </div>
        <div className="prest-kpi">
          <div className="num" style={{ color: "#A0713A" }}>{draft}</div>
          <div className="meta"><span className="lbl">Brouillons</span><span className="sub">non visibles</span></div>
        </div>
        <div className="prest-kpi">
          <div className="num">{services.reduce((s, sv) => s + (sv._count?.appointments ?? 0), 0)}</div>
          <div className="meta"><span className="lbl">RDV totaux</span><span className="sub">toutes prestations</span></div>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <span className="lbl">Filtres</span>
        <input
          placeholder="Rechercher…" value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ minWidth: 180 }}
        />
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="all">Toutes catégories</option>
          {CATS.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">Tous statuts</option>
          <option value="published">Publiées</option>
          <option value="draft">Brouillons</option>
        </select>
        <span className="spacer" />
        <span style={{ fontSize: 12, color: "var(--mute)" }}>{filtered.length} résultat{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Grid */}
      {isLoading && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--mute)", fontFamily: "var(--serif)", fontStyle: "italic" }}>
          Chargement…
        </div>
      )}

      {isError && (
        <div className="alert warn">
          <div className="body">Impossible de charger les prestations. Vérifiez votre connexion.</div>
        </div>
      )}

      {!isLoading && !isError && (
        <div className="mgr-grid">
          {filtered.map((service, idx) => (
            <ServiceCard
              key={service.id}
              service={service}
              allSlugs={services.map(s => s.slug)}
              onEdit={() => setEditingService(service)}
              onDelete={() => setDeleteTarget(service)}
              onDuplicate={() => handleDuplicate(service)}
              onMoveUp={() => handleMoveUp(service)}
              onMoveDown={() => handleMoveDown(service)}
              isFirst={idx === 0}
              isLast={idx === filtered.length - 1}
            />
          ))}
          <div className="mgr-card add" onClick={() => setIsCreating(true)} role="button">
            <span className="plus">+</span>
            Nouvelle prestation
          </div>
        </div>
      )}

      {!isLoading && !isError && filtered.length === 0 && services.length > 0 && (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--mute)" }}>
          <p>Aucune prestation ne correspond à vos filtres.</p>
          <button className="tbtn ghost" style={{ marginTop: 12 }} onClick={() => { setSearch(""); setCatFilter("all"); setStatusFilter("all") }}>
            Réinitialiser les filtres
          </button>
        </div>
      )}

      {/* Modals */}
      {(isCreating || editingService) && (
        <ServiceModal
          service={editingService}
          allServices={services}
          onClose={() => { setIsCreating(false); setEditingService(null) }}
          onSaved={() => { setIsCreating(false); setEditingService(null) }}
        />
      )}

      {deleteTarget && (
        <DeleteDialog
          service={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
