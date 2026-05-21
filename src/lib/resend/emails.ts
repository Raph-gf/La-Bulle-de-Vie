import { Resend } from "resend"

const FROM = "La Bulle de Vie <onboarding@resend.dev>"

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    console.warn("[resend] RESEND_API_KEY not set — email skipped")
    return null
  }
  return new Resend(key)
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface BookingEmailData {
  clientName: string
  serviceName: string
  date: string
  time: string
  location: string
  clientAddress?: string
  amountEur: string
  ref: string
}

interface SpecialistNotificationData extends BookingEmailData {
  clientEmail: string
  clientPhone?: string
  notes?: string
  isFirstVisit: boolean
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>La Bulle de Vie</title>
</head>
<body style="margin:0;padding:0;background:#F0E8DF;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0E8DF;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          ${content}
          <!-- footer -->
          <tr>
            <td style="background:#1a110b;padding:24px 48px;border-radius:0 0 12px 12px;text-align:center;">
              <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:#7a6052;letter-spacing:1px;">
                © 2026 La Bulle de Vie &nbsp;·&nbsp; Tous droits réservés
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function labelCell(label: string, value: string): string {
  return `<td style="padding:0 12px 0 0;vertical-align:top;width:50%;">
    <p style="margin:0;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#C4956A;">${label}</p>
    <p style="margin:4px 0 0;font-size:15px;color:#2C1F14;font-weight:500;">${value}</p>
  </td>`
}

// ─── Booking confirmation (to client) ────────────────────────────────────────

function buildConfirmationHtml(d: BookingEmailData): string {
  const locationLabel = d.location === "domicile" ? "À domicile" : "Au cabinet"
  const addressLine = d.location === "domicile" && d.clientAddress
    ? `<p style="margin:2px 0 0;font-size:13px;color:#6B5C4E;">${d.clientAddress}</p>`
    : ""

  return emailWrapper(`
  <!-- header -->
  <tr>
    <td style="background:#2C1F14;padding:44px 48px 40px;border-radius:12px 12px 0 0;text-align:center;">
      <p style="margin:0;font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#C4956A;">La Bulle de Vie</p>
      <h1 style="margin:12px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:normal;color:#F5EDE5;">
        Votre rendez-vous est confirmé
      </h1>
    </td>
  </tr>
  <!-- body -->
  <tr>
    <td style="background:#FDFAF7;padding:48px;">
      <p style="margin:0 0 8px;font-size:16px;color:#1C1C1C;">Bonjour <strong>${d.clientName}</strong>,</p>
      <p style="margin:0 0 36px;font-size:15px;color:#6B5C4E;line-height:1.7;">
        Votre réservation a bien été enregistrée. Nous avons hâte de vous accueillir.
      </p>

      <!-- booking card -->
      <table width="100%" cellpadding="0" cellspacing="0"
        style="background:#F5EDE5;border:1px solid #E2D5CB;border-radius:10px;margin-bottom:32px;">
        <tr>
          <td style="padding:28px 32px;">

            <!-- service -->
            <table width="100%" cellpadding="0" cellspacing="0"
              style="border-bottom:1px solid #E2D5CB;padding-bottom:20px;margin-bottom:20px;">
              <tr>
                <td>
                  <p style="margin:0;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#C4956A;">Prestation</p>
                  <p style="margin:4px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#2C1F14;">${d.serviceName}</p>
                </td>
              </tr>
            </table>

            <!-- date / time -->
            <table width="100%" cellpadding="0" cellspacing="0"
              style="border-bottom:1px solid #E2D5CB;padding-bottom:20px;margin-bottom:20px;">
              <tr>
                ${labelCell("Date", d.date)}
                ${labelCell("Heure", d.time)}
              </tr>
            </table>

            <!-- location / amount -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="width:50%;padding-right:12px;vertical-align:top;">
                  <p style="margin:0;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#C4956A;">Lieu</p>
                  <p style="margin:4px 0 0;font-size:15px;color:#2C1F14;font-weight:500;">${locationLabel}</p>
                  ${addressLine}
                </td>
                <td style="width:50%;vertical-align:top;">
                  <p style="margin:0;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#C4956A;">Montant réglé</p>
                  <p style="margin:4px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#2C1F14;">${d.amountEur}&nbsp;€</p>
                </td>
              </tr>
            </table>

          </td>
        </tr>
      </table>

      <!-- ref -->
      <p style="margin:0 0 32px;font-size:13px;color:#9A8070;text-align:center;">
        Référence : <strong style="color:#2C1F14;letter-spacing:1px;">${d.ref}</strong>
      </p>

      <!-- tip block -->
      <table width="100%" cellpadding="0" cellspacing="0"
        style="border-left:3px solid #C4956A;background:#FBF7F4;border-radius:0 6px 6px 0;margin-bottom:40px;">
        <tr>
          <td style="padding:18px 22px;">
            <p style="margin:0 0 6px;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#C4956A;">Bon à savoir</p>
            <p style="margin:0;font-size:14px;color:#6B5C4E;line-height:1.7;">
              Prévoyez d'arriver 5 minutes en avance. Portez des vêtements confortables.
              En cas d'empêchement, merci de nous prévenir au moins 24 h à l'avance.
            </p>
          </td>
        </tr>
      </table>

      <p style="margin:0;font-size:15px;color:#1C1C1C;line-height:1.7;">
        À très bientôt,<br>
        <em style="font-family:Georgia,'Times New Roman',serif;font-size:17px;color:#2C1F14;">L'équipe La Bulle de Vie</em>
      </p>
    </td>
  </tr>`)
}

// ─── Specialist notification ──────────────────────────────────────────────────

function buildSpecialistHtml(d: SpecialistNotificationData): string {
  const locationLabel = d.location === "domicile" ? "À domicile" : "Au cabinet"
  const firstVisitBadge = d.isFirstVisit
    ? `<span style="display:inline-block;background:#2C1F14;color:#C4956A;font-size:10px;letter-spacing:2px;
        text-transform:uppercase;padding:3px 10px;border-radius:20px;margin-left:10px;">1re visite</span>`
    : ""
  const notesBlock = d.notes
    ? `<table width="100%" cellpadding="0" cellspacing="0"
          style="border-top:1px solid #E2D5CB;padding-top:20px;margin-top:20px;">
        <tr>
          <td>
            <p style="margin:0;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#C4956A;">Notes du client</p>
            <p style="margin:6px 0 0;font-size:14px;color:#2C1F14;line-height:1.7;white-space:pre-wrap;">${d.notes}</p>
          </td>
        </tr>
      </table>`
    : ""

  return emailWrapper(`
  <!-- header -->
  <tr>
    <td style="background:#2C1F14;padding:40px 48px 36px;border-radius:12px 12px 0 0;">
      <p style="margin:0;font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#C4956A;">La Bulle de Vie</p>
      <h1 style="margin:10px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:normal;color:#F5EDE5;">
        Nouveau rendez-vous ${firstVisitBadge}
      </h1>
    </td>
  </tr>
  <!-- body -->
  <tr>
    <td style="background:#FDFAF7;padding:48px;">

      <!-- client info -->
      <table width="100%" cellpadding="0" cellspacing="0"
        style="background:#F5EDE5;border:1px solid #E2D5CB;border-radius:10px;margin-bottom:28px;">
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 18px;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#C4956A;">Client</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                ${labelCell("Nom", d.clientName)}
                ${labelCell("Email", `<a href="mailto:${d.clientEmail}" style="color:#2C1F14;">${d.clientEmail}</a>`)}
              </tr>
            </table>
            ${d.clientPhone ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;"><tr>${labelCell("Téléphone", d.clientPhone)}<td></td></tr></table>` : ""}
          </td>
        </tr>
      </table>

      <!-- appointment info -->
      <table width="100%" cellpadding="0" cellspacing="0"
        style="background:#F5EDE5;border:1px solid #E2D5CB;border-radius:10px;margin-bottom:28px;">
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 18px;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#C4956A;">Séance</p>

            <table width="100%" cellpadding="0" cellspacing="0"
              style="border-bottom:1px solid #E2D5CB;padding-bottom:18px;margin-bottom:18px;">
              <tr>
                <td>
                  <p style="margin:0;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#C4956A;">Prestation</p>
                  <p style="margin:4px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:20px;color:#2C1F14;">${d.serviceName}</p>
                </td>
              </tr>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0"
              style="border-bottom:1px solid #E2D5CB;padding-bottom:18px;margin-bottom:18px;">
              <tr>
                ${labelCell("Date", d.date)}
                ${labelCell("Heure", d.time)}
              </tr>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                ${labelCell("Lieu", locationLabel + (d.clientAddress ? `<br><span style="font-size:13px;color:#6B5C4E;">${d.clientAddress}</span>` : ""))}
                ${labelCell("Montant", `${d.amountEur} €`)}
              </tr>
            </table>

            ${notesBlock}
          </td>
        </tr>
      </table>

      <p style="margin:0;font-size:13px;color:#9A8070;text-align:center;">
        Référence : <strong style="color:#2C1F14;letter-spacing:1px;">${d.ref}</strong>
      </p>
    </td>
  </tr>`)
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function sendBookingConfirmation(to: string, data: BookingEmailData): Promise<void> {
  const client = getResend()
  if (!client) return

  const { error } = await client.emails.send({
    from: FROM,
    to,
    subject: `Confirmation — ${data.serviceName} le ${data.date}`,
    html: buildConfirmationHtml(data),
  })

  if (error) throw new Error(`Resend error: ${JSON.stringify(error)}`)
}

export async function sendSpecialistNotification(to: string, data: SpecialistNotificationData): Promise<void> {
  const client = getResend()
  if (!client) return

  const { error } = await client.emails.send({
    from: FROM,
    to,
    subject: `Nouveau RDV — ${data.clientName} · ${data.serviceName}`,
    html: buildSpecialistHtml(data),
  })

  if (error) throw new Error(`Resend error: ${JSON.stringify(error)}`)
}

export async function sendContactMessage(to: string, data: {
  senderName: string
  senderEmail: string
  senderPhone?: string
  message: string
}): Promise<void> {
  const client = getResend()
  if (!client) return

  const phoneRow = data.senderPhone
    ? `<tr><td style="padding:0 12px 0 0;width:50%;vertical-align:top;">
        <p style="margin:0;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#C4956A;">Téléphone</p>
        <p style="margin:4px 0 0;font-size:15px;color:#2C1F14;">${data.senderPhone}</p>
      </td></tr>`
    : ""

  const html = emailWrapper(`
  <tr>
    <td style="background:#2C1F14;padding:40px 48px 36px;border-radius:12px 12px 0 0;">
      <p style="margin:0;font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#C4956A;">La Bulle de Vie</p>
      <h1 style="margin:10px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:normal;color:#F5EDE5;">
        Nouveau message de contact
      </h1>
    </td>
  </tr>
  <tr>
    <td style="background:#FDFAF7;padding:48px;">
      <table width="100%" cellpadding="0" cellspacing="0"
        style="background:#F5EDE5;border:1px solid #E2D5CB;border-radius:10px;margin-bottom:28px;">
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 18px;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#C4956A;">Expéditeur</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                ${labelCell("Nom", data.senderName)}
                ${labelCell("Email", `<a href="mailto:${data.senderEmail}" style="color:#2C1F14;">${data.senderEmail}</a>`)}
              </tr>
              ${phoneRow}
            </table>
          </td>
        </tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0"
        style="background:#F5EDE5;border:1px solid #E2D5CB;border-radius:10px;">
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 16px;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#C4956A;">Message</p>
            <p style="margin:0;font-size:15px;color:#2C1F14;line-height:1.8;white-space:pre-wrap;">${data.message}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>`)

  const { error } = await client.emails.send({
    from: FROM,
    to,
    replyTo: data.senderEmail,
    subject: `Message de ${data.senderName}`,
    html,
  })

  if (error) throw new Error(`Resend error: ${JSON.stringify(error)}`)
}

export async function sendAppointmentReminder(to: string, data: BookingEmailData): Promise<void> {
  const client = getResend()
  if (!client) return

  const html = emailWrapper(`
  <tr>
    <td style="background:#2C1F14;padding:40px 48px;border-radius:12px 12px 0 0;text-align:center;">
      <p style="margin:0;font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#C4956A;">La Bulle de Vie</p>
      <h1 style="margin:12px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:normal;color:#F5EDE5;">
        Votre rendez-vous est demain
      </h1>
    </td>
  </tr>
  <tr>
    <td style="background:#FDFAF7;padding:48px;">
      <p style="margin:0 0 28px;font-size:16px;color:#1C1C1C;">Bonjour <strong>${data.clientName}</strong>,</p>
      <p style="margin:0 0 32px;font-size:15px;color:#6B5C4E;line-height:1.7;">
        Petit rappel : votre séance <strong>${data.serviceName}</strong> est prévue demain
        <strong>${data.date}</strong> à <strong>${data.time}</strong>.
      </p>
      <p style="margin:0;font-size:15px;color:#1C1C1C;line-height:1.7;">
        À demain,<br>
        <em style="font-family:Georgia,'Times New Roman',serif;font-size:17px;color:#2C1F14;">L'équipe La Bulle de Vie</em>
      </p>
    </td>
  </tr>`)

  const { error } = await client.emails.send({
    from: FROM,
    to,
    subject: `Rappel — ${data.serviceName} demain à ${data.time}`,
    html,
  })

  if (error) throw new Error(`Resend error: ${JSON.stringify(error)}`)
}
