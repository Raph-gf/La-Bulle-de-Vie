import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

export interface Review {
  id: string
  stars: number
  body: string
  approved: boolean
  specialistReply: string | null
  createdAt: string
  client: { id: string; fullName: string }
  service: { name: string }
}

export interface ReviewStats {
  total: number
  approved: number
  pending: number
  avgStars: number
}

async function fetchReviews(): Promise<{ reviews: Review[]; stats: ReviewStats }> {
  const res = await fetch("/api/dashboard/reviews")
  if (!res.ok) throw new Error("Fetch reviews failed")
  return res.json()
}

export function useReviews() {
  return useQuery({
    queryKey: ["dashboard", "reviews"],
    queryFn: fetchReviews,
    staleTime: 30_000,
  })
}

export function useApproveReview() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/dashboard/reviews/${id}/approve`, { method: "POST" }).then(r => {
        if (!r.ok) throw new Error()
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboard", "reviews"] }),
  })
}

export function useHideReview() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/dashboard/reviews/${id}/hide`, { method: "POST" }).then(r => {
        if (!r.ok) throw new Error()
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboard", "reviews"] }),
  })
}

export function useReplyReview() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reply }: { id: string; reply: string }) =>
      fetch(`/api/dashboard/reviews/${id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply }),
      }).then(r => { if (!r.ok) throw new Error() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboard", "reviews"] }),
  })
}
