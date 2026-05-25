# La Bulle De Vie — System Design Assessment

> Last updated: 2026-05-25.
> Model: one specialist, many clients. One deployment per specialist for the SaaS resale.

---

## What the system is

A booking + e-commerce platform for a single wellness specialist. One specialist, N clients.
The SaaS model is **white-label deployment**: each specialist who buys the product gets their own
instance — their own database, their own Stripe account, their own Supabase project. Not multi-tenant.

This means the `prisma.profile.findFirst({ where: { role: "specialist" } })` pattern is correct
and not a bug. There is always exactly one specialist row.

---

## Architecture overview

```
Browser
  └─ Next.js App Router (Vercel)
       ├─ Route groups: (public) · (auth) · (client) · (dashboard) · (confirmation)
       ├─ API routes: /api/booking/* · /api/dashboard/* · /api/user/* · /api/orders/* · /api/webhooks/*
       └─ proxy.ts (auth guard, runs before React)

Data layer
  ├─ Supabase (PostgreSQL + Auth + Storage)
  ├─ Prisma ORM (type-safe queries, server-side only)
  └─ Zustand (client state: cart, session)

External services
  ├─ Stripe — payments, webhooks, balance, payouts
  ├─ Resend — transactional email
  ├─ Google Calendar API — specialist calendar sync
  └─ (Twilio, OneSignal — not yet wired)
```

---

## What's working well

### 1. The booking flow is correctly designed

This is the hardest part of the system and it's done right.

```
Client → POST /api/booking
         ↓ price computed server-side from DB
         ↓ Stripe PaymentIntent created with metadata (slotId, serviceId, etc.)
         ↓ client_secret returned to browser

Browser → stripe.confirmPayment()
         ↓ Stripe charges card

Two concurrent confirmation paths:

Path A (client-side, fast):           Path B (webhook, async backup):
POST /api/booking/confirm              POST /api/webhooks/stripe
  └─ stripe.paymentIntents.retrieve      └─ constructEvent() verifies signature
  └─ pi.status === "succeeded"           └─ payment_intent.succeeded
  └─ prisma.$transaction:                └─ prisma.$transaction:
       check slot → mark booked               check slot → mark booked
       create appointment                     create appointment

@unique on stripePaymentIntentId → second caller hits P2002 → exits cleanly
```

Key decisions that are correct:
- Price always computed server-side from DB — client sends zero amounts
- PI status verified against Stripe's API, never trusted from client
- Slot booking is atomic (`$transaction`) — concurrent requests can't double-book
- `@unique` on `slotId` in Appointment + `isBooked` on AvailabilitySlot — two layers of slot locking
- Idempotency guard at the top of both paths before any write

### 2. The schema is clean

- All prices stored as integer cents — never floats, no rounding errors
- `@unique` on `Appointment.slotId` — one booking per slot, enforced at DB level
- `@unique` on `Appointment.stripePaymentIntentId` — idempotency without extra logic
- `OrderItem.unitPrice` snapshots the price at purchase time — product price changes don't corrupt history
- Guest booking is first-class (`guestName`, `guestEmail`, `guestPhone` — not a workaround)
- Discount codes and gift cards modeled as proper FK relations, not JSON blobs
- Enums for all status fields (`AppointmentStatus`, `OrderStatus`, `RefundStatus`)

### 3. Route group separation is correct

