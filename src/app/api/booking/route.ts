import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { serviceId, serviceSlug, slotId, notes, isFirstVisit, location, clientAddress, travelFee, name, email, phone } = body

    if (!slotId || !name || !email || (!serviceId && !serviceSlug)) {
      return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 })
    }

    // Resolve service ID from slug if needed
    let resolvedServiceId: string = serviceId
    if (!resolvedServiceId) {
      const service = await prisma.service.findUnique({
        where: { slug: serviceSlug },
        select: { id: true },
      })
      if (!service) {
        return NextResponse.json({ error: "Service introuvable" }, { status: 400 })
      }
      resolvedServiceId = service.id
    }

    // Get logged-in user if any
    let clientId: string | undefined
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) clientId = user.id

    // Verify slot is still free
    const slot = await prisma.availabilitySlot.findUnique({ where: { id: slotId } })
    if (!slot || slot.isBooked) {
      return NextResponse.json(
        { error: "Ce créneau vient d'être pris. Veuillez en choisir un autre." },
        { status: 409 }
      )
    }

    // Atomic: mark slot booked + create appointment
    const appointment = await prisma.$transaction(async (tx) => {
      await tx.availabilitySlot.update({
        where: { id: slotId },
        data: { isBooked: true },
      })
      return tx.appointment.create({
        data: {
          clientId: clientId ?? null,
          serviceId: resolvedServiceId,
          slotId,
          notes: notes ?? null,
          isFirstVisit: isFirstVisit ?? false,
          location: location ?? "cabinet",
          clientAddress: clientAddress ?? null,
          travelFee: typeof travelFee === "number" ? travelFee : 0,
          guestName: clientId ? null : name,
          guestEmail: clientId ? null : email,
          guestPhone: clientId ? null : (phone ?? null),
          status: "pending",
        },
        select: { id: true },
      })
    })

    const ref = `BDV-${appointment.id.slice(0, 6).toUpperCase()}`
    return NextResponse.json({ ok: true, appointmentId: appointment.id, ref })
  } catch (err: unknown) {
    // Unique constraint on slotId — two users hit the same slot simultaneously
    if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "P2002") {
      return NextResponse.json(
        { error: "Ce créneau vient d'être pris. Veuillez en choisir un autre." },
        { status: 409 }
      )
    }
    console.error("[booking] POST error:", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
