# La Bulle De Vie — Security Audit

> Last updated: 2026-05-25. Three audit passes: manual analysis + security-reviewer agent + system-architect agent.
> Review and resolve all Critical/High issues before production deploy.

---

## Auth strategy

JWT-in-cookies via Supabase SSR (`@supabase/ssr`):

- Login → Supabase issues `access_token` (JWT, ~1h) + `refresh_token` (weeks), both stored in cookies
- Every request: `src/proxy.ts` calls `getUser()` which validates the JWT **server-side against Supabase** — not a local decode, cannot be spoofed
- Session refresh happens automatically in the proxy on every request; new tokens are forwarded to the browser
- Cookies are NOT `httpOnly` by design — the Supabase JS client needs to read them client-side. Trade-off: XSS-accessible but short-lived and JWT-based (not a DB session ID that unlocks a row)
- `getUser()` is used everywhere. `getSession()` must never be used for auth decisions — it only reads the local cookie without server validation

---

## Vulnerabilities

### 🔴 CRITICAL

---

#### C1 — `isFirstVisit` discount never validated against booking history

**File:** `src/app/api/booking/route.ts` ~line 70

**Issue:** The 20% first-visit discount is applied based on a client-supplied `isFirstVisit: true` flag. The server never queries the database to verify the user has no prior confirmed appointments.

**Exploit:** Send `isFirstVisit: true` on every booking → permanent 20% discount on all bookings. For guest bookings there is no identity link at all, so it's trivially repeatable with any email.

**Fix:**
```ts
if (isFirstVisit && clientId) {
  const prior = await prisma.appointment.count({
    where: { clientId, status: { in: ["confirmed", "completed"] } },
  })
  if (prior > 0) isFirstVisit = false
}
// For guests: either disallow the discount, or flag for manual review
```

---

#### C2 — Stripe amount never verified at booking confirm

**File:** `src/app/api/booking/confirm/route.ts` ~line 24

**Issue:** After verifying `pi.status === "succeeded"`, the route stores `amountPaid: pi.amount_received` but never compares `pi.amount_received` against the actual service price in the database.

**Exploit:** Create a Stripe PaymentIntent for €0.01, pay it, call `/api/booking/confirm` with that PI ID → books a €105 soin for one cent. The server confirms it because the PI genuinely succeeded.

**Fix:** After fetching `serviceId` from PI metadata, fetch the service price and compare:
```ts
const service = await prisma.service.findUnique({ where: { id: serviceId }, select: { price: true } })
if (!service || pi.amount_received < service.price - 10) {
  return NextResponse.json({ error: "Montant invalide" }, { status: 400 })
}
```

---

### 🟠 HIGH

---

#### H1 — Open redirect in OAuth callback

**File:** `src/app/auth/callback/route.ts` line 8, 33

**Issue:**
```ts
const next = searchParams.get("next") ?? "/"
return NextResponse.redirect(`${origin}${next}`)
```
If `next` starts with `//`, the resulting URL `https://labulledevie.fr//evil.com` is treated by browsers as a scheme-relative redirect to `https://evil.com`.

**Exploit:** Phishing link `https://labulledevie.fr/auth/callback?code=real_code&next=//attacker.com/fake-login` — completes real OAuth, then sends the user to an attacker page. Users are least suspicious immediately after a successful login.

**Fix:**
```ts
const raw = searchParams.get("next") ?? "/"
const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/"
```

---

#### H2 — Open redirect in login page

**File:** `src/app/(auth)/login/page.tsx` line 541–542

**Issue:**
```ts
const redirectTo = searchParams.get("redirectTo") ?? "/"
router.push(redirectTo)
```
`router.push("https://evil.com")` navigates to the external domain.

**Exploit:** `/login?redirectTo=https://attacker.com` → user logs in normally, lands on attacker's page.

**Fix:**
```ts
const raw = searchParams.get("redirectTo") ?? "/"
const redirectTo = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/"
router.push(redirectTo)
```

---

#### H3 — `GET /api/dashboard/appointments` has no role check

**File:** `src/app/api/dashboard/appointments/route.ts`

**Issue:** The route checks `if (!user)` (401) but never verifies `profile.role === "specialist"`. Any authenticated client can call this endpoint and receive **all appointments from all clients** — names, emails, phones, health notes, addresses.

**Exploit:** Log in as a regular client → `GET /api/dashboard/appointments?from=2026-01-01&to=2026-12-31` → full appointment history with PII for every client in the system. This is a serious GDPR violation.

**Fix:** Add the same `requireSpecialist()` pattern used by other dashboard routes:
```ts
const profile = await prisma.profile.findUnique({ where: { id: user.id }, select: { role: true } })
if (profile?.role !== "specialist") return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
```

---

#### H4 — `GET/POST /api/dashboard/settings` has no role check

**File:** `src/app/api/dashboard/settings/route.ts` lines 9, 34

**Issue:** Same pattern as H3 — only checks `user` exists, not specialist role.

**Exploit:** Any client can read the specialist's cabinet address, GPS coordinates, travel pricing zones, and tax settings via GET. Via POST, any client can overwrite the cabinet address (disrupting geocoding) or set negative travel fees that reduce booking amounts.

