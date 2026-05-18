# La Bulle De Vie — Project Progress

> Update this file as each task is completed. ✅ = done, 🔄 = in progress, ⬜ = todo.

---

## Phase 1 — Foundation (UI, no backend)

### Design system
- ✅ Custom CSS design system (`src/app/bulle.css`) — CSS variables for colors, fonts, spacing, components
- ✅ Google Fonts — Cormorant Garamond (serif headings) + Manrope (sans body) via `@import`
- ✅ Global CSS variables: `--ink`, `--paper`, `--cream`, `--terra`, `--terra-soft`, `--line`, `--mute`, `--serif`, `--sans`
- ⬜ shadcn/ui — skipped in favour of the custom design system from Figma

### Layout
- ✅ Navbar — logo, links, CTA button, mobile hamburger menu, scroll-aware shadow
  - Dark-hero detection: white links on `/`, `/prestations`, `/decorations`, `/soins/*`
  - Scroll state: background appears after 40px scroll
- ✅ Footer — columns, newsletter input, contact info, social links
- ✅ Floating bubbles background animation (`Bulles.tsx`)

### Animations
- ✅ Migrated from custom IntersectionObserver to **Motion (Framer Motion)**
- ✅ `Reveal.tsx` — `whileInView` wrapper component, replaces `.reveal` CSS class
- ✅ `AnimatedCounter.tsx` — count-up animation triggered by `useInView`

### Public pages
- ✅ **Home** (`/`) — hero, about, services preview, animated stats, testimonials, FAQ accordion, newsletter CTA
- ✅ **Prestations** (`/prestations`) — filterable service catalog (Tous / Massages / Énergétique / Création), 6 cards, "Le déroulé" 3-step section, CTA
- ✅ **Soin detail** (`/soins/[id]`) — 6 individual soin pages (corps, visage, sel, galet, mains, jambes)
  - Hero with animated glass info card, facts row, 2-col layout
  - Description, ritual steps, benefits grid, FAQ accordion
  - Sticky aside: info card, rating bars (animated fill), contact
  - Reviews section: animated rating bars, filterable review cards with replies
  - Related soins, CTA section, mobile sticky bar
  - Data source: `src/lib/soins.ts` (typed `SOINS` record)
- ✅ **Décorations** (`/decorations`) — 5-filter art catalog, 6 product cards with hover reveal, custom order section
- ✅ **Mon parcours** (`/mon-parcours`) — bio grid, animated stats, alternating timeline, tabbed services table
- ✅ **Contact** (`/contact`) — hours, form, FAQ accordion, social links
- ⬜ 404 page

### Booking page
- ✅ **Booking wizard** (`/booking` and `/booking/[serviceId]`) — 5-step wizard with placeholder data
  - Step 1: Service selection cards (6 soins, pre-selected if coming from a soin page)
  - Step 2: Interactive calendar (Mon–Sat, 60-day window, month navigation)
  - Step 3: Time slot grid (pseudo-availability, deterministic by date)
  - Step 4: Contact form (name, email, phone, location, notes, first-timer checkbox)
  - Step 5: Review summary with "Modifier" links per step
  - Success screen: confetti bubble animation + booking reference (BDV-XXXXXX)
  - Live summary sidebar card (updates as you fill each step)
  - `BookingWizard.tsx` shared component — both pages use it
- All "Réserver" buttons across the site wired up:
  - Navbar, Home, Mon parcours, Prestations, Décorations → `/booking` (no pre-selection)
  - Soin detail pages → `/booking/[serviceId]` (pre-selects that soin)

### Supabase middleware (graceful skip)
- ✅ Middleware and `(client)/layout.tsx` both skip auth check when `NEXT_PUBLIC_SUPABASE_URL` is not set — allows local development without Supabase

---

## Phase 2 — Supabase setup

### ORM & database tooling
- ✅ Prisma 7.8.0 installed (`prisma` + `@prisma/client`)
- ✅ `@prisma/adapter-pg` + `pg` installed — required by Prisma 7 (URLs removed from schema)
- ✅ `tsx` installed as TypeScript runner for seed script
- ✅ `prisma.config.ts` — Prisma 7 config: loads `.env.local`, uses `DIRECT_URL` for migrations
- ✅ `src/lib/prisma.ts` — singleton PrismaClient with pg adapter + hot-reload safe globalThis pattern

