import { useQuery } from "@tanstack/react-query"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FinancesKpis {
  allTimeCents: number
  allTimeCount: number
  thisMonthCents: number
  thisWeekCents: number
  avgPerSessionCents: number
  totalRefundedCents: number
  availableBalance: number | null   // null = Stripe unreachable
  pendingBalance: number | null
}

export interface MonthlyBucket {
  month: string   // "2025-05"
  totalCents: number
  count: number
}

export interface FinanceTransaction {
  id: string
  clientName: string
  serviceName: string
  date: string
  startTime: string
  amountPaid: number | null
  discountAmount: number
  travelFee: number
  refundStatus: string
  isFirstVisit: boolean
}

export interface TopService {
  name: string
  totalCents: number
  count: number
}

export interface RefundItem {
  id: string
  clientName: string
  serviceName: string
  date: string
  amountPaid: number | null
  refundStatus: string
}

export interface StripePayout {
  id: string
  amountCents: number
  currency: string
  status: string
  arrivalDate: number   // Unix timestamp (seconds)
  description: string | null
}

export interface FinancesData {
  kpis: FinancesKpis
  monthly: MonthlyBucket[]
  transactions: FinanceTransaction[]
  topServices: TopService[]
  refunds: RefundItem[]
  payouts: StripePayout[]
}

// ── Fetch + hook ──────────────────────────────────────────────────────────────

async function fetchFinances(): Promise<FinancesData> {
  const res = await fetch("/api/dashboard/finances")
  if (!res.ok) throw new Error("Erreur serveur")
  return res.json()
}

export function useFinances() {
  return useQuery({
    queryKey: ["dashboard", "finances"],
    queryFn: fetchFinances,
    staleTime: 2 * 60_000,   // finances data — refresh every 2 min
  })
}
