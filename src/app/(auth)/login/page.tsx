"use client"

import { useState } from "react"
import Link from "next/link"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    console.log({ email, password, rememberMe })
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
        {/* Subtle texture overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(ellipse at 30% 20%, #B86F4A 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, #8B5E3C 0%, transparent 45%)",
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

        {/* Central quote */}
        <div className="relative z-10 flex-1 flex flex-col justify-center">
          <p
            className="text-white/20 text-xs tracking-widest uppercase mb-8"
            style={{ fontFamily: "var(--sans)", letterSpacing: "0.25em" }}
          >
            Votre espace bien-être
          </p>
          <blockquote
            className="text-white mb-6"
            style={{
              fontFamily: "var(--serif)",
              fontSize: "clamp(32px, 3.5vw, 48px)",
              lineHeight: 1.15,
              fontWeight: 400,
            }}
          >
            "Prenez soin de vous,
            <br />
            <span style={{ fontStyle: "italic", color: "#D89175" }}>le reste suivra.</span>"
          </blockquote>
          <p className="text-white/40 text-sm" style={{ fontFamily: "var(--sans)" }}>
            — La Bulle De Vie
          </p>
        </div>

        {/* Bottom stats */}
        <div className="relative z-10 flex gap-8">
          <div className="border border-white/10 rounded-2xl px-5 py-4 backdrop-blur-sm bg-white/5">
            <p
              className="text-white text-2xl mb-1"
              style={{ fontFamily: "var(--serif)" }}
            >
              500+
            </p>
            <p className="text-white/50 text-xs tracking-wide" style={{ fontFamily: "var(--sans)" }}>
              soins réalisés
            </p>
          </div>
          <div className="border border-white/10 rounded-2xl px-5 py-4 backdrop-blur-sm bg-white/5">
            <p
              className="text-white text-2xl mb-1"
              style={{ fontFamily: "var(--serif)" }}
            >
              4.9 / 5
            </p>
            <p className="text-white/50 text-xs tracking-wide" style={{ fontFamily: "var(--sans)" }}>
              satisfaction client
            </p>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div
        className="w-full md:w-1/2 flex flex-col justify-center px-6 py-16 sm:px-12 lg:px-20"
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
                fontSize: "clamp(30px, 3vw, 40px)",
                fontWeight: 400,
                color: "var(--ink)",
                lineHeight: 1.1,
              }}
            >
              Bon retour
            </h1>
            <p className="text-sm" style={{ color: "var(--mute)" }}>
              Connectez-vous à votre espace personnel.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-7">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium tracking-widest uppercase mb-3"
                style={{ color: "var(--mute)", letterSpacing: "0.15em" }}
              >
                Adresse e-mail
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent pb-2 text-sm focus:outline-none transition-colors"
                style={{
                  borderBottom: "1px solid var(--line)",
                  color: "var(--ink)",
                }}
                onFocus={(e) =>
                  (e.currentTarget.style.borderBottomColor = "var(--ink)")
                }
                onBlur={(e) =>
                  (e.currentTarget.style.borderBottomColor = "var(--line)")
                }
                placeholder="vous@exemple.fr"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium tracking-widest uppercase mb-3"
                style={{ color: "var(--mute)", letterSpacing: "0.15em" }}
              >
                Mot de passe
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent pb-2 pr-8 text-sm focus:outline-none transition-colors"
                  style={{
                    borderBottom: "1px solid var(--line)",
                    color: "var(--ink)",
                  }}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderBottomColor = "var(--ink)")
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderBottomColor = "var(--line)")
                  }
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-0 bottom-2 focus:outline-none"
                  style={{ color: "var(--mute)" }}
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword ? (
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

            {/* Remember me + forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className="w-4 h-4 rounded-sm border flex items-center justify-center transition-colors"
                    style={{
                      borderColor: rememberMe ? "var(--ink)" : "var(--line)",
                      background: rememberMe ? "var(--ink)" : "transparent",
                    }}
                  >
                    {rememberMe && (
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-xs" style={{ color: "var(--mute)" }}>
                  Se souvenir de moi
                </span>
              </label>
              <Link
                href="/forgot-password"
                className="text-xs transition-colors hover:underline"
                style={{ color: "var(--mute)" }}
              >
                Mot de passe oublié ?
              </Link>
            </div>

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
              Se connecter
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-7">
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
            Pas encore de compte ?{" "}
            <Link
              href="/register"
              className="font-medium transition-colors hover:underline"
              style={{ color: "var(--ink)" }}
            >
              Créer un compte →
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
