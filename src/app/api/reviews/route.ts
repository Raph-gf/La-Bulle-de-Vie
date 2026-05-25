import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { sendNewReviewNotification } from "@/lib/resend/emails"

const reviewSchema = z.object({
  appointmentId: z.string().uuid(),
  stars: z.number().int().min(1).max(5),
  body: z.string().min(10).max(1000).transform((s) => s.trim()),
})

export async function POST(req: NextRequest) {
  try {
    // Must be a logged-in client
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

    let body: unknown
    try { body = await req.json() } catch {
      return NextResponse.json({ error: "Corps invalide" }, { status: 400 })
    }

    const parsed = reviewSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données invalides", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 422 }
      )
    }

    const { appointmentId, stars, body: reviewBody } = parsed.data

    // Verify the appointment belongs to this client and has taken place
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        id: true,
        clientId: true,
        status: true,
        serviceId: true,
        service: { select: { name: true } },
        client: { select: { fullName: true } },
        review: { select: { id: true } },
        slot: { select: { date: true } },
      },
    })

    if (!appointment) {
      return NextResponse.json({ error: "Rendez-vous introuvable" }, { status: 404 })
    }
    if (appointment.clientId !== user.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
    }
    if (appointment.status === "cancelled") {
      return NextResponse.json({ error: "Ce rendez-vous a été annulé" }, { status: 400 })
    }
    // Allow review once the slot date is in the past (specialist may not have clicked "completed" yet)
    const slotDate = new Date(appointment.slot.date)
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    if (slotDate >= today && appointment.status !== "completed") {
      return NextResponse.json({ error: "Le rendez-vous n'a pas encore eu lieu" }, { status: 400 })
    }
    if (appointment.review) {
      return NextResponse.json({ error: "Vous avez déjà laissé un avis pour ce rendez-vous" }, { status: 409 })
    }

    // Create the review (pending approval by default)
    const review = await prisma.review.create({
      data: {
        appointmentId,
        serviceId: appointment.serviceId,
        clientId: user.id,
        stars,
        body: reviewBody,
        approved: false,
      },
    })

    // Notify specialist if they opted in — non-blocking
    const specialistEmail = process.env.SPECIALIST_EMAIL
    if (!specialistEmail) {
      console.warn("[reviews] SPECIALIST_EMAIL not set — specialist notification skipped")
    }
    if (specialistEmail) {
      const specialist = await prisma.profile.findFirst({
        where: { role: "specialist" },
        select: { notificationPrefs: true },
      })
      const prefs = (specialist?.notificationPrefs as Record<string, boolean> | null) ?? {}
      const wantsAlert = prefs.onNewReview !== false // default true

      if (wantsAlert) {
        sendNewReviewNotification(specialistEmail, {
          clientName: appointment.client?.fullName ?? "Client",
          serviceName: appointment.service.name,
          stars,
          body: reviewBody,
        }).catch((err) => console.error("[email] review notification failed:", err))
      }
    }

    return NextResponse.json({ review: { id: review.id } }, { status: 201 })
  } catch (err) {
    console.error("[reviews] POST error:", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
