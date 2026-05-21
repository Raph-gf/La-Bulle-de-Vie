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
- ✅ Specialist sets weekly working hours in dashboard (`/dashboard/disponibilites`)
  - Toggle each day (Mon–**Sun**), set start/end time per day
  - Choose slot duration: 30 / 45 / 60 / 90 min
  - Optional lunch break time range
  - Live slot count preview per day + weekly total
  - "Générer les créneaux" → generates real `availability_slots` rows for next 60 days
  - `GET /api/dashboard/availability` — load saved schedule + upcoming slot count
  - `POST /api/dashboard/availability` — save schedule + regenerate slots
  - Bug fixed: Sunday was missing from `DayKey` type, `DAY_LABELS`, `DAYS` array, `DEFAULT` schedule, API `WORK_DAYS` set, and validation loop
  - Bug fixed: old saved schedules (pre-Sunday) crashed on load — fixed by merging with `DEFAULT` so missing keys get safe fallbacks
  - Bug fixed: slot generation used `setHours` (local time) — in France (UTC+2) all slot dates were stored one day early. Fixed with `setUTCHours` / `getUTCDay` / `setUTCDate` throughout
  - Bug fixed: booking wizard fetched slots with `toISOString()` (UTC) — clicking any date in UTC+ timezone fetched the previous day's slots. Fixed using local `getFullYear/getMonth/getDate`
- ⬜ UX: add "unsaved changes" indicator so specialist knows to click "Générer les créneaux" after edits
- ⬜ Specialist can block specific dates / add one-off slots

### Booking wizard wiring
- ✅ Booking wizard UI — 5-step flow exists (service → date → time → contact → review)
- ✅ Step 2 calendar: fetches real available dates from `GET /api/booking/availability/dates`
- ✅ Step 3 time slots: fetches real slots from `GET /api/booking/availability/slots?date=`
  - Real `slotId` stored on selection (ready to link to appointment row)
  - Shows "no slots" message when date has nothing available
- ✅ Step 4 contact: pre-fills name/email/phone from logged-in user's profile (server-side props)
- ✅ Step 5 submit → `POST /api/booking` — creates `appointment` row (status: `pending`) + marks slot `isBooked: true` (atomic transaction)
  - Handles slot race condition: P2002 unique constraint → friendly 409 "créneau vient d'être pris"
  - Accepts `serviceSlug` (maps to DB service ID server-side)
  - Guest bookings supported (no auth required)
  - Returns real `ref` code (BDV-XXXXXX) shown on success screen
- ✅ Stripe payment step added to booking wizard (step 6 — after review)
  - `@stripe/react-stripe-js` + `@stripe/stripe-js` installed
  - `src/lib/stripe.ts` — server-side Stripe singleton
  - `POST /api/booking` now creates a `PaymentIntent` server-side and returns `clientSecret`
  - Server computes price from DB (service price + travel fee + first-visit discount) — never trusts client amount
  - `PaymentElement` rendered with custom appearance matching design system (terracotta accent, Manrope font)
  - `stripe.confirmPayment({ redirect: "if_required" })` — handles 3DS inline, fallback redirect to `/booking/confirmation`
  - On payment success: appointment `status: confirmed` inline (webhook also handles it)
- ✅ Stripe webhook (`POST /api/webhooks/stripe`)
  - Signature verified via `stripe.webhooks.constructEvent` before processing
  - `payment_intent.succeeded` → sets appointment `status: confirmed` + stores `amountPaid`
  - `payment_intent.payment_failed` → cancels appointment + frees slot (`isBooked: false`)
  - Uses `appointmentId` from PaymentIntent metadata for all lookups
- ✅ Appointment confirmation / receipt page (`/booking/confirmation`)
  - Full-page design with living bubble backdrop (DOM-spawned, continuous — mirrors claude.ai/design exactly)
  - Celebratory one-shot burst of rising bubbles on load
  - Staggered fade-in for eyebrow, subtitle, CTAs, calendar row
  - Booking summary card (glassmorphism), "Et maintenant ?" steps, account CTA
  - Google Calendar / Apple Calendar / .ics export buttons
  - Full-width `<hr>` divider + transparent footer floating over bubbles
  - Race condition handled: polls `/api/booking/status` until `confirmed` or `refunded`; shows refund screen if payment failed
  - Bug fixed: bubble effects now depend on `[status]` — refs were null during loading state

### Cancellation & refunds
- ⬜ Client can cancel from `/compte#appts` → trigger Stripe refund based on cancellation policy
- ⬜ Refund webhook → update appointment `refundStatus` in DB
- ⬜ Slot freed on cancellation (`isBooked: false`)

