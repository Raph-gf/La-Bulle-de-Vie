import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

// ── Types ─────────────────────────────────────────────────────────────────────

export type ClientSortKey = "name" | "lastVisit" | "sessions" | "totalSpent"

export interface ClientSummary {
  id: string
  fullName: string
  phone: string | null
  avatarUrl: string | null
  hasNotes: boolean
  joinedAt: string
  totalSessions: number
  lastVisitDate: string | null
  totalSpentCents: number
}

export interface ClientAppointment {
  id: string
  status: string
  location: string
  notes: string | null
  isFirstVisit: boolean
  amountPaid: number | null
  discountAmount: number
  travelFee: number
  refundStatus: string
  createdAt: string
  service: { name: string; durationMinutes: number; slug: string }
  slot: { date: string; startTime: string; endTime: string }
  review: { stars: number; approved: boolean } | null
}

export interface ClientDetail {
  id: string
  fullName: string
  phone: string | null
  avatarUrl: string | null
  specialistNotes: string | null
  preferredLocation: string | null
  createdAt: string
  totalSessions: number
  totalSpentCents: number
  firstVisitDate: string | null
  appointments: ClientAppointment[]
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────

async function fetchClients(
  search: string,
  sort: ClientSortKey
): Promise<ClientSummary[]> {
  const params = new URLSearchParams()
  if (search) params.set("search", search)
  if (sort) params.set("sort", sort)
  const res = await fetch(`/api/dashboard/clients?${params}`)
  if (!res.ok) throw new Error("Erreur serveur")
  const data = await res.json()
  return data.clients ?? []
}

async function fetchClientDetail(id: string): Promise<ClientDetail> {
  const res = await fetch(`/api/dashboard/clients/${id}`)
  if (!res.ok) throw new Error("Erreur serveur")
  const data = await res.json()
  return data.client
}

// ── Query hooks ───────────────────────────────────────────────────────────────

export function useClients(search = "", sort: ClientSortKey = "name") {
  return useQuery({
    queryKey: ["dashboard", "clients", search, sort],
    queryFn: () => fetchClients(search, sort),
    staleTime: 60_000,
  })
}

// Only fetches when a client is selected (id is non-null)
export function useClientDetail(id: string | null) {
  return useQuery({
    queryKey: ["dashboard", "clients", id],
    queryFn: () => fetchClientDetail(id!),
    enabled: !!id,
    staleTime: 30_000,
  })
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useUpdateClientNotes() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      fetch(`/api/dashboard/clients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      }).then((r) => {
        if (!r.ok) throw new Error("Erreur lors de la sauvegarde")
      }),
    onSuccess: (_data, { id }) => {
      // Refresh the detail panel (specialistNotes changed)
      qc.invalidateQueries({ queryKey: ["dashboard", "clients", id] })
      // Refresh the list (hasNotes indicator may have changed)
      qc.invalidateQueries({ queryKey: ["dashboard", "clients"] })
    },
  })
}
