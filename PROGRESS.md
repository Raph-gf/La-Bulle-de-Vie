# La Bulle De Vie — Project Progress

> Update this file as each task is completed. ✅ = done, 🔄 = in progress, ⬜ = todo.

---

## Phase 1 — Foundation (UI, no backend)

### Design system
- ⬜ Install shadcn/ui
- ⬜ Configure Tailwind design tokens (colors, fonts, spacing)
- ⬜ Install and configure Google Fonts (Cormorant Garamond + Inter)

### Layout
- ⬜ Navbar (logo, links, CTA button, mobile menu)
- ⬜ Footer (columns, newsletter input, social links)

### Public pages
- ⬜ Home page — Accueil (hero, about, services preview, testimonials, FAQ, newsletter)
- ⬜ Services page — Prestations (service card grid, price, duration, Réserver CTA)
- ⬜ Décorations page (art product grid, price, dimensions, medium, Ajouter au panier)
- ⬜ Mon parcours page (story, stats, services table)
- ⬜ Contact page (hours, form, FAQ accordion, social links)

---

## Phase 2 — Supabase setup

- ⬜ Create Supabase project
- ⬜ Write database schema (SQL migrations)
  - ⬜ profiles table + RLS
  - ⬜ services table + RLS
  - ⬜ appointments table + RLS
  - ⬜ reviews table + RLS
  - ⬜ products table + RLS
  - ⬜ orders + order_items tables + RLS
- ⬜ Seed database with fake services and products
- ⬜ Connect Supabase to Next.js (.env.local keys)
- ⬜ Replace static data with real Supabase queries on public pages

---

## Phase 3 — Auth

- ⬜ Login page (email/password + Google OAuth button)
- ⬜ Register page (email/password + Google OAuth button)
- ⬜ Configure Google OAuth in Supabase dashboard
- ⬜ useAuth hook wired to real Supabase session
- ⬜ Test (client) route guard — redirect if not logged in
- ⬜ Test (dashboard) route guard — redirect if role ≠ specialist
- ⬜ Profile auto-created on signup (Supabase trigger)

---

## Phase 4 — Booking + Stripe

- ⬜ Booking page — date/time picker (available slots)
- ⬜ Booking form — reason + symptoms
- ⬜ Create Stripe payment intent on booking submit
- ⬜ Stripe card payment step (Stripe Elements)
- ⬜ Stripe webhook handler — payment_intent.succeeded → confirm booking in DB
- ⬜ Appointment confirmation page (receipt)
- ⬜ Cancel appointment → trigger Stripe refund based on policy
- ⬜ Refund webhook handler → update booking status in DB

---

## Phase 5 — Notifications

- ⬜ Resend — booking confirmation email to client
- ⬜ Resend — instant notification email to specialist on new booking
- ⬜ Resend — 24h reminder email to client (Supabase cron / scheduled function)
- ⬜ Google Calendar — add event to client's calendar (one-click after booking)
- ⬜ Google Calendar — auto-add event to specialist's calendar on booking

---

## Phase 6 — Specialist Dashboard

- ⬜ Dashboard layout (sidebar + top bar)
- ⬜ Overview page (stats cards, today's appointments, alerts)
- ⬜ Agenda page (calendar view + appointment list)
- ⬜ Appointment detail modal (client info, reason, symptoms, actions)
- ⬜ Availability management (working hours, blocked slots)
- ⬜ Clients page (list, search, client profile with history + notes)
- ⬜ Finances page (revenue chart, Stripe payouts, refund tracker, CSV export)
- ⬜ Invoice generation (PDF per appointment / per client)
- ⬜ Reviews page (approve/hide, reply, aggregate score per service)
- ⬜ Services management (add/edit/delete, toggle visibility)
- ⬜ Boutique management (add/edit/delete products, stock, orders list)
- ⬜ Notifications settings (toggle email/SMS reminders, preview templates)
- ⬜ Settings page (profile, working hours, cancellation policy, connected accounts)

---

## Phase 7 — E-commerce

- ⬜ Product catalog page wired to real Supabase data
- ⬜ Cart (useCart hook + cart drawer/page)
- ⬜ Stripe checkout for cart
- ⬜ Order confirmation page + email
- ⬜ Client order history in /compte
- ⬜ Specialist marks order as shipped

---

## Phase 8 — Polish

- ⬜ SMS reminders via Twilio (24h before appointment)
- ⬜ Push notifications via OneSignal (booking confirmation, new booking alert)
- ⬜ PDF invoice generation
- ⬜ Mobile responsiveness audit (all pages)
- ⬜ Accessibility audit (aria labels, keyboard nav, contrast)
- ⬜ Performance audit (image optimization, lazy loading)
- ⬜ Security audit (RLS policies, API route guards, input sanitization)
- ⬜ Deploy to Vercel
- ⬜ Connect custom domain
- ⬜ Set up Stripe production keys + webhook endpoint

---

## Current phase: Phase 1 — Foundation
## Last updated: 2026-05-17