**Fix:** Add role check to both GET and POST handlers.

---

#### H5 — Orders confirm does not verify amount against DB prices

**File:** `src/app/api/orders/confirm/route.ts` ~line 46

**Issue:** Same class of vulnerability as C2, but for the e-commerce flow. The route fetches current product prices from the DB but never compares `pi.amount_received` against the sum of `product.price × quantity`.

**Exploit:** Create a PI for €0.01 when the cart total is €150 → call `/api/orders/confirm` → order created, stock decremented, confirmation email sent. All for €0.01.

**Fix:**
```ts
const expectedTotal = rawItems.reduce((sum, line) => {
  const p = products.find(p => p.id === line.id)!
  return sum + p.price * line.qty
}, 0)
if (pi.amount_received < expectedTotal - 10) {
  return NextResponse.json({ error: "Montant insuffisant" }, { status: 400 })
}
```

---

#### H6 — Google Calendar OAuth missing CSRF `state` parameter

**File:** `src/lib/google-calendar/index.ts` (generateAuthUrl call), `src/app/api/auth/google-calendar/callback/route.ts`

**Issue:** The OAuth authorization URL is built without a `state` parameter. The callback accepts any `code` without verifying the current session initiated the flow.

**Exploit:** A CSRF attack could trigger the callback with an attacker-controlled `code`, associating the attacker's Google Calendar token with the specialist's profile. The attacker would then receive copies of all new appointment events.

**Fix:**
```ts
// In getAuthUrl(): generate a state token and store in a short-lived cookie
const state = crypto.randomUUID()
// Set state in response cookie before redirect, verify in callback
return client.generateAuthUrl({ ..., state })
```

---

#### H7 — `travelPricing` and `taxSettings` stored without schema validation

**File:** `src/app/api/dashboard/settings/route.ts` ~lines 44, 67–68

**Issue:** These JSON fields are taken directly from the request body and stored to the DB without Zod validation. The `booking/route.ts` later casts `travelPricing` to a typed structure without safe parsing.

**Exploit:** A specialist (or attacker with their session) can store `{ "type": "zones", "zones": [{ "maxKm": 9999, "feeInCents": -10000 }] }` → every at-home booking has a negative travel fee, reducing the total charge below the service price.

**Fix:** Define and apply a Zod schema for both fields before `prisma.profile.update`.

---

#### H8 — No rate limiting on sensitive endpoints

**Files:** `src/app/api/booking/route.ts`, `src/app/api/contact/route.ts`, Supabase auth endpoints

**Issue:** No request rate limits anywhere. Vectors:
- Login: unlimited password attempts → brute force
- Booking: script can hammer all slots simultaneously → DoS on availability
- Contact: unlimited form spam

**Fix:** Upstash Redis + `@upstash/ratelimit`:
- Login: 5 attempts / 15 min / IP
- Booking: 3 creations / hour / IP
- Contact: 5 submissions / hour / IP

---

### 🟡 MEDIUM

---

#### M10 — No Content-Security-Policy header

**File:** `next.config.ts`

**Issue:** The security headers block includes `X-Frame-Options`, `nosniff`, `Referrer-Policy`, and `Permissions-Policy` — but no `Content-Security-Policy`. CSP is the browser's primary XSS mitigation layer. Without it, if any injection vector were exploited (future bug, compromised dependency), the browser would not block external script loads or data exfiltration.

**Current exposure:** No active XSS vectors exist right now (React escapes JSX, `dangerouslySetInnerHTML` is only set to hardcoded strings). But the absence of CSP means there is no defense-in-depth.

**Fix:** Add a `Content-Security-Policy` header in `next.config.ts`:
```ts
{
  key: "Content-Security-Policy",
  value: [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://js.stripe.com",  // unsafe-inline needed for Next.js inline scripts; tighten with nonces later
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https://res.cloudinary.com https://*.supabase.co",
    "connect-src 'self' https://*.supabase.co https://api.stripe.com",
    "frame-src https://js.stripe.com",
  ].join("; ")
}
```
Start in report-only mode (`Content-Security-Policy-Report-Only`) to catch violations before enforcing.

---

#### M1 — Three tables have no RLS policies

**File:** `supabase/migrations/001_rls_policies.sql`

**Tables:** `discount_codes`, `gift_cards`, `newsletter_subscribers`

**Issue:** These three tables have no `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` or associated policies. If RLS is not enabled, any authenticated (or anon, depending on project settings) Supabase client can read all rows — all discount codes and their limits, all gift card balances, all subscriber emails.

Currently the app only accesses these via Prisma (server-side), so there's no immediate exposure. But one client-side Supabase query on any of these tables would expose everything.

**Fix:** Add to migration:
```sql
ALTER TABLE "discount_codes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "gift_cards" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "newsletter_subscribers" ENABLE ROW LEVEL SECURITY;
-- specialist-only access for discount_codes and gift_cards
-- newsletter_subscribers: no client access, only service role
```

---

#### M2 — `profiles` UPDATE policy does not restrict the `role` column

**File:** `supabase/migrations/001_rls_policies.sql` lines ~26–30

**Issue:** The `profiles_client_own_update` policy allows a client to update any column on their own profile row, including `role`. Via a direct Supabase client call (bypassing the app), a client could promote themselves to `specialist`.

