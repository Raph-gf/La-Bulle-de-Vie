"use client"
import { useEffect, useRef, useState } from "react"

const MESSAGES = [
  "On souffle quelques bulles…",
  "On allume une bougie pour vous…",
  "On prépare votre cocon…",
  "On choisit la bonne huile…",
  "On accorde la musique…",
  "On vous installe en douceur…",
]

const SATS = [
  { size: 18, delay: 0.6,  tx: -50, ty: -100 },
  { size: 14, delay: 1.2,  tx:  60, ty: -110 },
  { size: 22, delay: 1.8,  tx: -30, ty: -130 },
  { size: 12, delay: 2.4,  tx:  80, ty:  -90 },
  { size: 16, delay: 3.0,  tx: -80, ty: -120 },
]

export default function LoadingScreen() {
  const fieldRef  = useRef<HTMLDivElement>(null)
  const msgRef    = useRef<HTMLDivElement>(null)
  const [pct, setPct] = useState(0)

  /* Ambient floating bubbles */
  useEffect(() => {
    const field = fieldRef.current
    if (!field) return

    function makeBubble(initial = false) {
      const b = document.createElement("div")
      b.className = "ld-bub"
      const size = 16 + Math.random() * 90
      b.style.width = b.style.height = size + "px"
      b.style.left = Math.random() * 100 + "vw"
      const dur = 14 + Math.random() * 18
      b.style.animationDuration = `${dur}s, ${4 + Math.random() * 4}s`
      if (initial) b.style.animationDelay = `-${Math.random() * dur}s, -${Math.random() * 5}s`
      b.style.setProperty("--ldx", ((Math.random() * 240 - 120) | 0) + "px")
      field!.appendChild(b)
      setTimeout(() => b.remove(), dur * 1000)
    }

    for (let i = 0; i < 14; i++) makeBubble(true)
    const iv = setInterval(() => makeBubble(false), 1100)
    return () => { clearInterval(iv); field.innerHTML = "" }
  }, [])

  /* Rotating messages */
  useEffect(() => {
    const el = msgRef.current
    if (!el) return
    let mi = 0
    const iv = setInterval(() => {
      const cur = el.querySelector(".ld-msg-line.in") as HTMLElement | null
      if (cur) {
        cur.classList.remove("in")
        cur.classList.add("out")
        setTimeout(() => cur.remove(), 600)
      }
      mi = (mi + 1) % MESSAGES.length
      const next = document.createElement("div")
      next.className = "ld-msg-line"
      next.textContent = MESSAGES[mi]
      el.appendChild(next)
      requestAnimationFrame(() => next.classList.add("in"))
    }, 2400)
    return () => clearInterval(iv)
  }, [])

  /* Fake progress — eases toward 95, never quite arrives */
  useEffect(() => {
    let p = 0
    const iv = setInterval(() => {
      p += (96 - p) * 0.04 + Math.random() * 0.6
      if (p > 95) p = 95
      setPct(Math.floor(p))
    }, 220)
    return () => clearInterval(iv)
  }, [])

  return (
    <div className="ld-root">
      <div className="ld-bub-field" ref={fieldRef} />

      <div className="ld-center">
        {/* Brand */}
        <div className="ld-brand">
          <span className="ld-brand-dot" />
          <span className="ld-brand-name">La bulle de vie</span>
        </div>

        {/* Bubble blower */}
        <div className="ld-stage">
          <div className="ld-rings">
            <div className="ld-ring" />
            <div className="ld-ring" />
            <div className="ld-ring" />
          </div>

          <div className="ld-main-bubble" />

          {SATS.map((s, i) => (
            <div
              key={i}
              className="ld-sat"
              style={{
                width:  s.size,
                height: s.size,
                marginTop:  -s.size / 2,
                marginLeft: -s.size / 2,
                animationDelay: `${s.delay}s`,
                ["--tx" as string]: `${s.tx}px`,
                ["--ty" as string]: `${s.ty}px`,
              }}
            />
          ))}
        </div>

        {/* Text */}
        <h1 className="ld-title">
          Un instant,{" "}
          <span className="ld-title-italic">on s&apos;installe.</span>
        </h1>

        <div className="ld-msg" ref={msgRef}>
          <div className="ld-msg-line in">{MESSAGES[0]}</div>
        </div>

        {/* Progress */}
        <div className="ld-track">
          <div className="ld-track-fill" />
        </div>
        <div className="ld-percent">{pct} %</div>
      </div>

      <div className="ld-tip">
        <em>« Le calme, c&apos;est ce qui reste quand on cesse de courir. »</em>
      </div>
    </div>
  )
}
