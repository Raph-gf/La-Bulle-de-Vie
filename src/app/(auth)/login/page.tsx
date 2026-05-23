"use client"

import { Suspense } from "react"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

// ── Zod schemas ─────────────────────────────────────────────────────
const loginSchema = z.object({
  email: z.string().email("Adresse e‑mail invalide"),
  password: z.string().min(1, "Mot de passe requis"),
  remember: z.boolean().optional(),
})

const registerSchema = z.object({
  prenom: z.string().min(1, "Prénom requis"),
  nom: z.string().min(1, "Nom requis"),
  email: z.string().email("Adresse e‑mail invalide"),
  phone: z.string().min(6, "Numéro invalide"),
  password: z
    .string()
    .min(8, "8 caractères minimum")
    .regex(/\d/, "Doit contenir un chiffre"),
  cgu: z.literal(true, { error: () => ({ message: "Requis" }) }),
  newsletter: z.boolean().optional(),
})

const forgotSchema = z.object({
  email: z.string().email("Adresse e‑mail invalide"),
})

const resetSchema = z.object({
  password: z.string().min(8, "8 caractères minimum").regex(/\d/, "Doit contenir un chiffre"),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirm"],
})

type LoginData = z.infer<typeof loginSchema>
type RegisterData = z.infer<typeof registerSchema>
type ForgotData = z.infer<typeof forgotSchema>
type ResetData = z.infer<typeof resetSchema>
type Mode = "login" | "register" | "forgot" | "success" | "reset"

// ── Strength meter ───────────────────────────────────────────────────
function passwordStrength(v: string): number {
  let s = 0
  if (v.length >= 8) s++
  if (/[A-Z]/.test(v)) s++
  if (/\d/.test(v)) s++
  if (/[^A-Za-z0-9]/.test(v) && v.length >= 10) s++
  return s
}
const strengthLabels = [
  "Au moins 8 caractères, dont un chiffre.",
  "Faible — ajoutez une majuscule",
  "Correct — ajoutez un chiffre",
  "Bon mot de passe",
  "Excellent ✦",
]
const strengthColors = ["", "#C95555", "#C9923F", "var(--terra)", "#5C8262"]

// ── Sub-components ───────────────────────────────────────────────────
function FloatInput({
  id, label, type = "text", autoComplete, icon, error, registration, rightSlot,
}: {
  id: string; label: string; type?: string; autoComplete?: string
  icon?: React.ReactNode; error?: string; registration: object; rightSlot?: React.ReactNode
}) {
  return (
    <div style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        {icon && (
          <span style={{
            position: "absolute", left: 16, top: 27, transform: "translateY(-50%)",
            color: "var(--mute)", pointerEvents: "none", width: 18, height: 18,
            display: "flex", alignItems: "center",
          }}>
            {icon}
          </span>
        )}
        <input
          id={id}
          type={type}
          autoComplete={autoComplete}
          placeholder=" "
          {...registration}
          style={{
            width: "100%", height: 54, padding: `0 ${rightSlot ? 46 : 16}px 0 ${icon ? 46 : 16}px`,
            border: `1px solid ${error ? "#C95555" : "var(--line)"}`, borderRadius: 10,
            background: "#fff", fontFamily: "var(--sans)", fontSize: 15, color: "var(--ink)",
            outline: "none", transition: "border-color .25s, box-shadow .25s",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = error ? "#C95555" : "var(--ink)"
            e.currentTarget.style.boxShadow = "0 0 0 4px #2218120c"
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = error ? "#C95555" : "var(--line)"
            e.currentTarget.style.boxShadow = "none"
          }}
        />
        <label
          htmlFor={id}
          style={{
            position: "absolute", left: icon ? 46 : 16, top: 27,
            transform: "translateY(-50%)",
            fontSize: 15, color: "var(--mute)", pointerEvents: "none",
            transition: "all .2s ease", background: "transparent", padding: "0 4px", lineHeight: 1,
          }}
          className="float-label"
        >
          {label}
        </label>
        {rightSlot}
      </div>
      {error && (
        <p style={{ fontSize: 11.5, color: "#C95555", marginTop: 4, marginLeft: 4 }}>{error}</p>
      )}
    </div>
  )
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" width={18} height={18}>
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" width={18} height={18}>
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

function IconEmail() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" width={18} height={18}>
      <rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 7 9-7"/>
    </svg>
  )
}
function IconLock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" width={18} height={18}>
      <rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>
    </svg>
  )
}
function IconPhone() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" width={18} height={18}>
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z"/>
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20}>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC04"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

function GoogleButton({ label, onClick, loading }: { label: string; onClick: () => void; loading?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
        width: "100%", padding: "14px 18px", borderRadius: 10,
        background: "#fff", border: "1px solid var(--line)",
        cursor: "pointer", fontFamily: "var(--sans)", fontSize: 15, fontWeight: 500,
        color: "var(--ink)", transition: "all .3s ease", opacity: loading ? 0.8 : 1,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--ink)"
        e.currentTarget.style.transform = "translateY(-1px)"
        e.currentTarget.style.boxShadow = "0 12px 28px -16px #2218127a"
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--line)"
        e.currentTarget.style.transform = "none"
        e.currentTarget.style.boxShadow = "none"
      }}
    >
      <GoogleIcon />
      <span>{loading ? "Connexion en cours…" : label}</span>
    </button>
  )
}

function OrSep() {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 16, margin: "24px 0",
      fontSize: 11, letterSpacing: ".24em", textTransform: "uppercase", color: "var(--mute)",
    }}>
      <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
      ou avec votre e‑mail
      <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
    </div>
  )
}

