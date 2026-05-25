"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useCartStore } from "@/lib/stores/useCartStore"

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
  const [mounted, setMounted] = useState(false)
  const { count, open: openCart } = useCartStore()
  const cartCount = mounted ? count() : 0

  useEffect(() => { setMounted(true) }, [])

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
          <button className="cart-nav-btn" onClick={() => { setOpen(false); openCart() }} aria-label="Panier">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </button>
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
