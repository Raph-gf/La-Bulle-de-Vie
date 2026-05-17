"use client"
import { useEffect, useRef } from "react"

export default function Counter() {
  const init = useRef(false)
  useEffect(() => {
    if (init.current) return
    init.current = true
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return
        const el = e.target as HTMLElement
        const target = parseFloat(el.dataset.count || "0")
        const isFloat = target % 1 !== 0
        const dur = 1400
        const start = performance.now()
        const tick = (now: number) => {
          const p = Math.min((now - start) / dur, 1)
          const ease = 1 - Math.pow(1 - p, 3)
          const val = target * ease
          el.textContent = isFloat ? val.toFixed(1) : Math.round(val).toString()
          if (p < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
        io.unobserve(el)
      })
    }, { threshold: 0.5 })
    document.querySelectorAll("[data-count]").forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])
  return null
}
