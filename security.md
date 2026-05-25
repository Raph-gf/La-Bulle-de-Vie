# La Bulle De Vie — Security Audit

> Last updated: 2026-05-25. Full audit combining automated review + manual analysis.
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

## Correctly implemented ✅

- `getUser()` used everywhere in API routes and layouts — `getSession()` never used for auth decisions
- Stripe PaymentIntents created server-side with prices from DB — client never sends an amount
- `stripe.webhooks.constructEvent()` verifies Stripe signature before processing any event
- `@unique` on `Appointment.stripePaymentIntentId` and `Order.stripePaymentIntentId` — prevents double-booking/double-order
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
- [ ] **H1** — Sanitise `next` param in auth callback (open redirect)
- [ ] **H2** — Sanitise `redirectTo` param in login page (open redirect)
- [ ] **H3** — Add role check to `GET /api/dashboard/appointments`
- [ ] **H4** — Add role check to `GET/POST /api/dashboard/settings`
- [ ] **H5** — Verify `pi.amount_received` against DB product prices in `orders/confirm`
- [ ] **H6** — Add CSRF `state` param to Google Calendar OAuth flow
- [ ] **H7** — Add Zod validation to `travelPricing` and `taxSettings` before DB write
- [ ] **H8** — Implement rate limiting (Upstash Redis)

### Should fix before launch
- [ ] **M1** — Enable RLS on `discount_codes`, `gift_cards`, `newsletter_subscribers`
- [ ] **M2** — Add `WITH CHECK (role = 'client')` to profiles UPDATE policy
- [ ] **M3** — Bind PaymentIntent to session user in `booking/confirm`
- [ ] **M4** — Add auth to `/api/booking/status`
- [ ] **M5** — Delete or replace dead stub `/api/stripe/webhook`
- [ ] **M6** — Derive file extension from MIME type, not filename
- [ ] **M7** — Cap cart items at 50, validate qty is integer
- [ ] **M8** — Replace `dangerouslySetInnerHTML` on login page
- [ ] **M9** — Remove `SPECIALIST_EMAIL` role derivation, use `profile.role` only

### Polish / good hygiene
- [ ] **L1** — Remove PII from `console.log` in API routes
- [ ] **L2** — Extract `requireSpecialist` to shared `src/lib/auth.ts`
- [ ] **L3** — Validate date params before passing to Prisma
- [ ] **L4** — Add warning log when `SPECIALIST_EMAIL` is missing

### Infrastructure (before go-live)
- [ ] Verify Stripe dashboard webhook points to `/api/webhooks/stripe` (not the stub)
- [ ] Set `RESEND_API_KEY`, `STRIPE_SECRET_KEY` (live mode), `STRIPE_WEBHOOK_SECRET` (live)
- [ ] Register Apple Pay domain in Stripe dashboard
- [ ] Verify `GOOGLE_REDIRECT_URI` matches production domain
- [ ] Run `prisma migrate deploy` (not `db push`) for production migrations
- [ ] Confirm all `NEXT_PUBLIC_*` vars are safe to expose (currently: Supabase URL, Supabase anon key, Stripe publishable key — all correct)