| Group | Path | Auth |
|---|---|---|
| `(public)` | Marketing pages | None |
| `(auth)` | /login, /register | None (redirect if logged in) |
| `(client)` | /compte | Requires user |
| `(dashboard)` | /dashboard/* | Requires specialist role |
| `(confirmation)` | /booking/confirmation, /commande/* | None (PI ID in URL) |

Each group has its own layout. CSS loads per group (public vs dashboard). `proxy.ts` guards at the
edge before React renders. This is the correct Next.js App Router pattern.

### 4. The query layer is well-separated

`src/lib/queries/` extracts DB logic out of API routes — appointments, boutique, clients, finances,
reviews, services each have their own file. React Query in the dashboard caches and deduplicates
server requests with correct `staleTime` values. The finances route runs all its DB queries in
parallel with `Promise.all`. These are the right abstractions.

### 5. Stripe integration is split correctly

```
src/lib/stripe.ts          → server-side Stripe client (secret key)
src/lib/stripe/client.ts   → browser Stripe client (publishable key)
src/lib/stripe/webhooks.ts → webhook event handlers
```

The secret key never reaches the browser. The publishable key is safe to expose. The webhook
handler verifies the Stripe signature before touching any data.

---

## What's a problem

### 1. Webhook SLOT_TAKEN path doesn't refund (bug)

**File:** `src/app/api/webhooks/stripe/route.ts`

The client-side confirm path handles SLOT_TAKEN correctly:
```ts
// booking/confirm/route.ts — correct
if (err.message === "SLOT_TAKEN") {
  await stripe.refunds.create({ payment_intent: pi.id, reason: "duplicate" })
  return NextResponse.json({ error: "..." }, { status: 409 })
}
```

The webhook path does not:
```ts
// webhooks/stripe/route.ts — missing refund
if (!slot || slot.isBooked) throw new Error("SLOT_TAKEN")
// exception is caught, break exits the switch — no refund issued
```

**Real scenario:** Two clients both reach payment simultaneously for the same slot.
Client A's payment goes through. Client B pays, the webhook fires first (before Client B's
`/api/booking/confirm` call returns), sees the slot is taken — and silently drops the event.
Client B is charged with no appointment and no refund. The client-side path will also fail on
the slot check and show an error, but by then the PI has already succeeded with no refund triggered.

**Fix:** Mirror the refund logic in the webhook path.

---

### 2. No background job infrastructure

The following features are documented as built but have no execution mechanism:

| Feature | Status |
|---|---|
| 24h appointment reminder (email) | Email template exists, nothing triggers it |
| 24h appointment reminder (SMS) | Twilio not wired at all |
| Post-appointment review invite email | Not implemented |
| Newsletter scheduled sends | Not implemented |

There is no cron, no queue, no scheduled Supabase Edge Function, no Vercel cron job (`vercel.json`).
Any time-based feature is currently dead on arrival in production.

**Fix options:**
- **Vercel Cron** (`vercel.json`) — simplest, runs a `/api/cron/reminders` route on a schedule.
  Free on Hobby, 2 jobs max. Good enough for reminder + review invite.
- **Supabase pg_cron** — PostgreSQL-native cron extension, runs inside the DB. More reliable,
  doesn't depend on Vercel. Requires enabling the extension.
- **Upstash QStash** — HTTP message queue, delays a webhook call to a future time. Best model for
  "send this email in 23 hours after booking creation."

---

### 3. Two sources of truth for services

`src/lib/soins.ts` contains hardcoded static service data (prices, descriptions, benefits, fake reviews).
The `services` table in the DB is the real, editable source.

`BookingWizard.tsx` currently imports from `soins.ts`:
```ts
import { SOINS, SoinId } from "@/lib/soins"
```

When the specialist edits a service in the dashboard (changes the price, updates the description),
`soins.ts` doesn't update. Pages that read from `soins.ts` silently show stale data.

**Fix:** Delete `soins.ts`. `BookingWizard` should fetch the service from the API or receive it as
a prop from the parent page which reads from DB. The static fake reviews in `soins.ts` should be
replaced by real `Review` rows from the DB.

---

### 4. Two validation file locations

```
src/lib/validation.ts           ← contact + newsletter schemas (used by 3 files)
src/lib/validations/
  booking.ts                    ← booking input schema
  review.ts                     ← review schema
  product.ts                    ← product schema
```

The original flat `validation.ts` was never cleaned up when the domain-split `validations/` folder
was created. A developer adding a new schema has two places to put it and no signal which is correct.

**Fix:** Move the contact + newsletter schemas into `src/lib/validations/contact.ts` and
`src/lib/validations/newsletter.ts`. Delete `src/lib/validation.ts`.

---

### 5. `src/lib/supabase/middleware.ts` is dead code

This file exports `updateSession()` — a session refresh helper that was the original approach
before `src/proxy.ts` was written. It is not imported anywhere. It creates ambiguity: is this
the auth pattern or is `proxy.ts`?

**Fix:** Delete it. `proxy.ts` is the correct pattern.

---

### 6. No pagination on the client list and finances history

`GET /api/dashboard/appointments` is date-filtered (good — the UI passes a week range).
`GET /api/dashboard/finances` loads all appointments for the last 12 months as a `findMany` into
memory, iterates over them in JS to build the monthly buckets and top services. At low volume
(< 500 appointments/year) this is fine. At high volume it becomes a slow, memory-heavy request.

`GET /api/dashboard/clients` — need to verify, but likely returns all clients unbounded.

**Not urgent today.** Flag for when the specialist hits ~500 appointments. The fix is to move the
aggregation into Prisma `groupBy` + `_sum` queries rather than loading rows into JS.

---

### 7. Cart is localStorage-only (cross-device gap)

```ts
// useCartStore.ts
persist({ name: "bdv-cart" })  // → localStorage
```

Cart state does not sync across devices. A client who adds artwork on mobile will see an empty
cart on desktop. For a wellness boutique selling a small number of art pieces this is an
acceptable trade-off — most purchases are single-session. Worth noting if the e-commerce side grows.

---

### 8. No slot generation automation

Availability slots are stored individually in `availability_slots`. The specialist either adds
them manually in the dashboard or the dashboard bulk-generates them. There is a `weeklySchedule`
JSON field on `Profile` (correctly modeled) but no code that reads it and auto-generates slots
for upcoming weeks.

The specialist will need to manually manage slots indefinitely until this is automated.

**Fix:** A cron job (same infrastructure as reminders) that runs weekly, reads `weeklySchedule`,
and creates slots for the next N weeks if they don't already exist.

---

### 9. `soins.ts` fake reviews inflate social proof

`soins.ts` contains fabricated review data (names, quotes, star ratings) that is currently
displayed on service pages. When real reviews exist in the DB, both will show — or the static
ones will show instead of real ones depending on which component reads which source.

Beyond the code quality issue, displaying fake reviews on a commercial platform is a legal risk
under French consumer protection law (Code de la consommation L121-4).

**Fix:** Delete the fake reviews from `soins.ts` (along with the full file — see point 3).
Display only `Review` rows from the DB, with an empty state until real reviews accumulate.

---

## Summary

| Area | Status | Priority |
|---|---|---|
| Booking flow (PI → webhook → idempotency) | Correct | — |
| Schema (types, constraints, snapshots) | Clean | — |
| Route groups + layout separation | Correct | — |
| Stripe key separation (server/browser) | Correct | — |
| Query layer + React Query | Good | — |
| Webhook SLOT_TAKEN → no refund | **Bug** | Fix before launch |
| Background jobs (reminders, review invites) | **Missing** | Fix before launch |
| `soins.ts` vs DB (two sources of truth) | **Debt** | Fix before launch |
| Fake reviews in `soins.ts` | **Legal risk** | Fix before launch |
| `validation.ts` vs `validations/` | Split | Before SaaS launch |
| `supabase/middleware.ts` dead code | Cleanup | Quick win |
| Slot generation automation | **Missing** | Short-term |
| Pagination on finances/client list | Not urgent | When volume warrants |
| Cart localStorage-only | Acceptable trade-off | Monitor |
