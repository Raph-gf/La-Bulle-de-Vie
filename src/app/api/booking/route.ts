import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { serviceId, slotId, notes, isFirstVisit, location, name, email, phone } = body

    if (!serviceId || !slotId || !name || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Check if a user is logged in — guests get clientId = undefined
    let clientId: string | undefined = undefined
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) clientId = user.id
    }

    // Verify the slot is still available
    const slot = await prisma.availabilitySlot.findUnique({ where: { id: slotId } })
    if (!slot || slot.isBooked) {
      return NextResponse.json({ error: "Ce créneau n'est plus disponible" }, { status: 409 })
    }

    // Create appointment + mark slot as booked atomically
    const appointment = await prisma.$transaction(async (tx) => {
      await tx.availabilitySlot.update({
        where: { id: slotId },
        data: { isBooked: true },
      })

      return tx.appointment.create({
        data: {
          clientId,
          serviceId,
          slotId,
          notes,
          isFirstVisit: isFirstVisit ?? false,
          location: location ?? "cabinet",
          guestName: clientId ? null : name,
          guestEmail: clientId ? null : email,
          guestPhone: clientId ? null : (phone ?? null),
          status: "pending",
        },
        include: { service: true, slot: true },
      })
    })

    const ref = `BDV-${appointment.id.slice(0, 6).toUpperCase()}`

    return NextResponse.json({ ok: true, appointmentId: appointment.id, ref })
  } catch (err) {
    console.error("[booking] POST error:", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