Currently mitigated because the app never issues a client-side UPDATE on profiles. But it's one line of client code away from a privilege escalation.

**Fix:**
```sql
CREATE POLICY "profiles_client_own_update" ON "profiles"
  FOR UPDATE USING (auth.uid()::text = id)
  WITH CHECK (auth.uid()::text = id AND role = 'client');
```

---

#### M3 — PaymentIntent not bound to the requesting user's session

**File:** `src/app/api/booking/confirm/route.ts` ~line 14

**Issue:** The endpoint accepts any `paymentIntentId` from the client with no check that the PI was created by the current session's user. A logged-in user can submit another user's PI ID.

**Partially mitigated by:** `@unique` on `Appointment.stripePaymentIntentId` (a PI can only create one appointment). The immediate double-booking risk is contained, but a logged-in user could potentially corrupt or impersonate another user's booking.

**Fix:**
```ts
const { data: { user } } = await supabase.auth.getUser()
if (user && pi.metadata.clientId && pi.metadata.clientId !== user.id) {
  return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
}
```

---

#### M4 — Unauthenticated endpoint leaks booking existence by PI ID

**File:** `src/app/api/booking/status/route.ts`

**Issue:** No authentication required. Accepts any `paymentIntentId` and reveals whether it corresponds to a confirmed appointment or a refund. Since appointment booking = health appointment, revealing existence is PII/GDPR-sensitive.

**Exploit:** PI IDs are not easily guessable externally, but an attacker who obtains one (e.g., from an intercepted URL) can confirm a specific person made a health appointment.

**Fix:** Require authentication, or at minimum verify the PI's `clientId` metadata matches the session user.

---

#### M5 — Dead stub Stripe webhook returns 200 silently

**File:** `src/app/api/stripe/webhook/route.ts`

**Issue:** This stub at `/api/stripe/webhook` returns `{ received: true }` without any processing or signature verification. If this URL is accidentally registered in the Stripe dashboard instead of `/api/webhooks/stripe`, all webhook events are silently discarded — no confirmation emails, no appointment creation, no refund processing.

**Fix:** Delete the file, or replace with an explicit 404:
```ts
export async function POST() {
  return NextResponse.json({ error: "Wrong endpoint. Use /api/webhooks/stripe" }, { status: 404 })
}
```

---

#### M6 — File upload extension taken from untrusted `file.name`

**File:** `src/app/api/dashboard/upload/route.ts` ~line 44

**Issue:** The extension stored in Supabase Storage is extracted from `file.name` (client-supplied), while the MIME type check uses `file.type`. An attacker could send `type: "image/jpeg"` (passes the allowlist) but `name: "malicious.html"` — the file is stored as `.html`.

**Exploit:** Depending on the storage CDN's content-type handling, a `.html` file could be served as `text/html`, enabling stored XSS if the URL is opened directly in a browser.

**Fix:** Derive the extension from the validated MIME type, not the filename:
```ts
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png",
  "image/webp": "webp", "image/gif": "gif", "image/avif": "avif",
}
const ext = MIME_TO_EXT[file.type] ?? "jpg"
```

---

#### M7 — Cart items array has no maximum size

**File:** `src/app/api/orders/route.ts` ~line 15

**Issue:** Only `items.length === 0` is checked. An attacker can send thousands of product IDs, triggering a large Prisma `IN` query, a loop over thousands of items, and a Stripe metadata payload that may exceed limits.

**Fix:**
```ts
if (items.length > 50) return NextResponse.json({ error: "Trop d'articles" }, { status: 422 })
// Also validate qty is a positive integer:
if (!Number.isInteger(line.qty) || line.qty < 1) return 422
```

---

#### M8 — `dangerouslySetInnerHTML` on login page success state

**File:** `src/app/(auth)/login/page.tsx` ~line 1024

**Issue:**
```tsx
<h2 dangerouslySetInnerHTML={{ __html: successTitle }} />
```
Currently safe because `setSuccessTitle` is only called with hardcoded strings. But if a future developer sets it from an API response (e.g., an error message containing user input), this becomes stored XSS.

**Fix:** Replace with plain JSX — the current strings don't use any HTML:
```tsx
<h2>{successTitle}</h2>
```

---

#### M9 — Specialist role bootstrapped from env var, not DB

**File:** `src/app/(dashboard)/layout.tsx` ~line 23, `src/app/auth/callback/route.ts` ~line 28

**Issue:**
```ts
const isSpecialist = user.email === process.env.SPECIALIST_EMAIL
```
Two problems:
1. If `SPECIALIST_EMAIL` is missing from prod env → no one can access the dashboard (silent lockout)
2. Anti-SaaS pattern — the project is being built for multi-tenant resale; this only works for one hardcoded identity

`profiles.role` already exists in the DB and is the correct source of truth. The env var was a bootstrap shortcut.

**Fix:** Remove the env var derivation. On first specialist login, set role via a seed or admin migration. Read only from `profile.role`.

---

### 🔵 LOW / INFORMATIONAL

---

#### L1 — PII logged to server logs

**File:** `src/app/api/booking/confirm/route.ts` line 50

