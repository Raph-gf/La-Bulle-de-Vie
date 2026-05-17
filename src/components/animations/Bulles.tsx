"use client"
import { useEffect } from "react"

export default function Bulles() {
  useEffect(() => {
    const container = document.getElementById("bulles")
    if (!container) return
    for (let i = 0; i < 14; i++) {
      const b = document.createElement("div")
      b.className = "bulle"
      const size = 30 + Math.random() * 120
      b.style.cssText = `
        width:${size}px; height:${size}px;
        left:${Math.random() * 100}%;
        --dx:${(Math.random() - 0.5) * 200}px;
        animation-duration:${8 + Math.random() * 16}s;
        animation-delay:${Math.random() * -20}s;
      `
      container.appendChild(b)
    }
  }, [])
  return <div className="bulles" id="bulles" />
}
