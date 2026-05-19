"use client"
import { useEffect } from "react"
import { useSessionStore } from "@/lib/stores/useSessionStore"

interface Props {
  userName: string
  role: "specialist" | "client"
  pendingCount: number
}

export function SessionInitializer({ userName, role, pendingCount }: Props) {
  const setUser = useSessionStore((s) => s.setUser)
  const setPendingCount = useSessionStore((s) => s.setPendingCount)

  useEffect(() => {
    setUser(userName, role)
    setPendingCount(pendingCount)
  }, [userName, role, pendingCount, setUser, setPendingCount])

  return null
}