### Travel distance pricing
- ✅ Schema ready — `Profile.travelPricing` (JSON), `Profile.cabinetAddress/Lat/Lng`, `Appointment.clientAddress`, `Appointment.travelFee`
- ⬜ Specialist configures travel pricing in dashboard settings:
  - **Option A — Zones** (recommended for simplicity): define up to 5 concentric zones
    - e.g. 0–5 km: +0€ · 5–15 km: +10€ · 15–30 km: +25€ · >30 km: indisponible
  - **Option B — Per km**: set a rate per km (e.g. 0.45€/km) + optional minimum fee
  - Set maximum travel distance (requests beyond this are blocked at booking)
  - Enter cabinet address → geocoded to lat/lng on save (Google Maps Geocoding API or free alternative)
- ⬜ Booking wizard step 4 ("à domicile" selected):
  - Show address input field for client
  - Call `/api/travel-fee` with client address → returns calculated surcharge
  - Display breakdown: "Service 105€ + Déplacement 15€ = 120€"
- ⬜ `/api/travel-fee` endpoint:
  - Geocode client address → lat/lng
  - Compute straight-line distance with Haversine formula (no API needed)
  - Look up specialist's zone config, return fee in cents
  - Upgrade path: swap Haversine for Google Maps Distance Matrix API for road distance
- ⬜ `Appointment.travelFee` stored and included in `amountPaid` (Stripe charge)
- ⬜ Travel fee shown on confirmation page and invoice

### Tax / VAT settings
- ✅ Schema ready — `Service.vatRate` (default 0%), `Product.vatRate` (default 20%), `Profile.taxSettings` (JSON)
- French context: massage/bien-être services are typically **TVA-exempt** (0%) — specialist toggles per service
- Physical products (décoration) are at **20% TVA** standard rate
- ⬜ Specialist can override VAT rate per service in dashboard (0%, 5.5%, 10%, 20%)
- ⬜ VAT amount calculated server-side and shown as a line item on invoices
- ⬜ `Profile.taxSettings` stores specialist's SIRET + VAT registration status for invoice generation

### Discount & gift card logic
- ✅ `discount_codes` table in schema — type (percent/fixed), value, maxUses, firstBookingOnly, expiresAt
- ✅ `gift_cards` table in schema — code, balance, purchasedBy, redeemedBy, expiresAt
- ✅ `Appointment` + `Order` updated — discountCodeId, giftCardId, discountAmount, amountPaid fields
- ⬜ Server-side price calculation utility — computes final amount after discounts (never trust client price)
- ⬜ Promo code validation API (`POST /api/discount/validate`) — checks code exists, not expired, not maxed out
- ⬜ Gift card validation API (`POST /api/gift-card/validate`) — checks code, returns remaining balance
- ⬜ Welcome discount (−20%) — auto-applied on first booking via `isFirstVisit` flag
- ⬜ Loyalty reward — flag on profile at 10th confirmed appointment, specialist manually redeems

### Toast notifications — `sonner` ✅ (2026-05-21)
- ✅ `sonner` installed — single `<Toaster position="top-right" richColors />` in root layout
- ✅ Hand-rolled toast systems removed from `disponibilites`, `parametres`, `compte` — replaced with `toast.success/error/warning`
- ✅ `BookingWizard`: slot taken (409) → `toast.error` + auto-jumps to step 2; payment failed → toast + inline error; network errors → toast on dates/slots fetch and booking submit

### Error handling (remaining)
- ⬜ Consistent API error format: `{ error: string, code?: string, fieldErrors?: Record<string, string[]> }`
- ⬜ Stripe error codes → French user messages (card_declined, insufficient_funds, expired_card, incorrect_cvc) — map in PaymentForm
- ⬜ Never expose raw Prisma/DB errors to client — log server-side, return generic message
- ⬜ React error boundary on booking wizard and `/compte` page — catch unexpected render crashes
- ⬜ Contact form (`/contact`) → `toast.success` on send, `toast.error` on failure (wired once Resend is set up)
- ⬜ Newsletter form → `toast.success` / `toast.error`
- ⬜ Dashboard TanStack Query error states → `toast.error` on query failure (currently silently fails)

