// TODO: implement Google Calendar OAuth flow and event creation
export async function addEventToCalendar(accessToken: string, event: {
  title: string
  description: string
  startDateTime: string
  endDateTime: string
}) {
  const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      summary: event.title,
      description: event.description,
      start: { dateTime: event.startDateTime },
      end: { dateTime: event.endDateTime },
    }),
  })

  return response.json()
}
