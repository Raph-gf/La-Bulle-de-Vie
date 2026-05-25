-- ============================================================================
-- 004_indexes_and_constraints.sql
-- Three data-integrity and performance fixes.
-- Idempotent: IF NOT EXISTS on every statement.
-- ============================================================================

-- ─── C4: Unique indexes for stripePaymentIntentId ────────────────────────────
--
-- WHY THIS MATTERS:
-- The booking and order flows use a dual-confirmation pattern: the client
-- calls /api/booking/confirm immediately after payment, and the Stripe webhook
-- fires async as an idempotent backup. The only thing preventing two concurrent
-- callers from creating two appointment rows for the same payment is the
-- P2002 unique-constraint error from Prisma.
--
-- The Prisma schema declares @unique on both columns — but this project uses
-- hand-written SQL migrations, not `prisma migrate`. Prisma never emitted the
-- actual CREATE UNIQUE INDEX statements. The constraint exists in the ORM layer
-- only, not in PostgreSQL. Any write that bypasses Prisma (Supabase dashboard,
-- raw SQL, a future migration bug) can silently create duplicate rows and break
-- the entire idempotency guarantee.
--
-- NULL values are allowed (appointment not yet paid) — PostgreSQL correctly
-- treats NULL != NULL so multiple NULLs never violate a unique index.

CREATE UNIQUE INDEX IF NOT EXISTS "appointments_stripePaymentIntentId_key"
  ON "appointments"("stripePaymentIntentId");

CREATE UNIQUE INDEX IF NOT EXISTS "orders_stripePaymentIntentId_key"
  ON "orders"("stripePaymentIntentId");


-- ─── C7: Star rating CHECK constraint ────────────────────────────────────────
--
-- WHY THIS MATTERS:
-- The Zod schema validates stars at the API boundary (1–5), but that's only
-- one layer. A direct Supabase dashboard insert, a future API route that forgets
-- Zod, or a DB seed script could store stars = 0 or stars = 99. Those rows
-- would silently corrupt every aggregate rating calculation — average stars on
-- a service card, the specialist's overall rating, the review sort order.
-- A CHECK constraint enforces the rule at the storage layer regardless of how
-- data arrives. It costs zero at query time (checked only on INSERT/UPDATE).

ALTER TABLE "reviews"
  ADD CONSTRAINT IF NOT EXISTS "reviews_stars_range"
  CHECK ("stars" >= 1 AND "stars" <= 5);


-- ─── M14: Performance indexes on the highest-frequency query paths ────────────
--
-- WHY THIS MATTERS:
-- PostgreSQL does a sequential scan (reads every row) when there is no index
-- for a query's WHERE or ORDER BY clause. On a small dataset this is fast.
-- As data grows — hundreds of availability slots per week, thousands of
-- appointments over years — every unindexed query becomes progressively slower.
-- These three indexes cover the most-hit read paths in the entire app.

-- 1. Public booking calendar — /api/booking/availability/slots
--    Every visitor to the booking page triggers this query:
--    WHERE date >= today AND isBooked = false
--    Without the index: full table scan of all slots ever created.
--    With the index: instant lookup by date range, filtered on isBooked.
--    Most critical — this is the highest-traffic public endpoint.
CREATE INDEX IF NOT EXISTS "availability_slots_date_isBooked_idx"
  ON "availability_slots"("date", "isBooked");

-- 2. User appointment history — /api/user/appointments, /api/user/history,
--    dashboard client detail (/api/dashboard/clients/[id])
--    All filter by clientId + status. Without index: full scan of all
--    appointments to find the ones belonging to one client.
CREATE INDEX IF NOT EXISTS "appointments_clientId_status_idx"
  ON "appointments"("clientId", "status");

-- 3. Service detail page + dashboard reviews list
--    WHERE serviceId = $1 AND approved = true
--    Without index: full scan of all reviews for every service page load.
CREATE INDEX IF NOT EXISTS "reviews_serviceId_approved_idx"
  ON "reviews"("serviceId", "approved");
