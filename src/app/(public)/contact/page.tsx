"use client"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import Reveal from "@/components/animations/Reveal"
import { contactSchema } from "@/lib/validation"

type ContactFormValues = z.infer<typeof contactSchema>

const faqItems = [
  { q: "Faut‑il réserver à l'avance ?", a: "Idéalement oui — un délai de 3 à 5 jours permet d'organiser votre séance dans les meilleures conditions. Pour les soins de dernière minute, n'hésitez pas à m'appeler directement." },
  { q: "Dois‑je apporter quelque chose pour ma séance ?", a: "Tout est prévu sur place : linges, huiles, ambiance sonore. Apportez simplement une tenue confortable — et l'envie de lâcher prise." },
  { q: "Quelles créations proposez‑vous ?", a: "Bougies parfumées, compositions florales séchées, brumes d'ambiance, et pièces décoratives sur mesure pour votre intérieur." },
  { q: "Quels moyens de paiement acceptez‑vous ?", a: "Carte, espèces, virement et chèques-cadeaux La bulle de vie. Le paiement se règle en ligne lors de la réservation." },
  { q: "Proposez‑vous des séances à domicile ?", a: "Oui, sur Lyon et alentours (15 km). Un supplément déplacement de 15 à 25 € est appliqué selon la distance." },
]

export default function ContactPage() {
  const [openFaq, setOpenFaq] = useState(-1)
  const [sending, setSending] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
  })

  async function onSubmit(data: ContactFormValues) {
    setSending(true)
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error()
      toast.success("Message envoyé ! Nous vous répondrons dans les plus brefs délais.")
      reset()
    } catch {
      toast.error("Une erreur est survenue. Veuillez réessayer ou nous appeler directement.")
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {/* ── Hero / Contact section ────────────────────────────── */}
      <section className="contact-split">
        {/* Dark decorative panel */}
        <div className="contact-panel" aria-hidden="true">
          <div className="contact-panel-orb contact-panel-orb-1" />
          <div className="contact-panel-orb contact-panel-orb-2" />
        </div>

        {/* Content */}
        <div className="contact-right">
          <Reveal>
            <p className="contact-eyebrow">Nous contacter</p>
            <h1 className="contact-title">Me<br />contacter</h1>
          </Reveal>

          <div className="contact-cols">
            {/* Left — Info */}
            <Reveal delay={0.1} className="contact-info-col">
              <div className="contact-block">
                <h3>Horaires</h3>
                <p>Lun – Ven<br />9h30 – 20h30</p>
                <p className="muted" style={{ marginTop: 10 }}>Week‑end<br />10h00 – 19h30</p>
              </div>

              <div className="contact-block">
                <h3>Contact</h3>
                <p>
                  <a href="tel:+33625486056" style={{ color: "var(--ink)", textDecoration: "none" }}>
                    06 25 48 60 56
                  </a>
                </p>
                <p style={{ marginTop: 6 }}>
                  <a href="mailto:contact@labulledevie.fr" style={{ color: "var(--ink)", textDecoration: "none" }}>
                    contact@labulledevie.fr
                  </a>
                </p>
              </div>

              <div className="contact-socials">
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer"
                  className="contact-social-link" aria-label="Instagram">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                  </svg>
                </a>
                <a href="https://x.com" target="_blank" rel="noopener noreferrer"
                  className="contact-social-link" aria-label="X / Twitter">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer"
                  className="contact-social-link" aria-label="Facebook">
                  <svg width="14" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
              </div>
            </Reveal>

            {/* Right — Form */}
            <Reveal delay={0.2} className="contact-form-col">
              <h3 className="contact-form-label">Formulaire</h3>
              <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="cf-name">Nom</label>
                    <input id="cf-name" type="text" placeholder="Votre nom" {...register("name")} />
                    {errors.name && <span className="hint" style={{ color: "var(--terra)" }}>{errors.name.message}</span>}
                  </div>
                  <div className="field">
                    <label htmlFor="cf-email">Email</label>
                    <input id="cf-email" type="email" placeholder="votre@email.fr" {...register("email")} />
                    {errors.email && <span className="hint" style={{ color: "var(--terra)" }}>{errors.email.message}</span>}
                  </div>
                  <div className="field full">
                    <label htmlFor="cf-phone">Téléphone <span style={{ color: "var(--mute)", fontWeight: 400 }}>(optionnel)</span></label>
                    <input id="cf-phone" type="tel" placeholder="06 00 00 00 00" {...register("phone")} />
                    {errors.phone && <span className="hint" style={{ color: "var(--terra)" }}>{errors.phone.message}</span>}
                  </div>
                  <div className="field full">
                    <label htmlFor="cf-message">Message</label>
                    <textarea id="cf-message" rows={5} placeholder="Votre message…" {...register("message")} />
                    {errors.message && <span className="hint" style={{ color: "var(--terra)" }}>{errors.message.message}</span>}
                  </div>
                </div>

                <div className="contact-submit">
                  <button type="submit" className="btn btn-dark" disabled={sending}
                    style={{ minWidth: 140, opacity: sending ? 0.7 : 1 }}>
                    {sending ? "Envoi…" : "Envoyer"}
                  </button>
                </div>
              </form>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────── */}
      <section className="faq" id="faq">
        <div className="wrap">
          <div className="faq-grid">
            <Reveal className="faq-side">
              <p className="eyebrow">Questions fréquentes</p>
              <h2>FAQ</h2>
              <p>Tout ce que vous devez savoir avant votre première séance.</p>
              <div className="faq-contact">
                <div className="faq-contact-row">
                  <div className="ico">✆</div>
                  <div>
                    <div style={{ fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--mute)", marginBottom: 2 }}>Téléphone</div>
                    <div>06 25 48 60 56</div>
                  </div>
                </div>
                <div className="faq-contact-row">
                  <div className="ico">@</div>
                  <div>
                    <div style={{ fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--mute)", marginBottom: 2 }}>E‑mail</div>
                    <div>contact@labulledevie.fr</div>
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.1} className="faq-list">
              {faqItems.map((item, i) => (
                <div key={i} className={`faq-item ${openFaq === i ? "open" : ""}`}>
                  <div className="faq-q" onClick={() => setOpenFaq(openFaq === i ? -1 : i)}>
                    <span>{item.q}</span>
                    <div className="plus" />
                  </div>
                  <div className="faq-a"><div><p>{item.a}</p></div></div>
                </div>
              ))}
            </Reveal>
          </div>
        </div>
      </section>
    </>
  )
}
