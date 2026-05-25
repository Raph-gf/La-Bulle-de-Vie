import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"
import { geocode, haversineKm, computeTravelFee, TravelPricing, DEFAULT_TRAVEL_PRICING } from "@/lib/geo"

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  const params = req.nextUrl.searchParams
  const rawLat = params.get("lat")
  const rawLng = params.get("lng")
  const address = params.get("address")

  // Prefer exact coordinates (from BAN autocomplete) — skip geocoding entirely
  let clientCoords: { lat: number; lng: number } | null = null
  if (rawLat && rawLng) {
    const lat = parseFloat(rawLat)
    const lng = parseFloat(rawLng)
    if (isFinite(lat) && isFinite(lng)) clientCoords = { lat, lng }
  }

  if (!clientCoords) {
    if (!address || address.trim().length < 5) {
      return NextResponse.json({ error: "Adresse trop courte" }, { status: 400 })
    }
  }

  try {
    const profile = await prisma.profile.findFirst({
      where: { role: "specialist" },
      select: { cabinetLat: true, cabinetLng: true, travelPricing: true },
    })

    // No cabinet coords configured yet — return flat default fee
    if (!profile?.cabinetLat || !profile?.cabinetLng) {
      return NextResponse.json({ feeInCents: 1800, distanceKm: null })
    }

    if (!clientCoords) {
      clientCoords = await geocode(address!.trim())
      if (!clientCoords) {
        return NextResponse.json({ error: "Adresse introuvable — vérifiez la saisie." }, { status: 422 })
      }
    }

    const distanceKm = haversineKm(profile.cabinetLat, profile.cabinetLng, clientCoords.lat, clientCoords.lng)
    const pricing = (profile.travelPricing as TravelPricing | null) ?? DEFAULT_TRAVEL_PRICING
    const feeInCents = computeTravelFee(distanceKm, pricing)

    if (feeInCents === null) {
      return NextResponse.json(
        {
          error: `Adresse hors zone (${Math.round(distanceKm)} km). Maximum : ${pricing.maxDistanceKm} km.`,
          distanceKm: Math.round(distanceKm * 10) / 10,
        },
        { status: 422 }
      )
    }

    return NextResponse.json({ feeInCents, distanceKm: Math.round(distanceKm * 10) / 10 })
  } catch (err) {
    console.error("[travel-fee] GET error:", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
