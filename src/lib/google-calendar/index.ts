import { google } from "googleapis"

export type GCalToken = {
  access_token: string
  refresh_token: string
  expiry_date: number
  scope: string
}

export function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI ?? `${process.env.NEXT_PUBLIC_URL}/api/auth/google-calendar/callback`,
  )
}

export function getAuthUrl() {
  const client = getOAuthClient()
  return client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/calendar.events"],
    prompt: "consent",
  })
}

export async function exchangeCode(code: string): Promise<GCalToken> {
  const client = getOAuthClient()
  const { tokens } = await client.getToken(code)
  return tokens as GCalToken
}

export type CalendarEvent = {
  summary: string
  description?: string
  location?: string
  start: string  // ISO datetime
  end: string    // ISO datetime
}

export async function createCalendarEvent(token: GCalToken, event: CalendarEvent) {
  const client = getOAuthClient()
  client.setCredentials(token)

  const calendar = google.calendar({ version: "v3", auth: client })

  const res = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: event.summary,
      description: event.description,
      location: event.location,
      start: { dateTime: event.start, timeZone: "Europe/Paris" },
      end: { dateTime: event.end, timeZone: "Europe/Paris" },
    },
  })

  return res.data
}

export function isGCalConfigured() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
}
