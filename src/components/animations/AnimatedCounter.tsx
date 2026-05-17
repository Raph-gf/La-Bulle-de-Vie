"use client"
import { useEffect, useRef, useState } from "react"
import { useInView } from "motion/react"

interface Props {
  value: number
  decimals?: number
  suffix?: string
}

export default function AnimatedCounter({ value, decimals = 0, suffix }: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-40px" })
  const [display, setDisplay] = useState("0")

  useEffect(() => {
    if (!isInView) return
    const dur = 1400
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1)
      const ease = 1 - Math.pow(1 - p, 3)
      setDisplay((value * ease).toFixed(decimals))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [isInView, value, decimals])

  return (
    <span ref={ref}>
      {display}{suffix}
    </span>
  )
}
