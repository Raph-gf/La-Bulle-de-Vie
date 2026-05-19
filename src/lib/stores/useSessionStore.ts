import { create } from "zustand"

interface SessionStore {
  userName: string
  role: "specialist" | "client"
  // Count of items needing attention (pending reviews + pending appointments)
  pendingCount: number
  setUser: (name: string, role: "specialist" | "client") => void
  setPendingCount: (n: number) => void
  incrementPending: () => void
  decrementPending: () => void
}

export const useSessionStore = create<SessionStore>((set) => ({
  userName: "",
  role: "client",
  pendingCount: 0,
  setUser: (userName, role) => set({ userName, role }),
  setPendingCount: (pendingCount) => set({ pendingCount }),
  incrementPending: () => set((s) => ({ pendingCount: s.pendingCount + 1 })),
  decrementPending: () => set((s) => ({ pendingCount: Math.max(0, s.pendingCount - 1) })),
}))
