import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BoutiqueProduct {
  id: string
  name: string
  description: string
  price: number
  stock: number
  medium: string
  dimensions: string
  imageUrl: string | null
  isPublished: boolean
  vatRate: number
  createdAt: string
}

export interface BoutiqueOrderItem {
  quantity: number
  unitPrice: number
  product: { name: string }
}

export interface BoutiqueOrder {
  id: string
  status: "pending" | "paid" | "shipped" | "cancelled"
  total: number
  amountPaid: number | null
  createdAt: string
  guestName: string | null
  guestEmail: string | null
  client: { fullName: string } | null
  items: BoutiqueOrderItem[]
}

export interface BoutiqueKpis {
  totalRevenue: number
  totalOrders: number
  pendingOrders: number
  lowStockCount: number
}

export interface BoutiqueData {
  products: BoutiqueProduct[]
  orders: BoutiqueOrder[]
  kpis: BoutiqueKpis
}

export type ProductInput = {
  name: string
  description: string
  price: number
  stock: number
  medium: string
  dimensions: string
  vatRate: number
  imageUrl?: string | null
}

// ── Query key ─────────────────────────────────────────────────────────────────

const QK = ["dashboard", "boutique"] as const

// ── Fetch ─────────────────────────────────────────────────────────────────────

async function fetchBoutique(): Promise<BoutiqueData> {
  const res = await fetch("/api/dashboard/boutique")
  if (!res.ok) throw new Error("Erreur serveur")
  return res.json()
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useBoutique() {
  return useQuery({
    queryKey: QK,
    queryFn: fetchBoutique,
    staleTime: 60_000,
  })
}

export function useCreateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ProductInput) =>
      fetch("/api/dashboard/boutique", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(async (r) => {
        const json = await r.json()
        if (!r.ok) throw new Error(json.error ?? "Création échouée")
        return json.product as BoutiqueProduct
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}

export function useUpdateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ProductInput> & { isPublished?: boolean } }) =>
      fetch(`/api/dashboard/boutique/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(async (r) => {
        const json = await r.json()
        if (!r.ok) throw new Error(json.error ?? "Mise à jour échouée")
        return json.product as BoutiqueProduct
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}

export function useDeleteProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/dashboard/boutique/${id}`, { method: "DELETE" }).then(async (r) => {
        const json = await r.json()
        if (!r.ok) throw new Error(json.error ?? "Suppression échouée")
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: BoutiqueOrder["status"] }) =>
      fetch(`/api/dashboard/boutique/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }).then(async (r) => {
        const json = await r.json()
        if (!r.ok) throw new Error(json.error ?? "Mise à jour échouée")
        return json.order as BoutiqueOrder
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}
