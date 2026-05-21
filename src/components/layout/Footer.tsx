"use client"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"

export default function Footer() {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) throw new Error()
      setSubmitted(true)
      toast.success("Inscription confirmée — à très vite dans la bulle !")
    } catch {
      toast.error("Une erreur est survenue. Veuillez réessayer.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <footer>
      <div className="wrap">
        <div className="foot-grid">
          <div className="foot-brand">
            <h3>La bulle de vie</h3>
            <p>Un cocon pour le corps, l&apos;esprit et la maison. Massages personnalisés et créations artisanales à Lyon.</p>
          </div>
          <div className="foot-col">
            <h4>Aide &amp; infos</h4>
            <Link href="/#faq">FAQ</Link>
            <Link href="/contact">Nous contacter</Link>
            <Link href="#">Cartes cadeaux</Link>
            <Link href="/login">Se connecter</Link>
            <Link href="/register">Créer un compte</Link>
          </div>
          <div className="foot-col">
            <h4>Conditions</h4>
            <Link href="#">Mentions légales</Link>
            <Link href="#">CGV</Link>
            <Link href="#">CGU</Link>
          </div>
          <div className="foot-col newsletter">
            <h4>Inscrivez‑vous à la newsletter</h4>
            {submitted ? (
              <div className="ok">✓ Merci, à très vite dans la bulle.</div>
            ) : (
              <form onSubmit={handleSubmit}>
                <input
                  type="email"
                  placeholder="Votre adresse mail"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
                <button type="submit" disabled={loading}>
                  {loading ? "…" : "Je m’inscris"}
                </button>
              </form>
            )}
          </div>
        </div>
        <div className="foot-bottom">
          <div>© 2026 La bulle de vie — Tous droits réservés.</div>
          <div>Conception &amp; soin · <Link href="#">Lyon, France</Link></div>
        </div>
      </div>
    </footer>
  )
}
