"use client"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useSessionStore } from "@/lib/stores/useSessionStore"

const LABELS: Record<string, string> = {
  "/dashboard": "Accueil",
  "/dashboard/rendez-vous": "Rendez-vous",
  "/dashboard/clients": "Clients",
  "/dashboard/finances": "Finances",
  "/dashboard/avis": "Avis",
  "/dashboard/disponibilites": "Disponibilités",
  "/dashboard/boutique": "Boutique",
  "/dashboard/parametres": "Paramètres",
}

export default function Topbar() {
  const pathname = usePathname()
  const router = useRouter()
  const here = LABELS[pathname] ?? "Dashboard"
  const pendingCount = useSessionStore((s) => s.pendingCount)

  return (
    <header className="topbar">
      <div className="crumbs">
        <span>La bulle de vie</span>
        <span style={{ opacity: .4 }}>›</span>
        <span className="here">{here}</span>
      </div>

      <div className="search">
        <input type="text" placeholder="Rechercher un client, une réservation…" />
      </div>

      <button
        className="icon-btn"
        title={pendingCount > 0 ? `${pendingCount} élément${pendingCount > 1 ? "s" : ""} en attente` : "Notifications"}
        aria-label="Notifications"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width={17} height={17}>
          <path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" /><path d="M10 20a2 2 0 0 0 4 0" />
        </svg>
        {pendingCount > 0 && <span className="dot-n" />}
      </button>

      <button className="tbtn" onClick={() => router.push("/booking")}>
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Nouveau RDV
      </button>
    </header>
  )
}
