"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import { toast } from "sonner"
import { CalendarSkeleton, SlotsSkeleton } from "@/components/ui/Skeleton"
import { loadStripe } from "@stripe/stripe-js"
import {
  Elements,
  PaymentElement,
  ExpressCheckoutElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js"
import type { StripeExpressCheckoutElementConfirmEvent } from "@stripe/stripe-js"
import { SOINS, SoinId } from "@/lib/soins"
import AddressAutocomplete from "@/components/booking/AddressAutocomplete"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

type Svc = { id: SoinId; name: string; price: number; dur: number }
type Info = { first: string; last: string; email: string; phone: string; place: string; address: string; note: string }
type Slot = { id: string; startTime: string; endTime: string }

const SOIN_ORDER: SoinId[] = ["visage", "sel", "galet", "mains", "corps", "jambes"]
const STEPS = ["Soin", "Date", "Heure", "Vos infos", "Confirmer", "Paiement"]
const MONTHS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"]
const DOW = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"]

function fmtDate(d: Date | null) {
  if (!d) return "—"
  const dow = ["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"][d.getDay()]
  return `${dow} ${d.getDate()} ${MONTHS[d.getMonth()].toLowerCase()}`
}

type UserData = { fullName: string; email: string; phone: string }

interface Props {
  serviceId?: string
  userData?: UserData | null
}

// ── Stripe inner form — steps 2, 3 + submit (must be inside <Elements>) ─
interface StripePaymentBlockProps {
  amountInCents: number
  refCode: string
  onSuccess: () => void
}

function StripePaymentBlock({ amountInCents, refCode, onSuccess }: StripePaymentBlockProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)
  const [expressAvailable, setExpressAvailable] = useState(false)

  async function confirmBooking(paymentIntentId: string): Promise<void> {
    try {
      const res = await fetch("/api/booking/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentIntentId }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        console.error("[booking/confirm] server error:", res.status, body)
        toast.error(`Erreur lors de la confirmation (${res.status}) — votre paiement est bien passé, contactez-nous avec la référence ${refCode}.`)
      }
    } catch (err) {
      console.error("[booking/confirm] network error:", err)
    }
  }

  async function handlePay(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return
    setPaying(true)
    setPayError(null)

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: {
        return_url: `${window.location.origin}/booking/confirmation?ref=${refCode}`,
      },
    })

    if (error) {
      const msg = error.message ?? "Le paiement a échoué. Veuillez réessayer."
      setPayError(msg)
      toast.error(msg)
      setPaying(false)
      return
    }

    if (paymentIntent?.status === "succeeded") {
      await confirmBooking(paymentIntent.id)
      onSuccess()
    }
  }

  async function handleExpressConfirm(event: StripeExpressCheckoutElementConfirmEvent) {
    if (!stripe || !elements) {
      event.paymentFailed({ reason: "fail" })
      return
    }
    setPaying(true)
    setPayError(null)

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: {
        return_url: `${window.location.origin}/booking/confirmation?ref=${refCode}`,
      },
    })

    if (error) {
      event.paymentFailed({ reason: "fail" })
      const msg = error.message ?? "Le paiement a échoué."
      setPayError(msg)
      toast.error(msg)
      setPaying(false)
    } else if (paymentIntent?.status === "succeeded") {
      await confirmBooking(paymentIntent.id)
      onSuccess()
    }
  }

  const fmtAmount = (amountInCents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })

  return (
    <form onSubmit={handlePay}>
      {/* Express Checkout (Apple Pay / Google Pay) — auto-hides when unsupported */}
      <ExpressCheckoutElement
        onReady={({ availablePaymentMethods }) => {
          setExpressAvailable(availablePaymentMethods !== undefined)
        }}
        onConfirm={handleExpressConfirm}
        options={{
          buttonType: { applePay: "plain", googlePay: "plain" },
          layout: { maxColumns: 2, maxRows: 1, overflow: "never" },
        }}
      />
      {expressAvailable && <div className="or-sep">ou payer par carte</div>}

      {/* Step 2 — Mode de paiement */}
      <div className="co-step">
        <div className="co-step-head">
          <div className="co-step-num">2</div>
          <h2>Mode de paiement</h2>
          <span className="badge-secure">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>
            </svg>
            SSL · 256 bits
          </span>
        </div>
        <PaymentElement
          options={{
            layout: "tabs",
            paymentMethodOrder: ["card", "apple_pay", "google_pay", "paypal", "revolut_pay"],
          }}
        />
      </div>

      {/* Step 3 — Adresse de facturation */}
      <div className="co-step">
        <div className="co-step-head">
          <div className="co-step-num">3</div>
          <h2>Adresse de facturation</h2>
        </div>
        <div className="co-form-grid">
          <div className="co-fld full">
            <label>Adresse</label>
            <input type="text" placeholder="22 rue de la République" autoComplete="address-line1" />
          </div>
          <div className="co-fld">
            <label>Code postal</label>
            <input type="text" placeholder="69002" autoComplete="postal-code" inputMode="numeric" />
          </div>
          <div className="co-fld">
            <label>Ville</label>
            <input type="text" placeholder="Lyon" autoComplete="address-level2" />
          </div>
          <div className="co-fld full">
            <label>Pays</label>
            <select autoComplete="country-name">
              <option>France</option>
              <option>Belgique</option>
              <option>Suisse</option>
              <option>Luxembourg</option>
            </select>
          </div>
        </div>
      </div>

      {payError && (
        <div style={{ background: "#FDECE2", border: "1px solid #F4C8AE", borderRadius: 10, padding: "12px 16px", color: "#8B4427", fontSize: 14, marginBottom: 16 }}>
          {payError}
        </div>
      )}

      <button type="submit" className={`pay-btn${paying ? " loading" : ""}`} disabled={!stripe || paying}>
        <span className="lbl">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width={16} height={16} style={{ verticalAlign: "middle" }}>
            <rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>
          </svg>
          {paying ? "Paiement en cours…" : <>Payer <strong>{fmtAmount}</strong></>}
          {!paying && <span className="arrow">→</span>}
        </span>
      </button>

      <p className="legal">
        En cliquant sur "Payer", vous acceptez nos{" "}
        <a href="/cgv">CGV</a> et notre{" "}
        <a href="/confidentialite">politique de confidentialité</a>.{" "}
        Vos données bancaires sont traitées par{" "}
        <strong style={{ color: "var(--ink)", fontWeight: 500 }}>Stripe</strong>, jamais stockées par nos serveurs.
      </p>
    </form>
  )
}

