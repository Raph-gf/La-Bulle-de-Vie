import { z } from "zod"

export const bookingSchema = z.object({
  serviceId: z.string().uuid(),
  date: z.string().datetime(),
  reason: z.string().min(1).max(500),
  symptoms: z.string().max(1000).optional(),
})

export type BookingInput = z.infer<typeof bookingSchema>
