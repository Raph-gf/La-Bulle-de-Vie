import { NextRequest, NextResponse } from "next/server"
import { contactSchema } from "@/lib/validation"
import { sendContactMessage } from "@/lib/resend/emails"

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 })
  }

  const result = contactSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { error: "Données invalides", fieldErrors: result.error.flatten().fieldErrors },
      { status: 422 }
    )
  }

  const { name, email, phone, message } = result.data
  const specialistEmail = process.env.SPECIALIST_EMAIL

  if (!specialistEmail) {
    console.error("[contact] SPECIALIST_EMAIL not set")
    return NextResponse.json({ error: "Configuration serveur manquante" }, { status: 500 })
  }

  try {
    await sendContactMessage(specialistEmail, {
      senderName: name,
      senderEmail: email,
      senderPhone: phone || undefined,
      message,
    })
  } catch (err) {
    console.error("[contact] email send failed:", err)
    return NextResponse.json({ error: "Erreur lors de l'envoi du message" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
