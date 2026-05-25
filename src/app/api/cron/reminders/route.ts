import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { sendAppointmentReminder } from "@/lib/resend/emails"

// GET /api/cron/reminders
// Invoked by Vercel Cron at 08:00 UTC every day.
// Sends a 24h reminder to every client whose appointment is tomorrow.
// Protected by CRON_SECRET so only Vercel (or an authorised caller) can trigger it.
export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "")
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // "tomorrow" window: UTC midnight → end of tomorrow UTC
  const now = new Date()
  const tomorrowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
  const tomorrowEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 2))

  const appointments = await prisma.appointment.findMany({
    where: {
      status: { in: ["confirmed", "pending"] },
      slot: { date: { gte: tomorrowStart, lt: tomorrowEnd } },
    },
    select: {
      id: true,
      clientId: true,
      guestEmail: true,
      guestName: true,
      location: true,
      clientAddress: true,
      stripePaymentIntentId: true,
      amountPaid: true,
      service: { select: { name: true } },
      slot: { select: { date: true, startTime: true } },
      client: { select: { fullName: true } },
    },
  })

  if (appointments.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0, total: 0 })
  }

  // Batch-fetch emails for registered clients from Supabase Auth
  const registeredIds = [...new Set(appointments.map(a => a.clientId).filter(Boolean))] as string[]
  const emailMap: Record<string, string> = {}

  await Promise.allSettled(
    registeredIds.map(async (uid) => {
      const { data } = await supabaseAdmin.auth.admin.getUserById(uid)
      if (data?.user?.email) emailMap[uid] = data.user.email
    })
  )

  const date = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    timeZone: "Europe/Paris",
  }).format(tomorrowStart)

  let sent = 0
  let failed = 0

  await Promise.allSettled(
    appointments.map(async (appt) => {
      const email = appt.clientId ? emailMap[appt.clientId] : appt.guestEmail
      if (!email) return // no email → skip silently

      const clientName = appt.client?.fullName ?? appt.guestName ?? "Client"
      const amountEur = (appt.amountPaid ?? 0) > 0
        ? ((appt.amountPaid ?? 0) / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : "0,00"
      const ref = appt.stripePaymentIntentId
        ? `BDV-${appt.stripePaymentIntentId.slice(-6).toUpperCase()}`
        : appt.id.slice(0, 8).toUpperCase()

      try {
        await sendAppointmentReminder(email, {
          clientName,
          serviceName: appt.service.name,
          date,
          time: appt.slot.startTime,
          location: appt.location,
          clientAddress: appt.clientAddress ?? undefined,
          amountEur,
          ref,
        })
        sent++
      } catch (err) {
        console.error(`[cron/reminders] reminder failed for appt ${appt.id}:`, err)
        failed++
      }
    })
  )

  console.log(`[cron/reminders] sent=${sent} failed=${failed} skipped=${appointments.length - sent - failed}`)
  return NextResponse.json({ sent, failed, total: appointments.length })
}