### Skeleton loading states (planned)
- ⬜ **Booking wizard — Step 2 calendar**: replace `datesLoading` spinner with a skeleton calendar grid (7 columns × 5 rows of grey pill-shaped tiles)
- ⬜ **Booking wizard — Step 3 slots**: replace `slotsLoading` spinner with 6 skeleton slot pills
- ⬜ **Dashboard accueil KPI tiles**: 4 skeleton tiles (width 100%, height 80px, shimmer animation) shown while TanStack Query `isPending`
- ⬜ **Dashboard "Le programme du jour" card**: skeleton rows (avatar circle + two lines) while `isPending`
- ⬜ **Dashboard agenda week view**: full-height skeleton grid while appointments load
- ⬜ **`/compte` appointments view**: 3 skeleton appointment cards while `apptsLoading`
- ⬜ Shared `<Skeleton>` primitive — `src/components/ui/Skeleton.tsx` — accepts `width`, `height`, `className`; uses CSS `@keyframes shimmer` (gradient sweep left→right)
- ⬜ Shimmer animation in `bulle.css` — `@keyframes shimmer { from { background-position: -200% 0 } to { background-position: 200% 0 } }` with a warm cream-to-beige gradient matching the design system

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
- ✅ Booking confirmation email to client — fires on `payment_intent.succeeded` in Stripe webhook
  - Branded HTML: dark mocha header, cream body, booking summary card, tip block, ref number
  - Non-blocking: email failure never fails the webhook response
- ✅ Instant notification to specialist on new booking — same webhook trigger
  - Contains: client name/email/phone, service, date, time, location, notes, first-visit badge, amount
  - Recipient: `SPECIALIST_EMAIL` env var (set to raphaelgarnier1997@gmail.com)
  - Sender: `onboarding@resend.dev` (works without domain verification — swap to labulldevie.fr later)
- ✅ `src/lib/resend/emails.ts` — 3 typed functions: `sendBookingConfirmation`, `sendSpecialistNotification`, `sendAppointmentReminder`
  - Lazy Resend client: logs warning + no-ops if `RESEND_API_KEY` not set (safe in dev)
- ⬜ **Resend account + API key needed** — set `RESEND_API_KEY` in `.env.local` to activate
- ⬜ 24h reminder email to client (needs a cron/scheduled job — Vercel Cron or Supabase Edge Function)
- ✅ Contact form (`/contact`) — full page built from Figma + wired to Resend
  - Split layout: dark gradient panel left, content right
  - Info column: hours, phone, email, social links (Instagram, X, Facebook)
  - Form: Name, Email, Phone (optional), Message — validated with contactSchema
  - `POST /api/contact` → sendContactMessage → specialist email with reply-to set
  - toast.success / toast.error feedback, form resets on success
  - FAQ accordion section reused from home page
  - contactSchema updated: `subject` → `phone` (optional)
- ✅ Newsletter form (footer) → wired to `POST /api/newsletter`
  - `newsletter_subscribers` table added to Prisma schema + pushed to Supabase
  - Upsert on subscribe (re-subscribing is silent, no duplicate email)
  - Welcome email via Resend (`sendNewsletterWelcome`) with unsubscribe link
  - `GET /api/newsletter/unsubscribe?token=xxx` → deletes row, shows branded confirmation page
  - Footer form: real API call, toast.success/error, loading state, success message
- ⬜ Google Calendar — one-click "Add to my calendar" after booking confirmation
- ⬜ Google Calendar — auto-add event to specialist's calendar on booking

---

## Phase 6 — Specialist Dashboard

