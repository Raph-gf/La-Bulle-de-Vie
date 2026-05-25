"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { AppointmentCardsSkeleton } from "@/components/ui/Skeleton"

type View = "overview" | "appts" | "history" | "favorites" | "preferences" | "payments" | "gifts" | "settings"
const ALL_VIEWS: View[] = ["overview", "appts", "history", "favorites", "preferences", "payments", "gifts", "settings"]

type Appt = {
  id: string
  status: string
  location: string
  clientAddress: string | null
  service: { name: string; durationMinutes: number; price: number }
  slot: { date: string; startTime: string }
}

type HistAppt = {
  id: string
  status: string
  amountPaid: number
  review: { id: string; stars: number; approved: boolean; specialistReply: string | null } | null
  service: { name: string; durationMinutes: number }
  slot: { date: string; startTime: string }
}

type NextAppt = {
  id: string
  location: string
  clientAddress: string | null
  amountPaid: number
  service: { name: string; durationMinutes: number; price: number }
  slot: { date: string; startTime: string }
}

type Stats = {
  totalSessions: number
  reviewsCount: number
  topService: string | null
  nextAppointment: NextAppt | null
}

type ProfileData = {
  fullName: string
  phone: string | null
  preferredLocation: string | null
  defaultShippingAddress: string | null
  avatarUrl: string | null
}

type ReviewModal = { appointmentId: string; serviceName: string } | null

const MONTHS_SHORT = ["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Aoû","Sep","Oct","Nov","Déc"]
const MONTHS_LONG = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"]

function fmtApptDate(iso: string) {
  const d = new Date(iso)
  return { day: d.getUTCDate(), month: MONTHS_SHORT[d.getUTCMonth()] }
}

