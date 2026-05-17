"use client"
import { motion } from "motion/react"
import { type ReactNode } from "react"

interface RevealProps {
  children: ReactNode
  delay?: number
  className?: string
  style?: React.CSSProperties
  as?: keyof typeof motion
}

export default function Reveal({ children, delay = 0, className, style }: RevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.1, 0.25, 1] }}
      viewport={{ once: true, margin: "-40px" }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  )
}
