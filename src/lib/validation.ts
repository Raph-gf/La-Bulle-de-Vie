/**
 * Shared server-side validation schemas (Zod).
 * Import these in API routes — never trust client-sent data.
 *
 * Rules applied everywhere:
 *  - Max lengths on every string to prevent payload bloat
 *  - HTML tags stripped from free-text fields to block XSS
 *  - Regex patterns for structured fields (email, phone, codes)
 *  - Amounts always validated against DB price, never trusted from client
 */

import { z } from "zod"

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Strip HTML tags and trim. Use on any free-text field. */
function stripHtml(s: string) {
  return s.replace(/<[^>]*>/g, "").trim()
}

/** String field with HTML stripped and a max length. */
const text = (max: number, min = 0) =>
  z
    .string()
    .max(max, `Maximum ${max} caractères`)
    .transform(stripHtml)
    .refine(s => s.length >= min, `Minimum ${min} caractère${min > 1 ? "s" : ""}`)

// ── Primitives ────────────────────────────────────────────────────────────────

export const emailSchema = z
  .string()
  .email("Adresse e‑mail invalide")
  .max(254, "Adresse e‑mail trop longue")
  .toLowerCase()

export const phoneSchema = z
  .string()
  .regex(/^[\+\d\s\-\(\)]{6,20}$/, "Numéro de téléphone invalide")
  .optional()
  .or(z.literal(""))

export const nameSchema = z
  .string()
  .min(1, "Requis")
  .max(100, "Maximum 100 caractères")
  .regex(/^[^<>&"'\/\\]+$/, "Caractères non autorisés")
  .transform(s => s.trim())

export const uuidSchema = z.string().uuid("Identifiant invalide")

export const starsSchema = z
  .number()
  .int()
  .min(1, "Minimum 1 étoile")
  .max(5, "Maximum 5 étoiles")

// ── Booking ───────────────────────────────────────────────────────────────────

export const bookingContactSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  location: z.enum(["cabinet", "domicile"], { error: () => ({ message: "Lieu invalide" }) }),
  notes: text(1000).optional(),
  isFirstVisit: z.boolean().optional().default(false),
})

export const bookingSchema = z.object({
  serviceId: uuidSchema,
  slotId: uuidSchema,
  contact: bookingContactSchema,
  /** Optional promo code — validated server-side against discount_codes table */
  discountCode: z.string().max(30).regex(/^[A-Z0-9\-]*$/, "Code invalide").optional(),
  /** Optional gift card code */
  giftCardCode: z.string().max(30).regex(/^[A-Z0-9\-]*$/, "Code invalide").optional(),
})

// ── Review ────────────────────────────────────────────────────────────────────

export const reviewSchema = z.object({
  appointmentId: uuidSchema,
  stars: starsSchema,
  body: text(1000, 10),
})

// ── Contact form ──────────────────────────────────────────────────────────────

export const contactSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  subject: text(150, 1),
  message: text(2000, 10),
})

// ── Newsletter ────────────────────────────────────────────────────────────────

export const newsletterSchema = z.object({
  email: emailSchema,
})

// ── Profile update ────────────────────────────────────────────────────────────

export const profileUpdateSchema = z.object({
  fullName: nameSchema,
  phone: phoneSchema,
  preferredLocation: z.enum(["cabinet", "domicile"]).optional(),
  defaultShippingAddress: z
    .object({
      street: text(200, 1),
      city: text(100, 1),
      zip: z.string().max(10).regex(/^[\dA-Z\s\-]{3,10}$/i, "Code postal invalide"),
    })
    .optional(),
  notificationPrefs: z
    .object({
      rappel24h: z.boolean(),
      rappel2h: z.boolean(),
      sms: z.boolean(),
      newsletter: z.boolean(),
    })
    .optional(),
})

// ── Discount / gift card validation ──────────────────────────────────────────

export const discountCodeInputSchema = z.object({
  code: z
    .string()
    .min(3, "Code trop court")
    .max(30, "Code trop long")
    .regex(/^[A-Z0-9\-]+$/, "Code invalide — majuscules et chiffres uniquement")
    .toUpperCase(),
})

export const giftCardInputSchema = z.object({
  code: z
    .string()
    .min(3, "Code trop court")
    .max(30, "Code trop long")
    .regex(/^[A-Z0-9\-]+$/, "Code invalide")
    .toUpperCase(),
})

// ── Specialist: availability slot creation ────────────────────────────────────

export const slotSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide (YYYY-MM-DD)"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Heure invalide (HH:MM)"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Heure invalide (HH:MM)"),
})

// ── Specialist: review reply ──────────────────────────────────────────────────

export const reviewReplySchema = z.object({
  reviewId: uuidSchema,
  reply: text(500, 1),
})

// ── Utility: parse and return typed errors ────────────────────────────────────

/**
 * Parse unknown API body with a Zod schema.
 * Returns { data } on success or { error, fieldErrors } on failure.
 */
export function parseBody<T>(schema: z.ZodSchema<T>, body: unknown):
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> } {
  const result = schema.safeParse(body)
  if (result.success) return { ok: true, data: result.data }

  const fieldErrors: Record<string, string[]> = {}
  for (const issue of result.error.issues) {
    const key = issue.path.join(".")
    fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message]
  }
  return {
    ok: false,
    error: "Données invalides",
    fieldErrors,
  }
}
