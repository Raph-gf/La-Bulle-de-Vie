"use client"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

const NAV = [
  {
    section: "Aujourd'hui",
    items: [
      { href: "/dashboard", exact: true, label: "Accueil", icon: <HomeIcon /> },
      { href: "/dashboard/rendez-vous", label: "Rendez-vous", icon: <CalIcon />, badge: null },
      { href: "/dashboard/clients", label: "Clients", icon: <UsersIcon /> },
      { href: "/dashboard/finances", label: "Finances", icon: <CoinIcon /> },
      { href: "/dashboard/avis", label: "Avis", icon: <StarIcon /> },
    ],
  },
  {
    section: "Catalogue",
    items: [
      { href: "/dashboard/disponibilites", label: "Disponibilités", icon: <SparkIcon /> },
      { href: "/dashboard/boutique", label: "Boutique", icon: <ShopIcon /> },
    ],
  },
  {
    section: "Réglages",
    items: [
      { href: "/dashboard/parametres", label: "Paramètres", icon: <SettingsIcon /> },
    ],
  },
]

interface Props {
  userName: string
}

export default function Sidebar({ userName }: Props) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  const initial = userName.charAt(0).toUpperCase()

  return (
    <aside className="side">
      <div className="brand">
        <div className="logo-dot" />
        <div>
          <div className="name">La Bulle</div>
          <div className="sub">Studio</div>
        </div>
      </div>

      {NAV.map((group) => (
        <div key={group.section}>
          <div className="side-section">{group.section}</div>
          <nav className="nav-side">
            {group.items.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-item${active ? " active" : ""}`}
                >
                  <span className="ic">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      ))}

      <button className="side-profile" onClick={handleLogout} style={{ border: "none", width: "100%", textAlign: "left", background: "transparent", marginTop: "auto" }}>
        <div className="av">{initial}</div>
        <div>
          <div className="n">{userName}</div>
          <div className="r">Spécialiste</div>
        </div>
        <div className="arrow">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </div>
      </button>
    </aside>
  )
}

function HomeIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>
}
function CalIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>
}
function UsersIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="9" r="3.5"/><path d="M3 20c0-3.5 2.7-5.5 6-5.5s6 2 6 5.5"/><circle cx="17" cy="8" r="2.5"/><path d="M15 14.5c2.5 0 5 1.5 5 4"/></svg>
}
function CoinIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 9c0-1 .8-2 2.5-2s2.5 1 2.5 2-1 1.7-2.5 2-2.5.7-2.5 2 1 2 2.5 2 2.5-1 2.5-2"/><path d="M12 6v1.5M12 16.5V18"/></svg>
}
function StarIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l2.5 6 6.5.6-5 4.5 1.5 6.4L12 17.3 6.5 20.5 8 14.1 3 9.6 9.5 9z"/></svg>
}
function SparkIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l3-7 3 7 7 3-7 3-3 7-3-7-7-3z"/></svg>
}
function ShopIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16l-1.5 12.5a2 2 0 0 1-2 1.5h-9a2 2 0 0 1-2-1.5z"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/></svg>
}
function SettingsIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>
}
