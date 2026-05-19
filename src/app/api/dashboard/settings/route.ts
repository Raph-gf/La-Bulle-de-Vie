import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { geocode } from "@/lib/geo"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { role: true, cabinetAddress: true, cabinetLat: true, cabinetLng: true, travelPricing: true, taxSettings: true },
    })
    if (profile?.role !== "specialist") return NextResponse.json({ error: "Non autorisé" }, { status: 403 })

    return NextResponse.json({
      cabinetAddress: profile.cabinetAddress,
      cabinetLat: profile.cabinetLat,
      cabinetLng: profile.cabinetLng,
      travelPricing: profile.travelPricing,
      taxSettings: profile.taxSettings,
    })
  } catch (err) {
    console.error("[dashboard/settings] GET error:", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { role: true },
    })
    if (profile?.role !== "specialist") return NextResponse.json({ error: "Non autorisé" }, { status: 403 })

    const body = await req.json()
    const { cabinetAddress, travelPricing, taxSettings } = body

    let geocodeStatus: "ok" | "failed" | "unchanged" = "unchanged"
    let cabinetLat: number | undefined
    let cabinetLng: number | undefined

    if (cabinetAddress && typeof cabinetAddress === "string" && cabinetAddress.trim().length > 0) {
      const coords = await geocode(cabinetAddress.trim())
      if (coords) {
        cabinetLat = coords.lat
        cabinetLng = coords.lng
        geocodeStatus = "ok"
      } else {
        geocodeStatus = "failed"
      }
    }

    const updated = await prisma.profile.update({
      where: { id: user.id },
      data: {
        ...(cabinetAddress !== undefined && { cabinetAddress: cabinetAddress.trim() }),
        ...(cabinetLat !== undefined && { cabinetLat }),
        ...(cabinetLng !== undefined && { cabinetLng }),
        ...(travelPricing !== undefined && { travelPricing }),
        ...(taxSettings !== undefined && { taxSettings }),
      },
      select: { cabinetAddress: true, cabinetLat: true, cabinetLng: true, travelPricing: true, taxSettings: true },
    })

    return NextResponse.json({ ok: true, geocodeStatus, ...updated })
  } catch (err) {
    console.error("[dashboard/settings] POST error:", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
