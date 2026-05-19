import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { geocode, haversineKm, computeTravelFee, TravelPricing, DEFAULT_TRAVEL_PRICING } from "@/lib/geo"

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address")
  if (!address || address.trim().length < 5) {
    return NextResponse.json({ error: "Adresse trop courte" }, { status: 400 })
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

    const coords = await geocode(address.trim())
    if (!coords) {
      return NextResponse.json({ error: "Adresse introuvable — vérifiez la saisie." }, { status: 422 })
    }

    const distanceKm = haversineKm(profile.cabinetLat, profile.cabinetLng, coords.lat, coords.lng)
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
