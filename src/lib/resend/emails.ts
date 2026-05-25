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
  // Rich design fields — all optional for backward compat
  dayOfWeek?: string
  dayNum?: string | number
  monthYear?: string
  durationMin?: number
  clientInitial?: string
  sessionCount?: number
  totalSpend?: string
  isVip?: boolean
  clientMessage?: string
  privateNotes?: string
  additionalItems?: { label: string; price: string }[]
  promoCode?: string
  promoDiscount?: string
  stripeFees?: string
  netAmount?: string
  dashboardUrl?: string
  clientProfileUrl?: string
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
  const locationLabel = d.location === "domicile" ? "&#192; domicile" : "Au cabinet"
  const initial = d.clientInitial ?? d.clientName.charAt(0).toUpperCase()

  const vipBadge = d.isVip
    ? `<span style="background:#B86F4A;color:#fff;font-family:'Manrope',Arial,sans-serif;font-style:normal;font-size:10px;letter-spacing:.18em;padding:3px 9px;border-radius:99px;vertical-align:middle;margin-left:6px;">VIP</span>`
    : d.isFirstVisit
    ? `<span style="background:#3D6346;color:#fff;font-family:'Manrope',Arial,sans-serif;font-style:normal;font-size:10px;letter-spacing:.18em;padding:3px 9px;border-radius:99px;vertical-align:middle;margin-left:6px;">1re visite</span>`
    : ""

  const dateTileInner = d.dayNum
    ? `<p style="margin:0;font-family:'Manrope',Arial,sans-serif;font-size:11px;letter-spacing:.22em;color:#ffffff88;text-transform:uppercase;">${d.dayOfWeek ?? ""}</p>
       <p style="margin:8px 0 4px;font-family:'Cormorant Garamond',Georgia,serif;font-size:54px;line-height:1;color:#ffffff;">${d.dayNum}</p>
       <p style="margin:0;font-family:'Manrope',Arial,sans-serif;font-size:11px;letter-spacing:.22em;color:#ffffff88;text-transform:uppercase;">${d.monthYear ?? ""}</p>
       <p style="margin:14px 0 0;font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;font-size:22px;color:#D89175;">${d.time}</p>`
    : `<p style="margin:0;font-family:'Manrope',Arial,sans-serif;font-size:14px;color:#ffffff;line-height:1.5;">${d.date}</p>
       <p style="margin:8px 0 0;font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;font-size:22px;color:#D89175;">${d.time}</p>`

  const statsLine = d.sessionCount !== undefined
    ? `<p style="margin:6px 0 0;font-family:'Manrope',Arial,sans-serif;font-size:13px;color:#8B7563;">${
        d.sessionCount > 0
          ? `<strong style="color:#B86F4A;font-weight:500;">${d.sessionCount} s&#233;ance${d.sessionCount > 1 ? "s" : ""}</strong>${d.totalSpend ? ` &#183; <strong style="color:#B86F4A;font-weight:500;">${d.totalSpend} d&#233;pens&#233;</strong>` : ""}`
          : "Premi&#232;re visite"
      }</p>`
    : ""

  const privateNotesBlock = (d.privateNotes ?? d.notes)
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:18px;">
        <tr>
          <td style="background:#FFF9EE;border:1px dashed #E9D5B5;border-radius:10px;padding:16px 18px;">
            <p style="margin:0 0 6px;font-family:'Manrope',Arial,sans-serif;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#8B7563;">
              &#9998; Notes priv&#233;es
            </p>
            <p style="margin:0;font-family:'Manrope',Arial,sans-serif;font-size:14px;line-height:1.55;color:#4A3A2E;white-space:pre-wrap;">${d.privateNotes ?? d.notes}</p>
          </td>
        </tr>
      </table>`
    : ""

  const clientMessageBlock = d.clientMessage
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px;">
        <tr>
          <td style="background:#F1E7DA;border-radius:10px;padding:16px 18px;">
            <p style="margin:0 0 6px;font-family:'Manrope',Arial,sans-serif;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#8B7563;">
              Message laiss&#233;
            </p>
            <p style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;font-size:17px;line-height:1.45;color:#221812;">
              &#171; ${d.clientMessage} &#187;
            </p>
          </td>
        </tr>
      </table>`
    : ""

  const additionalRows = (d.additionalItems ?? []).map(item =>
    `<tr>
      <td style="padding:8px 0;border-top:1px dashed #2218121f;font-family:'Manrope',Arial,sans-serif;font-size:14px;color:#4A3A2E;">${item.label}</td>
      <td align="right" style="padding:8px 0;border-top:1px dashed #2218121f;font-family:'Cormorant Garamond',Georgia,serif;font-size:17px;color:#221812;">${item.price}</td>
    </tr>`
  ).join("")

  const promoRow = d.promoCode && d.promoDiscount
    ? `<tr>
        <td style="padding:8px 0;border-top:1px dashed #2218121f;font-family:'Manrope',Arial,sans-serif;font-size:14px;color:#B86F4A;">Code ${d.promoCode}</td>
        <td align="right" style="padding:8px 0;border-top:1px dashed #2218121f;font-family:'Cormorant Garamond',Georgia,serif;font-size:17px;color:#B86F4A;">${d.promoDiscount}</td>
      </tr>`
    : ""

  const stripeFeesRow = d.stripeFees
    ? `<tr>
        <td style="padding:8px 0;border-top:1px dashed #2218121f;font-family:'Manrope',Arial,sans-serif;font-size:13px;color:#8B7563;">Frais Stripe</td>
        <td align="right" style="padding:8px 0;border-top:1px dashed #2218121f;font-family:'Manrope',Arial,sans-serif;font-size:13px;color:#8B7563;">${d.stripeFees}</td>
      </tr>`
    : ""

  const netRow = d.netAmount
    ? `<tr>
        <td style="padding:18px 0 0;border-top:1px solid #221812;font-family:'Manrope',Arial,sans-serif;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:#8B7563;">Re&#231;u sur votre compte</td>
        <td align="right" style="padding:18px 0 0;border-top:1px solid #221812;font-family:'Cormorant Garamond',Georgia,serif;font-size:28px;color:#3D6346;">${d.netAmount}</td>
      </tr>`
    : `<tr>
        <td style="padding:18px 0 0;border-top:1px solid #221812;font-family:'Manrope',Arial,sans-serif;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:#8B7563;">Total pay&#233;</td>
        <td align="right" style="padding:18px 0 0;border-top:1px solid #221812;font-family:'Cormorant Garamond',Georgia,serif;font-size:28px;color:#3D6346;">${d.amountEur}</td>
      </tr>`

  const stripeLink = d.dashboardUrl
    ? `<p style="margin:16px 0 0;font-family:'Manrope',Arial,sans-serif;font-size:12px;color:#8B7563;">
        Versement Stripe pr&#233;vu sous 24h &#183; <a href="${d.dashboardUrl}" style="color:#B86F4A;">Voir sur Stripe &#8594;</a>
      </p>`
    : ""

  const profileHref = d.clientProfileUrl ?? "https://labulledevie.fr/dashboard/clients"

  const preheader = d.dayNum
    ? `${d.clientName} vient de r&#233;server ${d.serviceName} pour ${d.dayOfWeek ?? ""} ${d.dayNum} &#224; ${d.time}.`
    : `${d.clientName} vient de r&#233;server ${d.serviceName} le ${d.date} &#224; ${d.time}.`

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>Nouvelle r&#233;servation &#8212; La bulle de vie</title>
<style>
  body{margin:0;padding:0;width:100% !important;background:#F1E7DA;}
  table{border-collapse:collapse}
  img{border:0;outline:none;display:block}
  a{text-decoration:none;color:#B86F4A}
  .preheader{display:none !important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden}
</style>
</head>
<body style="margin:0;padding:0;background:#F1E7DA;">

<div class="preheader">${preheader}</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F1E7DA;padding:32px 16px;">
  <tr>
    <td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

        <!-- Brand header -->
        <tr>
          <td align="center" style="padding:8px 0 28px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="vertical-align:middle;padding-right:12px;">
                  <table cellpadding="0" cellspacing="0" border="0"><tr><td width="12" height="12" style="background:#B86F4A;border-radius:50%;line-height:12px;font-size:0;">&nbsp;</td></tr></table>
                </td>
                <td style="vertical-align:middle;font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;font-size:22px;color:#221812;">
                  La bulle de vie &#183; Studio
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- HERO -->
        <tr>
          <td style="background:#FBF6EF;border-radius:18px;padding:48px 48px 40px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="left" style="margin-bottom:24px;">
              <tr>
                <td style="background:#EAF1E8;border-radius:999px;padding:6px 14px;">
                  <p style="margin:0;font-family:'Manrope',Arial,sans-serif;font-size:11px;letter-spacing:.14em;color:#3D6346;text-transform:uppercase;">&#10003; Nouvelle r&#233;servation</p>
                </td>
              </tr>
            </table>
            <h1 style="margin:0 0 12px;font-family:'Cormorant Garamond',Georgia,serif;font-weight:400;font-size:34px;line-height:1.05;color:#221812;">
              ${d.clientName} a r&#233;serv&#233; <em style="color:#B86F4A;font-style:italic;">${d.serviceName}.</em>
            </h1>
            <p style="margin:0;font-family:'Manrope',Arial,sans-serif;font-size:15px;line-height:1.55;color:#4A3A2E;">
              R&#233;servation confirm&#233;e et pay&#233;e. Voici les d&#233;tails pour pr&#233;parer la s&#233;ance.
            </p>
          </td>
        </tr>

        <tr><td height="16">&nbsp;</td></tr>

        <!-- WHEN -->
        <tr>
          <td>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="180" valign="top" style="padding-right:14px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td align="center" style="background:#221812;border-radius:14px;padding:24px 12px;">
                        ${dateTileInner}
                      </td>
                    </tr>
                  </table>
                </td>
                <td valign="top" style="background:#FBF6EF;border-radius:14px;padding:24px 28px;">
                  <p style="margin:0 0 16px;font-family:'Manrope',Arial,sans-serif;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:#8B7563;">S&#233;ance</p>
                  <p style="margin:0 0 6px;font-family:'Cormorant Garamond',Georgia,serif;font-size:24px;color:#221812;line-height:1.1;">${d.serviceName}</p>
                  <p style="margin:0 0 16px;font-family:'Manrope',Arial,sans-serif;font-size:13px;color:#4A3A2E;">${d.durationMin ? `${d.durationMin} min &#183; ` : ""}${locationLabel} &#183; ${d.amountEur}</p>
                  <p style="margin:14px 0 4px;font-family:'Manrope',Arial,sans-serif;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:#8B7563;">R&#233;f&#233;rence</p>
                  <p style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:16px;color:#221812;letter-spacing:.04em;">${d.ref}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr><td height="16">&nbsp;</td></tr>

        <!-- CLIENT CARD -->
        <tr>
          <td style="background:#FBF6EF;border-radius:18px;padding:32px 36px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="64" valign="top">
                  <table cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td width="56" height="56" align="center" style="background:#B86F4A;border-radius:50%;line-height:56px;font-family:'Cormorant Garamond',Georgia,serif;font-size:26px;color:#ffffff;">${initial}</td>
                    </tr>
                  </table>
                </td>
                <td valign="top" style="padding-left:16px;">
                  <p style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:22px;color:#221812;">${d.clientName}${vipBadge}</p>
                  ${statsLine}
                </td>
              </tr>
            </table>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;">
              <tr>
                <td width="50%" valign="top" style="padding:14px 0;border-top:1px solid #2218121f;">
                  <p style="margin:0;font-family:'Manrope',Arial,sans-serif;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#8B7563;">E&#8209;mail</p>
                  <p style="margin:4px 0 0;"><a href="mailto:${d.clientEmail}" style="font-family:'Manrope',Arial,sans-serif;font-size:14px;color:#221812;text-decoration:none;">${d.clientEmail}</a></p>
                </td>
                <td width="50%" valign="top" style="padding:14px 0 14px 14px;border-top:1px solid #2218121f;">
                  ${d.clientPhone
                    ? `<p style="margin:0;font-family:'Manrope',Arial,sans-serif;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#8B7563;">T&#233;l&#233;phone</p>
                       <p style="margin:4px 0 0;"><a href="tel:${d.clientPhone}" style="font-family:'Manrope',Arial,sans-serif;font-size:14px;color:#221812;text-decoration:none;">${d.clientPhone}</a></p>`
                    : ""}
                </td>
              </tr>
            </table>
            ${privateNotesBlock}
            ${clientMessageBlock}
          </td>
        </tr>

        <tr><td height="16">&nbsp;</td></tr>

        <!-- PAYMENT SUMMARY -->
        <tr>
          <td style="background:#FBF6EF;border-radius:18px;padding:32px 36px;">
            <p style="margin:0 0 18px;font-family:'Manrope',Arial,sans-serif;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:#8B7563;">Paiement</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding:8px 0;font-family:'Manrope',Arial,sans-serif;font-size:14px;color:#4A3A2E;">${d.serviceName}${d.durationMin ? ` &#183; ${d.durationMin} min` : ""}</td>
                <td align="right" style="padding:8px 0;font-family:'Cormorant Garamond',Georgia,serif;font-size:17px;color:#221812;">${d.amountEur}</td>
              </tr>
              ${additionalRows}
              ${promoRow}
              ${stripeFeesRow}
              ${netRow}
            </table>
            ${stripeLink}
          </td>
        </tr>

        <tr><td height="16">&nbsp;</td></tr>

        <!-- CTAs -->
        <tr>
          <td align="center" style="padding:12px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="background:#221812;border-radius:999px;">
                  <a href="https://labulledevie.fr/dashboard/agenda" style="display:inline-block;padding:14px 26px;font-family:'Manrope',Arial,sans-serif;font-size:14px;color:#ffffff;text-decoration:none;">
                    Voir dans l'agenda &#8594;
                  </a>
                </td>
                <td width="10">&nbsp;</td>
                <td style="border-radius:999px;border:1px solid #221812;">
                  <a href="${profileHref}" style="display:inline-block;padding:13px 24px;font-family:'Manrope',Arial,sans-serif;font-size:14px;color:#221812;text-decoration:none;">
                    Fiche cliente
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr><td height="24">&nbsp;</td></tr>

        <!-- FOOTER -->
        <tr>
          <td align="center" style="padding:8px 32px;">
            <p style="margin:0 0 4px;font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;font-size:14px;color:#221812;">
              La bulle de vie &#183; Studio
            </p>
            <p style="margin:0;font-family:'Manrope',Arial,sans-serif;font-size:11px;color:#8B7563;">
              Notification envoy&#233;e &#183; <a href="https://labulledevie.fr/dashboard/notifs" style="color:#8B7563;">G&#233;rer mes notifications</a>
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
  subject?: string
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

  const subjectRow = data.subject
    ? `<tr><td style="padding:0 12px 0 0;vertical-align:top;">
        <p style="margin:0;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#C4956A;">Sujet</p>
        <p style="margin:4px 0 0;font-size:15px;color:#2C1F14;">${data.subject}</p>
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
              ${subjectRow}
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
    subject: `[${data.subject ?? "Contact"}] Message de ${data.senderName}`,
    html,
  })

  if (error) throw new Error(`Resend error: ${JSON.stringify(error)}`)
}

export async function sendNewsletterWelcome(to: string, data: {
  unsubscribeToken: string
}): Promise<void> {
  const client = getResend()
  if (!client) return

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  const unsubUrl = `${appUrl}/api/newsletter/unsubscribe?token=${data.unsubscribeToken}`

  const html = emailWrapper(`
  <tr>
    <td style="background:#2C1F14;padding:44px 48px 40px;border-radius:12px 12px 0 0;text-align:center;">
      <p style="margin:0;font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#C4956A;">La Bulle de Vie</p>
      <h1 style="margin:12px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:normal;color:#F5EDE5;">
        Bienvenue dans la bulle
      </h1>
    </td>
  </tr>
  <tr>
    <td style="background:#FDFAF7;padding:48px;text-align:center;">
      <p style="margin:0 0 20px;font-size:16px;color:#1C1C1C;line-height:1.7;">
        Merci de rejoindre notre liste. Vous recevrez en avant-première nos nouveaux soins, offres exclusives et inspirations bien-être.
      </p>
      <p style="margin:0 0 36px;font-size:15px;color:#6B5C4E;line-height:1.7;">
        D'ici là, prenez soin de vous.
      </p>
      <p style="margin:0;font-size:15px;color:#1C1C1C;line-height:1.7;">
        <em style="font-family:Georgia,'Times New Roman',serif;font-size:17px;color:#2C1F14;">L'équipe La Bulle de Vie</em>
      </p>
      <p style="margin:40px 0 0;font-size:11px;color:#B8A898;">
        <a href="${unsubUrl}" style="color:#B8A898;">Se désinscrire</a>
      </p>
    </td>
  </tr>`)

  const { error } = await client.emails.send({
    from: FROM,
    to,
    subject: "Bienvenue dans la bulle ✦",
    html,
  })

  if (error) throw new Error(`Resend error: ${JSON.stringify(error)}`)
}

export async function sendNewReviewNotification(to: string, data: {
  clientName: string
  serviceName: string
  stars: number
  body: string
}): Promise<void> {
  const client = getResend()
  if (!client) return

  const stars = "★".repeat(data.stars) + "☆".repeat(5 - data.stars)

  const html = emailWrapper(`
  <tr>
    <td style="background:#2C1F14;padding:40px 48px 36px;border-radius:12px 12px 0 0;">
      <p style="margin:0;font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#C4956A;">La Bulle de Vie</p>
      <h1 style="margin:10px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:normal;color:#F5EDE5;">
        Nouvel avis reçu
      </h1>
    </td>
  </tr>
  <tr>
    <td style="background:#FDFAF7;padding:48px;">
      <table width="100%" cellpadding="0" cellspacing="0"
        style="background:#F5EDE5;border:1px solid #E2D5CB;border-radius:10px;margin-bottom:28px;">
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 4px;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#C4956A;">Client</p>
            <p style="margin:0 0 18px;font-size:16px;color:#2C1F14;font-weight:500;">${data.clientName}</p>
            <p style="margin:0 0 4px;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#C4956A;">Prestation</p>
            <p style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-size:18px;color:#2C1F14;">${data.serviceName}</p>
            <p style="margin:0 0 4px;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#C4956A;">Note</p>
            <p style="margin:0 0 18px;font-size:20px;color:#C4956A;letter-spacing:3px;">${stars}</p>
            <p style="margin:0 0 4px;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#C4956A;">Commentaire</p>
            <p style="margin:0;font-size:15px;color:#2C1F14;line-height:1.7;font-style:italic;">"${data.body}"</p>
          </td>
        </tr>
      </table>
      <p style="margin:0;font-size:14px;color:#6B5C4E;line-height:1.7;text-align:center;">
        Rendez-vous dans votre tableau de bord pour approuver ou masquer cet avis.
      </p>
    </td>
  </tr>`)

  const { error } = await client.emails.send({
    from: FROM,
    to,
    subject: `Nouvel avis — ${data.clientName} · ${data.stars}/5 étoiles`,
    html,
  })

  if (error) throw new Error(`Resend error: ${JSON.stringify(error)}`)
}

export async function sendOrderConfirmation(to: string, data: {
  clientName: string
  ref: string
  amountEur: string
  items: { name: string; qty: number; unitPrice: number }[]
  shippingAddress?: Record<string, string> | null
}): Promise<void> {
  const client = getResend()
  if (!client) return

  const itemRows = data.items.map(i => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #E2D5CB;font-size:14px;color:#2C1F14;">${i.name}</td>
      <td style="padding:10px 0;border-bottom:1px solid #E2D5CB;font-size:14px;color:#2C1F14;text-align:center;">×${i.qty}</td>
      <td style="padding:10px 0;border-bottom:1px solid #E2D5CB;font-size:14px;color:#2C1F14;text-align:right;">
        ${((i.unitPrice * i.qty) / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
      </td>
    </tr>`).join("")

  const addr = data.shippingAddress
  const addrBlock = addr
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5EDE5;border:1px solid #E2D5CB;border-radius:10px;margin-bottom:28px;">
        <tr><td style="padding:24px 32px;">
          <p style="margin:0 0 10px;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#C4956A;">Adresse de livraison</p>
          <p style="margin:0;font-size:14px;color:#2C1F14;line-height:1.7;">
            ${addr.name ? addr.name + "<br>" : ""}
            ${addr.address ? addr.address + "<br>" : ""}
            ${addr.postalCode ? addr.postalCode + " " : ""}${addr.city ? addr.city : ""}
          </p>
        </td></tr>
      </table>`
    : ""

  const html = emailWrapper(`
  <tr>
    <td style="background:#2C1F14;padding:44px 48px 40px;border-radius:12px 12px 0 0;text-align:center;">
      <p style="margin:0;font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#C4956A;">La Bulle de Vie</p>
      <h1 style="margin:12px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:normal;color:#F5EDE5;">
        Votre commande est confirmée
      </h1>
    </td>
  </tr>
  <tr>
    <td style="background:#FDFAF7;padding:48px;">
      <p style="margin:0 0 8px;font-size:16px;color:#1C1C1C;">Bonjour <strong>${data.clientName}</strong>,</p>
      <p style="margin:0 0 36px;font-size:15px;color:#6B5C4E;line-height:1.7;">
        Merci pour votre achat ! Votre commande a bien été enregistrée et sera préparée avec soin.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5EDE5;border:1px solid #E2D5CB;border-radius:10px;margin-bottom:28px;">
        <tr><td style="padding:28px 32px;">
          <p style="margin:0 0 18px;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#C4956A;">Récapitulatif</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${itemRows}
            <tr>
              <td colspan="2" style="padding:14px 0 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#C4956A;">Total réglé</td>
              <td style="padding:14px 0 0;text-align:right;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#2C1F14;">${data.amountEur} €</td>
            </tr>
          </table>
        </td></tr>
      </table>

      ${addrBlock}

      <p style="margin:0 0 32px;font-size:13px;color:#9A8070;text-align:center;">
        Référence : <strong style="color:#2C1F14;letter-spacing:1px;">${data.ref}</strong>
      </p>

      <p style="margin:0;font-size:15px;color:#1C1C1C;line-height:1.7;">
        À très bientôt,<br>
        <em style="font-family:Georgia,'Times New Roman',serif;font-size:17px;color:#2C1F14;">L'équipe La Bulle de Vie</em>
      </p>
    </td>
  </tr>`)

  const { error } = await client.emails.send({
    from: FROM,
    to,
    subject: `Commande confirmée — réf. ${data.ref}`,
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