### Schema
- ✅ `prisma/schema.prisma` — 8 models, 5 enums, snake_case table names via `@@map`
  - `Profile` (extends auth.users), `Service`, `AvailabilitySlot`, `Appointment`
  - `Review`, `Product`, `Order`, `OrderItem`
  - Enums: `UserRole`, `AppointmentStatus`, `RefundStatus`, `OrderStatus`, `ServiceCategory`
- ✅ Migration applied to Supabase: `prisma/migrations/20260518185152_init/migration.sql`

### RLS & indexes
- ✅ `supabase/migrations/001_rls_policies.sql` — RLS on all 8 tables
  - Fixed `auth.uid()::text` cast (Prisma stores IDs as `text`, not `uuid`)
  - Idempotent: `DROP POLICY IF EXISTS` before each `CREATE POLICY`
  - 16 indexes on FK columns + frequently queried fields (status, isPublished, slug, date…)
  - `reviews.stars` CHECK constraint (1–5)
- ✅ RLS policies applied to live Supabase database

### Seed
- ✅ `prisma/seed.ts` — seeds 6 soins (exact match to `src/lib/soins.ts`) + 5 artwork products
- ✅ Seed executed successfully — data live in Supabase

### Environment
- ✅ `.env.local` — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `DATABASE_URL`, `DIRECT_URL` filled in
- ✅ TypeScript types: `src/types/database.ts` exports all Prisma row types + composite types

### Still to do (deferred to later phases)
- ⬜ Replace static `SOINS` data with Prisma query on `/prestations` and `/soins/[id]`
- ⬜ Replace static product data on `/decorations` with Prisma query

---

## Phase 3 — Auth ✅ Complete

- ✅ Login page (`/login`) — full Connexion.html design, 4 modes: login / register / forgot / success
  - React Hook Form + Zod validation on all 3 forms
  - Floating label inputs, password strength meter, show/hide toggle
  - Google account picker → real OAuth redirect
- ✅ `/register` redirects to `/login?mode=register`
- ✅ Login form wired to Supabase `signInWithPassword` — redirects to `/compte` on success
- ✅ Register form wired to Supabase `signUp` — stores `full_name` + `phone` in user metadata
- ✅ Forgot password wired to `resetPasswordForEmail`
- ✅ Google OAuth working — `signInWithOAuth({ provider: "google" })`
- ✅ `src/app/auth/callback/route.ts` — exchanges OAuth code for session, redirects to `/compte`
- ✅ Inline auth error display (wrong password, duplicate email, etc.)
- ✅ `(client)/layout.tsx` guard — redirects unauthenticated users to `/login`
- ✅ Navbar avatar — shows user initial in terracotta circle when logged in, links to `/compte`
- ✅ Mon compte page (`/compte`) — 7-view account space (sidebar SPA pattern)
  - Views: Mon espace, Rendez‑vous, Historique, Favoris, Préférences, Paiement, Cadeaux, Profil & sécurité
  - User name/initial from Supabase auth, working logout (`signOut` + redirect)
  - Live countdown timer, toggle switches, toast notifications
  - Hash-based routing (`#overview`, `#appts`, etc.), mobile drawer
- ⬜ Profile row auto-created in `profiles` table on signup (DB trigger or callback)

### Mon compte — data to wire up (deferred)
- ⬜ Appointments view: replace placeholder séances with real Prisma query
- ⬜ History view: query past appointments from DB
- ⬜ Stats: query real counts (total séances, reviews, etc.)
- ⬜ Overview: show real next appointment + real countdown target
- ⬜ Loyalty bar: compute from real appointment count
- ⬜ Favorites: store/query favorites in DB
- ⬜ Payments: pull Stripe payment methods via API
- ⬜ Gifts: query gift cards from DB
- ⬜ Settings form: save changes to `profiles` table
- ⬜ Notification preferences: persist to `profiles` table

---

## Phase 4 — Booking + Stripe

> Prerequisite: specialist must be able to set availability before clients can book real slots.

### Specialist availability (prerequisite)
- ⬜ Specialist sets weekly working hours in dashboard (stored in `availability_slots`)
- ⬜ Specialist can block specific dates / add one-off slots