**Issue:**
```ts
console.log("[booking/confirm] metadata:", { slotId, serviceId, clientEmail, clientName, location })
```
In production (Vercel), server logs are retained and potentially accessible to team members. Logging client names and emails is a GDPR concern for a health-related service.

**Fix:** Remove or redact PII from all `console.log` calls in API routes. Keep `console.error` for genuine errors, but log IDs not personal data:
```ts
console.log("[booking/confirm] metadata:", { slotId, serviceId, hasClient: !!clientId })
```

---

#### L2 — `requireSpecialist` copy-pasted across 8+ route files

**Files:** `src/app/api/dashboard/*/route.ts`

**Issue:** The auth+role check is duplicated in every dashboard route file. If one copy is accidentally modified, that route loses its protection without any global signal.

**Fix:** Extract to `src/lib/auth.ts` and import everywhere:
```ts
export async function requireSpecialist(): Promise<{ id: string } | NextResponse>
```

---

#### L3 — Appointment date filter accepts NaN dates

**File:** `src/app/api/dashboard/appointments/route.ts` ~lines 26–29

**Issue:** `new Date(undefined)` and `new Date("garbage")` produce `Invalid Date`. Prisma receives a NaN Date in a `gte`/`lt` filter — behaviour is undefined (may return all rows or throw).

**Fix:**
```ts
const from = new Date(fromParam)
if (isNaN(from.getTime())) return NextResponse.json({ error: "Date invalide" }, { status: 400 })
```

---

#### L4 — `SPECIALIST_EMAIL` silently affects email delivery in two extra places

**Files:** `src/app/api/booking/confirm/route.ts` ~line 136, `src/app/api/webhooks/stripe/route.ts` ~line 121

**Issue:** If `SPECIALIST_EMAIL` is not set, specialist notification emails are silently skipped — no booking alerts are sent and no error is thrown. Not a security vulnerability but a production reliability gap.

**Fix:** Add a startup check or a clear log warning if `SPECIALIST_EMAIL` is absent when sending specialist notifications.

---

#### L5 — `useAuth` hook uses low-trust session on auth state changes

**File:** `src/hooks/useAuth.ts` ~line 17

**Issue:** `onAuthStateChange` returns `session?.user` (local cookie, not server-validated) on subsequent events. The initial `getUser()` call is correctly server-validated. For UI display this is fine; any security decisions correctly go through `getUser()` in API routes. Flag for awareness.

---

---

## Audit 2 — Additional findings (security-reviewer + system-architect agents)

### 🔴 CRITICAL

---

#### C3 — Promo codes hardcoded in client bundle, discount never applied server-side

**File:** `src/app/(public)/panier/page.tsx` lines 42–44, 196–200

**Issue:** The promo lookup table (`BULLE20` = 20% off, `BIENVENUE` = €15 flat) is declared as a plain `const` in a `"use client"` component. It ships verbatim in the browser JavaScript bundle — anyone can read all valid codes by opening DevTools.

More critically: the discount is computed entirely client-side and **never sent to `/api/orders`**. The server creates the Stripe PaymentIntent from raw product prices with no promo deduction. The "Réduction" line in the cart UI is cosmetic — the actual Stripe charge is always the full total.

