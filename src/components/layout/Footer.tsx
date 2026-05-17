"use client"
import Link from "next/link"
import { useState } from "react"

export default function Footer() {
  const [submitted, setSubmitted] = useState(false)

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
              <form onSubmit={e => { e.preventDefault(); setSubmitted(true) }}>
                <input type="email" placeholder="Votre adresse mail" required />
                <button type="submit">Je m&apos;inscris</button>
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