// ── Main wizard ──────────────────────────────────────────────────────
export default function BookingWizard({ serviceId, userData }: Props) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [svc, setSvc] = useState<Svc | null>(null)
  const [date, setDate] = useState<Date | null>(null)
  const [time, setTime] = useState<string | null>(null)
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth())
  const [info, setInfo] = useState<Info>({ first: "", last: "", email: "", phone: "", place: "cabinet", address: "", note: "" })
  const [firstTime, setFirstTime] = useState(false)
  const [refCode, setRefCode] = useState("")
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [amountInCents, setAmountInCents] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [availableDates, setAvailableDates] = useState<Set<string>>(new Set())
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [datesLoading, setDatesLoading] = useState(true)
  const [travelFee, setTravelFee] = useState<number | null>(null)
  const [travelFeeLoading, setTravelFeeLoading] = useState(false)
  const [travelFeeError, setTravelFeeError] = useState<string | null>(null)
  const [addressCoords, setAddressCoords] = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    const id = serviceId as SoinId | undefined
    if (id && SOINS[id]) {
      const s = SOINS[id]
      setSvc({ id, name: s.name, price: s.price, dur: parseInt(s.dur) })
    }
  }, [serviceId])

  useEffect(() => {
    if (userData) {
      const parts = userData.fullName.trim().split(" ")
      setInfo((v) => ({
        ...v,
        first: parts[0] ?? v.first,
        last: parts.slice(1).join(" ") || v.last,
        email: userData.email || v.email,
        phone: userData.phone || v.phone,
      }))
    }
  }, [userData])

  useEffect(() => {
    fetch("/api/booking/availability/dates")
      .then((r) => r.json())
      .then((data) => setAvailableDates(new Set(data.dates ?? [])))
      .catch(() => toast.error("Impossible de charger les disponibilités"))
      .finally(() => setDatesLoading(false))
  }, [])

  useEffect(() => {
    if (!date) return
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
    setSlotsLoading(true)
    setAvailableSlots([])
    fetch(`/api/booking/availability/slots?date=${iso}`)
      .then((r) => r.json())
      .then((data) => setAvailableSlots(data.slots ?? []))
      .catch(() => toast.error("Impossible de charger les créneaux"))
      .finally(() => setSlotsLoading(false))
  }, [date])

  useEffect(() => {
    if (info.place !== "domicile" || !addressCoords) {
      setTravelFee(null)
      setTravelFeeError(null)
      return
    }
    setTravelFeeLoading(true)
    setTravelFeeError(null)
    fetch(`/api/travel-fee?lat=${addressCoords.lat}&lng=${addressCoords.lng}`)
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) {
          setTravelFeeError(data.error ?? "Zone non desservie")
          setTravelFee(null)
        } else {
          setTravelFee(data.feeInCents)
        }
      })
      .catch(() => setTravelFeeError("Erreur réseau"))
      .finally(() => setTravelFeeLoading(false))
  }, [addressCoords, info.place])

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const maxDate = new Date(today); maxDate.setDate(today.getDate() + 60)
  const minMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const curViewStart = new Date(viewYear, viewMonth, 1)
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1)
  const startOffset = (firstDayOfMonth.getDay() + 6) % 7
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

  function goTo(n: number) {
    setStep(n)
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50)
  }

  function calcDisplayTotal() {
    if (!svc) return 0
    let t = svc.price
    if (info.place === "domicile") t += Math.round((travelFee ?? 1800) / 100)
    if (firstTime) t = Math.round(t * 0.8)
    return t
  }

  // Step 4 → 5: create PaymentIntent on the server (appointment created by webhook on success)
  async function handleProceedToPayment() {
    if (!svc || !selectedSlotId) return

    // Already have a PaymentIntent from a previous attempt — reuse it, don't call API again
    if (clientSecret) {
      goTo(5)
      return
    }

    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceSlug: svc.id,
          slotId: selectedSlotId,
          notes: info.note || null,
          isFirstVisit: firstTime,
          location: info.place,
          clientAddress: info.place === "domicile" ? info.address : null,
          name: `${info.first} ${info.last}`.trim(),
          email: info.email,
          phone: info.phone || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 409) {
          toast.error("Ce créneau vient d'être pris — choisissez un autre horaire.", { duration: 6000 })
          goTo(2)
        } else {
          setSubmitError(data.error ?? "Erreur inattendue")
        }
        return
      }
      setRefCode(data.ref)
      setClientSecret(data.clientSecret)
      setAmountInCents(data.amountInCents)
      // Save booking data so confirmation page can display details
      // Extract PI ID from clientSecret (format: pi_xxx_secret_yyy)
      const paymentIntentId = (data.clientSecret as string).split("_secret_")[0]
      sessionStorage.setItem("booking_confirmation", JSON.stringify({
        ref: data.ref,
        paymentIntentId,
        serviceName: svc.name,
        serviceDur: svc.dur,
        date: date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}` : "",
        time: time ?? "",
        place: info.place,
        address: info.address,
        firstName: info.first,
        lastName: info.last,
        email: info.email,
        phone: info.phone,
        amountInCents: data.amountInCents,
        travelFee: travelFee,
        isFirstTime: firstTime,
      }))
      goTo(5)
    } catch {
      toast.error("Erreur réseau — vérifiez votre connexion et réessayez.")
      setSubmitError("Erreur réseau. Vérifiez votre connexion et réessayez.")
    } finally {
      setSubmitting(false)
    }
  }

  const isInfoValid = !!(
    info.first.trim() &&
    info.last.trim() &&
    /\S+@\S+\.\S+/.test(info.email) &&
    info.phone.trim().length >= 6 &&
    (info.place !== "domicile" || addressCoords !== null)
  )

  // ── Step 5: full-page checkout layout ──────────────────────────────
  if (step === 5 && clientSecret) {
    const servicePrice = svc ? svc.price : 0
    const travelFeeEur = travelFee ? travelFee / 100 : 0
    const discountEur = firstTime ? Math.round(servicePrice * 0.2) : 0
    const totalEur = amountInCents / 100
    const taxEur = Math.round((totalEur / 6) * 100) / 100

    function fmtDateLong(d: Date | null) {
      if (!d) return "—"
      const dow = ["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"][d.getDay()]
      return `${dow} ${d.getDate()} ${MONTHS[d.getMonth()].toLowerCase()} ${d.getFullYear()}`
    }

    const stripeAppearance = {
      theme: "stripe" as const,
      variables: {
        colorPrimary: "#D89175",
        colorBackground: "#ffffff",
        colorText: "#1C1C1C",
        colorTextPlaceholder: "#9e9181",
        fontFamily: "Manrope, sans-serif",
        borderRadius: "10px",
        spacingUnit: "4px",
      },
      rules: {
        ".Input": { border: "1px solid #e8ddd5", boxShadow: "none", padding: "14px 16px", fontSize: "15px" },
        ".Input:focus": { border: "1px solid #1C1C1C", boxShadow: "0 0 0 4px #2218120c" },
        ".Tab": { border: "1.5px solid #e8ddd5", borderRadius: "10px" },
        ".Tab--selected": { border: "1.5px solid #1C1C1C", boxShadow: "0 0 0 4px #2218120c" },
        ".Label": { fontSize: "11px", letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: "500", color: "#9e9181" },
      },
    }

    return (
      <div style={{ position: "fixed", inset: 0, background: "var(--paper)", overflowY: "auto", zIndex: 100 }}>
        {/* Sticky top bar */}
        <header className="co-top">
          <div className="co-top-inner">
            <button className="co-back" onClick={() => goTo(4)}>
              <span className="arrow">←</span>
              Retour à la réservation
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--serif)", fontSize: 18, fontStyle: "italic" }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "radial-gradient(circle at 30% 30%, #fff, var(--terra) 70%)", boxShadow: "0 0 12px var(--terra-soft)", flexShrink: 0 }} />
              La bulle de vie
            </div>
            <div className="co-secure">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>
              </svg>
              Paiement sécurisé · Stripe
            </div>
          </div>
        </header>

        <main className="checkout">
          {/* ── LEFT: payment form ── */}
          <section>
            <div className="co-head">
              <span className="eyebrow">Étape finale</span>
              <h1>Régler <span className="italic">votre séance.</span></h1>
              <p className="sub">Paiement 100 % sécurisé via Stripe — vos données ne transitent jamais par nos serveurs.</p>
            </div>

            {/* Step 1 — Vos coordonnées */}
            <div className="co-step">
              <div className="co-step-head">
                <div className="co-step-num">1</div>
                <h2>Vos coordonnées</h2>
              </div>
              <div className="co-form-grid">
                <div className="co-fld">
                  <label>Prénom</label>
                  <input type="text" value={info.first} readOnly />
                </div>
                <div className="co-fld">
                  <label>Nom</label>
                  <input type="text" value={info.last} readOnly />
                </div>
                <div className="co-fld full">
                  <label>E‑mail<span className="opt">— confirmation envoyée ici</span></label>
                  <input type="email" value={info.email} readOnly className="with-icon" />
                  <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 7 9-7"/>
                  </svg>
                </div>
                {info.phone && (
                  <div className="co-fld full">
                    <label>Téléphone<span className="opt">— pour le rappel SMS, optionnel</span></label>
                    <input type="tel" value={info.phone} readOnly className="with-icon" />
                    <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z"/>
                    </svg>
                  </div>
                )}
              </div>
            </div>

            {/* Steps 2 (PaymentElement) + 3 (billing) + submit — inside <Elements> */}
            <Elements stripe={stripePromise} options={{ clientSecret, appearance: stripeAppearance }}>
              <StripePaymentBlock
                amountInCents={amountInCents}
                refCode={refCode}
                onSuccess={() => router.push(`/booking/confirmation?ref=${refCode}`)}
              />
            </Elements>
          </section>

          {/* ── RIGHT: order summary ── */}
          <aside className="summary">
            <h3>Votre commande</h3>
            <div className="sub">{fmtDateLong(date)}{time ? ` · ${time.replace(":", "h")}` : ""}</div>

            {svc && (
              <div className="order-item">
                <div className="order-thumb">❋</div>
                <div className="order-info">
                  <div className="order-nm">{svc.name}</div>
                  <div className="order-det">{svc.dur} min</div>
                  <div className="order-meta">
                    <span className="order-meta-pill">{info.place === "domicile" ? "À domicile" : "Cabinet Lyon 7ᵉ"}</span>
                    {firstTime && <span className="order-meta-pill" style={{ color: "var(--terra)" }}>1ère visite</span>}
                  </div>
                </div>
                <div className="order-price">{servicePrice} €</div>
              </div>
            )}

            <div className="promo-row">
              <input type="text" placeholder="Code promo" maxLength={16} style={{ textTransform: "uppercase" }} />
              <button type="button">Appliquer</button>
            </div>

            <div className="total-line">
              <span>Sous‑total</span>
              <span className="v">{servicePrice} €</span>
            </div>
            {travelFeeEur > 0 && (
              <div className="total-line">
                <span>Déplacement</span>
                <span className="v">+{travelFeeEur.toFixed(0)} €</span>
              </div>
            )}
            {discountEur > 0 && (
              <div className="total-line discount">
                <span>Remise 1ère visite (−20 %)</span>
                <span className="v">−{discountEur} €</span>
              </div>
            )}
            <div className="total-line">
              <span>Frais de gestion</span>
              <span className="v">Offerts</span>
            </div>
            <div className="total-line">
              <span>TVA incluse (20 %)</span>
              <span className="v">{taxEur.toFixed(2)} €</span>
            </div>

            <div className="total-grand">
              <div>
                <div className="lbl">Total</div>
              </div>
              <div className="v">
                <span>{totalEur.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                <small>€</small>
              </div>
            </div>

            <div className="gives-back">
              <span className="ic">♥</span>
              <div>Cette séance vous fait <strong style={{ fontFamily: "var(--serif)", fontStyle: "italic" }}>gagner 1 tampon</strong> dans votre Bulle d'or. Fidélité récompensée.</div>
            </div>

            <div className="trust">
              <div className="trust-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>
                </svg>
                SSL 256 bits
              </div>
              <div className="trust-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M12 2 4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6z"/><path d="M9 12l2 2 4-4"/>
                </svg>
                Stripe certifié PCI
              </div>
              <div className="trust-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>
                </svg>
                Annul. 24h
              </div>
            </div>
          </aside>
        </main>
      </div>
    )
  }

  return (
    <div className="resa-page">
      <div className="wrap">
        <div className="resa-header">
          <span className="eyebrow" style={{ justifyContent: "center", display: "inline-flex" }}>Réservation</span>
          <h1 style={{ marginTop: 18 }}>Entrez <span className="italic">dans la bulle.</span></h1>
          <p>Quatre étapes, deux minutes. Confirmation par e‑mail sous 24h.</p>
        </div>

        {/* Stepper */}
        <div className="stepper">
          {STEPS.map((label, i) => (
            <span key={label} style={{ display: "contents" }}>
              {i > 0 && <span className="step-sep" />}
              <div
                className={`step${i === step ? " active" : ""}${i < step ? " done" : ""}`}
                onClick={() => { if (i < step && i < 5) goTo(i) }}
                style={{ cursor: i < step && i < 5 ? "pointer" : "default" }}
              >
                <span className="ix"><span>{i + 1}</span></span>
                {label}
              </div>
            </span>
          ))}
        </div>

        <div className="resa-grid">
          {/* Left: step panels */}
          <div className="panel-stack">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.25 }}
              >
                {/* ── Step 0: Soin ── */}
                {step === 0 && (
                  <div className="panel">
                    <span className="eyebrow">Étape 1</span>
                    <h2 style={{ marginTop: 12 }}>Quel soin <span className="italic">vous appelle ?</span></h2>
                    <p className="panel-sub">Choisissez la prestation. Vous pourrez encore changer d'avis avant de confirmer.</p>
                    <div className="svc-grid">
                      {SOIN_ORDER.map(id => {
                        const s = SOINS[id]
                        return (
                          <button
                            key={id}
                            className={`svc${svc?.id === id ? " selected" : ""}`}
                            onClick={() => setSvc({ id, name: s.name, price: s.price, dur: parseInt(s.dur) })}
                          >
                            <div className="row">
                              <div className="nm">{s.name}</div>
                              <div className="pr">{s.price}€</div>
                            </div>
                            <div className="dur">{s.dur}</div>
                            <div className="meta">{s.lede.slice(0, 65).trimEnd()}…</div>
                          </button>
                        )
                      })}
                    </div>
                    <div className="step-nav">
                      <button className="ghost" onClick={() => router.back()}>← Retour</button>
                      <button className="btn primary" disabled={!svc} onClick={() => svc && goTo(1)}>
                        Continuer <span className="arrow">→</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Step 1: Date ── */}
                {step === 1 && (
                  <div className="panel">
                    <span className="eyebrow">Étape 2</span>
                    <h2 style={{ marginTop: 12 }}>Choisissez <span className="italic">une date.</span></h2>
                    <p className="panel-sub">Seules les dates avec des créneaux libres sont sélectionnables.</p>
                    <div className="cal">
                      <div className="cal-head">
                        <div className="mname">{MONTHS[viewMonth]} {viewYear}</div>
                        <div className="cal-nav">
                          <button
                            className="cal-btn"
                            disabled={curViewStart.getTime() <= minMonth.getTime()}
                            onClick={() => {
                              if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
                              else setViewMonth(m => m - 1)
                            }}
                            aria-label="Mois précédent"
                          >‹</button>
                          <button
                            className="cal-btn"
                            onClick={() => {
                              if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
                              else setViewMonth(m => m + 1)
                            }}
                            aria-label="Mois suivant"
                          >›</button>
                        </div>
                      </div>
                      {datesLoading ? <CalendarSkeleton days={35} /> : <div className="cal-grid">
                        {DOW.map(d => <div key={d} className="cal-dow">{d}</div>)}
                        {Array.from({ length: startOffset }, (_, i) => (
                          <div key={`e${i}`} className="cal-cell empty" />
                        ))}
                        {Array.from({ length: daysInMonth }, (_, i) => {
                          const day = i + 1
                          const d = new Date(viewYear, viewMonth, day)
                          const isoDate = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                          const pastOrFuture = d < today || d > maxDate
                          const hasSlots = !datesLoading && availableDates.has(isoDate)
                          const disabled = pastOrFuture || (!datesLoading && !hasSlots)
                          const isToday = d.getTime() === today.getTime()
                          const isSelected = date ? d.getTime() === date.getTime() : false
                          let cls = "cal-cell"
                          if (disabled) cls += " disabled"
                          else {
                            cls += " available"
                            if (isToday) cls += " today"
                            if (isSelected) cls += " selected"
                          }
                          return (
                            <div
                              key={day}
                              className={cls}
                              onClick={() => { if (!disabled) { setDate(d); setTime(null); setSelectedSlotId(null) } }}
                            >
                              {day}
                            </div>
                          )
                        })}
                      </div>}
                    </div>
                    <div className="step-nav">
                      <button className="ghost" onClick={() => goTo(0)}>← Retour</button>
                      <button className="btn primary" disabled={!date} onClick={() => date && goTo(2)}>
                        Continuer <span className="arrow">→</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Step 2: Heure ── */}
                {step === 2 && (
                  <div className="panel">
                    <span className="eyebrow">Étape 3</span>
                    <h2 style={{ marginTop: 12 }}>À quelle heure <span className="italic">vous attendre ?</span></h2>
                    <p className="panel-sub">Les créneaux affichés sont disponibles pour la date choisie.</p>
                    <div className="slots">
                      {slotsLoading && <SlotsSkeleton count={6} />}
                      {!slotsLoading && availableSlots.length === 0 && (
                        <p style={{ color: "var(--mute)", fontStyle: "italic", gridColumn: "1/-1" }}>
                          Aucun créneau disponible pour cette date. Essayez une autre journée.
                        </p>
                      )}
                      {!slotsLoading && availableSlots.map((slot) => (
                        <button
                          key={slot.id}
                          className={`slot${selectedSlotId === slot.id ? " selected" : ""}`}
                          onClick={() => { setTime(slot.startTime); setSelectedSlotId(slot.id) }}
                        >
                          <span>{slot.startTime.replace(":", "h")}</span>
                          <small>{svc?.dur || 60} min</small>
                        </button>
                      ))}
                    </div>
                    <div className="step-nav">
                      <button className="ghost" onClick={() => goTo(1)}>← Retour</button>
                      <button className="btn primary" disabled={!selectedSlotId} onClick={() => selectedSlotId && goTo(3)}>
                        Continuer <span className="arrow">→</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Step 3: Vos infos ── */}
                {step === 3 && (
                  <div className="panel">
                    <span className="eyebrow">Étape 4</span>
                    <h2 style={{ marginTop: 12 }}>Faisons <span className="italic">connaissance.</span></h2>
                    <p className="panel-sub">Vos coordonnées pour la confirmation. Rien d'autre.</p>
                    <div className="form-grid">
                      <div className="field">
                        <label>Prénom</label>
                        <input
                          type="text"
                          value={info.first}
                          onChange={e => setInfo(v => ({ ...v, first: e.target.value }))}
                          autoComplete="given-name"
                        />
                      </div>
                      <div className="field">
                        <label>Nom</label>
                        <input
                          type="text"
                          value={info.last}
                          onChange={e => setInfo(v => ({ ...v, last: e.target.value }))}
                          autoComplete="family-name"
                        />
                      </div>
                      <div className="field">
                        <label>E‑mail</label>
                        <input
                          type="email"
                          value={info.email}
                          onChange={e => setInfo(v => ({ ...v, email: e.target.value }))}
                          autoComplete="email"
                        />
                      </div>
                      <div className="field">
                        <label>Téléphone</label>
                        <input
                          type="tel"
                          value={info.phone}
                          onChange={e => setInfo(v => ({ ...v, phone: e.target.value }))}
                          autoComplete="tel"
                          placeholder="06 …"
                        />
                      </div>
                      <div className="field full">
                        <label>Lieu de la séance</label>
                        <select
                          value={info.place}
                          onChange={e => setInfo(v => ({ ...v, place: e.target.value }))}
                        >
                          <option value="cabinet">Au cabinet — Lyon 7ᵉ</option>
                          <option value="domicile">À mon domicile (+18€ selon distance)</option>
                        </select>
                      </div>
                      {info.place === "domicile" && (
                        <div className="field full">
                          <label>Votre adresse</label>
                          <AddressAutocomplete
                            value={info.address}
                            onChange={(raw) => {
                              setInfo(v => ({ ...v, address: raw }))
                              setAddressCoords(null)
                              setTravelFee(null)
                            }}
                            onSelect={(label, lat, lng) => {
                              setInfo(v => ({ ...v, address: label }))
                              setAddressCoords({ lat, lng })
                            }}
                          />
                          {travelFeeLoading && (
                            <span className="hint" style={{ fontStyle: "italic" }}>Calcul du déplacement…</span>
                          )}
                          {!travelFeeLoading && travelFeeError && (
                            <span className="hint" style={{ color: "var(--terra)" }}>{travelFeeError}</span>
                          )}
                          {!travelFeeLoading && !travelFeeError && travelFee !== null && (
                            <span className="hint" style={{ color: "var(--terra)" }}>
                              {travelFee === 0
                                ? "Déplacement inclus — vous êtes dans la zone gratuite."
                                : `Frais de déplacement : +${(travelFee / 100).toFixed(2).replace(".", ",")} €`}
                            </span>
                          )}
                          {!travelFeeLoading && !travelFeeError && travelFee === null && !addressCoords && (
                            <span className="hint">Commencez à saisir votre adresse et choisissez dans la liste.</span>
                          )}
                        </div>
                      )}
                      <div className="field full">
                        <label>Un mot pour préparer la séance ?</label>
                        <textarea
                          value={info.note}
                          onChange={e => setInfo(v => ({ ...v, note: e.target.value }))}
                          placeholder="Tensions du moment, allergies, ambiance souhaitée…"
                        />
                        <span className="hint">Optionnel — mais souvent utile.</span>
                      </div>
                      <label className="check-row full">
                        <input
                          type="checkbox"
                          checked={firstTime}
                          onChange={e => setFirstTime(e.target.checked)}
                        />
                        <span>
                          <strong>C'est ma première bulle.</strong>{" "}
                          Profitez de 20 % offerts sur votre soin signature.
                        </span>
                      </label>
                    </div>
                    <div className="step-nav">
                      <button className="ghost" onClick={() => goTo(2)}>← Retour</button>
                      <button
                        className="btn primary"
                        disabled={!isInfoValid}
                        onClick={() => isInfoValid && goTo(4)}
                      >
                        Vérifier ma réservation <span className="arrow">→</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Step 4: Confirmer ── */}
                {step === 4 && (
                  <div className="panel">
                    <span className="eyebrow">Étape 5</span>
                    <h2 style={{ marginTop: 12 }}>Tout est bon ? <span className="italic">On confirme.</span></h2>
                    <p className="panel-sub">Un dernier coup d'œil avant le paiement. Vous pouvez modifier chaque étape.</p>
                    <div className="review">
                      {([
                        { label: "Soin", value: svc?.name ?? "—", editStep: 0 },
                        { label: "Date", value: fmtDate(date), editStep: 1 },
                        { label: "Heure", value: time ? time.replace(":", "h") : "—", editStep: 2 },
                        { label: "Vous", value: `${info.first} ${info.last}`, editStep: 3 },
                        { label: "Coordonnées", value: `${info.email} · ${info.phone}`, editStep: 3 },
                        { label: "Lieu", value: info.place === "domicile" ? `À domicile${info.address ? ` — ${info.address}` : ""}` : "Au cabinet · Lyon 7ᵉ", editStep: 3 },
                        ...(info.place === "domicile" ? [{ label: "Déplacement", value: travelFee === null ? "À calculer" : travelFee === 0 ? "Gratuit" : `+${(travelFee / 100).toFixed(2).replace(".", ",")} €`, editStep: 3 }] : []),
                        ...(firstTime ? [{ label: "Remise 1ère visite", value: "−20 %", editStep: 3 }] : []),
                        ...(info.note ? [{ label: "Note", value: info.note, editStep: 3 }] : []),
                      ] as { label: string; value: string; editStep: number }[]).map(row => (
                        <div key={row.label} className="review-row">
                          <div>
                            <div className="lbl">{row.label}</div>
                            <div className="val">{row.value}</div>
                          </div>
                          <button className="edit" onClick={() => goTo(row.editStep)}>Modifier</button>
                        </div>
                      ))}
                    </div>
                    {submitError && (
                      <div style={{
                        background: "#FDECE2", border: "1px solid #F4C8AE",
                        borderRadius: 10, padding: "12px 16px",
                        color: "#8B4427", fontSize: 14, marginBottom: 16,
                      }}>
                        {submitError}
                      </div>
                    )}
                    <div className="step-nav">
                      <button className="ghost" onClick={() => goTo(3)}>← Retour</button>
                      <button className="btn primary" onClick={handleProceedToPayment} disabled={submitting}>
                        {submitting
                          ? "Préparation du paiement…"
                          : <>Procéder au paiement — {calcDisplayTotal()}€ <span className="arrow">→</span></>}
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 5 handled outside the wizard grid — see checkout render below */}
                {step === 5 && <div />}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right: summary sidebar */}
          <aside className="summary">
            <div className="summary-card">
              <span className="eyebrow" style={{ color: "#ffffff99" }}>Votre réservation</span>
              <h3 style={{ marginTop: 14, color: "#fff", fontStyle: "italic" }}>En un coup d'œil</h3>
              <div className="summary-list">
                {([
                  ["Soin", svc?.name ?? null, "À choisir"],
                  ["Date", date ? fmtDate(date) : null, "—"],
                  ["Heure", time ? time.replace(":", "h") : null, "—"],
                  ["Durée", svc ? `${svc.dur} min` : null, "—"],
                ] as [string, string | null, string][]).map(([label, val, placeholder]) => (
                  <div key={label} className="summary-row">
                    <div>
                      <div className="l">{label}</div>
                      <div className={`v${!val ? " muted" : ""}`}>{val ?? placeholder}</div>
                    </div>
                  </div>
                ))}
              </div>
              {info.place === "domicile" && svc && (
                <div className="summary-row" style={{ borderTop: "1px solid rgba(255,255,255,.1)", paddingTop: 12 }}>
                  <div>
                    <div className="l">Déplacement</div>
                    <div className="v" style={{ fontSize: 13 }}>
                      {travelFeeLoading
                        ? "Calcul…"
                        : travelFeeError
                        ? "—"
                        : travelFee === null
                        ? "Saisissez l'adresse"
                        : travelFee === 0
                        ? "Gratuit"
                        : `+${(travelFee / 100).toFixed(2).replace(".", ",")} €`}
                    </div>
                  </div>
                </div>
              )}
              {firstTime && svc && (
                <div className="summary-row" style={{ borderTop: "1px solid rgba(255,255,255,.1)", paddingTop: 12 }}>
                  <div>
                    <div className="l">Remise 1ère visite</div>
                    <div className="v" style={{ fontSize: 13, color: "#b8e6b8" }}>−20 %</div>
                  </div>
                </div>
              )}
              <div className="summary-total">
                <div className="l">Total</div>
                <div className="v">{svc ? `${calcDisplayTotal()}€` : "—"}</div>
              </div>
              <div className="summary-perks">
                <span className="ic">🔒</span>
                <div>Paiement sécurisé par Stripe. Annulation gratuite jusqu'à 24h avant.</div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
