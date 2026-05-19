import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

export type Appt = {
  id: string
  status: string
  location: string
  clientAddress: string | null
  notes: string | null
  isFirstVisit: boolean
  guestName: string | null
  guestEmail: string | null
  client: { fullName: string } | null
  service: { name: string; durationMinutes: number; price: number }
  slot: { date: string; startTime: string }
}

async function fetchAppointments(from?: string, to?: string): Promise<Appt[]> {
  const params = new URLSearchParams()
  if (from) params.set("from", from)
  if (to) params.set("to", to)
  const res = await fetch(`/api/dashboard/appointments?${params}`)
  if (!res.ok) throw new Error("Erreur serveur")
  const data = await res.json()
  return data.appointments ?? []
}

export function useAppointments(from?: string, to?: string) {
  return useQuery({
    queryKey: ["appointments", from ?? "all", to ?? "all"],
    queryFn: () => fetchAppointments(from, to),
  })
}

export function useWeekAppointments(weekStart: string, weekEnd: string) {
  return useQuery({
    queryKey: ["appointments", "week", weekStart],
    queryFn: () => fetchAppointments(weekStart, weekEnd),
  })
}

export function useTodayAppointments(todayISO: string, tomorrowISO: string) {
  return useQuery({
    queryKey: ["appointments", "today", todayISO],
    queryFn: () => fetchAppointments(todayISO, tomorrowISO),
    // Today's data stays fresh for 2 minutes
    staleTime: 2 * 60_000,
  })
}

// Confirm an appointment — invalidates the appointments cache automatically
export function useConfirmAppointment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/dashboard/appointments/${id}/confirm`, {
        method: "POST",
      })
      if (!res.ok) throw new Error("Erreur lors de la confirmation")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] })
    },
  })
}
