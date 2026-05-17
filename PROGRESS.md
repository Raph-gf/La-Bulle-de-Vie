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

### Planned schema (discussed, not yet created)
```
profiles        — extension of auth.users (name, phone, role: client | specialist)
services        — the 6 soins (name, price, duration, category, description)
appointments    — bookings (client_id → profiles, service_id → services, date, time, status, notes)
reviews         — client reviews (appointment_id → appointments, stars, body, approved)
products        — deco products (name, price, stock, images)
orders          — client orders (client_id → profiles, total, status)
order_items     — order lines (order_id → orders, product_id → products, qty, price)
```
RLS rules: clients see own rows only; specialist (role check) sees all; approved reviews are public.

### Todo
- ⬜ Create Supabase project (dashboard.supabase.com)
- ⬜ Write SQL migrations for all 7 tables
- ⬜ Add RLS policies per table
- ⬜ Seed database (fake services + products matching current static data)
- ⬜ Add `.env.local` keys (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- ⬜ Replace static `SOINS` data with Supabase query on `/prestations` and `/soins/[id]`
- ⬜ Replace static product data on `/decorations` with Supabase query

---

## Phase 3 — Auth

- ✅ Login page UI (`/login`) — exists as placeholder
- ✅ Register page UI (`/register`) — exists as placeholder
- ✅ `(client)` route group guard — redirects to `/login` if not authenticated
- ✅ `(dashboard)` route group — exists
- ⬜ Wire login form to Supabase `signInWithPassword`
- ⬜ Wire register form to Supabase `signUp`
- ⬜ Google OAuth — configure in Supabase dashboard + add button
- ⬜ Profile auto-created on signup (Supabase DB trigger or `signUp` callback)
- ⬜ Test route guards end-to-end with real sessions

---

## Phase 4 — Booking + Stripe

- ✅ Booking wizard UI with placeholder data (see Phase 1)
- ⬜ Replace placeholder slots with real availability from `appointments` table
- ⬜ On wizard submit → create `appointment` row in Supabase (status: `pending`)
- ⬜ Create Stripe payment intent on booking submit
- ⬜ Add Stripe card payment step (Stripe Elements) after step 5
- ⬜ Stripe webhook: `payment_intent.succeeded` → set appointment status to `confirmed`
- ⬜ Appointment confirmation page with receipt
- ⬜ Cancel appointment → trigger Stripe refund based on cancellation policy
- ⬜ Refund webhook → update appointment status in DB

---

## Phase 5 — Notifications

- ⬜ Resend — booking confirmation email to client
- ⬜ Resend — instant notification to specialist on new booking (name, date, time, service, notes)
- ⬜ Resend — 24h reminder email to client
- ⬜ Google Calendar — one-click "Add to my calendar" after booking confirmation
- ⬜ Google Calendar — auto-add event to specialist's calendar on booking

---

## Phase 6 — Specialist Dashboard

- ✅ Dashboard layout exists (sidebar placeholder)
- ✅ Dashboard sub-pages exist as placeholders: rendez-vous, clients, finances, avis, boutique
- ⬜ Overview — stats cards, today's appointments
- ⬜ Agenda — calendar view + appointment list + detail modal
- ⬜ Availability management (working hours, blocked dates)
- ⬜ Clients — list, search, profile with history + notes
- ⬜ Finances — revenue chart (Stripe-synced), refund tracker, CSV export
- ⬜ Invoice generation (PDF)
- ⬜ Reviews — approve/hide, reply, aggregate score per service
- ⬜ Services management — edit price, duration, visibility
- ⬜ Boutique — add/edit/delete products, stock, orders list
- ⬜ Settings — profile, working hours, cancellation policy

---

## Phase 7 — E-commerce

- ✅ Décorations catalog page (static data)
- ⬜ Wire catalog to real Supabase products
- ⬜ Cart (useCart hook + cart drawer + `/panier` page)
- ⬜ Stripe checkout for cart
- ⬜ Order confirmation page + email
- ⬜ Client order history in `/compte`
- ⬜ Specialist marks order as shipped

---

## Phase 8 — Polish

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

## Current phase: Phase 2 — Supabase setup
## Last session: 2026-05-17
## Next step: Create Supabase project → write SQL schema → seed → wire to pages