function SubmitBtn({ label, loading, disabled }: { label: string; loading?: boolean; disabled?: boolean }) {
  return (
    <button
      type="submit"
      disabled={disabled || loading}
      style={{
        width: "100%", padding: "16px 20px", border: "none", borderRadius: 10,
        background: "var(--ink)", color: "#fff", fontFamily: "var(--sans)",
        fontSize: 15, fontWeight: 500, letterSpacing: ".02em",
        cursor: disabled || loading ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "all .3s ease",
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10,
      }}
      onMouseEnter={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.background = "var(--terra)"
          e.currentTarget.style.transform = "translateY(-1px)"
          e.currentTarget.style.boxShadow = "0 12px 28px -16px var(--terra)"
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "var(--ink)"
        e.currentTarget.style.transform = "none"
        e.currentTarget.style.boxShadow = "none"
      }}
    >
      <span>{loading ? "Chargement…" : label}</span>
      {!loading && <span style={{ transition: "transform .3s" }}>→</span>}
    </button>
  )
}

function TabPill({ mode, onSwitch }: { mode: "login" | "register"; onSwitch: (m: "login" | "register") => void }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr 1fr",
      padding: 4, background: "var(--cream)", borderRadius: 999,
      marginBottom: 32, position: "relative",
    }}>
      <div style={{
        position: "absolute", top: 4, bottom: 4, left: 4,
        width: "calc(50% - 4px)", background: "var(--ink)", borderRadius: 999,
        transition: "transform .4s cubic-bezier(.2,.7,.2,1)", zIndex: 0,
        transform: mode === "register" ? "translateX(100%)" : "none",
      }} />
      {(["login", "register"] as const).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onSwitch(t)}
          style={{
            position: "relative", zIndex: 1, background: "transparent", border: "none",
            cursor: "pointer", padding: "12px 16px", fontFamily: "var(--sans)", fontSize: 14,
            color: mode === t ? "#fff" : "var(--ink-soft)", transition: "color .35s",
          }}
        >
          {t === "login" ? "Se connecter" : "Créer un compte"}
        </button>
      ))}
    </div>
  )
}

// ── Google overlay modal ─────────────────────────────────────────────
const ACCOUNTS = [
  { key: "l", initial: "L", name: "Laurence Valère", email: "laurence.valere@gmail.com", grad: "linear-gradient(135deg,#B86F4A,#D89175)" },
  { key: "s", initial: "S", name: "Sophie Marchand", email: "sophie.marchand@gmail.com", grad: "linear-gradient(135deg,#5F6FAE,#87A3D9)" },
  { key: "c", initial: "C", name: "Camille Roy", email: "camille.r@gmail.com", grad: "linear-gradient(135deg,#5C8262,#8EB494)" },
]

function GoogleModal({
  show, onClose, onPick,
}: { show: boolean; onClose: () => void; onPick: (name: string, email: string) => void }) {
  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "#0009", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        opacity: show ? 1 : 0, pointerEvents: show ? "auto" : "none",
        transition: "opacity .3s ease",
      }}
    >
      <div style={{
        background: "#fff", borderRadius: 14, width: 420, maxWidth: "92vw",
        boxShadow: "0 30px 80px -20px #00000060", overflow: "hidden",
        transform: show ? "none" : "translateY(20px) scale(.95)",
        transition: "transform .35s cubic-bezier(.2,.7,.2,1)",
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "18px 24px", borderBottom: "1px solid #00000010",
          fontFamily: "-apple-system,Segoe UI,Roboto,sans-serif", fontSize: 14, color: "#5f6368",
        }}>
          <GoogleIcon />
          <span>Se connecter avec Google</span>
          <button onClick={onClose} style={{ marginLeft: "auto", background: "transparent", border: "none", cursor: "pointer", fontSize: 20, color: "#5f6368" }}>×</button>
        </div>
        <div style={{ padding: "32px 32px 28px", textAlign: "center", fontFamily: "-apple-system,Segoe UI,Roboto,sans-serif" }}>
          <h3 style={{ fontSize: 20, fontWeight: 400, color: "#202124", margin: "0 0 4px" }}>Choisir un compte</h3>
          <p style={{ fontSize: 13, color: "#5f6368", margin: 0 }}>pour continuer vers <strong style={{ color: "#202124" }}>labulledevie.fr</strong></p>
        </div>
        <div>
          {ACCOUNTS.map((a) => (
            <button
              key={a.key}
              onClick={() => onPick(a.name, a.email)}
              style={{
                display: "flex", alignItems: "center", gap: 14, padding: "12px 32px",
                cursor: "pointer", border: "none", background: "transparent",
                width: "100%", textAlign: "left", fontFamily: "-apple-system,Segoe UI,Roboto,sans-serif",
                transition: "background .15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f6f0f9")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <div style={{
                width: 36, height: 36, borderRadius: "50%", background: a.grad,
                color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 500, fontSize: 15,
              }}>{a.initial}</div>
              <div>
                <div style={{ fontSize: 14, color: "#202124" }}>{a.name}</div>
                <div style={{ fontSize: 13, color: "#5f6368", marginTop: 1 }}>{a.email}</div>
              </div>
            </button>
          ))}
          <button
            onClick={onClose}
            style={{
              display: "flex", alignItems: "center", gap: 14, padding: "12px 32px",
              cursor: "pointer", border: "none", borderTop: "1px solid #00000010",
              background: "transparent", width: "100%", fontFamily: "-apple-system,Segoe UI,Roboto,sans-serif",
              transition: "background .15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f6f0f9")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <div style={{
              width: 36, height: 36, borderRadius: "50%", background: "#f1f3f4",
              color: "#5f6368", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
            }}>+</div>
            <span style={{ fontSize: 14, color: "#202124" }}>Utiliser un autre compte</span>
          </button>
        </div>
        <div style={{
          padding: "16px 24px", fontSize: 11, color: "#5f6368",
          borderTop: "1px solid #00000010", background: "#fafafa",
          fontFamily: "-apple-system,Segoe UI,Roboto,sans-serif",
        }}>
          Pour continuer, Google partagera votre nom, adresse e‑mail, préférences linguistiques et photo de profil avec labulledevie.fr.
        </div>
      </div>
    </div>
  )
}