### Booking wizard wiring
- ✅ Booking wizard UI — 5-step flow exists (service → date → time → contact → review)
- ⬜ Step 2 calendar: fetch real available dates from `availability_slots` (not fake deterministic logic)
- ⬜ Step 3 time slots: fetch real slots for selected date from `availability_slots`
- ⬜ Step 4 contact: pre-fill name/email/phone from Supabase user if logged in
- ⬜ Step 5 submit → create `appointment` row (status: `pending`) + mark slot as `isBooked: true` (atomic transaction)
- ⬜ Add Stripe payment step after review — Stripe Elements card form
- ⬜ Create Stripe `PaymentIntent` server-side on booking submit
- ⬜ Stripe webhook: `payment_intent.succeeded` → set appointment `status: confirmed`
- ⬜ Appointment confirmation / receipt page (shown after successful payment)

### Cancellation & refunds
- ⬜ Client can cancel from `/compte#appts` → trigger Stripe refund based on cancellation policy
- ⬜ Refund webhook → update appointment `refundStatus` in DB
- ⬜ Slot freed on cancellation (`isBooked: false`)

### Discount & gift card logic
- ✅ `discount_codes` table in schema — type (percent/fixed), value, maxUses, firstBookingOnly, expiresAt
- ✅ `gift_cards` table in schema — code, balance, purchasedBy, redeemedBy, expiresAt
- ✅ `Appointment` + `Order` updated — discountCodeId, giftCardId, discountAmount, amountPaid fields
- ⬜ Server-side price calculation utility — computes final amount after discounts (never trust client price)
- ⬜ Promo code validation API (`POST /api/discount/validate`) — checks code exists, not expired, not maxed out
- ⬜ Gift card validation API (`POST /api/gift-card/validate`) — checks code, returns remaining balance
- ⬜ Welcome discount (−20%) — auto-applied on first booking via `isFirstVisit` flag
- ⬜ Loyalty reward — flag on profile at 10th confirmed appointment, specialist manually redeems

### Error handling (to implement per route in Phase 4+)
- ⬜ Consistent API error format: `{ error: string, code?: string, fieldErrors?: Record<string, string[]> }`
- ⬜ Race condition on slot booking — catch Prisma unique constraint error (`P2002`), return "Ce créneau vient d'être pris"
- ⬜ Stripe payment failed webhook (`payment_intent.payment_failed`) — cancel appointment, free slot
- ⬜ Stripe error codes → French user messages (card_declined, insufficient_funds, expired_card, incorrect_cvc)
- ⬜ Stripe webhook signature verification on every webhook route
- ⬜ Never expose raw Prisma/DB errors to client — log server-side, return generic message
- ⬜ React error boundary on booking wizard and `/compte` page

### Input security
- ✅ `src/lib/validation.ts` — shared Zod schemas for all user inputs
  - HTML tag stripping on all free-text fields (notes, messages, names)
  - Max lengths on every field (prevents payload bloat)
  - Regex patterns: email (RFC), phone, promo codes (uppercase alphanumeric)
  - `parseBody()` helper — parse + return typed field errors for API routes
  - Schemas: `bookingSchema`, `reviewSchema`, `contactSchema`, `newsletterSchema`, `profileUpdateSchema`, `discountCodeInputSchema`, `giftCardInputSchema`, `slotSchema`, `reviewReplySchema`
- ✅ Security HTTP headers in `next.config.ts` — X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- ⬜ Rate limiting on sensitive routes (auth, booking, contact) — Upstash Redis `@upstash/ratelimit`
  - Login attempts: 5 per 15 min per IP
  - Booking creation: 3 per hour per IP
  - Contact form: 5 per hour per IP
- ⬜ All API routes must use `parseBody()` from `src/lib/validation.ts` — no raw `req.json()` without validation
- ⬜ Stripe amount double-check — compare PaymentIntent amount against DB service price before confirming

### Static data (deferred from Phase 2)
- ⬜ `/prestations` and `/soins/[id]` — replace `src/lib/soins.ts` with Prisma query
- ⬜ `/soins/[id]` reviews section — replace hardcoded reviews with real DB data

---

## Phase 5 — Notifications

