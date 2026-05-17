import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function sendBookingConfirmation(to: string, data: {
  clientName: string
  serviceName: string
  date: string
  time: string
}) {
  // TODO: use React Email template
  await resend.emails.send({
    from: "La Bulle de Vie <noreply@labulldevie.fr>",
    to,
    subject: "Confirmation de votre rendez-vous",
    html: `<p>Bonjour ${data.clientName}, votre rendez-vous est confirmé.</p>`,
  })
}

export async function sendAppointmentReminder(to: string, data: {
  clientName: string
  serviceName: string
  date: string
  time: string
}) {
  await resend.emails.send({
    from: "La Bulle de Vie <noreply@labulldevie.fr>",
    to,
    subject: "Rappel : votre rendez-vous demain",
    html: `<p>Bonjour ${data.clientName}, rappel de votre rendez-vous demain.</p>`,
  })
}

export async function sendSpecialistNotification(to: string, data: {
  clientName: string
  serviceName: string
  date: string
  time: string
  reason: string
  symptoms: string
}) {
  await resend.emails.send({
    from: "La Bulle de Vie <noreply@labulldevie.fr>",
    to,
    subject: `Nouveau rendez-vous — ${data.clientName}`,
    html: `<p>Nouveau rendez-vous de ${data.clientName} pour ${data.serviceName}.</p>`,
  })
}