// ── Aside (left panel) ───────────────────────────────────────────────
function Aside() {
  return (
    <aside style={{
      position: "relative", overflow: "hidden",
      background: "#1a110b", color: "#fff",
      padding: "56px 64px",
      display: "flex", flexDirection: "column", justifyContent: "space-between",
    }}>
      <div style={{
        position: "absolute", inset: 0, zIndex: 0,
        background: "radial-gradient(ellipse at 30% 30%,var(--terra) 0%,transparent 50%),radial-gradient(ellipse at 80% 70%,var(--terra-soft) 0%,transparent 55%),radial-gradient(ellipse at 50% 100%,#2A1F18 0%,transparent 60%)",
        opacity: .35, animation: "nebula 22s ease-in-out infinite alternate",
      }} />
      {[
        { w: 180, h: 180, t: 60, r: -40, delay: 0 },
        { w: 120, h: 120, t: "30%", l: "40%", delay: -6 },
        { w: 80, h: 80, b: "30%", r: "24%", delay: -12 },
        { w: 220, h: 220, b: -60, l: -60, delay: -3 },
      ].map((b, i) => (
        <div key={i} style={{
          position: "absolute", borderRadius: "50%", pointerEvents: "none",
          background: "radial-gradient(circle at 30% 30%,#ffffff20,transparent 70%)",
          border: "1px solid #ffffff14",
          width: b.w, height: b.h,
          top: b.t as never, right: b.r as never, bottom: b.b as never, left: b.l as never,
          animation: `floatY 18s ease-in-out infinite`,
          animationDelay: `${b.delay}s`,
        }} />
      ))}
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%", gap: 80 }}>
        <Link href="/" style={{
          fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 26,
          color: "#fff", textDecoration: "none", display: "flex", alignItems: "center", gap: 12,
        }}>
          <span style={{
            width: 12, height: 12, borderRadius: "50%",
            background: "radial-gradient(circle at 30% 30%,#fff,var(--terra) 70%)",
            boxShadow: "0 0 14px var(--terra-soft)", animation: "pulse 3s ease-in-out infinite",
            flexShrink: 0,
          }} />
          La bulle de vie
        </Link>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <h2 style={{
            fontSize: "clamp(40px,4.6vw,64px)", lineHeight: 1.02, color: "#fff",
            fontWeight: 400, letterSpacing: "-.01em", maxWidth: 460, margin: 0,
          }}>
            Bienvenue dans{" "}
            <span style={{ color: "var(--terra-soft)", fontStyle: "italic", display: "block" }}>
              votre bulle.
            </span>
          </h2>
          <p style={{ color: "#ffffffaa", maxWidth: 380, marginTop: 24, fontSize: 17, lineHeight: 1.6 }}>
            Vos prochains rendez‑vous, vos soins préférés, votre historique — tout au même endroit.
          </p>

          <div style={{
            marginTop: 48, padding: 32,
            background: "#ffffff0d", backdropFilter: "blur(10px)",
            border: "1px solid #ffffff20", borderRadius: 14, maxWidth: 440,
          }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: 48, lineHeight: .5, color: "var(--terra-soft)", fontStyle: "italic" }}>"</div>
            <p style={{ fontFamily: "var(--serif)", fontSize: 20, lineHeight: 1.4, color: "#fff", marginTop: 8, marginBottom: 0 }}>
              J'aime retrouver mes séances et mes notes en un clin d'œil — c'est devenu mon petit espace à moi.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 20, paddingTop: 18, borderTop: "1px solid #ffffff20" }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%", background: "var(--terra)",
                color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--serif)", fontSize: 15,
              }}>S</div>
              <div>
                <div style={{ fontSize: 14, color: "#fff" }}>Sophie M.</div>
                <div style={{ fontSize: 11, color: "#ffffff88", letterSpacing: ".16em", textTransform: "uppercase", marginTop: 2 }}>Cliente · 24 séances</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 32, color: "#ffffff66", fontSize: 12, letterSpacing: ".04em" }}>
          {["Mentions légales", "Confidentialité", "CGU"].map((l) => (
            <Link key={l} href="#" style={{ color: "inherit", textDecoration: "none" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#ffffff66")}
            >{l}</Link>
          ))}
        </div>
      </div>
    </aside>
  )
}

// ── Main page ────────────────────────────────────────────────────────
export default function LoginPage() {
  return (
    <Suspense>
      <ConnexionPage />
    </Suspense>
  )
}

function ConnexionPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [mode, setMode] = useState<Mode>("login")
  const [loading, setLoading] = useState(false)
  const [authError, setAuthError] = useState("")
  const [successTitle, setSuccessTitle] = useState("")
  const [successText, setSuccessText] = useState("")
  const [showLoginPwd, setShowLoginPwd] = useState(false)
  const [showRegPwd, setShowRegPwd] = useState(false)
  const [showResetPwd, setShowResetPwd] = useState(false)
  const [pwdValue, setPwdValue] = useState("")
  const [resetPwdValue, setResetPwdValue] = useState("")

  useEffect(() => {
    const m = searchParams.get("mode") as Mode | null
    if (m === "register" || m === "forgot" || m === "reset") setMode(m)
  }, [searchParams])

  function go(m: Mode) {
    setAuthError("")
    setMode(m)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  async function handleGoogleAuth() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  // ── Login form
  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", remember: true },
  })
  async function onLogin(data: LoginData) {
    setLoading(true)
    setAuthError("")
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })
    if (error) {
      setAuthError(
        error.message === "Invalid login credentials"
          ? "Email ou mot de passe incorrect."
          : error.message
      )
      setLoading(false)
      return
    }
    const redirectTo = searchParams.get("redirectTo") ?? "/"
    router.push(redirectTo)
  }

  // ── Register form
  const registerForm = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { prenom: "", nom: "", email: "", phone: "", password: "", cgu: undefined, newsletter: false },
  })
  async function onRegister(data: RegisterData) {
    setLoading(true)
    setAuthError("")
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { full_name: `${data.prenom} ${data.nom}`, phone: data.phone },
      },
    })
    if (error) {
      setAuthError(
        error.message.toLowerCase().includes("already registered")
          ? "Un compte existe déjà avec cet email."
          : error.message
      )
      setLoading(false)
      return
    }
    setLoading(false)
    setSuccessTitle("Vérifiez vos mails.")
    setSuccessText("Un lien de confirmation vient de partir. Cliquez dessus pour activer votre compte et accéder à votre espace.")
    go("success")
  }

  // ── Forgot form
  const forgotForm = useForm<ForgotData>({ resolver: zodResolver(forgotSchema) })
  async function onForgot(data: ForgotData) {
    setLoading(true)
    setAuthError("")
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/login?mode=reset")}`,
    })
    if (error) {
      setAuthError(error.message)
      setLoading(false)
      return
    }
    setLoading(false)
    setSuccessTitle("C'est parti.")
    setSuccessText("Un lien vient de partir vers votre adresse. Pensez à vérifier vos spams.")
    go("success")
  }

  // ── Reset password form
  const resetForm = useForm<ResetData>({ resolver: zodResolver(resetSchema) })
  async function onReset(data: ResetData) {
    setLoading(true)
    setAuthError("")
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: data.password })
    if (error) {
      setAuthError(error.message)
      setLoading(false)
      return
    }
    setLoading(false)
    router.push("/compte")
  }

  const strength = passwordStrength(pwdValue)
  const resetStrength = passwordStrength(resetPwdValue)

  return (
    <>
      <style>{`
        @keyframes nebula { 0%{transform:scale(1) translateZ(0)} 100%{transform:scale(1.15) translate3d(-30px,20px,0)} }
        @keyframes floatY { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-24px)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.6} }
        @keyframes panelIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
        @keyframes pop { from{transform:scale(.4);opacity:0} }
        .float-label {}
        .ifld-wrap input:focus ~ .float-label,
        .ifld-wrap input:not(:placeholder-shown) ~ .float-label {
          top: 0 !important; left: 12px !important;
          font-size: 10.5px !important; letter-spacing: .18em !important;
          text-transform: uppercase !important; color: var(--terra) !important;
          background: #fff !important;
        }
      `}</style>

      <div style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "1fr 540px", background: "var(--paper)" }}
        className="auth-grid">
        <style>{`@media(max-width:980px){.auth-grid{grid-template-columns:1fr!important}.auth-aside-wrap{display:none!important}}`}</style>

        <div className="auth-aside-wrap">
          <Aside />
        </div>

        {/* RIGHT — form panel */}
        <main style={{
          padding: "56px 72px 48px", overflowY: "auto",
          display: "flex", flexDirection: "column", minHeight: "100vh",
          fontFamily: "var(--sans)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, color: "var(--mute)" }}>
            <Link href="/" style={{
              color: "var(--ink)", textDecoration: "none",
              display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13,
              transition: "color .25s",
            }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--terra)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--ink)")}
            >
              <span>←</span> Retour à l'accueil
            </Link>
            <span>Besoin d'aide ? <a href="mailto:contact@labulledevie.fr" style={{ color: "var(--terra)", textDecoration: "none" }}>contact@labulledevie.fr</a></span>
          </div>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: 420, margin: "60px auto", width: "100%" }}>

            {/* LOGIN PANEL */}
            {mode === "login" && (
              <div style={{ animation: "panelIn .5s ease" }}>
                <span className="eyebrow">Bon retour</span>
                <h1 style={{ fontFamily: "var(--serif)", fontSize: "clamp(36px,3.6vw,48px)", lineHeight: 1.02, fontWeight: 400, marginTop: 14, marginBottom: 14 }}>
                  Se <span style={{ color: "var(--terra)", fontStyle: "italic" }}>connecter.</span>
                </h1>
                <p style={{ fontSize: 15, color: "var(--mute)", marginBottom: 32, lineHeight: 1.55 }}>
                  Retrouvez vos rendez‑vous et votre historique en quelques secondes.
                </p>

                <TabPill mode="login" onSwitch={go} />
                <GoogleButton label="Continuer avec Google" onClick={handleGoogleAuth} />
                <OrSep />

                <form onSubmit={loginForm.handleSubmit(onLogin)} noValidate style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div className="ifld-wrap" style={{ position: "relative" }}>
                    <div style={{ position: "relative" }}>
                      <span style={{ position: "absolute", left: 16, top: 27, transform: "translateY(-50%)", color: "var(--mute)", pointerEvents: "none", display: "flex" }}><IconEmail /></span>
                      <input
                        id="loginEmail" type="email" placeholder=" " autoComplete="email"
                        {...loginForm.register("email")}
                        style={{
                          width: "100%", height: 54, padding: "0 16px 0 46px",
                          border: `1px solid ${loginForm.formState.errors.email ? "#C95555" : "var(--line)"}`,
                          borderRadius: 10, background: "#fff", fontFamily: "var(--sans)", fontSize: 15, color: "var(--ink)", outline: "none",
                        }}
                      />
                      <label htmlFor="loginEmail" className="float-label" style={{
                        position: "absolute", left: 46, top: 27, transform: "translateY(-50%)",
                        fontSize: 15, color: "var(--mute)", pointerEvents: "none",
                        transition: "all .2s ease", background: "transparent", padding: "0 4px", lineHeight: 1,
                      }}>Adresse e‑mail</label>
                    </div>
                    {loginForm.formState.errors.email && <p style={{ fontSize: 11.5, color: "#C95555", marginTop: 4, marginLeft: 4 }}>{loginForm.formState.errors.email.message}</p>}
                  </div>

                  <div className="ifld-wrap" style={{ position: "relative" }}>
                    <div style={{ position: "relative" }}>
                      <span style={{ position: "absolute", left: 16, top: 27, transform: "translateY(-50%)", color: "var(--mute)", pointerEvents: "none", display: "flex" }}><IconLock /></span>
                      <input
                        id="loginPwd" type={showLoginPwd ? "text" : "password"} placeholder=" " autoComplete="current-password"
                        {...loginForm.register("password")}
                        style={{
                          width: "100%", height: 54, padding: "0 46px 0 46px",
                          border: `1px solid ${loginForm.formState.errors.password ? "#C95555" : "var(--line)"}`,
                          borderRadius: 10, background: "#fff", fontFamily: "var(--sans)", fontSize: 15, color: "var(--ink)", outline: "none",
                        }}
                      />
                      <label htmlFor="loginPwd" className="float-label" style={{
                        position: "absolute", left: 46, top: 27, transform: "translateY(-50%)",
                        fontSize: 15, color: "var(--mute)", pointerEvents: "none",
                        transition: "all .2s ease", background: "transparent", padding: "0 4px", lineHeight: 1,
                      }}>Mot de passe</label>
                      <button type="button" onClick={() => setShowLoginPwd(v => !v)}
                        style={{ position: "absolute", right: 12, top: 27, transform: "translateY(-50%)", background: "transparent", border: "none", cursor: "pointer", color: showLoginPwd ? "var(--terra)" : "var(--mute)", padding: 4, lineHeight: 0 }}>
                        <EyeIcon open={showLoginPwd} />
                      </button>
                    </div>
                    {loginForm.formState.errors.password && <p style={{ fontSize: 11.5, color: "#C95555", marginTop: 4, marginLeft: 4 }}>{loginForm.formState.errors.password.message}</p>}
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                    <label style={{ display: "flex", gap: 12, alignItems: "center", cursor: "pointer", fontSize: 13, color: "var(--ink-soft)" }}>
                      <input type="checkbox" {...loginForm.register("remember")} defaultChecked style={{ display: "none" }} />
                      <span style={{
                        width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                        border: "1.5px solid var(--line)", background: "#fff", position: "relative",
                      }} />
                      Se souvenir de moi
                    </label>
                    <button type="button" onClick={() => go("forgot")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--terra)", fontSize: 13 }}>
                      Mot de passe oublié ?
                    </button>
                  </div>

                  {authError && (
                    <p style={{ fontSize: 13, color: "#C95555", background: "#C9555510", border: "1px solid #C9555530", borderRadius: 8, padding: "10px 14px" }}>
                      {authError}
                    </p>
                  )}
                  <div style={{ marginTop: 8 }}>
                    <SubmitBtn label="Se connecter" loading={loading} />
                  </div>
                </form>

                <p style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: "var(--mute)" }}>
                  Première bulle ?{" "}
                  <button type="button" onClick={() => go("register")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--terra)", fontWeight: 500, fontSize: 13 }}>
                    Créer un compte →
                  </button>
                </p>
              </div>
            )}

            {/* REGISTER PANEL */}
            {mode === "register" && (
              <div style={{ animation: "panelIn .5s ease" }}>
                <span className="eyebrow">Bienvenue</span>
                <h1 style={{ fontFamily: "var(--serif)", fontSize: "clamp(36px,3.6vw,48px)", lineHeight: 1.02, fontWeight: 400, marginTop: 14, marginBottom: 14 }}>
                  Créer <span style={{ color: "var(--terra)", fontStyle: "italic" }}>votre bulle.</span>
                </h1>
                <p style={{ fontSize: 15, color: "var(--mute)", marginBottom: 32, lineHeight: 1.55 }}>
                  Quelques secondes pour ouvrir votre espace. Et un cadeau de bienvenue :{" "}
                  <strong style={{ color: "var(--terra)" }}>‑20 % sur votre première séance signature</strong>.
                </p>

                <TabPill mode="register" onSwitch={go} />
                <GoogleButton label="S'inscrire avec Google" onClick={handleGoogleAuth} />
                <OrSep />

                <form onSubmit={registerForm.handleSubmit(onRegister)} noValidate style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* Prénom + Nom */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    {(["prenom", "nom"] as const).map((field) => (
                      <div key={field} className="ifld-wrap" style={{ position: "relative" }}>
                        <div style={{ position: "relative" }}>
                          <input
                            id={field} type="text" placeholder=" " autoComplete={field === "prenom" ? "given-name" : "family-name"}
                            {...registerForm.register(field)}
                            style={{
                              width: "100%", height: 54, padding: "0 16px",
                              border: `1px solid ${registerForm.formState.errors[field] ? "#C95555" : "var(--line)"}`,
                              borderRadius: 10, background: "#fff", fontFamily: "var(--sans)", fontSize: 15, color: "var(--ink)", outline: "none",
                            }}
                          />
                          <label htmlFor={field} className="float-label" style={{
                            position: "absolute", left: 16, top: 27, transform: "translateY(-50%)",
                            fontSize: 15, color: "var(--mute)", pointerEvents: "none",
                            transition: "all .2s ease", background: "transparent", padding: "0 4px", lineHeight: 1,
                          }}>{field === "prenom" ? "Prénom" : "Nom"}</label>
                        </div>
                        {registerForm.formState.errors[field] && <p style={{ fontSize: 11.5, color: "#C95555", marginTop: 4 }}>{registerForm.formState.errors[field]?.message}</p>}
                      </div>
                    ))}
                  </div>

                  {/* Email */}
                  <div className="ifld-wrap" style={{ position: "relative" }}>
                    <div style={{ position: "relative" }}>
                      <span style={{ position: "absolute", left: 16, top: 27, transform: "translateY(-50%)", color: "var(--mute)", pointerEvents: "none", display: "flex" }}><IconEmail /></span>
                      <input id="rEmail" type="email" placeholder=" " autoComplete="email"
                        {...registerForm.register("email")}
                        style={{ width: "100%", height: 54, padding: "0 16px 0 46px", border: `1px solid ${registerForm.formState.errors.email ? "#C95555" : "var(--line)"}`, borderRadius: 10, background: "#fff", fontFamily: "var(--sans)", fontSize: 15, color: "var(--ink)", outline: "none" }}
                      />
                      <label htmlFor="rEmail" className="float-label" style={{ position: "absolute", left: 46, top: 27, transform: "translateY(-50%)", fontSize: 15, color: "var(--mute)", pointerEvents: "none", transition: "all .2s ease", background: "transparent", padding: "0 4px", lineHeight: 1 }}>Adresse e‑mail</label>
                    </div>
                    {registerForm.formState.errors.email && <p style={{ fontSize: 11.5, color: "#C95555", marginTop: 4, marginLeft: 4 }}>{registerForm.formState.errors.email.message}</p>}
                  </div>

                  {/* Phone */}
                  <div className="ifld-wrap" style={{ position: "relative" }}>
                    <div style={{ position: "relative" }}>
                      <span style={{ position: "absolute", left: 16, top: 27, transform: "translateY(-50%)", color: "var(--mute)", pointerEvents: "none", display: "flex" }}><IconPhone /></span>
                      <input id="rPhone" type="tel" placeholder=" " autoComplete="tel"
                        {...registerForm.register("phone")}
                        style={{ width: "100%", height: 54, padding: "0 16px 0 46px", border: `1px solid ${registerForm.formState.errors.phone ? "#C95555" : "var(--line)"}`, borderRadius: 10, background: "#fff", fontFamily: "var(--sans)", fontSize: 15, color: "var(--ink)", outline: "none" }}
                      />
                      <label htmlFor="rPhone" className="float-label" style={{ position: "absolute", left: 46, top: 27, transform: "translateY(-50%)", fontSize: 15, color: "var(--mute)", pointerEvents: "none", transition: "all .2s ease", background: "transparent", padding: "0 4px", lineHeight: 1 }}>Téléphone</label>
                    </div>
                    <p style={{ fontSize: 11.5, color: "var(--mute)", marginTop: 6, marginLeft: 4 }}>Pour les rappels de vos rendez‑vous. Jamais partagé.</p>
                    {registerForm.formState.errors.phone && <p style={{ fontSize: 11.5, color: "#C95555", marginTop: 2, marginLeft: 4 }}>{registerForm.formState.errors.phone.message}</p>}
                  </div>

                  {/* Password */}
                  <div className="ifld-wrap" style={{ position: "relative" }}>
                    <div style={{ position: "relative" }}>
                      <span style={{ position: "absolute", left: 16, top: 27, transform: "translateY(-50%)", color: "var(--mute)", pointerEvents: "none", display: "flex" }}><IconLock /></span>
                      <input id="rPwd" type={showRegPwd ? "text" : "password"} placeholder=" " autoComplete="new-password"
                        {...registerForm.register("password", {
                          onChange: (e) => setPwdValue(e.target.value),
                        })}
                        style={{ width: "100%", height: 54, padding: "0 46px 0 46px", border: `1px solid ${registerForm.formState.errors.password ? "#C95555" : "var(--line)"}`, borderRadius: 10, background: "#fff", fontFamily: "var(--sans)", fontSize: 15, color: "var(--ink)", outline: "none" }}
                      />
                      <label htmlFor="rPwd" className="float-label" style={{ position: "absolute", left: 46, top: 27, transform: "translateY(-50%)", fontSize: 15, color: "var(--mute)", pointerEvents: "none", transition: "all .2s ease", background: "transparent", padding: "0 4px", lineHeight: 1 }}>Mot de passe</label>
                      <button type="button" onClick={() => setShowRegPwd(v => !v)}
                        style={{ position: "absolute", right: 12, top: 27, transform: "translateY(-50%)", background: "transparent", border: "none", cursor: "pointer", color: showRegPwd ? "var(--terra)" : "var(--mute)", padding: 4, lineHeight: 0 }}>
                        <EyeIcon open={showRegPwd} />
                      </button>
                    </div>
                    {/* Strength meter */}
                    {pwdValue && (
                      <>
                        <div style={{ display: "flex", gap: 4, marginTop: 8, padding: "0 4px" }}>
                          {[1, 2, 3, 4].map((i) => (
                            <span key={i} style={{
                              flex: 1, height: 3, borderRadius: 99,
                              background: i <= strength ? strengthColors[strength] : "var(--line)",
                              transition: "background .4s ease",
                            }} />
                          ))}
                        </div>
                        <p style={{ fontSize: 11, color: strengthColors[strength] || "var(--mute)", letterSpacing: ".04em", marginTop: 6, padding: "0 4px" }}>
                          {strengthLabels[strength]}
                        </p>
                      </>
                    )}
                    {registerForm.formState.errors.password && <p style={{ fontSize: 11.5, color: "#C95555", marginTop: 4, marginLeft: 4 }}>{registerForm.formState.errors.password.message}</p>}
                  </div>

                  {/* CGU */}
                  <label style={{ display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer", fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.5, padding: "4px 0", marginTop: 8 }}>
                    <input type="checkbox" {...registerForm.register("cgu")} style={{ display: "none" }} />
                    <span style={{
                      width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 1,
                      border: "1.5px solid var(--line)", background: "#fff", position: "relative",
                    }} />
                    <span>J'accepte les <Link href="#" style={{ color: "var(--terra)", textDecoration: "underline", textUnderlineOffset: 3 }}>CGU</Link> et la <Link href="#" style={{ color: "var(--terra)", textDecoration: "underline", textUnderlineOffset: 3 }}>politique de confidentialité</Link>.</span>
                  </label>
                  {registerForm.formState.errors.cgu && <p style={{ fontSize: 11.5, color: "#C95555", marginTop: -8, marginLeft: 4 }}>Vous devez accepter les CGU</p>}

                  <label style={{ display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer", fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.5, padding: "4px 0" }}>
                    <input type="checkbox" {...registerForm.register("newsletter")} style={{ display: "none" }} />
                    <span style={{
                      width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 1,
                      border: "1.5px solid var(--line)", background: "#fff", position: "relative",
                    }} />
                    <span>Recevoir les nouvelles douces de la bulle (1 fois par mois, max).</span>
                  </label>

                  {authError && (
                    <p style={{ fontSize: 13, color: "#C95555", background: "#C9555510", border: "1px solid #C9555530", borderRadius: 8, padding: "10px 14px" }}>
                      {authError}
                    </p>
                  )}
                  <div style={{ marginTop: 12 }}>
                    <SubmitBtn label="Créer mon compte" loading={loading} />
                  </div>
                </form>

                <p style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: "var(--mute)" }}>
                  Déjà parmi nous ?{" "}
                  <button type="button" onClick={() => go("login")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--terra)", fontWeight: 500, fontSize: 13 }}>
                    Se connecter →
                  </button>
                </p>
              </div>
            )}

            {/* FORGOT PANEL */}
            {mode === "forgot" && (
              <div style={{ animation: "panelIn .5s ease" }}>
                <span className="eyebrow">Mot de passe</span>
                <h1 style={{ fontFamily: "var(--serif)", fontSize: "clamp(36px,3.6vw,48px)", lineHeight: 1.02, fontWeight: 400, marginTop: 14, marginBottom: 14 }}>
                  Rien <span style={{ color: "var(--terra)", fontStyle: "italic" }}>de grave.</span>
                </h1>
                <p style={{ fontSize: 15, color: "var(--mute)", marginBottom: 32, lineHeight: 1.55 }}>
                  Indiquez votre adresse, je vous envoie un lien pour redéfinir votre mot de passe.
                </p>

                <form onSubmit={forgotForm.handleSubmit(onForgot)} noValidate style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div className="ifld-wrap" style={{ position: "relative" }}>
                    <div style={{ position: "relative" }}>
                      <span style={{ position: "absolute", left: 16, top: 27, transform: "translateY(-50%)", color: "var(--mute)", pointerEvents: "none", display: "flex" }}><IconEmail /></span>
                      <input id="forgotEmail" type="email" placeholder=" " autoComplete="email"
                        {...forgotForm.register("email")}
                        style={{ width: "100%", height: 54, padding: "0 16px 0 46px", border: `1px solid ${forgotForm.formState.errors.email ? "#C95555" : "var(--line)"}`, borderRadius: 10, background: "#fff", fontFamily: "var(--sans)", fontSize: 15, color: "var(--ink)", outline: "none" }}
                      />
                      <label htmlFor="forgotEmail" className="float-label" style={{ position: "absolute", left: 46, top: 27, transform: "translateY(-50%)", fontSize: 15, color: "var(--mute)", pointerEvents: "none", transition: "all .2s ease", background: "transparent", padding: "0 4px", lineHeight: 1 }}>Adresse e‑mail</label>
                    </div>
                    {forgotForm.formState.errors.email && <p style={{ fontSize: 11.5, color: "#C95555", marginTop: 4, marginLeft: 4 }}>{forgotForm.formState.errors.email.message}</p>}
                  </div>
                  {authError && (
                    <p style={{ fontSize: 13, color: "#C95555", background: "#C9555510", border: "1px solid #C9555530", borderRadius: 8, padding: "10px 14px" }}>
                      {authError}
                    </p>
                  )}
                  <div style={{ marginTop: 8 }}>
                    <SubmitBtn label="Envoyer le lien" loading={loading} />
                  </div>
                </form>

                <p style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: "var(--mute)" }}>
                  <button type="button" onClick={() => go("login")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--terra)", fontWeight: 500, fontSize: 13 }}>
                    ← Retour à la connexion
                  </button>
                </p>
              </div>
            )}

            {/* RESET PASSWORD PANEL */}
            {mode === "reset" && (
              <div style={{ animation: "panelIn .5s ease" }}>
                <span className="eyebrow">Nouveau mot de passe</span>
                <h1 style={{ fontFamily: "var(--serif)", fontSize: "clamp(36px,3.6vw,48px)", lineHeight: 1.02, fontWeight: 400, marginTop: 14, marginBottom: 14 }}>
                  Choisissez <span style={{ color: "var(--terra)", fontStyle: "italic" }}>votre nouveau</span> mot de passe.
                </h1>
                <p style={{ fontSize: 15, color: "var(--mute)", marginBottom: 32, lineHeight: 1.55 }}>
                  Choisissez un mot de passe solide. Vous serez redirigé vers votre espace une fois confirmé.
                </p>

                <form onSubmit={resetForm.handleSubmit(onReset)} noValidate style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* New password */}
                  <div className="ifld-wrap" style={{ position: "relative" }}>
                    <div style={{ position: "relative" }}>
                      <span style={{ position: "absolute", left: 16, top: 27, transform: "translateY(-50%)", color: "var(--mute)", pointerEvents: "none", display: "flex" }}><IconLock /></span>
                      <input id="resetPwd" type={showResetPwd ? "text" : "password"} placeholder=" " autoComplete="new-password"
                        {...resetForm.register("password", { onChange: (e) => setResetPwdValue(e.target.value) })}
                        style={{ width: "100%", height: 54, padding: "0 46px 0 46px", border: `1px solid ${resetForm.formState.errors.password ? "#C95555" : "var(--line)"}`, borderRadius: 10, background: "#fff", fontFamily: "var(--sans)", fontSize: 15, color: "var(--ink)", outline: "none" }}
                      />
                      <label htmlFor="resetPwd" className="float-label" style={{ position: "absolute", left: 46, top: 27, transform: "translateY(-50%)", fontSize: 15, color: "var(--mute)", pointerEvents: "none", transition: "all .2s ease", background: "transparent", padding: "0 4px", lineHeight: 1 }}>Nouveau mot de passe</label>
                      <button type="button" onClick={() => setShowResetPwd(v => !v)}
                        style={{ position: "absolute", right: 12, top: 27, transform: "translateY(-50%)", background: "transparent", border: "none", cursor: "pointer", color: showResetPwd ? "var(--terra)" : "var(--mute)", padding: 4, lineHeight: 0 }}>
                        <EyeIcon open={showResetPwd} />
                      </button>
                    </div>
                    {resetPwdValue && (
                      <>
                        <div style={{ display: "flex", gap: 4, marginTop: 8, padding: "0 4px" }}>
                          {[1, 2, 3, 4].map((i) => (
                            <span key={i} style={{
                              flex: 1, height: 3, borderRadius: 99,
                              background: i <= resetStrength ? strengthColors[resetStrength] : "var(--line)",
                              transition: "background .4s ease",
                            }} />
                          ))}
                        </div>
                        <p style={{ fontSize: 11, color: strengthColors[resetStrength] || "var(--mute)", letterSpacing: ".04em", marginTop: 6, padding: "0 4px" }}>
                          {strengthLabels[resetStrength]}
                        </p>
                      </>
                    )}
                    {resetForm.formState.errors.password && <p style={{ fontSize: 11.5, color: "#C95555", marginTop: 4, marginLeft: 4 }}>{resetForm.formState.errors.password.message}</p>}
                  </div>

                  {/* Confirm password */}
                  <div className="ifld-wrap" style={{ position: "relative" }}>
                    <div style={{ position: "relative" }}>
                      <span style={{ position: "absolute", left: 16, top: 27, transform: "translateY(-50%)", color: "var(--mute)", pointerEvents: "none", display: "flex" }}><IconLock /></span>
                      <input id="resetConfirm" type={showResetPwd ? "text" : "password"} placeholder=" " autoComplete="new-password"
                        {...resetForm.register("confirm")}
                        style={{ width: "100%", height: 54, padding: "0 16px 0 46px", border: `1px solid ${resetForm.formState.errors.confirm ? "#C95555" : "var(--line)"}`, borderRadius: 10, background: "#fff", fontFamily: "var(--sans)", fontSize: 15, color: "var(--ink)", outline: "none" }}
                      />
                      <label htmlFor="resetConfirm" className="float-label" style={{ position: "absolute", left: 46, top: 27, transform: "translateY(-50%)", fontSize: 15, color: "var(--mute)", pointerEvents: "none", transition: "all .2s ease", background: "transparent", padding: "0 4px", lineHeight: 1 }}>Confirmer le mot de passe</label>
                    </div>
                    {resetForm.formState.errors.confirm && <p style={{ fontSize: 11.5, color: "#C95555", marginTop: 4, marginLeft: 4 }}>{resetForm.formState.errors.confirm.message}</p>}
                  </div>

                  {authError && (
                    <p style={{ fontSize: 13, color: "#C95555", background: "#C9555510", border: "1px solid #C9555530", borderRadius: 8, padding: "10px 14px" }}>
                      {authError}
                    </p>
                  )}
                  <div style={{ marginTop: 8 }}>
                    <SubmitBtn label="Définir mon mot de passe" loading={loading} />
                  </div>
                </form>
              </div>
            )}

            {/* SUCCESS PANEL */}
            {mode === "success" && (
              <div style={{ animation: "panelIn .5s ease", textAlign: "center", padding: "40px 0" }}>
                <div style={{
                  width: 80, height: 80, borderRadius: "50%", background: "var(--terra)", color: "#fff",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  fontSize: 36, marginBottom: 24,
                  boxShadow: "0 18px 40px -12px var(--terra)",
                  animation: "pop .6s cubic-bezier(.2,1.4,.4,1) backwards",
                }}>✓</div>
                <h2 style={{ fontFamily: "var(--serif)", fontSize: 32, lineHeight: 1.1, marginBottom: 14, fontWeight: 400 }}
                  dangerouslySetInnerHTML={{ __html: successTitle }} />
                <p style={{ fontSize: 15, lineHeight: 1.6, maxWidth: 340, margin: "0 auto 28px", color: "var(--mute)" }}>{successText}</p>
                <Link href="/" style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10,
                  padding: "16px 20px", borderRadius: 10, background: "var(--ink)", color: "#fff",
                  fontFamily: "var(--sans)", fontSize: 15, fontWeight: 500, textDecoration: "none",
                  maxWidth: 280, width: "100%",
                }}>
                  <span>Entrer dans mon espace</span> <span>→</span>
                </Link>
                <p style={{ marginTop: 24, fontSize: 13, color: "var(--mute)" }}>
                  ou <Link href="/booking" style={{ color: "var(--terra)", textDecoration: "none" }}>réserver une séance →</Link>
                </p>
              </div>
            )}

          </div>

          <p style={{ fontSize: 12, color: "var(--mute)", textAlign: "center", marginTop: 32 }}>
            © 2026 La bulle de vie ·{" "}
            {["Mentions", "Confidentialité", "Cookies"].map((l, i) => (
              <span key={l}><Link href="#" style={{ color: "var(--mute)", textDecoration: "none" }}>{l}</Link>{i < 2 ? " · " : ""}</span>
            ))}
          </p>
        </main>
      </div>

    </>
  )
}
