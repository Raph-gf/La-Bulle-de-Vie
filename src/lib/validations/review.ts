import { z } from "zod"

export const reviewSchema = z.object({
  appointmentId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
})

export type ReviewInput = z.infer<typeof reviewSchema>
