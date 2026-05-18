"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

const links = [
  { href: "/prestations", label: "Massages" },
  { href: "/decorations", label: "Décoration" },
  { href: "/mon-parcours", label: "Mon parcours" },
  { href: "/#faq", label: "FAQ" },
]

export default function Navbar() {
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [userInitial, setUserInitial] = useState<string | null>(null)

  // Pages whose hero is dark — nav links should be white when unscrolled
  const darkHero =
    pathname === "/" ||
    pathname === "/prestations" ||
    pathname === "/decorations" ||
    pathname.startsWith("/soins")

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      const name = (user.user_metadata?.full_name as string) || user.email || ""
      setUserInitial(name.charAt(0).toUpperCase() || null)
    })
  }, [])

  return (
    <nav className={`nav ${darkHero ? "on-dark" : ""} ${scrolled ? "scrolled" : ""}`} id="nav">
      <div className="wrap nav-inner">
        <Link className="logo" href="/">
          <span className="logo-dot" />
          La bulle de vie
        </Link>

        <div className={`nav-links ${open ? "nav-open" : ""}`}>
          {links.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className={`nav-link ${pathname === l.href ? "active" : ""}`}
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          {userInitial ? (
            <Link
              href="/compte"
              onClick={() => setOpen(false)}
              style={{
                width: 34, height: 34, borderRadius: "50%",
                background: "linear-gradient(135deg, var(--terra), var(--terra-soft))",
                color: "#fff", display: "inline-flex", alignItems: "center",
                justifyContent: "center", fontFamily: "var(--serif)", fontSize: 15,
                textDecoration: "none", flexShrink: 0,
                boxShadow: "0 2px 8px #B86F4A44",
              }}
              aria-label="Mon compte"
            >
              {userInitial}
            </Link>
          ) : (
            <Link
              href="/login"
              className={`nav-link ${pathname === "/login" ? "active" : ""}`}
              onClick={() => setOpen(false)}
            >
              Se connecter
            </Link>
          )}
          <Link className="btn primary" href="/booking" onClick={() => setOpen(false)}>
            Réserver <span className="arrow">→</span>
          </Link>
        </div>

        <button
          className="nav-burger"
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          onClick={() => setOpen(o => !o)}
        >
          <span /><span /><span />
        </button>
      </div>
    </nav>
  )
}
