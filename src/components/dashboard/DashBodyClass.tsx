"use client"
import { useEffect } from "react"

export default function DashBodyClass() {
  useEffect(() => {
    document.body.classList.add("dash")
    return () => document.body.classList.remove("dash")
  }, [])
  return null
}
