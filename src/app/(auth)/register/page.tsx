"use client"

import { useState } from "react"
import Link from "next/link"

interface RegisterForm {
  prenom: string
  nom: string
  email: string
  telephone: string
  password: string
  confirmPassword: string
  acceptTerms: boolean
}

export default function RegisterPage() {
  const [form, setForm] = useState<RegisterForm>({
    prenom: "",
    nom: "",
    email: "",
    telephone: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordMismatch, setPasswordMismatch] = useState(false)

  function handleChange(field: keyof RegisterForm, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (field === "confirmPassword" || field === "password") {
      setPasswordMismatch(false)
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (form.password !== form.confirmPassword) {
      setPasswordMismatch(true)
      return
    }
    console.log(form)
  }

  function handleGoogleOAuth() {
    console.log("google oauth")
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — hidden on mobile */}
      <div
        className="hidden md:flex md:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #2C1F14 0%, #1a0f08 100%)" }}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(ellipse at 70% 20%, #B86F4A 0%, transparent 50%), radial-gradient(ellipse at 20% 80%, #8B5E3C 0%, transparent 45%)",
          }}
        />

        {/* Logo */}
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-3">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: "radial-gradient(circle at 30% 30%, #fff, #B86F4A 70%)" }}
            />
            <span
              className="text-white text-xl"
              style={{ fontFamily: "var(--serif)", fontStyle: "italic" }}
            >
              La Bulle De Vie
            </span>
          </Link>
        </div>

        {/* Central quote + benefits */}
        <div className="relative z-10 flex-1 flex flex-col justify-center">
          <p
            className="text-white/20 text-xs tracking-widest uppercase mb-8"
            style={{ fontFamily: "var(--sans)", letterSpacing: "0.25em" }}
          >
            Rejoignez-nous
          </p>
          <blockquote
            className="text-white mb-10"
            style={{
              fontFamily: "var(--serif)",
              fontSize: "clamp(28px, 3vw, 44px)",
              lineHeight: 1.18,
              fontWeight: 400,
            }}
          >
            "Votre bien-être
            <br />
            <span style={{ fontStyle: "italic", color: "#D89175" }}>commence ici.</span>"
          </blockquote>
          <ul className="space-y-4">
            {[
              "Réservez en quelques clics",
              "Gérez vos rendez-vous en ligne",
              "Accédez à votre historique",
            ].map((benefit) => (
              <li key={benefit} className="flex items-start gap-3">
                <span
                  className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs"
                  style={{ background: "rgba(184,111,74,0.25)", color: "#D89175" }}
                >
                  ✓
                </span>
                <span className="text-sm text-white/70" style={{ fontFamily: "var(--sans)" }}>
                  {benefit}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom decoration */}
        <div className="relative z-10">
          <div className="h-px w-full" style={{ background: "rgba(255,255,255,0.08)" }} />
          <p className="mt-4 text-xs text-white/25" style={{ fontFamily: "var(--sans)" }}>
            Votre confiance est notre priorité — données 100 % sécurisées
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div
        className="w-full md:w-1/2 flex flex-col justify-center px-6 py-16 sm:px-12 lg:px-20 overflow-y-auto"
        style={{ background: "var(--paper)", fontFamily: "var(--sans)" }}
      >
        {/* Mobile logo */}
        <div className="md:hidden mb-10">
          <Link href="/" className="flex items-center gap-3">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: "radial-gradient(circle at 30% 30%, #fff, #B86F4A 70%)" }}
            />
            <span
              className="text-xl"
              style={{
                fontFamily: "var(--serif)",
                fontStyle: "italic",
                color: "var(--ink)",
              }}
            >
              La Bulle De Vie
            </span>
          </Link>
        </div>

        <div className="w-full max-w-sm mx-auto">
          {/* Heading */}
          <div className="mb-10">
            <h1
              className="mb-2"
              style={{
                fontFamily: "var(--serif)",
                fontSize: "clamp(28px, 3vw, 38px)",
                fontWeight: 400,
                color: "var(--ink)",
                lineHeight: 1.1,
              }}
            >
              Créer un compte
            </h1>
            <p className="text-sm" style={{ color: "var(--mute)" }}>
              Quelques secondes pour accéder à votre espace bien-être.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Prénom + Nom */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <FieldInput
                id="prenom"
                label="Prénom"
                type="text"
                autoComplete="given-name"
                required
                value={form.prenom}
                onChange={(v) => handleChange("prenom", v)}
                placeholder="Marie"
              />
              <FieldInput
                id="nom"
                label="Nom"
                type="text"
                autoComplete="family-name"
                required
                value={form.nom}
                onChange={(v) => handleChange("nom", v)}
                placeholder="Dupont"
              />
            </div>

            {/* Email */}
            <FieldInput
              id="email"
              label="Adresse e-mail"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={(v) => handleChange("email", v)}
              placeholder="vous@exemple.fr"
            />

            {/* Téléphone */}
            <FieldInput
              id="telephone"
              label="Téléphone (optionnel)"
              type="tel"
              autoComplete="tel"
              value={form.telephone}
              onChange={(v) => handleChange("telephone", v)}
              placeholder="+33 6 00 00 00 00"
            />

            {/* Mot de passe */}
            <PasswordInput
              id="password"
              label="Mot de passe"
              autoComplete="new-password"
              value={form.password}
              onChange={(v) => handleChange("password", v)}
              show={showPassword}
              onToggle={() => setShowPassword((s) => !s)}
              placeholder="8 caractères minimum"
            />

            {/* Confirmer */}
            <div>
              <PasswordInput
                id="confirmPassword"
                label="Confirmer le mot de passe"
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={(v) => handleChange("confirmPassword", v)}
                show={showConfirmPassword}
                onToggle={() => setShowConfirmPassword((s) => !s)}
                placeholder="Répétez votre mot de passe"
                error={passwordMismatch}
              />
              {passwordMismatch && (
                <p className="mt-2 text-xs" style={{ color: "#c0392b" }}>
                  Les mots de passe ne correspondent pas.
                </p>
              )}
            </div>

            {/* Terms */}
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <div className="relative mt-0.5 flex-shrink-0">
                <input
                  type="checkbox"
                  required
                  checked={form.acceptTerms}
                  onChange={(e) => handleChange("acceptTerms", e.target.checked)}
                  className="sr-only"
                />
                <div
                  className="w-4 h-4 rounded-sm border flex items-center justify-center transition-colors"
                  style={{
                    borderColor: form.acceptTerms ? "var(--ink)" : "var(--line)",
                    background: form.acceptTerms ? "var(--ink)" : "transparent",
                  }}
                >
                  {form.acceptTerms && (
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-xs leading-relaxed" style={{ color: "var(--mute)" }}>
                J'accepte les{" "}
                <Link
                  href="/conditions"
                  className="underline transition-colors hover:opacity-80"
                  style={{ color: "var(--ink)" }}
                >
                  conditions d'utilisation
                </Link>{" "}
                et la{" "}
                <Link
                  href="/confidentialite"
                  className="underline transition-colors hover:opacity-80"
                  style={{ color: "var(--ink)" }}
                >
                  politique de confidentialité
                </Link>
              </span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              className="w-full py-3.5 rounded-full text-sm font-medium tracking-wide transition-colors"
              style={{
                background: "var(--ink)",
                color: "var(--paper)",
                fontFamily: "var(--sans)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--terra)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--ink)")}
            >
              Créer mon compte
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px" style={{ background: "var(--line)" }} />
            <span className="text-xs" style={{ color: "var(--mute)" }}>
              ou
            </span>
            <div className="flex-1 h-px" style={{ background: "var(--line)" }} />
          </div>

          {/* Google OAuth */}
          <button
            type="button"
            onClick={handleGoogleOAuth}
            className="w-full flex items-center justify-center gap-3 py-3.5 rounded-full text-sm font-medium border transition-colors"
            style={{
              borderColor: "var(--line)",
              color: "var(--ink)",
              background: "transparent",
              fontFamily: "var(--sans)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--ink)"
              e.currentTarget.style.background = "var(--ink)"
              e.currentTarget.style.color = "var(--paper)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--line)"
              e.currentTarget.style.background = "transparent"
              e.currentTarget.style.color = "var(--ink)"
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continuer avec Google
          </button>

          {/* Footer link */}
          <p className="text-center mt-8 text-xs" style={{ color: "var(--mute)" }}>
            Déjà un compte ?{" "}
            <Link
              href="/login"
              className="font-medium transition-colors hover:underline"
              style={{ color: "var(--ink)" }}
            >
              Se connecter →
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

interface FieldInputProps {
  id: string
  label: string
  type: string
  autoComplete?: string
  required?: boolean
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

function FieldInput({ id, label, type, autoComplete, required, value, onChange, placeholder }: FieldInputProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-xs font-medium uppercase mb-3"
        style={{ color: "var(--mute)", letterSpacing: "0.15em" }}
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent pb-2 text-sm focus:outline-none transition-colors"
        style={{
          borderBottom: "1px solid var(--line)",
          color: "var(--ink)",
          fontFamily: "var(--sans)",
        }}
        onFocus={(e) => (e.currentTarget.style.borderBottomColor = "var(--ink)")}
        onBlur={(e) => (e.currentTarget.style.borderBottomColor = "var(--line)")}
      />
    </div>
  )
}

interface PasswordInputProps {
  id: string
  label: string
  autoComplete?: string
  value: string
  onChange: (value: string) => void
  show: boolean
  onToggle: () => void
  placeholder?: string
  error?: boolean
}

function PasswordInput({ id, label, autoComplete, value, onChange, show, onToggle, placeholder, error }: PasswordInputProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-xs font-medium uppercase mb-3"
        style={{ color: "var(--mute)", letterSpacing: "0.15em" }}
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent pb-2 pr-8 text-sm focus:outline-none transition-colors"
          style={{
            borderBottom: `1px solid ${error ? "#c0392b" : "var(--line)"}`,
            color: "var(--ink)",
            fontFamily: "var(--sans)",
          }}
          onFocus={(e) =>
            (e.currentTarget.style.borderBottomColor = error ? "#c0392b" : "var(--ink)")
          }
          onBlur={(e) =>
            (e.currentTarget.style.borderBottomColor = error ? "#c0392b" : "var(--line)")
          }
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-0 bottom-2 focus:outline-none"
          style={{ color: "var(--mute)" }}
          aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        >
          {show ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
              <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
              <line x1="1" y1="1" x2="23" y2="23"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}
