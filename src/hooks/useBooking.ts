"use client"

import { useState } from "react"
import type { BookingInput } from "@/lib/validations/booking"

export function useBooking() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createBooking = async (data: BookingInput) => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!res.ok) throw new Error("Erreur lors de la réservation")

      return await res.json()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue")
    } finally {
      setLoading(false)
    }
  }

  return { createBooking, loading, error }
}
