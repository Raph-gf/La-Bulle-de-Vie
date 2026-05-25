export interface TravelZone {
  maxKm: number
  feeInCents: number
}

export interface TravelPricing {
  zones: TravelZone[]
  maxDistanceKm: number
}

export const DEFAULT_TRAVEL_PRICING: TravelPricing = {
  zones: [
    { maxKm: 5, feeInCents: 0 },
    { maxKm: 15, feeInCents: 1000 },
    { maxKm: 30, feeInCents: 2500 },
  ],
  maxDistanceKm: 30,
}

export async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search")
  url.searchParams.set("q", address)
  url.searchParams.set("format", "json")
  url.searchParams.set("limit", "1")
  url.searchParams.set("countrycodes", "fr")

  try {
    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": `LaBulleDVie/1.0 (${process.env.NOMINATIM_CONTACT_EMAIL ?? "contact@labulledevie.fr"})`,
        "Accept-Language": "fr",
      },
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!Array.isArray(data) || data.length === 0) return null
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  } catch {
    return null
  }
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function computeTravelFee(distanceKm: number, pricing: TravelPricing): number | null {
  if (distanceKm > pricing.maxDistanceKm) return null
  const sorted = [...pricing.zones].sort((a, b) => a.maxKm - b.maxKm)
  for (const zone of sorted) {
    if (distanceKm <= zone.maxKm) return zone.feeInCents
  }
  return null
}
