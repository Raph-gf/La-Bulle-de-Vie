import { NextRequest, NextResponse } from "next/server"
import { newsletterSchema } from "@/lib/validation"
import { prisma } from "@/lib/prisma"
import { sendNewsletterWelcome } from "@/lib/resend/emails"

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 })
  }

  const result = newsletterSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { error: "Adresse e-mail invalide" },
      { status: 422 }
    )
  }

  const { email } = result.data

  // Upsert — silently ignore if already subscribed
  const subscriber = await prisma.newsletterSubscriber.upsert({
    where: { email },
    update: {},
    create: { email },
    select: { unsubscribeToken: true, subscribedAt: true },
  })

  // Only send welcome email on first subscription (subscribedAt was just set)
  const isNew = Date.now() - subscriber.subscribedAt.getTime() < 5000
  if (isNew) {
    sendNewsletterWelcome(email, { unsubscribeToken: subscriber.unsubscribeToken })
      .catch(err => console.error("[newsletter] welcome email failed:", err))
  }

  return NextResponse.json({ ok: true })
}