### App shell ✅
- ✅ Dashboard layout — CSS grid `260px 1fr`, sticky sidebar, main column
- ✅ `dashboard.css` — full design system port (KPI tiles, cards, tables, agenda, calendar, reviews, settings)
- ✅ Sidebar (`Sidebar.tsx`) — dark `#1a110b`, 3 sections (Aujourd'hui / Catalogue / Réglages), active accent bar, badges, logout
- ✅ Topbar (`Topbar.tsx`) — breadcrumb (Zustand-ready), pill search, bell icon with **real** pending dot (reads from Zustand `pendingCount`), "Nouveau RDV" button
- ✅ `DashBodyClass.tsx` — client component that adds/removes `body.dash` via `useEffect` (can't set body class from server layout in Next.js App Router)
- ✅ Auth guard — `(dashboard)/layout.tsx` redirects non-specialists to `/`

### Data layer ✅ (2026-05-19)
- ✅ **Zustand** (`src/lib/stores/useSessionStore.ts`) — `userName`, `role`, `pendingCount` shared across all client components; `incrementPending` / `decrementPending` for granular notification updates
- ✅ **TanStack Query** (`@tanstack/react-query` v5) — `QueryProvider` wraps the full dashboard with `staleTime: 60s`
- ✅ `SessionInitializer.tsx` — server layout fetches `pendingReviews + pendingAppts` counts and seeds Zustand on mount (no client-side round-trip needed for initial state)
- ✅ Query hooks (`src/lib/queries/appointments.ts`):
  - `useAppointments(from?, to?)` — generic range query, keyed by params
  - `useWeekAppointments(weekStart, weekEnd)` — keyed by `["appointments", "week", weekStart]`
  - `useTodayAppointments(today, tomorrow)` — 2-minute stale time
  - `useConfirmAppointment()` — mutation that auto-invalidates appointments cache on success
- ✅ ReactQueryDevtools included in dev (invisible in prod)

### Accueil (overview) ✅
- ✅ Greeting with first name + today's date
- ✅ KPI grid — featured dark tile (upcoming count + SVG sparkline), RDV du jour, nouveaux clients 7j, note moyenne from approved reviews
- ✅ **"Le programme du jour"** card (`TodayAgendaCard.tsx`) — now a TanStack Query client component:
  - 3 tabs: **Aujourd'hui / Demain / Cette semaine** (matching the design exactly)
  - Tab switches fetch new data; previously fetched tabs served instantly from cache
  - Server passes `initialAppts` to avoid flash on first load
  - Tiny orange dot during background refetch
- ✅ Alerts card — pending reviews count (linked to `/dashboard/avis`), Stripe placeholder, empty-slot warning
- ✅ Activity feed from today's appointments
- ✅ Revenue chart placeholder with "Activez Stripe" CTA
- ✅ Prochains RDV summary card

### Agenda ✅
- ✅ Agenda page (`/dashboard/rendez-vous`) — refactored to TanStack Query (no manual `useState/useEffect/fetch`)
  - `useWeekAppointments` for semaine view — cached per week, instant on back-navigation
  - `useAppointments()` for liste view — shared cache with other query consumers
- ✅ Week calendar — one flat `.week` CSS Grid (all 104 cells as direct children so `nth-child(8n)` works for Sunday border removal)
  - Events: percentage-based `top` / `height` (matches the design's JS exactly)
  - Event content: `<strong>clientName</strong>serviceName` — name in Cormorant Garamond block, service after
  - Status colours: confirmed (green), pending (amber), blocked (muted)
- ✅ List view — grouped by date, correct `.pill` class (cream badge, no status dot)
- ✅ Detail drawer — right-side panel with backdrop, animated in, "Confirmer" / "Fermer" actions
- ✅ Google Calendar placeholder banner with "Connecter Google Agenda" CTA (not yet wired)

### Paramètres ✅
- ✅ Cabinet address input + Nominatim geocode (OSM, no paid API), shows map link on success
- ✅ Travel zones editor — add/remove zones, set maxKm + fee in €, live zone preview table, max distance setting
- ✅ VAT rate quick-select buttons per service and product category

### API routes
- ✅ `GET /api/dashboard/appointments` — date range params (`from`, `to`), specialist-only guard
- ✅ `GET /api/dashboard/settings` — returns `cabinetAddress`, `cabinetLat/Lng`, `travelPricing`, `taxSettings`
- ✅ `POST /api/dashboard/settings` — geocodes cabinet address, saves lat/lng

### Still to build
- ⬜ Clients page — searchable/filterable table + sticky detail panel (history, private notes)
- ⬜ Finances page — KPI tiles + 12-month bar chart + transactions table + Stripe payouts
- ⬜ Avis page — moderation (approve/hide/reply), linked to public soin review sections
- ⬜ Prestations page — CRUD for soins (currently static data in `src/lib/soins.ts`)
- ⬜ Boutique page — product table + orders tab + stock warnings
- ⬜ Notifications page — email/SMS reminder toggles
- ⬜ `POST /api/dashboard/appointments/:id/confirm` — confirm appointment + invalidate query cache
- ⬜ Google Calendar OAuth integration — real two-way sync
- ⬜ Revenue chart — real SVG bars from Stripe/DB data

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

## Current phase: Phase 5 — Notifications
## Last session: 2026-05-21
## Next step: Set RESEND_API_KEY → test emails, then 24h reminder cron + contact form email
## Also done this session: Booking confirmation email + specialist notification wired into Stripe webhook

---

## Notes

### Apple Pay — domain registration required
Apple Pay via Stripe's `ExpressCheckoutElement` requires the domain to be registered in the Stripe Dashboard before the button appears.
Steps:
1. Stripe Dashboard → Settings → Payment methods → Apple Pay
2. Add the production domain (e.g. `labulldevie.fr`) and each Vercel preview domain if needed
3. Stripe auto-generates a `/.well-known/apple-developer-merchantid-domain-association` file — verify it resolves

Apple Pay will **not** appear on localhost — test on Vercel preview or production.
Google Pay works on Chrome desktop and Android; no domain registration required.
