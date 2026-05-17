"use client"
import { useEffect, useRef } from "react"

export default function ScrollReveal() {
  const init = useRef(false)
  useEffect(() => {
    if (init.current) return
    init.current = true
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add("revealed")
          io.unobserve(e.target)
        }
      })
    }, { threshold: 0.12 })
    document.querySelectorAll(".reveal").forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])
  return null
}