**Exploit:** Share promo codes freely (they're in the source). Conversely: codes can never actually reduce the charge because the server ignores them — the specialist is not losing revenue today, but the feature is broken by design.

**Fix:** Move promo validation to the server. Pass `promoCode` in the `POST /api/orders` body, look it up against the existing `discount_codes` table (schema already exists — M1), apply the discount before creating the PI, store `discountCodeId` + `discountAmount` in PI metadata for `/api/orders/confirm` to persist.

---

#### C4 — `stripePaymentIntentId` unique constraint exists in Prisma schema but is missing from DB migrations

**File:** `prisma/schema.prisma` lines 178, 261 / `supabase/migrations/`

**Issue:** `Appointment.stripePaymentIntentId` and `Order.stripePaymentIntentId` are both marked `@unique` in the Prisma schema, but neither migration emits a `CREATE UNIQUE INDEX` for these columns. The idempotency guard — the P2002 collision that prevents double-booking — is **not enforced at the DB level**. If the Prisma client is bypassed (raw SQL, Supabase dashboard insert, migration drift), two appointment rows with the same PI ID can be created silently.

**Fix:**
```sql
CREATE UNIQUE INDEX "appointments_stripePaymentIntentId_key"
  ON "appointments"("stripePaymentIntentId");
CREATE UNIQUE INDEX "orders_stripePaymentIntentId_key"
  ON "orders"("stripePaymentIntentId");
```
Add as a new migration file, then run `prisma migrate deploy`.

---

#### C5 — `orders/confirm` STOCK_ISSUE returns 409 without issuing a Stripe refund

**File:** `src/app/api/orders/confirm/route.ts` ~line 104

**Issue:** When two clients simultaneously pay for the last unit of a product, the second confirm call hits `STOCK_ISSUE`, returns `{ error: "votre paiement sera remboursé" }`, but no `stripe.refunds.create()` is called. The client is charged with no order created and no refund triggered.

**Fix:** Mirror the `booking/confirm` SLOT_TAKEN pattern:
```ts
if (err.message === "STOCK_ISSUE") {
  await stripe.refunds.create({ payment_intent: paymentIntentId, reason: "duplicate" })
  return NextResponse.json({ error: "Stock insuffisant. Votre paiement sera remboursé." }, { status: 409 })
}
```

---

#### C6 — Product stock can go negative under concurrent orders

**File:** `src/app/api/orders/confirm/route.ts` ~line 52

**Issue:** Stock is read into a JS array before the transaction starts (line 46), then the `p.stock < line.qty` check inside the transaction uses the pre-fetched JS value. Two concurrent transactions can both read `stock = 1`, both pass the check, and both issue `{ decrement: line.qty }` — leaving stock at -1.

**Fix:** Inside the transaction, re-fetch with a pessimistic lock or use a conditional update that will fail if stock is insufficient:
```ts
const updated = await tx.product.updateMany({
  where: { id: line.id, stock: { gte: line.qty } },
  data: { stock: { decrement: line.qty } },
})
if (updated.count === 0) throw new Error("STOCK_ISSUE")
```

---

#### C7 — `Review.stars` has no DB-level CHECK constraint

**File:** `prisma/schema.prisma` line 214 / migrations

**Issue:** The schema comment says "enforce with a DB CHECK constraint" but neither migration adds one. API-layer Zod validation is the only guard. A direct Supabase insert or future API bug can store `stars = 0` or `stars = 99`, corrupting all aggregate ratings.

**Fix:**
```sql
ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_stars_range" CHECK ("stars" >= 1 AND "stars" <= 5);
```

---

### 🟠 HIGH

---

#### H9 — Shipping fee is not included in the Stripe PaymentIntent

**File:** `src/app/(public)/panier/page.tsx` lines 213–234 + `src/app/api/orders/route.ts` lines 11–64

**Issue:** The cart page computes `shippingFee` (standard €6.50, express €14.90) client-side and displays it in the order summary, but `POST /api/orders` receives only `{ items }`. The server builds the PI for `sum(product.price × qty)` only. The client is charged for products but not shipping.

**Fix:** Include `shippingMethod` in the request body. Server-side: define the same `SHIPPING_OPTIONS` map, look up the selected method, add the fee to `total` before creating the PI, store `shippingMethod` in PI metadata.

---

#### H10 — Google Calendar OAuth callback has no specialist role check

**File:** `src/app/api/auth/google-calendar/callback/route.ts` lines 19–28

**Issue:** The callback verifies session exists (`if (!user)`) but never checks `profile.role === "specialist"`. If a client user reaches this callback URL with a valid `?code=`, the route calls `exchangeCode(code)` and stores a Google OAuth token on the client's profile. Combined with the missing CSRF `state` param (H6), an attacker could link their own Google Calendar token to another user's profile.

**Fix:**
```ts
const profile = await prisma.profile.findUnique({ where: { id: user.id }, select: { role: true } })
if (profile?.role !== "specialist") return NextResponse.redirect(new URL("/login", req.url))
```

---

#### H11 — `POST /api/dashboard/availability` has no Zod validation — NaN time fields cause infinite loop

**File:** `src/app/api/dashboard/availability/route.ts` lines 71–88

**Issue:** The request body is cast directly from `req.json()` with no Zod schema. Two specific gaps:
- `lunchStart`/`lunchEnd` have no format validation — `"99:99"` produces `NaN` minutes in `generateSlots`, causing the slot generation to loop indefinitely (DoS against the specialist's own endpoint)
- `start >= end` is not validated — generates zero slots silently
- Arbitrary extra keys are stored wholesale into the `weeklySchedule` JSON field in the DB

**Fix:** Define and enforce a full Zod schema before any processing, including `start < end` refinements and `z.string().regex(/^\d{2}:\d{2}$/)` for all time fields.

---

#### H12 — Availability slot regeneration is not in a transaction — gap between deleteMany and createMany

**File:** `src/app/api/dashboard/availability/route.ts` ~lines 98–128

**Issue:** `POST /api/dashboard/availability` deletes ALL future unbooked slots then re-creates 60 days of new ones in two separate Prisma calls. If the request fails between the delete and the createMany (network hiccup, server timeout, unhandled exception), the specialist has zero available slots until they manually regenerate. Clients browsing the booking page during this window see no availability.

**Fix:**
```ts
await prisma.$transaction([
  prisma.availabilitySlot.deleteMany({ where: { isBooked: false, date: { gte: today } } }),
  prisma.availabilitySlot.createMany({ data: newSlots, skipDuplicates: true }),
])
```

---

### 🟡 MEDIUM

---

#### M11 — `GET /api/travel-fee` is unauthenticated and proxies attacker addresses to Nominatim

**File:** `src/app/api/travel-fee/route.ts`

**Issue:** No authentication required. An attacker can send arbitrary `?address=` strings, which the server forwards to `https://nominatim.openstreetmap.org/search`. Effects:
- Nominatim ToS abuse using the app's server IP — risks rate-limiting or banning the Vercel egress IP
- Unlimited address enumeration using the app as an unauthenticated geolocation proxy
- No rate limiting (see H8)

**Fix:** Require any authenticated session before processing (clients are logged in during checkout). Apply H8 rate limiting once implemented.

---

#### M12 — `src/lib/stripe/client.ts` is a misleading duplicate of `src/lib/stripe.ts`

**Files:** `src/lib/stripe.ts`, `src/lib/stripe/client.ts`

**Issue:** Both files are identical — both call `new Stripe(process.env.STRIPE_SECRET_KEY!, ...)`. The filename `client.ts` strongly implies browser-safe code. If a developer imports it in a client component or a `"use client"` page, `STRIPE_SECRET_KEY` leaks to the browser bundle. Currently safe because the file isn't imported in any client component, but the naming is a trap.

**Fix:** Delete `src/lib/stripe/client.ts`. Use only `src/lib/stripe.ts`. Consider renaming it to `src/lib/stripe/server.ts` to make the server-only intent explicit.

---

#### M13 — `POST /api/auth/google-calendar/disconnect` has no specialist role check

**File:** `src/app/api/auth/google-calendar/disconnect/route.ts` lines 6–16

**Issue:** Checks auth (`if (!user)`) but not role. Any client can call this endpoint and get a 200 (though harmless today since clients don't have a `googleCalendarToken`). If calendar integration is later extended to clients, this silently becomes a token-revocation vector.

**Fix:** Add `profile.role === "specialist"` check, consistent with the other Google Calendar routes.

---

#### M14 — No database indexes on the most-queried columns

**File:** `prisma/schema.prisma`

**Issue:** No `@@index` directives exist. The highest-frequency queries hit unindexed columns:
- `Appointment` filtered by `clientId + status` (user history, client detail)
- `AvailabilitySlot` filtered by `date + isBooked` (public booking calendar — most critical)
- `Review` filtered by `serviceId + approved` (service detail page)

Without these, every availability and history query is a full table scan. At a few hundred bookings this is imperceptible; at a few thousand it becomes the primary performance bottleneck.

**Fix:**
```prisma
model Appointment {
  @@index([clientId, status])
}
model AvailabilitySlot {
  @@index([date, isBooked])
}
model Review {
  @@index([serviceId, approved])
}
```

---

#### M15 — Booking route always charges zone 1 travel fee regardless of actual distance

**File:** `src/app/api/booking/route.ts` lines 55–66

**Issue:** When `location === "domicile"`, the server computes travel fee using `pricing.zones[0]?.feeInCents` unconditionally. The public `/api/travel-fee` endpoint correctly calculates distance-based zone pricing and shows the right fee in the UI — but the booking API ignores this and always charges the first zone. A client 30 km away sees the correct €25 surcharge in the cart, but is charged the zone 1 rate (e.g. €18).

**Fix:** Either pass the verified `travelFeeInCents` from the client with the distance included in PI metadata (and re-verify server-side), or run the full `computeTravelFee` logic inside the booking route using the client-provided address.

---

#### M16 — Boutique product creation multiplies price by 100, service creation does not — inconsistent

**File:** `src/app/api/dashboard/boutique/route.ts` ~line 87

**Issue:** The boutique POST handler does `Math.round(price * 100)` — treating the form input as euros and converting to cents. The services route does NOT multiply, expecting cents from the form. If the dashboard forms are inconsistent (one sends euros, the other sends cents), products may be stored at 100× the intended price. Verify which form sends which unit.

**Fix:** Standardise: all prices stored as cents in the DB. All dashboard forms send euros, all API routes multiply by 100. Or the inverse — but pick one and document it.

---

### 🔵 LOW / INFORMATIONAL

---

#### L6 — `requireSpecialist()` returns 401 for both unauthenticated and wrong-role cases

**Files:** `src/app/api/dashboard/clients/route.ts`, `src/app/api/dashboard/boutique/route.ts`, and others using the shared helper

**Issue:** The helper returns `null` for both missing session and wrong role; callers return 401 in both cases. HTTP convention: 401 = not authenticated, 403 = authenticated but forbidden. A client-role user hitting a dashboard route should get 403, not 401 — 401 tells their client to retry authentication. Addressed naturally by the L2 fix (extract shared `requireSpecialist` to `src/lib/auth.ts` with typed return values).

---

#### L7 — Personal email hardcoded in Nominatim User-Agent

**File:** `src/lib/geo.ts` line 31

**Issue:**
```ts
"User-Agent": "LaBulleDVie/1.0 (raphaelgarnier1997@gmail.com)"
```
Required by Nominatim ToS. However, it's hardcoded in source and will persist in git history and any fork. For SaaS resale, each deployed instance should use the specialist's contact email.

**Fix:**
```ts
`LaBulleDVie/1.0 (${process.env.NOMINATIM_CONTACT_EMAIL ?? "contact@labulledevie.fr"})`
```

---

#### L8 — Finances refund KPI is computed from a `take: 20` slice

**File:** `src/app/api/dashboard/finances/route.ts` ~line 81

**Issue:** The refund list query uses `take: 20`. The `totalRefundedCents` KPI is computed in JS from this 20-item slice, not from a DB aggregate. If the specialist has more than 20 refunds, the displayed "Total remboursé" figure is understated.

**Fix:** Add a separate `prisma.appointment.aggregate({ where: { refundStatus: "refunded" }, _sum: { amountPaid: true } })` for the KPI, independent of the display list.

---

## Classic web attack vectors

### CSRF (Cross-Site Request Forgery)

**Status: Mostly mitigated — no explicit token, but architecture provides protection.**

Supabase SSR sets session cookies with `SameSite=Lax`. This means:
- A malicious cross-origin page doing `fetch("https://labulledevie.fr/api/booking", { credentials: "include" })` — the browser **will not send the cookie**. SameSite=Lax blocks cross-origin subrequests (fetch, XHR, iframes, form POST from a foreign origin). This covers the most common CSRF attack vector.
- The remaining gap: `SameSite=Lax` still sends cookies on top-level GET navigations. Any state-changing `GET` endpoint would be vulnerable. Currently none exist — all mutations use `POST`/`PATCH`/`DELETE`.

**What's not covered:**
- No explicit `Origin` header check on API routes. If a subdomain of the app domain were ever compromised, `SameSite=Lax` would not protect.
- Google Calendar OAuth flow is missing a CSRF `state` param (see H6 above — this is the one real CSRF exposure).
- No `SameSite=Strict` — using Lax is the correct trade-off (Strict breaks OAuth redirects), but worth noting.

**Verdict:** Protected for the standard threat model. H6 is the only active CSRF vulnerability.

---

### SQL Injection

**Status: Protected — no exposure found.**

Two query layers, both safe:

1. **Prisma ORM** — all queries use the query builder (`.findMany()`, `.create()`, `.update()`). Prisma parameterizes every value. Grepped the entire `src/` directory for `$queryRaw`, `$queryRawUnsafe`, `$executeRaw`, `$executeRawUnsafe` — **zero hits**. No raw SQL anywhere.

2. **Supabase PostgREST** (`.from("table").select()`) — PostgREST parameterizes all inputs at the protocol level. User input never reaches SQL string construction.

**Future risk to watch:** If `$queryRaw` is ever added, use Prisma's tagged template literal form only:
```ts
// SAFE — parameterized
prisma.$queryRaw`SELECT * FROM appointments WHERE id = ${id}`

// UNSAFE — never do this
prisma.$queryRaw(`SELECT * FROM appointments WHERE id = '${id}'`)
```

**Verdict:** Clean. Maintain the ORM-only discipline.

---

### XSS (Cross-Site Scripting)

**Status: Mostly protected — one confirmed gap (no CSP).**

**Protected:**
- React/Next.js escapes all JSX output by default. Every `{variable}` in JSX is HTML-encoded. An attacker cannot inject markup via any React-rendered value.
- The one `dangerouslySetInnerHTML` in the codebase (`login/page.tsx:1024`) only receives hardcoded French strings set by `setSuccessTitle`. No user input ever reaches it. (Still should be fixed — see M8.)
- No `eval()`, `innerHTML`, or `document.write()` usage found.

**Exposed:**
- **No Content-Security-Policy header** (see M10). Without CSP, if an XSS payload were executed via a future bug, the browser has no fallback restriction on script sources or data exfiltration endpoints.
- Supabase auth cookies are not `httpOnly` by design (the Supabase JS client must read them). If XSS were ever achieved, session tokens would be accessible to the injected script.

**Verdict:** No active XSS vectors exist today. The missing CSP is the gap — it would contain any future injection by blocking unauthorized script sources.

---

## Correctly implemented ✅

- **SQL injection:** Zero raw queries — all DB access via Prisma ORM or Supabase PostgREST, both fully parameterized
- **XSS via React:** JSX auto-escaping on all rendered values — no user-controlled `dangerouslySetInnerHTML`
- **CSRF:** `SameSite=Lax` on Supabase session cookies — cross-origin fetch/XHR cannot send credentials; all mutations use POST
- `getUser()` used everywhere in API routes and layouts — `getSession()` never used for auth decisions
- Stripe PaymentIntents created server-side with prices from DB — client never sends an amount
- `stripe.webhooks.constructEvent()` verifies Stripe signature before processing any event
- `@unique` on `Appointment.stripePaymentIntentId` and `Order.stripePaymentIntentId` in Prisma schema — note: DB-level unique index is missing from migrations (see C4)
- Webhook `payment_intent.succeeded` SLOT_TAKEN path correctly calls `stripe.refunds.create()` — confirmed fixed
- Zod validation on all public POST endpoints (`/api/contact`, `/api/newsletter`, `/api/reviews`, `/api/booking`)
- Security HTTP headers in `next.config.ts`: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`
- RLS enabled on 8 of 11 tables with well-scoped policies
- `availability_slots_public_select` uses `USING (true)` for SELECT only — appropriate for public calendar
- `appointments` client policies filter by `clientId = auth.uid()::text` — clients can't read each other's appointments
- `SUPABASE_SERVICE_ROLE_KEY` only imported in `src/lib/supabase/admin.ts` (server-side only), never in client components or `NEXT_PUBLIC_*` vars
- Review submission (`POST /api/reviews`) verifies the appointment belongs to the current user before allowing a review
- Newsletter unsubscribe returns 200 for non-existent tokens — correct, prevents email enumeration
- All `requireSpecialist()` helpers (where present) check both auth AND `profile.role` from DB
- Auth callback trigger (`002_profile_trigger.sql`) always creates profiles with `role = 'client'` — new OAuth users cannot self-assign specialist role
- Route-level proxy auth guard (`src/proxy.ts`) redirects unauthenticated users before React renders

---

## Pre-production checklist

### Must fix before launch
- [ ] **C1** — Validate `isFirstVisit` against booking history
- [ ] **C2** — Verify `pi.amount_received` against DB service price in `booking/confirm`
- [ ] **C3** — Move promo code validation server-side; wire to `discount_codes` table
- [x] **C4** — Add missing `UNIQUE INDEX` for `stripePaymentIntentId` on `appointments` and `orders` tables ✅ migration 004
- [x] **C5** — Add Stripe refund to `orders/confirm` STOCK_ISSUE branch ✅ fixed
- [ ] **C6** — Fix concurrent stock decrement with conditional update inside transaction
- [x] **C7** — Add `CHECK (stars >= 1 AND stars <= 5)` constraint to `reviews` table ✅ migration 004
- [x] **H1** — Sanitise `next` param in auth callback (open redirect) ✅ fixed
- [x] **H2** — Sanitise `redirectTo` param in login page (open redirect) ✅ fixed
- [x] **H3** — Add role check to `GET /api/dashboard/appointments` ✅ already present
- [x] **H4** — Add role check to `GET/POST /api/dashboard/settings` ✅ already present
- [ ] **H5** — Verify `pi.amount_received` against DB product prices in `orders/confirm`
- [ ] **H6** — Add CSRF `state` param to Google Calendar OAuth flow
- [ ] **H7** — Add Zod validation to `travelPricing` and `taxSettings` before DB write
- [ ] **H8** — Implement rate limiting (Upstash Redis)
- [ ] **H9** — Include shipping fee in Stripe PaymentIntent for orders
- [ ] **H10** — Add specialist role check to Google Calendar OAuth callback
- [ ] **H11** — Add Zod validation to `POST /api/dashboard/availability` (NaN time DoS)
- [x] **H12** — Wrap availability deleteMany + createMany in a single `$transaction` ✅ fixed

### Should fix before launch
- [ ] **M1** — Enable RLS on `discount_codes`, `gift_cards`, `newsletter_subscribers`
- [ ] **M2** — Add `WITH CHECK (role = 'client')` to profiles UPDATE policy
- [ ] **M3** — Bind PaymentIntent to session user in `booking/confirm`
- [ ] **M4** — Add auth to `/api/booking/status`
- [x] **M5** — Delete or replace dead stub `/api/stripe/webhook` ✅ deleted
- [ ] **M6** — Derive file extension from MIME type, not filename
- [ ] **M7** — Cap cart items at 50, validate qty is integer
- [x] **M8** — Replace `dangerouslySetInnerHTML` on login page ✅ fixed
- [ ] **M9** — Remove `SPECIALIST_EMAIL` role derivation, use `profile.role` only
- [ ] **M10** — Add Content-Security-Policy header to `next.config.ts`
- [ ] **M11** — Add auth to `GET /api/travel-fee` to prevent Nominatim proxy abuse
- [x] **M12** — Delete `src/lib/stripe/client.ts` (misleading duplicate) ✅ deleted
- [ ] **M13** — Add role check to `POST /api/auth/google-calendar/disconnect`
- [x] **M14** — Add `@@index` directives to Prisma schema (AvailabilitySlot date, Appointment clientId, Review serviceId) ✅ migration 004
- [ ] **M15** — Fix travel zone selection in booking route (currently always zone 0)
- [ ] **M16** — Audit boutique vs services price unit (euros vs cents inconsistency)

### Polish / good hygiene
- [x] **L1** — Remove PII from `console.log` in API routes ✅ fixed
- [ ] **L2** — Extract `requireSpecialist` to shared `src/lib/auth.ts` (also fixes L6 401 vs 403)
- [ ] **L3** — Validate date params before passing to Prisma
- [ ] **L4** — Add warning log when `SPECIALIST_EMAIL` is missing
- [x] **L7** — Move Nominatim contact email to env var (`NOMINATIM_CONTACT_EMAIL`) ✅ fixed
- [ ] **L8** — Fix finances refund KPI to use DB aggregate, not `take: 20` slice

### Requires Supabase Pro plan
- [ ] **Leaked password protection** — Enable in Dashboard → Authentication → Settings → Password → "Prevent use of leaked passwords" (HaveIBeenPwned check). Unavailable on free plan — enable on upgrade.

### Infrastructure (before go-live)
- [ ] Verify Stripe dashboard webhook points to `/api/webhooks/stripe` (not the stub)
- [ ] Set `RESEND_API_KEY`, `STRIPE_SECRET_KEY` (live mode), `STRIPE_WEBHOOK_SECRET` (live)
- [ ] Register Apple Pay domain in Stripe dashboard
- [ ] Verify `GOOGLE_REDIRECT_URI` matches production domain
- [ ] Run `prisma migrate deploy` (not `db push`) for production migrations
- [ ] Confirm all `NEXT_PUBLIC_*` vars are safe to expose (currently: Supabase URL, Supabase anon key, Stripe publishable key — all correct)
