# La Bulle De Vie — Project Bible

## Project overview

A full-stack booking and e-commerce platform for a massage/wellness specialist.
Originally built for a client who canceled — being repurposed as a sellable SaaS product targeting wellness professionals (massage therapists, osteopaths, naturopaths, etc.).

**Security is priority #1.**

---

## Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Next.js 14 (App Router) | Dev's comfort zone |
| Backend / DB | Supabase | PostgreSQL, Auth, Storage, Edge Functions, RLS |
| Payments | Stripe | Booking payments, refunds, webhooks |
| Email | Resend | Transactional emails — developer-friendly |
| SMS | Twilio | Appointment reminders via SMS |
| Push notifications | OneSignal | Mobile/web push |
| Calendar | Google Calendar API | Both client and specialist sides |
| Styling | Tailwind CSS + shadcn/ui | Fast, consistent, maintainable |
| Deployment | Vercel | Native Next.js hosting |

---

## Features

### Authentication
- Email/password registration and login
- Google OAuth ("Sign in with Google")
- Secure session management via Supabase Auth
- Two roles: `client` and `specialist` (admin)

### Appointment booking (client side)
- Browse available services with descriptions, duration, and price
- Pick date and time from available slots
- Fill in reason for visit + symptoms/notes
- Pay in advance via Stripe (card)
- Receive booking confirmation email + optional SMS
- Add appointment to their Google Calendar (one-click)
- Receive a reminder 24h before the appointment (email + SMS)

### Notifications (specialist side)
- Instant notification (email + push) when a booking is made
- Notification contains: client name, date, time, service, reason, symptoms
- Appointment auto-added to specialist's Google Calendar

### Refund system
- Client can cancel → triggers Stripe refund based on cancellation policy
- Refund status tracked in dashboard
- Email confirmation of refund sent to client

### Ratings & reviews (social proof)
- After a completed appointment, client receives an email inviting them to leave a review
- Client can rate the service (1–5 stars) and leave a written comment
- Reviews are tied to a specific service/prestation (not just the specialist globally)
- Specialist can see all reviews in the dashboard (approve/hide if needed)
- Approved reviews displayed publicly on the service card and/or a dedicated reviews section on the home page
- Aggregate rating (average stars + total count) shown on each service
- Social proof block on home page ("Ils nous font confiance" / testimonials section already in Figma)

### Specialist dashboard
- Upcoming appointments (today + next 7 days)
- Full appointment calendar view
- Client list with session history and notes per client
- Revenue chart (monthly/weekly, Stripe-synced)
- Refund tracker (amount refunded + reason)
- Top services by revenue
- Cancellation rate
- Occupancy rate (% of slots booked)
- Invoice generation (PDF) per client on demand
- Tax/VAT tracking
- E-commerce order management

### E-commerce (specialist side)
- Specialist sells custom products / artwork
- Full product management in dashboard (add, edit, delete, stock)
- Product catalog page for clients (grid, filters)
- Cart + Stripe checkout
- Order confirmation email
- Order history for clients

### Public-facing pages (from Figma)
- Home (`Accueil`) — hero, about, services preview, testimonials, FAQ, newsletter
- Services (`Massage`) — full catalog with cards, price, duration, "Réserver" CTA
- Décoration — e-commerce art catalog with "Ajouter au panier"
- Mon parcours — specialist about page with story, stats, services table
- Contact — hours, contact form, FAQ accordion, social links

### Pages still to design (not in Figma)
- Booking flow (date/time picker + Stripe payment step)
- Login / Register pages
- User account (upcoming bookings, past history, profile)
- Specialist dashboard (full admin area)
- Cart + checkout
- Appointment confirmation / receipt
- Order confirmation

---

## Design system (from Figma)

**Visual identity:** Luxury wellness spa — warm, elegant, French aesthetic.

**Colors:**
- Background: warm cream/beige (`~#F5EDE5`)
- Text: dark charcoal (`~#1C1C1C`)
- Cards / CTAs: rich dark mocha/brown (`~#2C1F14` or similar)
- Accent / highlights: warm gold-beige tones

**Typography:**
- Headings: serif — Playfair Display or Cormorant Garamond
- Body: clean sans-serif — Inter or DM Sans

**Layout principles:**
- Lots of whitespace
- Full-width hero with dark photo overlay
- Card grids (2 or 3 columns) for services and products
- Dark overlay cards with white text for product/service listings
- Simple top nav: logo left, links center, CTA button right
- Multi-column footer with newsletter signup

---

## Build order

1. Design tokens → Tailwind config (colors, fonts, spacing)
2. Navbar + Footer (shared layout)
3. Home page (section by section)
4. Massage services page
5. Décoration / e-commerce catalog
6. Mon parcours + Contact pages
7. Auth (Supabase + Google OAuth)
8. Booking flow + Stripe payment
9. Stripe webhooks (confirmation, refunds)
10. Email notifications (Resend)
11. Google Calendar integration
12. Specialist dashboard
13. SMS / Push notifications (Twilio + OneSignal)

---

## Who is Raphael

**Name:** Raphael Garnier-Fagour
**Email:** raphaelgarnier1997@gmail.com

Raphael is a French junior developer (~2 years experience) who recently spent time working in Canada where he built Laravel projects professionally. He's back and using this project to get back into coding after a ~2 month gap, and to level up into full-stack product development.

He is ambitious and has a clear vision for his products. He thinks like a product owner — not just a developer. He wants to build things that are beautiful, sellable, and real, not just portfolio projects.

**Technically:**
- Comfortable with: React, Next.js, PostgreSQL, Prisma, Node.js
- Currently learning: NestJS, Supabase
- Past experience: Laravel (production, Canada)
- Wants to learn: Supabase patterns, custom e-commerce, Shopify backend integration

**How to work with him:**
- He's not fully confident yet after the gap — be encouraging, not condescending
- Explain the *why* behind architectural decisions, not just the *what*
- Don't overwhelm with options — recommend clearly and explain trade-offs simply
- He learns by doing, so always give him working code to run and test
- He has good taste (see Figma designs) — don't suggest ugly or generic solutions
- He wants to grow from this project, so take learning opportunities when they arise

---

## Figma screens available

Located in project root as PNG files:
- `Accueil.png` — Home page
- `Massage.png` — Services catalog
- `Décoration.png` — Art e-commerce catalog
- `Mon parcours.png` — Specialist about page
- `Contact.png` — Contact + FAQ

Designed by Raphael's cousins (UI/UX designers). Visual identity is final — do not reinvent it.

---

## Notes

- Project name "La Bulle De Vie" is a placeholder — will be genericized for SaaS resale later
- Supabase chosen over custom NestJS backend to serve as a learning project
- All monetary amounts handled server-side via Stripe webhooks, never trusted from client