function fmtApptDateLong(iso: string) {
  const d = new Date(iso)
  return `${d.getUTCDate()} ${MONTHS_LONG[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

export default function ComptePage() {
  const router = useRouter()
  const [view, setView] = useState<View>("overview")
  const [sideOpen, setSideOpen] = useState(false)
  const [userName, setUserName] = useState("Chargement…")
  const [userEmail, setUserEmail] = useState("")
  const [userInitial, setUserInitial] = useState("?")
  const [appts, setAppts] = useState<Appt[]>([])
  const [apptsLoading, setApptsLoading] = useState(false)
  const [history, setHistory] = useState<HistAppt[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [stats, setStats] = useState<Stats | null>(null)
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [profileSaving, setProfileSaving] = useState(false)
  const [countdown, setCountdown] = useState({ d: "00", h: "00", m: "00" })
  const [toggles, setToggles] = useState({ "2fa": false, rappel24: true, rappel2h: true, sms: false, newsletter: true })
  const [reviewModal, setReviewModal] = useState<ReviewModal>(null)
  const [reviewStars, setReviewStars] = useState(0)
  const [reviewBody, setReviewBody] = useState("")
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set())
  // Form refs for settings
  const pfFirstNameRef = useRef<HTMLInputElement>(null)
  const pfLastNameRef = useRef<HTMLInputElement>(null)
  const pfPhoneRef = useRef<HTMLInputElement>(null)
  const pfAddressRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      const name = (user.user_metadata?.full_name as string) || user.email?.split("@")[0] || "Client"
      setUserName(name)
      setUserEmail(user.email ?? "")
      setUserInitial(name.charAt(0).toUpperCase())
    })

    const hash = window.location.hash.slice(1) as View
    if (ALL_VIEWS.includes(hash)) setView(hash)

    // Fetch stats (next appointment + counts)
    fetch("/api/user/stats").then(r => r.json()).then((d: Stats) => {
      setStats(d)
    }).catch(() => {})

    // Fetch profile for settings form prefill
    fetch("/api/user/profile").then(r => r.json()).then(d => {
      if (d.profile) setProfileData(d.profile)
    }).catch(() => {})
  }, [])

  // Update countdown whenever stats (nextAppointment) changes
  useEffect(() => {
    const next = stats?.nextAppointment
    if (!next) return

    const [h, m] = next.slot.startTime.split(":").map(Number)
    const target = new Date(next.slot.date)
    target.setUTCHours(h - 2, m, 0, 0) // convert Paris time (UTC+2) to UTC for comparison

    function tick() {
      let diff = Math.max(0, target.getTime() - Date.now())
      const d = Math.floor(diff / 86400000); diff -= d * 86400000
      const hr = Math.floor(diff / 3600000); diff -= hr * 3600000
      const mn = Math.floor(diff / 60000)
      setCountdown({ d: String(d).padStart(2, "0"), h: String(hr).padStart(2, "0"), m: String(mn).padStart(2, "0") })
    }
    tick()
    const iv = setInterval(tick, 30000)
    return () => clearInterval(iv)
  }, [stats?.nextAppointment])

  useEffect(() => {
    if (view !== "appts") return
    setApptsLoading(true)
    fetch("/api/user/appointments")
      .then(r => r.json())
      .then(d => setAppts(d.appointments ?? []))
      .finally(() => setApptsLoading(false))
  }, [view])

  useEffect(() => {
    if (view !== "history") return
    setHistoryLoading(true)
    fetch("/api/user/history")
      .then(r => r.json())
      .then(d => setHistory(d.appointments ?? []))
      .finally(() => setHistoryLoading(false))
  }, [view])

  async function handleSaveProfile() {
    const firstName = pfFirstNameRef.current?.value.trim() ?? ""
    const lastName = pfLastNameRef.current?.value.trim() ?? ""
    const phone = pfPhoneRef.current?.value.trim() ?? ""
    const address = pfAddressRef.current?.value.trim() ?? ""
    if (!firstName) { toast.error("Le prénom est requis"); return }

    setProfileSaving(true)
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: `${firstName} ${lastName}`.trim(), phone: phone || null, defaultShippingAddress: address || null }),
      })
      if (!res.ok) throw new Error()
      const d = await res.json()
      const newName = d.profile.fullName
      setUserName(newName)
      setUserInitial(newName.charAt(0).toUpperCase())
      toast.success("Profil mis à jour")
    } catch {
      toast.error("Erreur lors de la mise à jour")
    } finally {
      setProfileSaving(false)
    }
  }

  async function handleSubmitReview() {
    if (!reviewModal || reviewStars === 0) { toast.error("Choisissez une note"); return }
    if (reviewBody.trim().length < 10) { toast.error("L'avis doit faire au moins 10 caractères"); return }
    setReviewSubmitting(true)
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId: reviewModal.appointmentId, stars: reviewStars, body: reviewBody.trim() }),
      })
      if (res.status === 409) { toast.error("Vous avez déjà laissé un avis pour cette séance"); setReviewModal(null); return }
      if (!res.ok) throw new Error()
      toast.success("Avis envoyé — merci ! Il sera visible après validation.")
      setReviewModal(null)
      setReviewStars(0)
      setReviewBody("")
      // Refresh history to show star rating
      fetch("/api/user/history").then(r => r.json()).then(d => setHistory(d.appointments ?? []))
    } catch {
      toast.error("Erreur lors de l'envoi")
    } finally {
      setReviewSubmitting(false)
    }
  }

  function go(v: View) {
    setView(v)
    setSideOpen(false)
    window.history.replaceState({}, "", "#" + v)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  async function handleLogout() {
    if (!confirm("Vous déconnecter ?")) return
    await createClient().auth.signOut()
    router.push("/")
  }

  const firstName = userName.split(" ")[0]
  const todayStr = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
  const todayFormatted = todayStr.charAt(0).toUpperCase() + todayStr.slice(1)

  const navItems: { view: View; label: string; icon: string[]; badge?: number }[] = [
    { view: "overview", label: "Mon espace", icon: ["M3 11 12 4l9 7", "M5 10v10h14V10"] },
    { view: "appts", label: "Rendez‑vous", icon: ["M3 5h18v16H3z", "M3 10h18", "M8 3v4", "M16 3v4"], badge: 2 },
    { view: "history", label: "Historique", icon: ["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z", "M12 7v5l3 2"] },
    { view: "favorites", label: "Mes favoris", icon: ["M12 21s-7-4.5-7-10.5C5 7 7.5 5 10 5c1.5 0 2.5 1 2 2 .5-1 1.5-2 3-2 2.5 0 5 2 5 5.5C19 16.5 12 21 12 21z"] },
  ]
  const profileItems: { view: View; label: string; icon: string[]; badge?: number }[] = [
    { view: "preferences", label: "Préférences", icon: ["M5 12l3-7 3 7 7 3-7 3-3 7-3-7-7-3z"] },
    { view: "payments", label: "Paiement", icon: ["M3 6h18v13H3z", "M3 10h18"] },
    { view: "gifts", label: "Cadeaux", icon: ["M3 8h18v13H3z", "M3 12h18", "M12 8v13", "M8 8a2 2 0 0 1 0-4c2 0 4 4 4 4", "M16 8a2 2 0 0 0 0-4c-2 0-4 4-4 4"], badge: 1 },
    { view: "settings", label: "Profil & sécurité", icon: ["M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z", "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"] },
  ]

  function NavItem({ item }: { item: typeof navItems[0] }) {
    const active = view === item.view
    return (
      <button onClick={() => go(item.view)} className={`acc-nav-item${active ? " active" : ""}`}>
        <span className="ic">
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            {item.icon.map((d, i) => <path key={i} d={d} />)}
          </svg>
        </span>
        <span>{item.label}</span>
        {item.badge && <span className="badge">{item.badge}</span>}
      </button>
    )
  }

  return (
    <>
      <style>{`
        body{background:var(--paper);overflow-x:hidden}
        .acc{display:grid;grid-template-columns:260px 1fr;min-height:100vh}
        .acc-side{background:var(--cream);padding:28px 18px 24px;display:flex;flex-direction:column;position:sticky;top:0;height:100vh;border-right:1px solid var(--line);overflow-y:auto}
        .acc-brand{display:flex;align-items:center;gap:10px;padding:4px 12px 24px;border-bottom:1px solid var(--line);margin-bottom:18px;text-decoration:none}
        .acc-brand .dot{width:12px;height:12px;border-radius:50%;background:radial-gradient(circle at 30% 30%,#fff,var(--terra) 70%);box-shadow:0 0 12px var(--terra-soft);animation:pulse 3s ease-in-out infinite}
        .acc-brand .name{font-family:var(--serif);font-style:italic;font-size:20px;color:var(--ink)}
        .acc-user{display:flex;align-items:center;gap:14px;padding:14px;background:#fff;border-radius:12px;margin-bottom:14px;border:1px solid var(--line)}
        .acc-user .av{width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,var(--terra) 0%,var(--terra-soft) 100%);color:#fff;display:flex;align-items:center;justify-content:center;font-family:var(--serif);font-size:20px;flex-shrink:0}
        .acc-user .info{flex:1;min-width:0}
        .acc-user .n{font-family:var(--serif);font-size:17px;line-height:1.1;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .acc-user .r{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--mute);margin-top:3px}
        .acc-nav{display:flex;flex-direction:column;gap:2px}
        .acc-nav-item{display:flex;align-items:center;gap:14px;padding:11px 14px;border-radius:8px;color:var(--ink-soft);font-size:14px;text-decoration:none;cursor:pointer;transition:background .25s,color .25s;position:relative;background:transparent;border:none;width:100%;text-align:left;font-family:var(--sans)}
        .acc-nav-item:hover{background:#fff;color:var(--ink)}
        .acc-nav-item.active{background:var(--ink);color:#fff}
        .acc-nav-item .ic{width:18px;height:18px;flex-shrink:0;display:inline-flex}
        .acc-nav-item .badge{margin-left:auto;background:var(--terra);color:#fff;font-size:10.5px;font-weight:600;padding:2px 7px;border-radius:999px;min-width:20px;text-align:center}
        .acc-nav-item.active .badge{background:#fff;color:var(--ink)}
        .acc-side-section{font-size:10.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--mute);padding:18px 14px 8px}
        .acc-side-bottom{margin-top:auto;padding-top:18px;border-top:1px solid var(--line)}
        .acc-logout{display:flex;align-items:center;gap:14px;padding:11px 14px;border-radius:8px;color:var(--ink-soft);font-size:14px;cursor:pointer;transition:background .25s,color .25s;background:transparent;border:none;width:100%;text-align:left;font-family:var(--sans)}
        .acc-logout:hover{background:#fff;color:var(--terra)}
        .acc-logout .ic{width:18px;height:18px;flex-shrink:0}
        .acc-main{display:flex;flex-direction:column;min-width:0;padding:48px 56px 80px}
        @keyframes viewIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
        .v-head{margin-bottom:36px}
        .v-head .eyebrow{margin-bottom:10px}
        .v-head h1{font-size:clamp(40px,4vw,60px);line-height:1.02}
        .v-head h1 .italic{color:var(--terra)}
        .v-head .lede{color:var(--mute);margin-top:10px;font-size:15.5px;max-width:580px;line-height:1.55}
        .card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:28px}
        .card-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:20px}
        .card-head h3{font-size:22px;line-height:1.1}
        .card-head .sub{font-size:12px;color:var(--mute);letter-spacing:.04em}
        .card-head a{font-size:13px;color:var(--terra);text-decoration:none}
        .card-head a:hover{text-decoration:underline}
        .next-card{background:linear-gradient(135deg,#1a110b 0%,#2A1F18 100%);color:#fff;border-radius:16px;padding:36px 40px;position:relative;overflow:hidden;margin-bottom:24px}
        .next-card::before{content:"";position:absolute;top:-50%;right:-20%;width:400px;height:400px;border-radius:50%;background:radial-gradient(circle,var(--terra) 0%,transparent 60%);opacity:.4;pointer-events:none}
        .next-card::after{content:"";position:absolute;bottom:-30%;left:-10%;width:300px;height:300px;border-radius:50%;background:radial-gradient(circle,var(--terra-soft) 0%,transparent 60%);opacity:.25;pointer-events:none}
        .next-card .inner{position:relative;z-index:1}
        .next-card .eyebrow{color:#ffffffaa;margin-bottom:12px}
        .next-card .eyebrow::before{background:#ffffffaa}
        .next-card h2{font-family:var(--serif);font-size:48px;line-height:1.02;color:#fff;margin-bottom:14px;font-weight:400}
        .next-card h2 .italic{color:var(--terra-soft)}
        .next-card .when{display:flex;gap:32px;flex-wrap:wrap;margin-top:24px}
        .next-card .when-block .l{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#ffffff88;margin-bottom:6px}
        .next-card .when-block .v{font-family:var(--serif);font-size:22px;line-height:1.1;color:#fff}
        .next-card .when-block .v.big{font-size:32px}
        .next-card .actions{display:flex;gap:10px;margin-top:32px;flex-wrap:wrap}
        .next-card .btn{padding:12px 22px;border:1px solid #ffffff40;background:transparent;color:#fff;border-radius:999px;font-family:var(--sans);font-size:13px;cursor:pointer;text-decoration:none;transition:all .3s ease;display:inline-flex;align-items:center;gap:8px}
        .next-card .btn:hover{background:#fff;color:var(--ink);border-color:#fff}
        .next-card .btn.primary{background:#fff;color:var(--ink);border-color:#fff}
        .next-card .btn.primary:hover{background:var(--terra);color:#fff;border-color:var(--terra)}
        .next-card .countdown{position:absolute;top:36px;right:40px;z-index:1;display:flex;gap:14px}
        .next-card .cd-item{text-align:center;min-width:48px}
        .next-card .cd-num{font-family:var(--serif);font-size:36px;line-height:1;color:#fff}
        .next-card .cd-lbl{font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:#ffffff88;margin-top:4px}
        .stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px}
        .stat-tile{background:#fff;border:1px solid var(--line);border-radius:12px;padding:20px;transition:transform .3s ease}
        .stat-tile:hover{transform:translateY(-2px)}
        .stat-tile .l{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--mute)}
        .stat-tile .v{font-family:var(--serif);font-size:32px;line-height:1;margin-top:10px;color:var(--ink)}
        .stat-tile .v small{font-size:14px;color:var(--mute);margin-left:2px}
        .stat-tile .sub{font-size:12px;color:var(--mute);margin-top:6px;letter-spacing:.04em}
        .stat-tile .sub strong{color:var(--terra)}
        .row-2{display:grid;grid-template-columns:1.5fr 1fr;gap:24px;margin-bottom:24px}
        .appt-item{display:grid;grid-template-columns:64px 1fr auto;align-items:center;gap:18px;padding:16px 0;border-bottom:1px solid var(--line);transition:padding-left .25s ease}
        .appt-item:hover{padding-left:6px}
        .appt-item:last-child{border-bottom:none}
        .appt-date{text-align:center;padding:8px 0;border:1px solid var(--line);border-radius:8px;background:var(--paper)}
        .appt-date .d{font-family:var(--serif);font-size:22px;line-height:1;color:var(--ink)}
        .appt-date .m{font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--mute);margin-top:4px}
        .appt-info .nm{font-family:var(--serif);font-size:18px}
        .appt-info .det{font-size:13px;color:var(--mute);margin-top:3px}
        .appt-info .det .sep{margin:0 8px;opacity:.4}
        .appt-actions{display:flex;gap:6px}
        .appt-status{display:inline-flex;align-items:center;gap:6px;padding:3px 9px;border-radius:999px;font-size:10.5px;background:var(--cream);color:var(--ink);letter-spacing:.06em}
        .appt-status::before{content:"";width:5px;height:5px;border-radius:50%;background:var(--mute)}
        .appt-status.ok{background:#EAF1E8;color:#3D6346}
        .appt-status.ok::before{background:#5C8262}
        .appt-status.pending{background:#F9F1E5;color:#7A5C2A}
        .appt-status.pending::before{background:#C9923F}
        .btn-small{padding:7px 14px;border-radius:999px;border:1px solid var(--line);background:transparent;font-family:var(--sans);font-size:12px;cursor:pointer;color:var(--ink-soft);transition:all .25s;text-decoration:none}
        .btn-small:hover{border-color:var(--ink);color:var(--ink)}
        .btn-small.danger:hover{border-color:var(--terra);color:var(--terra);background:#FDECE2}
        .btn-small.primary{background:var(--ink);color:#fff;border-color:var(--ink)}
        .btn-small.primary:hover{background:var(--terra);border-color:var(--terra)}
        .hist-item{display:grid;grid-template-columns:60px 1fr 100px 130px;align-items:center;gap:18px;padding:18px 0;border-bottom:1px solid var(--line)}
        .hist-item:last-child{border-bottom:none}
        .hist-date{font-family:var(--serif);font-style:italic;color:var(--mute);font-size:13px}
        .hist-date strong{display:block;font-style:normal;font-family:var(--serif);color:var(--ink);font-size:18px}
        .hist-info .nm{font-family:var(--serif);font-size:17px}
        .hist-info .det{font-size:12.5px;color:var(--mute);margin-top:2px}
        .hist-price{font-family:var(--serif);font-size:17px;color:var(--terra);text-align:right}
        .hist-action{text-align:right}
        .hist-action .stars-given{color:var(--terra);letter-spacing:3px;font-size:14px}
        .btn-rate{padding:6px 14px;border:1px dashed var(--line);border-radius:999px;background:transparent;font-family:var(--sans);font-size:11.5px;color:var(--ink-soft);cursor:pointer;letter-spacing:.04em;transition:all .25s}
        .btn-rate:hover{border-style:solid;border-color:var(--ink);color:var(--ink);background:var(--paper)}
        .fav-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
        .fav-card{position:relative;aspect-ratio:3/4;border-radius:12px;overflow:hidden;background:#1a110b;cursor:pointer;transition:transform .4s ease;text-decoration:none;display:block}
        .fav-card:hover{transform:translateY(-4px)}
        .fav-card::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 40%,#000000c0 100%);pointer-events:none}
        .fav-card .fav-img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .9s cubic-bezier(.2,.7,.2,1);background:linear-gradient(135deg,#2A1F18,#1a110b)}
        .fav-card:hover .fav-img{transform:scale(1.06)}
        .fav-card .body{position:absolute;left:0;right:0;bottom:0;padding:20px;color:#fff;z-index:1}
        .fav-card .body .nm{font-family:var(--serif);font-size:22px;line-height:1.1}
        .fav-card .body .row{display:flex;justify-content:space-between;margin-top:8px;font-size:13px;color:#ffffffbb}
        .fav-card .body .pr{font-family:var(--serif);font-size:18px;color:#fff}
        .fav-card .heart{position:absolute;top:14px;right:14px;z-index:2;width:36px;height:36px;border-radius:50%;background:#ffffff15;backdrop-filter:blur(8px);border:1px solid #ffffff30;display:flex;align-items:center;justify-content:center;color:var(--terra);cursor:pointer;transition:all .25s}
        .fav-card .heart:hover{background:#fff}
        .loyalty{background:linear-gradient(135deg,var(--cream) 0%,#F7EFE3 100%);border-radius:14px;padding:28px;border:1px solid var(--line)}
        .loyalty .top{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}
        .loyalty h3{font-size:22px}
        .loyalty .count{font-family:var(--serif);font-size:24px;color:var(--terra)}
        .loyalty .track{position:relative;height:10px;background:#fff;border-radius:99px;overflow:hidden;margin:14px 0 18px}
        .loyalty .fill{height:100%;background:linear-gradient(90deg,var(--terra),var(--terra-soft));border-radius:99px;transition:width 1s ease}
        .loyalty .markers{display:flex;justify-content:space-between;font-size:11px;letter-spacing:.06em;color:var(--mute);margin-top:8px}
        .loyalty .markers .next{color:var(--terra);font-family:var(--serif);font-style:italic}
        .loyalty .gift{margin-top:18px;padding:16px 18px;background:#fff;border-radius:10px;border:1px dashed var(--terra);display:flex;align-items:center;gap:14px}
        .pref-block{margin-bottom:24px}
        .pref-block h3{font-size:20px;margin-bottom:6px}
        .pref-block .desc{font-size:13.5px;color:var(--mute);margin-bottom:18px;line-height:1.55}
        .chip-pick{display:flex;flex-wrap:wrap;gap:8px}
        .chip-pick label{padding:9px 18px;border:1px solid var(--line);border-radius:999px;cursor:pointer;font-size:13.5px;color:var(--ink-soft);transition:all .25s ease;user-select:none;background:#fff;display:inline-block}
        .chip-pick label:hover{border-color:var(--ink)}
        .chip-pick input{display:none}
        .chip-pick label:has(input:checked){background:var(--ink);color:#fff;border-color:var(--ink)}
        .pref-text{width:100%;padding:14px 16px;border:1px solid var(--line);border-radius:10px;background:#fff;font-family:var(--sans);font-size:14.5px;resize:vertical;min-height:90px;outline:none;transition:border-color .25s;color:var(--ink);line-height:1.55}
        .pref-text:focus{border-color:var(--ink)}
        .pf-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}
        .pf-field{display:flex;flex-direction:column;gap:6px}
        .pf-field.full{grid-column:span 2}
        .pf-field label{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--mute);font-weight:500}
        .pf-field input,.pf-field select{padding:14px 16px;border:1px solid var(--line);border-radius:10px;background:#fff;font-family:var(--sans);font-size:15px;color:var(--ink);outline:none;transition:border-color .25s}
        .pf-field input:focus,.pf-field select:focus{border-color:var(--ink)}
        .pf-field .hint{font-size:11.5px;color:var(--mute);margin-top:4px}
        .av-upload{display:flex;align-items:center;gap:18px;padding:16px;background:var(--paper);border:1px solid var(--line);border-radius:10px;margin-bottom:24px}
        .av-upload .av-big{width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,var(--terra),var(--terra-soft));color:#fff;display:flex;align-items:center;justify-content:center;font-family:var(--serif);font-size:32px;flex-shrink:0}
        .pay-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px}
        .pay-card{padding:22px 24px;border:1px solid var(--line);border-radius:12px;background:#fff;position:relative;transition:all .3s}
        .pay-card:hover{border-color:var(--ink);transform:translateY(-2px)}
        .pay-card.default{border-color:var(--terra)}
        .pay-card .head{display:flex;align-items:center;gap:12px;margin-bottom:18px}
        .pay-card .brand{width:44px;height:30px;border-radius:6px;background:linear-gradient(135deg,#1a1f71,#4a52a1);color:#fff;display:flex;align-items:center;justify-content:center;font-family:var(--serif);font-size:13px;font-style:italic}
        .pay-card .brand.mc{background:linear-gradient(135deg,#ff5f00,#eb001b 70%)}
        .pay-card .num{font-family:var(--serif);font-size:18px;letter-spacing:.04em}
        .pay-card .exp{font-size:11px;color:var(--mute);letter-spacing:.06em;margin-top:4px}
        .pay-card .menu{position:absolute;top:18px;right:18px;color:var(--mute);cursor:pointer;padding:4px;font-size:18px;line-height:1;background:none;border:none}
        .pay-card .default-pill{position:absolute;top:18px;right:46px;background:var(--terra);color:#fff;font-size:10px;letter-spacing:.18em;text-transform:uppercase;padding:3px 9px;border-radius:999px}
        .pay-card .actions{display:flex;gap:10px;margin-top:12px;font-size:12px}
        .pay-card .actions a{color:var(--terra);text-decoration:none;transition:color .2s}
        .pay-card .actions a:hover{text-decoration:underline}
        .pay-add{display:flex;align-items:center;justify-content:center;gap:10px;padding:22px 24px;border:1px dashed var(--line);border-radius:12px;background:transparent;cursor:pointer;font-family:var(--sans);color:var(--mute);font-size:14px;transition:all .3s;width:100%}
        .pay-add:hover{border-color:var(--ink);color:var(--ink);background:var(--paper)}
        .gift-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}
        .gift-tile{background:linear-gradient(135deg,#1a110b 0%,#2A1F18 100%);color:#fff;border-radius:12px;padding:24px;position:relative;overflow:hidden}
        .gift-tile::before{content:"";position:absolute;top:-30%;right:-15%;width:200px;height:200px;border-radius:50%;background:radial-gradient(circle,var(--terra) 0%,transparent 65%);opacity:.45;pointer-events:none}
        .gift-tile.used{background:linear-gradient(135deg,#c9b8a3 0%,#b3a18b 100%)}
        .gift-tile.used::before{background:radial-gradient(circle,var(--ink) 0%,transparent 65%);opacity:.15}
        .gift-tile .inner{position:relative;z-index:1}
        .gift-tile .l{font-size:10.5px;letter-spacing:.18em;text-transform:uppercase;color:#ffffff88}
        .gift-tile .v{font-family:var(--serif);font-size:36px;line-height:1;margin-top:8px}
        .gift-tile .from{font-size:13px;color:#ffffffaa;margin-top:14px;font-family:var(--serif);font-style:italic}
        .gift-tile .code{margin-top:14px;padding:8px 12px;background:#ffffff15;border-radius:6px;font-family:'Courier New',monospace;font-size:12px;letter-spacing:.16em;display:inline-block}
        .switch{position:relative;width:44px;height:24px;border-radius:999px;cursor:pointer;flex-shrink:0;transition:background .25s;border:none}
        .switch::after{content:"";position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;box-shadow:0 2px 6px #2218124a;transition:transform .25s}
        .switch.on{background:var(--terra)}
        .switch.off{background:var(--line)}
        .switch.on::after{transform:translateX(20px)}
        .toggle-row{display:flex;align-items:center;gap:18px;padding:18px 0;border-bottom:1px solid var(--line)}
        .toggle-row:last-child{border-bottom:none}
        .toggle-row .info{flex:1}
        .toggle-row .info .ttl{font-family:var(--serif);font-size:17px}
        .toggle-row .info .desc{font-size:13px;color:var(--mute);margin-top:4px;max-width:480px;line-height:1.5}
        .conn-row{display:flex;align-items:center;gap:14px;padding:16px;background:var(--paper);border:1px solid var(--line);border-radius:10px;margin-bottom:10px}
        .conn-row .lg{width:42px;height:42px;border-radius:10px;background:#fff;border:1px solid var(--line);display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .conn-row .info{flex:1}
        .conn-row .info .nm{font-family:var(--serif);font-size:16px}
        .conn-row .info .em{font-size:12.5px;color:var(--mute);margin-top:2px}
        .pill-st{background:#EAF1E8;color:#3D6346;font-size:11px;letter-spacing:.06em;padding:4px 10px;border-radius:999px;display:inline-flex;align-items:center;gap:6px}
        .pill-st::before{content:"";width:6px;height:6px;border-radius:50%;background:#5C8262}
        .danger-zone{margin-top:32px;padding:24px;background:#FDECE2;border:1px solid #F4C8AE;border-radius:12px}
        .danger-zone h3{color:#8B4427;font-size:20px}
        .danger-zone p{font-size:13px;color:var(--ink-soft);margin-top:6px;margin-bottom:14px;line-height:1.55}
        .btn-danger{padding:10px 18px;border:1px solid #8B4427;border-radius:999px;background:transparent;color:#8B4427;cursor:pointer;font-family:var(--sans);font-size:13px;transition:all .25s;margin-right:8px}
        .btn-danger:hover{background:#8B4427;color:#fff}
        .btn-save{padding:12px 26px;border:none;border-radius:999px;background:var(--ink);color:#fff;font-family:var(--sans);font-size:14px;cursor:pointer;transition:all .3s;display:inline-flex;align-items:center;gap:8px}
        .btn-save:hover{background:var(--terra);transform:translateY(-1px)}
.mobile-top{display:none}
        @media(max-width:1100px){.acc{grid-template-columns:220px 1fr}.acc-main{padding:40px 32px}.stats-row{grid-template-columns:1fr 1fr}.pf-grid,.gift-grid,.pay-grid{grid-template-columns:1fr}.pf-field.full{grid-column:auto}.fav-grid{grid-template-columns:1fr 1fr}.row-2{grid-template-columns:1fr}}
        @media(max-width:720px){.acc{grid-template-columns:1fr}.acc-side{position:fixed;left:0;top:0;bottom:0;width:260px;transform:translateX(-100%);z-index:50;transition:transform .35s ease}.acc-side.open{transform:translateX(0)}.mobile-top{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;background:var(--paper);border-bottom:1px solid var(--line);position:sticky;top:0;z-index:10}.mobile-top .burger{width:40px;height:40px;border-radius:50%;background:#fff;border:1px solid var(--line);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:18px}.acc-main{padding:24px 20px 80px}.stats-row{grid-template-columns:1fr}.fav-grid{grid-template-columns:1fr}.next-card{padding:28px 24px}.next-card .countdown{position:static;margin-top:24px;justify-content:flex-start}.next-card h2{font-size:32px}.v-head h1{font-size:32px}.hist-item{grid-template-columns:1fr;gap:8px}.hist-action,.hist-price{text-align:left}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.6}}
      `}</style>

      {/* Mobile top bar */}
      <div className="mobile-top">
        <Link className="acc-brand" href="/" style={{ padding: 0, border: "none", margin: 0 }}>
          <span className="dot" />
          <span className="name">La bulle</span>
        </Link>
        <button className="burger" onClick={() => setSideOpen(o => !o)} aria-label="Menu">≡</button>
      </div>

      <div className="acc">
        {/* ── SIDEBAR ─────────────────────────────────────────── */}
        <aside className={`acc-side${sideOpen ? " open" : ""}`}>
          <Link className="acc-brand" href="/">
            <span className="dot" />
            <span className="name">La bulle de vie</span>
          </Link>

          <div className="acc-user">
            <div className="av">{userInitial}</div>
            <div className="info">
              <div className="n">{userName}</div>
              <div className="r">Cliente · espace perso</div>
            </div>
          </div>

          <nav className="acc-nav">
            {navItems.map(item => <NavItem key={item.view} item={item} />)}
          </nav>

          <div className="acc-side-section">Mon profil</div>
          <nav className="acc-nav">
            {profileItems.map(item => <NavItem key={item.view} item={item} />)}
          </nav>

          <div className="acc-side-bottom">
            <button className="acc-logout" onClick={handleLogout}>
              <span className="ic">
                <svg width="18" height="18" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" />
                </svg>
              </span>
              <span>Se déconnecter</span>
            </button>
          </div>
        </aside>

        {/* ── MAIN ────────────────────────────────────────────── */}
        <main className="acc-main">

          {/* ── OVERVIEW ──────────────────────────────────────── */}
          {view === "overview" && (
            <section style={{ animation: "viewIn .5s ease" }}>
              <div className="v-head">
                <span className="eyebrow">{todayFormatted}</span>
                <h1>Bonjour, <span className="italic">{firstName}.</span></h1>
                <p className="lede">
                  {stats?.nextAppointment
                    ? `Votre prochaine séance est le ${fmtApptDateLong(stats.nextAppointment.slot.date)} à ${stats.nextAppointment.slot.startTime.replace(":", "h")}. Voici votre espace.`
                    : "Bienvenue dans votre espace. Réservez votre prochaine bulle quand vous le souhaitez."}
                </p>
              </div>

              {stats?.nextAppointment ? (
                <div className="next-card">
                  <div className="countdown">
                    <div className="cd-item"><div className="cd-num">{countdown.d}</div><div className="cd-lbl">jours</div></div>
                    <div className="cd-item"><div className="cd-num">{countdown.h}</div><div className="cd-lbl">heures</div></div>
                    <div className="cd-item"><div className="cd-num">{countdown.m}</div><div className="cd-lbl">min</div></div>
                  </div>
                  <div className="inner">
                    <span className="eyebrow">Votre prochaine séance</span>
                    <h2>{stats.nextAppointment.service.name}<br /><span className="italic">avec Laurence.</span></h2>
                    <div className="when">
                      <div className="when-block"><div className="l">Date</div><div className="v big">{fmtApptDateLong(stats.nextAppointment.slot.date)}</div></div>
                      <div className="when-block"><div className="l">Heure</div><div className="v big">{stats.nextAppointment.slot.startTime.replace(":", "h")}</div></div>
                      <div className="when-block"><div className="l">Durée</div><div className="v">{stats.nextAppointment.service.durationMinutes} min</div></div>
                      <div className="when-block"><div className="l">Lieu</div><div className="v">{stats.nextAppointment.location === "domicile" ? "À domicile" : "Cabinet"}</div></div>
                    </div>
                    <div className="actions">
                      <button className="btn primary" onClick={() => go("appts")}>Voir les détails →</button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="next-card">
                  <div className="inner">
                    <span className="eyebrow">Aucune séance à venir</span>
                    <h2>Prenez <span className="italic">soin de vous.</span></h2>
                    <p style={{ color: "#ffffffaa", marginTop: 10, fontSize: 16, lineHeight: 1.55 }}>Réservez votre prochaine bulle en quelques secondes.</p>
                    <div className="actions" style={{ marginTop: 24 }}>
                      <a className="btn primary" href="/booking">Réserver une séance →</a>
                    </div>
                  </div>
                </div>
              )}

              <div className="stats-row">
                <div className="stat-tile">
                  <div className="l">Séances</div>
                  <div className="v">{stats?.totalSessions ?? "—"}</div>
                  <div className="sub">{stats?.totalSessions === 0 ? "Commencez dès maintenant" : `${stats?.totalSessions} séance${(stats?.totalSessions ?? 0) > 1 ? "s" : ""} au total`}</div>
                </div>
                <div className="stat-tile">
                  <div className="l">Soin préféré</div>
                  <div className="v" style={{ fontSize: stats?.topService ? 20 : 32 }}>{stats?.topService ?? "—"}</div>
                  <div className="sub">{stats?.topService ? "Le plus réservé" : "À découvrir"}</div>
                </div>
                <div className="stat-tile">
                  <div className="l">Avis laissés</div>
                  <div className="v">{stats?.reviewsCount ?? "—"}</div>
                  <div className="sub">{stats?.reviewsCount === 0 ? "Partagez votre expérience" : "Merci pour vos retours"}</div>
                </div>
                <div className="stat-tile">
                  <div className="l">Fidélité</div>
                  <div className="v">{stats?.totalSessions ?? 0}<small>/10</small></div>
                  <div className="sub">{(stats?.totalSessions ?? 0) >= 10 ? <strong style={{ color: "var(--terra)" }}>Soin offert débloqué ✦</strong> : `Plus que ${10 - (stats?.totalSessions ?? 0)} séances`}</div>
                </div>
              </div>

              <div className="row-2">
                <div className="loyalty">
                  {(() => {
                    const n = stats?.totalSessions ?? 0
                    const pct = Math.min(100, (n / 10) * 100)
                    return (
                      <>
                        <div className="top">
                          <div>
                            <h3>Programme fidélité <span style={{ fontFamily: "var(--serif)", color: "var(--terra)", fontStyle: "italic" }}>Bulle d&apos;or</span></h3>
                            <p style={{ fontSize: 13, color: "var(--mute)", marginTop: 4 }}>{n >= 10 ? "Félicitations ! Votre soin offert est débloqué." : `Encore ${10 - n} séance${10 - n > 1 ? "s" : ""} pour débloquer votre soin offert.`}</p>
                          </div>
                          <div className="count">{n}<small style={{ color: "var(--mute)", fontSize: 14 }}>/10</small></div>
                        </div>
                        <div className="track"><div className="fill" style={{ width: `${pct}%` }} /></div>
                        <div className="markers">
                          <span>Début</span>
                          <span className="next">{n >= 10 ? "✦ Soin offert disponible" : "Prochain : Soin du corps offert ✦"}</span>
                        </div>
                      </>
                    )
                  })()}
                  <div className="gift">
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--terra)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>♥</div>
                    <div>
                      <div style={{ fontFamily: "var(--serif)", fontSize: 17 }}>À votre 10ᵉ séance</div>
                      <div style={{ fontSize: 12.5, color: "var(--mute)", marginTop: 2 }}>Votre Soin du corps signature vous est offert.</div>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-head"><h3>Activité récente</h3></div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <p style={{ color: "var(--mute)", fontSize: 14, fontStyle: "italic", textAlign: "center", padding: "20px 0" }}>Aucune activité pour le moment.</p>
                  </div>
                </div>
              </div>

              <div className="card" style={{ background: "var(--cream)", border: "none", textAlign: "center", padding: "40px 32px" }}>
                <h3 style={{ fontSize: 28, fontFamily: "var(--serif)", marginBottom: 10 }}>Envie d&apos;<span style={{ fontStyle: "italic", color: "var(--terra)" }}>une nouvelle bulle ?</span></h3>
                <p style={{ color: "var(--mute)", marginBottom: 20, maxWidth: 420, marginLeft: "auto", marginRight: "auto" }}>Réservez votre prochain rendez‑vous en quelques secondes.</p>
                <Link className="btn-save" href="/booking" style={{ textDecoration: "none" }}>Réserver une séance <span>→</span></Link>
              </div>
            </section>
          )}

          {/* ── RENDEZ-VOUS ─────────────────────────────────────── */}
          {view === "appts" && (
            <section style={{ animation: "viewIn .5s ease" }}>
              <div className="v-head">
                <span className="eyebrow">Rendez‑vous</span>
                <h1>Vos prochaines <span className="italic">bulles.</span></h1>
                <p className="lede">Toutes vos séances à venir, à reporter, annuler ou compléter en quelques clics.</p>
              </div>
              <div className="card" style={{ marginBottom: 24 }}>
                <div className="card-head">
                  <h3>Mes rendez‑vous</h3>
                  <Link href="/booking">+ Nouveau rendez‑vous</Link>
                </div>
                {apptsLoading && <AppointmentCardsSkeleton count={3} />}
                {!apptsLoading && appts.length === 0 && (
                  <div style={{ textAlign: "center", padding: "40px 0", color: "var(--mute)" }}>
                    <p style={{ fontFamily: "var(--serif)", fontSize: 18, marginBottom: 12 }}>Aucun rendez‑vous à venir.</p>
                    <Link href="/booking" className="btn-small primary">Réserver une séance →</Link>
                  </div>
                )}
                {!apptsLoading && appts.length > 0 && (() => {
                  const nowUTC = new Date()
                  const todayStr = nowUTC.toISOString().split("T")[0]

                  const todayAppts = appts.filter(a => a.slot.date.split("T")[0] === todayStr)
                  const futureAppts = appts.filter(a => a.slot.date.split("T")[0] > todayStr)

                  function renderAppt(appt: Appt, isToday: boolean) {
                    const { day, month } = fmtApptDate(appt.slot.date)
                    const lieu = appt.location === "domicile"
                      ? `À domicile${appt.clientAddress ? ` — ${appt.clientAddress}` : ""}`
                      : "Cabinet"

                    // How many hours until the slot?
                    const [slotH, slotM] = appt.slot.startTime.split(":").map(Number)
                    const slotDate = new Date(appt.slot.date)
                    slotDate.setUTCHours(slotH - 2, slotM, 0, 0) // Paris UTC+2 → UTC
                    const hoursUntil = (slotDate.getTime() - nowUTC.getTime()) / 3_600_000

                    const statusCls = appt.status === "confirmed" ? "ok" : appt.status === "pending" ? "pending" : ""
                    const statusLabel = isToday
                      ? (hoursUntil < 0 ? "Passé aujourd'hui" : hoursUntil < 2 ? "Imminent" : "Aujourd'hui")
                      : appt.status === "confirmed" ? "Confirmé" : "En attente"

                    const canCancel = hoursUntil > 4 // policy: >4h before
                    const cancelLabel = hoursUntil > 24 ? "Annuler" : hoursUntil > 4 ? "Annuler (50%)" : null

                    return (
                      <div key={appt.id} className="appt-item">
                        <div className="appt-date">
                          <div className="d">{day}</div>
                          <div className="m">{month}</div>
                        </div>
                        <div className="appt-info">
                          <div className="nm">{appt.service.name} · {appt.service.durationMinutes} min</div>
                          <div className="det">
                            {appt.slot.startTime.replace(":", "h")}
                            <span className="sep">·</span>{lieu}
                            <span className="sep">·</span>{(appt.service.price / 100).toFixed(0)}€
                            <span className="sep">·</span>
                            <span className={`appt-status${statusCls ? " " + statusCls : ""}`}>{statusLabel}</span>
                          </div>
                        </div>
                        <div className="appt-actions">
                          {canCancel && cancelLabel ? (
                            <button className="btn-small danger" onClick={async () => {
                              const msg = hoursUntil > 24
                                ? "Annuler ce rendez‑vous ? Vous serez remboursé intégralement."
                                : "Annuler ce rendez‑vous ? Remboursement à 50% selon notre politique."
                              if (!confirm(msg)) return
                              try {
                                const res = await fetch("/api/booking/cancel", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ appointmentId: appt.id }),
                                })
                                if (!res.ok) {
                                  const d = await res.json()
                                  toast.error(d.error ?? "Erreur lors de l'annulation")
                                  return
                                }
                                const d = await res.json()
                                const msg = d.refundPolicy === "full"
                                  ? "Rendez-vous annulé — remboursement intégral initié."
                                  : d.refundPolicy === "half"
                                    ? "Rendez-vous annulé — remboursement à 50% initié."
                                    : "Rendez-vous annulé."
                                toast.success(msg)
                                // Refresh the appointments list
                                setApptsLoading(true)
                                fetch("/api/user/appointments")
                                  .then(r => r.json())
                                  .then(d => setAppts(d.appointments ?? []))
                                  .finally(() => setApptsLoading(false))
                              } catch {
                                toast.error("Erreur lors de l'annulation")
                              }
                            }}>
                              {cancelLabel}
                            </button>
                          ) : isToday ? (
                            <span style={{ fontSize: 12, color: "var(--mute)", fontStyle: "italic" }}>Annulation impossible</span>
                          ) : null}
                        </div>
                      </div>
                    )
                  }

                  return (
                    <>
                      {todayAppts.length > 0 && (
                        <>
                          <div style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--terra)", fontWeight: 600, marginBottom: 12, paddingBottom: 10, borderBottom: "1px solid var(--line)" }}>
                            Aujourd&apos;hui
                          </div>
                          {todayAppts.map(a => renderAppt(a, true))}
                        </>
                      )}
                      {futureAppts.length > 0 && (
                        <>
                          {todayAppts.length > 0 && (
                            <div style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--mute)", fontWeight: 600, margin: "20px 0 12px", paddingBottom: 10, borderBottom: "1px solid var(--line)" }}>
                              À venir
                            </div>
                          )}
                          {futureAppts.map(a => renderAppt(a, false))}
                        </>
                      )}
                    </>
                  )
                })()}
              </div>
              <div className="card">
                <div className="card-head"><h3>Politique d&apos;annulation</h3></div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
                  <div style={{ padding: 16, background: "#EAF1E8", borderRadius: 10 }}>
                    <div style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "#3D6346", marginBottom: 6 }}>+ de 24h avant</div>
                    <div style={{ fontFamily: "var(--serif)", fontSize: 22 }}>Remboursement intégral</div>
                  </div>
                  <div style={{ padding: 16, background: "#F9F1E5", borderRadius: 10 }}>
                    <div style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "#7A5C2A", marginBottom: 6 }}>Entre 24h et 4h</div>
                    <div style={{ fontFamily: "var(--serif)", fontSize: 22 }}>Remboursement à 50%</div>
                  </div>
                  <div style={{ padding: 16, background: "#FDECE2", borderRadius: 10 }}>
                    <div style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "#8B4427", marginBottom: 6 }}>Moins de 4h</div>
                    <div style={{ fontFamily: "var(--serif)", fontSize: 22 }}>Acompte conservé</div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ── HISTORIQUE ──────────────────────────────────────── */}
          {view === "history" && (
            <section style={{ animation: "viewIn .5s ease" }}>
              <div className="v-head">
                <span className="eyebrow">Historique</span>
                <h1>Toutes vos <span className="italic">séances passées.</span></h1>
                <p className="lede">Vos séances passées — retrouvez, notez, téléchargez vos factures.</p>
              </div>
              <div className="card">
                {historyLoading && <AppointmentCardsSkeleton count={3} />}
                {!historyLoading && history.length === 0 && (
                  <p style={{ color: "var(--mute)", fontSize: 14, fontStyle: "italic", textAlign: "center", padding: "32px 0" }}>Aucune séance passée pour le moment.</p>
                )}
                {!historyLoading && history.length > 0 && (() => {
                  const total = history.reduce((s, a) => s + (a.amountPaid ?? 0), 0)
                  return (
                    <>
                      <div className="card-head">
                        <h3>{new Date(history[0].slot.date).getUTCFullYear()}</h3>
                        <span className="sub">{history.length} séance{history.length > 1 ? "s" : ""} · {(total / 100).toLocaleString("fr-FR", { minimumFractionDigits: 0 })}€</span>
                      </div>
                      {history.map(appt => {
                        const { day, month } = fmtApptDate(appt.slot.date)
                        const todayStr = new Date().toISOString().split("T")[0]
                        const slotStr = appt.slot.date.split("T")[0]
                        const isPast = slotStr < todayStr

                        // Status label: derive from date, not just DB status
                        // Specialist may not have clicked "completed" yet, but the appointment happened
                        const statusLabel =
                          appt.status === "completed" ? "Terminé" :
                          appt.status === "cancelled" ? "Annulé" :
                          isPast ? "Effectué" :
                          "Confirmé"

                        // Allow review for any past non-cancelled appointment without an existing review
                        const canReview = isPast && appt.status !== "cancelled" && !appt.review
                        return (
                          <div key={appt.id} className="hist-item">
                            <div className="hist-date"><strong>{day}</strong>{month}</div>
                            <div className="hist-info">
                              <div className="nm">{appt.service.name}</div>
                              <div className="det">{appt.slot.startTime.replace(":", "h")} · {appt.service.durationMinutes} min · {statusLabel}</div>
                            </div>
                            <div className="hist-price">{appt.amountPaid ? `${(appt.amountPaid / 100).toFixed(0)}€` : "—"}</div>
                            <div className="hist-action">
                              {appt.review ? (
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                                  <div className="stars-given">{"★".repeat(appt.review.stars)}{"☆".repeat(5 - appt.review.stars)}</div>
                                  {appt.review.approved ? (
                                    <span style={{
                                      display: "inline-flex", alignItems: "center", gap: 5,
                                      fontSize: 11, fontWeight: 600, letterSpacing: ".06em",
                                      padding: "3px 9px", borderRadius: 999,
                                      background: "#EAF1E8", color: "#3D6346",
                                    }}>
                                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                                        <path d="M2 6l3 3 5-5" stroke="#5C8262" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                      Avis approuvé
                                    </span>
                                  ) : (
                                    <span style={{
                                      display: "inline-flex", alignItems: "center", gap: 5,
                                      fontSize: 11, letterSpacing: ".06em",
                                      padding: "3px 9px", borderRadius: 999,
                                      background: "#F9F1E5", color: "#7A5C2A",
                                    }}>
                                      En attente de validation
                                    </span>
                                  )}
                                  {appt.review.specialistReply && (() => {
                                    const open = expandedReplies.has(appt.review!.id)
                                    return (
                                      <div style={{ textAlign: "right" }}>
                                        <button
                                          onClick={() => setExpandedReplies(prev => {
                                            const next = new Set(prev)
                                            open ? next.delete(appt.review!.id) : next.add(appt.review!.id)
                                            return next
                                          })}
                                          style={{
                                            background: "none", border: "none", cursor: "pointer",
                                            fontSize: 11.5, color: "var(--terra)", fontFamily: "var(--sans)",
                                            display: "inline-flex", alignItems: "center", gap: 5, padding: 0,
                                          }}
                                        >
                                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transition: "transform .25s", transform: open ? "rotate(180deg)" : "none" }}>
                                            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                          </svg>
                                          {open ? "Masquer la réponse" : "Réponse du spécialiste"}
                                        </button>
                                        {open && (
                                          <div style={{
                                            marginTop: 8, padding: "10px 14px", textAlign: "left",
                                            background: "var(--cream)", borderRadius: 10,
                                            borderLeft: "3px solid var(--terra)",
                                            animation: "panelIn .2s ease",
                                          }}>
                                            <p style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.55, margin: 0, fontFamily: "var(--serif)", fontStyle: "italic" }}>
                                              &ldquo;{appt.review.specialistReply}&rdquo;
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })()}
                                </div>
                              ) : canReview ? (
                                <button className="btn-rate" onClick={() => { setReviewModal({ appointmentId: appt.id, serviceName: appt.service.name }); setReviewStars(0); setReviewBody("") }}>
                                  Laisser un avis →
                                </button>
                              ) : null}
                            </div>
                          </div>
                        )
                      })}
                    </>
                  )
                })()}
              </div>
            </section>
          )}

          {/* ── FAVORIS ─────────────────────────────────────────── */}
          {view === "favorites" && (
            <section style={{ animation: "viewIn .5s ease" }}>
              <div className="v-head">
                <span className="eyebrow">Favoris</span>
                <h1>Vos soins <span className="italic">préférés.</span></h1>
                <p className="lede">Les rituels que vous avez sauvegardés — accessibles en un clic depuis votre espace.</p>
              </div>
              <div className="fav-grid">
                {[
                  { id: "corps", nm: "Soin du corps", dur: "60 min", stars: "4.9", prix: "105€" },
                  { id: "galet", nm: "Soin galet chaud", dur: "30 min", stars: "5.0", prix: "55€" },
                  { id: "visage", nm: "Soin visage", dur: "30 min", stars: "4.8", prix: "45€" },
                ].map(s => (
                  <Link key={s.id} className="fav-card" href={`/soins/${s.id}`}>
                    <div className="fav-img" />
                    <span className="heart" onClick={e => { e.preventDefault(); toast.success("Retiré des favoris") }}>♥</span>
                    <div className="body">
                      <div className="nm">{s.nm}</div>
                      <div className="row"><span>{s.dur} · ★ {s.stars}</span><span className="pr">{s.prix}</span></div>
                    </div>
                  </Link>
                ))}
              </div>
              <div style={{ marginTop: 32, textAlign: "center", padding: 32, background: "var(--cream)", borderRadius: 14 }}>
                <p style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 20, color: "var(--ink-soft)", marginBottom: 16 }}>Vous voulez découvrir d&apos;autres rituels ?</p>
                <Link className="btn-save" href="/prestations" style={{ textDecoration: "none" }}>Explorer tous les soins →</Link>
              </div>
            </section>
          )}

          {/* ── PRÉFÉRENCES ─────────────────────────────────────── */}
          {view === "preferences" && (
            <section style={{ animation: "viewIn .5s ease" }}>
              <div className="v-head">
                <span className="eyebrow">Préférences</span>
                <h1>Ce que <span className="italic">Laurence sait de vous.</span></h1>
                <p className="lede">Vos préférences pour les séances. Elle s&apos;y réfère avant chaque rendez‑vous pour ajuster le soin.</p>
              </div>
              <div className="card" style={{ marginBottom: 24 }}>
                <div className="pref-block">
                  <h3>Pression préférée</h3>
                  <p className="desc">Du toucher le plus léger au modelage le plus profond.</p>
                  <div className="chip-pick">
                    {["Très douce", "Douce", "Moyenne", "Appuyée", "Très profonde"].map(v => (
                      <label key={v}><input type="radio" name="pressure" defaultChecked={v === "Douce"} /><span>{v}</span></label>
                    ))}
                  </div>
                </div>
                <div className="pref-block">
                  <h3>Ambiance</h3>
                  <p className="desc">Pendant la séance, vous préférez…</p>
                  <div className="chip-pick">
                    {[["Silence complet", true], ["Musique douce", false], ["Sons de nature", false], ["Discussion légère", false]].map(([v, c]) => (
                      <label key={v as string}><input type="checkbox" defaultChecked={c as boolean} /><span>{v as string}</span></label>
                    ))}
                  </div>
                </div>
                <div className="pref-block">
                  <h3>Zones à privilégier</h3>
                  <p className="desc">Là où vous portez le plus de tension.</p>
                  <div className="chip-pick">
                    {[["Épaules", true], ["Nuque", true], ["Bas du dos", false], ["Pieds", true], ["Mains", false], ["Visage", false], ["Cuir chevelu", false]].map(([v, c]) => (
                      <label key={v as string}><input type="checkbox" defaultChecked={c as boolean} /><span>{v as string}</span></label>
                    ))}
                  </div>
                </div>
                <div className="pref-block">
                  <h3>Zones à éviter</h3>
                  <p className="desc">Ou simplement à effleurer.</p>
                  <div className="chip-pick">
                    {["Aucune", "Ventre", "Visage", "Cuir chevelu"].map(v => (
                      <label key={v}><input type="checkbox" /><span>{v}</span></label>
                    ))}
                  </div>
                </div>
                <div className="pref-block">
                  <h3>Allergies / contre‑indications</h3>
                  <p className="desc">Huiles, plantes, problèmes médicaux — tout ce que Laurence doit savoir.</p>
                  <textarea className="pref-text" placeholder="Ex : allergie à l'huile de coco, lombalgie chronique côté droit…" />
                </div>
                <div className="pref-block">
                  <h3>Note personnelle pour Laurence</h3>
                  <p className="desc">Une intention, un mot, ce que vous voulez. Laurence le lit avant chaque séance.</p>
                  <textarea className="pref-text" placeholder="Ex : période chargée au travail, besoin de relâcher la nuque…" />
                </div>
                <button className="btn-save" onClick={() => toast.success("Préférences enregistrées")}>Enregistrer mes préférences →</button>
              </div>
            </section>
          )}

          {/* ── PAIEMENT ────────────────────────────────────────── */}
          {view === "payments" && (
            <section style={{ animation: "viewIn .5s ease" }}>
              <div className="v-head">
                <span className="eyebrow">Paiement</span>
                <h1>Vos moyens <span className="italic">de paiement.</span></h1>
                <p className="lede">Vos cartes sont enregistrées en toute sécurité via Stripe — La bulle de vie ne stocke aucune donnée bancaire.</p>
              </div>
              <div className="card" style={{ marginBottom: 24 }}>
                <div className="card-head"><h3>Cartes enregistrées</h3><a href="#" onClick={e => { e.preventDefault(); toast.success("Redirection vers Stripe…") }}>+ Ajouter une carte</a></div>
                <div className="pay-grid">
                  <div className="pay-card default">
                    <div className="default-pill">Par défaut</div>
                    <button className="menu">⋯</button>
                    <div className="head"><div className="brand">VISA</div><div><div className="num">•••• •••• •••• 4242</div><div className="exp">EXP 12 / 28</div></div></div>
                    <div className="actions"><a href="#">Modifier</a><a href="#">Retirer</a></div>
                  </div>
                  <div className="pay-card">
                    <button className="menu">⋯</button>
                    <div className="head"><div className="brand mc">MC</div><div><div className="num">•••• •••• •••• 8801</div><div className="exp">EXP 06 / 27</div></div></div>
                    <div className="actions"><a href="#">Définir par défaut</a><a href="#">Retirer</a></div>
                  </div>
                </div>
                <button className="pay-add" onClick={() => toast.success("Redirection vers Stripe…")}>+ Ajouter une nouvelle carte</button>
              </div>
              <div className="card">
                <div className="card-head"><h3>Factures</h3><span className="sub">Téléchargeables au format PDF</span></div>
                <p style={{ color: "var(--mute)", fontSize: 14, fontStyle: "italic", textAlign: "center", padding: "32px 0" }}>Aucune facture pour le moment.</p>
              </div>
            </section>
          )}

          {/* ── CADEAUX ─────────────────────────────────────────── */}
          {view === "gifts" && (
            <section style={{ animation: "viewIn .5s ease" }}>
              <div className="v-head">
                <span className="eyebrow">Cartes cadeaux</span>
                <h1>Vos bulles <span className="italic">à offrir, à recevoir.</span></h1>
                <p className="lede">Gérez les cartes cadeaux reçues et offrez‑en à votre entourage.</p>
              </div>
              <div className="card" style={{ marginBottom: 24 }}>
                <div className="card-head"><h3>Reçues</h3><span className="sub">0 carte</span></div>
                <p style={{ color: "var(--mute)", fontSize: 14, fontStyle: "italic", textAlign: "center", padding: "32px 0" }}>Aucune carte cadeau reçue.</p>
              </div>
              <div className="card" style={{ textAlign: "center", padding: "48px 32px", background: "linear-gradient(135deg,var(--cream),#F7EFE3)", border: "none" }}>
                <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 48, color: "var(--terra)", marginBottom: 14, lineHeight: 1 }}>♥</div>
                <h3 style={{ fontSize: 28, fontFamily: "var(--serif)", marginBottom: 10 }}>Offrir une <span style={{ fontStyle: "italic", color: "var(--terra)" }}>bulle.</span></h3>
                <p style={{ color: "var(--mute)", marginBottom: 24, maxWidth: 420, marginLeft: "auto", marginRight: "auto" }}>Un soin sur‑mesure, une parenthèse — la plus jolie attention à offrir. À partir de 35€.</p>
                <button className="btn-save" onClick={() => toast.success("Ouverture du flux cadeau…")}>Offrir une carte cadeau →</button>
              </div>
            </section>
          )}

          {/* ── PARAMÈTRES ──────────────────────────────────────── */}
          {view === "settings" && (
            <section style={{ animation: "viewIn .5s ease" }}>
              <div className="v-head">
                <span className="eyebrow">Profil &amp; sécurité</span>
                <h1>Vos infos <span className="italic">personnelles.</span></h1>
                <p className="lede">Modifiez vos coordonnées, votre mot de passe et vos connexions externes.</p>
              </div>
              <div className="card" style={{ marginBottom: 24 }}>
                <h3 style={{ marginBottom: 14 }}>Photo &amp; informations</h3>
                <div className="av-upload">
                  <div className="av-big">{userInitial}</div>
                  <div>
                    <div style={{ fontFamily: "var(--serif)", fontSize: 18 }}>{userName}</div>
                    <div style={{ fontSize: 13, color: "var(--mute)", marginTop: 2 }}>{userEmail}</div>
                    <div style={{ marginTop: 8, fontSize: 12, color: "var(--terra)", textDecoration: "underline", cursor: "pointer" }}>Changer la photo</div>
                  </div>
                </div>
                <div className="pf-grid">
                  <div className="pf-field"><label>Prénom</label><input ref={pfFirstNameRef} type="text" defaultValue={profileData?.fullName?.split(" ")[0] ?? userName.split(" ")[0]} /></div>
                  <div className="pf-field"><label>Nom</label><input ref={pfLastNameRef} type="text" defaultValue={profileData?.fullName?.split(" ").slice(1).join(" ") ?? userName.split(" ").slice(1).join(" ")} /></div>
                  <div className="pf-field full"><label>Adresse e‑mail</label><input type="email" defaultValue={userEmail} readOnly style={{ opacity: .7, cursor: "not-allowed" }} /><div className="hint">L&apos;adresse e‑mail ne peut pas être modifiée ici — contactez le support.</div></div>
                  <div className="pf-field"><label>Téléphone</label><input ref={pfPhoneRef} type="tel" defaultValue={profileData?.phone ?? ""} placeholder="+33 6 00 00 00 00" /></div>
                  <div className="pf-field"><label>Date de naissance</label><input type="date" /></div>
                  <div className="pf-field full"><label>Adresse pour soins à domicile</label><input ref={pfAddressRef} type="text" defaultValue={profileData?.defaultShippingAddress as string ?? ""} placeholder="22 rue de la République, Lyon 2ᵉ" /><div className="hint">Ne s&apos;applique que si vous choisissez &quot;à domicile&quot; lors de la réservation.</div></div>
                </div>
                <button className="btn-save" style={{ marginTop: 24 }} onClick={handleSaveProfile} disabled={profileSaving}>
                  {profileSaving ? "Enregistrement…" : "Enregistrer les modifications →"}
                </button>
              </div>

              <div className="card" style={{ marginBottom: 24 }}>
                <h3 style={{ marginBottom: 14 }}>Connexion &amp; sécurité</h3>
                <div className="toggle-row">
                  <div className="info"><div className="ttl">Mot de passe</div><div className="desc">Modifiez votre mot de passe de connexion.</div></div>
                  <button className="btn-rate" onClick={() => toast.success("Lien de changement envoyé")}>Modifier</button>
                </div>
                <div className="toggle-row">
                  <div className="info"><div className="ttl">Authentification à deux facteurs</div><div className="desc">Sécurise votre compte avec un code envoyé par SMS à chaque connexion.</div></div>
                  <button className={`switch ${toggles["2fa"] ? "on" : "off"}`} onClick={() => { setToggles(t => ({ ...t, "2fa": !t["2fa"] })); toast.success(toggles["2fa"] ? "Désactivé" : "Activé") }} />
                </div>
                <h4 style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--mute)", fontWeight: 500, margin: "24px 0 12px" }}>Comptes connectés</h4>
                <div className="conn-row">
                  <div className="lg">
                    <svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC04" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                  </div>
                  <div className="info"><div className="nm">Google</div><div className="em">{userEmail}</div></div>
                  <span className="pill-st">Connecté</span>
                </div>
              </div>

              <div className="card" style={{ marginBottom: 24 }}>
                <h3 style={{ marginBottom: 14 }}>Notifications</h3>
                {([
                  ["rappel24", "Rappel 24h avant la séance", "E‑mail avec adresse, durée et lien d'annulation."],
                  ["rappel2h", "Rappel 2h avant la séance", "Petit mot doux + accès au cabinet."],
                  ["sms", "SMS de confirmation", "Reçu après chaque réservation et chaque modification."],
                  ["newsletter", "Lettre de la bulle", "Une newsletter mensuelle — nouveautés, conseils, parenthèses."],
                ] as [keyof typeof toggles, string, string][]).map(([key, ttl, desc]) => (
                  <div key={key} className="toggle-row">
                    <div className="info"><div className="ttl">{ttl}</div><div className="desc">{desc}</div></div>
                    <button className={`switch ${toggles[key] ? "on" : "off"}`} onClick={() => { setToggles(t => ({ ...t, [key]: !t[key] })); toast.success(toggles[key] ? "Désactivé" : "Activé") }} />
                  </div>
                ))}
              </div>

              <div className="danger-zone">
                <h3>Zone sensible</h3>
                <p>Vous pouvez mettre votre compte en pause ou le supprimer définitivement. Vos données sont effacées sous 30 jours.</p>
                <button className="btn-danger">Mettre mon compte en pause</button>
                <button className="btn-danger">Supprimer mon compte</button>
              </div>
            </section>
          )}

        </main>
      </div>

      {/* ── REVIEW MODAL ────────────────────────────────────── */}
      {reviewModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setReviewModal(null) }}
          style={{
            position: "fixed", inset: 0, zIndex: 100,
            background: "#0007", backdropFilter: "blur(6px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
          }}
        >
          <div style={{
            background: "#fff", borderRadius: 16, width: 520, maxWidth: "100%",
            boxShadow: "0 30px 80px -20px #00000050", padding: 36,
          }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: 26, marginBottom: 6 }}>
              Votre <span style={{ color: "var(--terra)", fontStyle: "italic" }}>avis</span>
            </div>
            <p style={{ fontSize: 14, color: "var(--mute)", marginBottom: 24 }}>
              {reviewModal.serviceName} — comment s&apos;est passée votre séance ?
            </p>

            {/* Stars */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  onClick={() => setReviewStars(n)}
                  style={{
                    fontSize: 32, background: "none", border: "none", cursor: "pointer",
                    color: n <= reviewStars ? "var(--terra)" : "var(--line)",
                    transition: "color .2s", lineHeight: 1,
                  }}
                >
                  ★
                </button>
              ))}
              {reviewStars > 0 && <span style={{ alignSelf: "center", fontSize: 13, color: "var(--mute)", marginLeft: 8 }}>
                {["", "Décevant", "Passable", "Bien", "Très bien", "Excellent"][reviewStars]}
              </span>}
            </div>

            {/* Body */}
            <textarea
              value={reviewBody}
              onChange={e => setReviewBody(e.target.value)}
              placeholder="Décrivez votre expérience — ce que vous avez aimé, ressenti, vécu… (10 caractères minimum)"
              style={{
                width: "100%", minHeight: 120, padding: 14, borderRadius: 10,
                border: "1px solid var(--line)", fontFamily: "var(--sans)", fontSize: 14,
                color: "var(--ink)", resize: "vertical", outline: "none",
                transition: "border-color .25s", lineHeight: 1.55, boxSizing: "border-box",
              }}
              onFocus={e => (e.currentTarget.style.borderColor = "var(--ink)")}
              onBlur={e => (e.currentTarget.style.borderColor = "var(--line)")}
            />
            <div style={{ fontSize: 12, color: "var(--mute)", marginTop: 6, textAlign: "right" }}>
              {reviewBody.length} / 1000 caractères
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
              <button
                onClick={() => setReviewModal(null)}
                style={{ padding: "12px 20px", border: "1px solid var(--line)", borderRadius: 999, background: "transparent", cursor: "pointer", fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink-soft)" }}
              >
                Annuler
              </button>
              <button
                className="btn-save"
                onClick={handleSubmitReview}
                disabled={reviewSubmitting || reviewStars === 0}
                style={{ opacity: reviewStars === 0 ? 0.5 : 1 }}
              >
                {reviewSubmitting ? "Envoi…" : "Envoyer mon avis →"}
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  )
}