- ⬜ Resend SMTP configured in Supabase (replaces default email for auth flows)
- ⬜ Booking confirmation email to client (service, date, time, location, cancellation link)
- ⬜ Instant notification to specialist on new booking (client name, date, time, service, notes)
- ⬜ 24h reminder email to client
- ⬜ Contact form (`/contact`) → send message to specialist via Resend
- ⬜ Newsletter form (home + footer) → store subscriber email in DB / send to mailing list
- ⬜ Google Calendar — one-click "Add to my calendar" after booking confirmation
- ⬜ Google Calendar — auto-add event to specialist's calendar on booking

---

## Phase 6 — Specialist Dashboard

> Dashboard layout and sidebar exist but all sub-pages are empty placeholders.

- ✅ Dashboard layout with sidebar navigation
- ✅ Sub-page stubs: rendez-vous, clients, finances, avis, boutique
- ⬜ Overview — today's appointments, weekly stats, revenue snapshot
- ⬜ Agenda — calendar view, appointment list, detail modal (client name, service, notes)
- ⬜ Availability management — set weekly hours, block dates, add one-off slots
- ⬜ Clients — list with search, client profile (history, specialist notes per client)
- ⬜ Finances — monthly revenue chart (Stripe-synced), refund tracker, CSV export
- ⬜ Invoice generation (PDF) per client on demand
- ⬜ Reviews — list, approve/hide, reply, aggregate rating per service
- ⬜ Services management — edit price, duration, description, toggle published
- ⬜ Boutique — add/edit/delete products, stock management, orders list
- ⬜ Settings — profile, working hours, cancellation policy config
- ⬜ Dashboard auth guard — only `role: specialist` can access

---

## Phase 7 — E-commerce

- ✅ Décorations catalog page (static data, UI complete)
- ⬜ Wire catalog to real Prisma products from DB
- ⬜ "Ajouter au panier" → real cart state (Zustand or React context)
- ⬜ Cart drawer + `/panier` page showing items, quantities, total
- ⬜ Stripe checkout for cart (PaymentIntent or Checkout Session)
- ⬜ Order confirmation page + confirmation email via Resend
- ⬜ Client order history wired in `/compte#history`
- ⬜ Specialist marks order as shipped in dashboard boutique

---

## Phase 8 — Missing pages & loose ends

- ⬜ Password reset form — `/login?mode=reset` (after clicking email link, let user enter new password via `updateUser`)
- ⬜ Profile auto-created in `profiles` table on signup (Supabase DB trigger)
- ⬜ Review submission — form triggered from `/compte#history` after completed appointment
- ⬜ Gift card purchase + redemption flow
- ⬜ Favorites — store in DB, toggle from `/soins/[id]` page
- ⬜ 404 page
- ⬜ `/compte` data wiring (see Phase 3 deferred list above)

---

## Phase 9 — Polish & deploy

- ⬜ SMS reminders via Twilio (24h before appointment)
- ⬜ Push notifications via OneSignal
- ⬜ Mobile responsiveness audit (all pages)
- ⬜ Accessibility audit (aria labels, keyboard nav, contrast)
- ⬜ Performance audit (image optimization, lazy loading)
- ⬜ Security audit (RLS policies, API route guards, input sanitization)
- ⬜ Deploy to Vercel
- ⬜ Connect custom domain
- ⬜ Set up Stripe production keys + webhook endpoint

---

## Key files

| Path | What it is |
|------|------------|
| `src/app/bulle.css` | Entire CSS design system (~1100 lines) |
| `src/lib/soins.ts` | Static data for all 6 soins (typed) |
| `src/components/booking/BookingWizard.tsx` | 5-step booking wizard component |
| `src/components/animations/Reveal.tsx` | Motion whileInView wrapper |
| `src/components/animations/AnimatedCounter.tsx` | Count-up animation |
| `src/components/animations/Bulles.tsx` | Floating bubbles background |
| `src/components/layout/Navbar.tsx` | Responsive navbar with dark-hero detection |
| `src/components/layout/Footer.tsx` | Site footer |
| `src/app/(public)/soins/[id]/page.tsx` | Soin detail page (dynamic) |
| `src/app/(client)/booking/page.tsx` | Generic booking (no pre-selection) |
| `src/app/(client)/booking/[serviceId]/page.tsx` | Pre-selected soin booking |

## Current phase: Phase 4 — Booking + Stripe
## Last session: 2026-05-19
## Next step: Specialist availability management → real slots → booking wizard wiring → Stripe payment
