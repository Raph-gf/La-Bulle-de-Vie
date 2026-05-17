import { z } from "zod"

export const productSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  price: z.number().positive(),
  stock: z.number().int().min(0),
  dimensions: z.string().optional(),
  medium: z.string().optional(),
})

export type ProductInput = z.infer<typeof productSchema>
