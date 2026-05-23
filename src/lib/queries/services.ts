import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

export interface Benefit {
  title: string
  description: string
}

export interface Service {
  id: string
  name: string
  slug: string
  tagline: string | null
  forWho: string | null
  shortDescription: string | null
  longDescription: string | null
  ritualCore: string | null
  ritualCoreDuration: string | null
  benefits: Benefit[] | null
  relatedSlugs: string[]
  bgColor: string | null
  displayOrder: number
  description: string
  durationMinutes: number
  price: number
  category: "massage" | "energetique" | "creation"
  isPublished: boolean
  imageUrls: string[]
  vatRate: number
  createdAt: string
  updatedAt: string
  _count?: { appointments: number; reviews: number }
}

export type ServiceInput = Omit<Service, "id" | "createdAt" | "updatedAt" | "_count">

const QK = ["dashboard", "services"] as const

async function fetchServices(): Promise<{ services: Service[] }> {
  const res = await fetch("/api/dashboard/services")
  if (!res.ok) throw new Error("Fetch services failed")
  return res.json()
}

export function useServices() {
  return useQuery({ queryKey: QK, queryFn: fetchServices, staleTime: 30_000 })
}

export function useCreateService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ServiceInput) =>
      fetch("/api/dashboard/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(async r => {
        const json = await r.json()
        if (!r.ok) throw new Error(json.error ?? "Création échouée")
        return json.service as Service
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}

export function useUpdateService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ServiceInput> }) =>
      fetch(`/api/dashboard/services/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(async r => {
        const json = await r.json()
        if (!r.ok) throw new Error(json.error ?? "Mise à jour échouée")
        return json.service as Service
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}

export function useDeleteService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/dashboard/services/${id}`, { method: "DELETE" }).then(async r => {
        const json = await r.json()
        if (!r.ok) throw new Error(json.error ?? "Suppression échouée")
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}

export function useToggleService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/dashboard/services/${id}/toggle`, { method: "PATCH" }).then(async r => {
        const json = await r.json()
        if (!r.ok) throw new Error(json.error ?? "Bascule échouée")
        return json as { isPublished: boolean }
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}

export function useDuplicateService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/dashboard/services/${id}/duplicate`, { method: "POST" }).then(async r => {
        const json = await r.json()
        if (!r.ok) throw new Error(json.error ?? "Duplication échouée")
        return json.service as Service
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}
