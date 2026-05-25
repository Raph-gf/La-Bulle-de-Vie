-- ============================================================================
-- 006_rls_missing_tables.sql
-- M1: Enable RLS on discount_codes, gift_cards, newsletter_subscribers
--
-- These three tables were created without RLS. Without it, any authenticated
-- (or even anonymous) Supabase client can read/write them directly.
-- All legitimate access goes through the Prisma service-role client in API
-- routes, so the policies here are intentionally restrictive.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- discount_codes — specialist manages, no direct client access needed
-- ---------------------------------------------------------------------------

ALTER TABLE "discount_codes" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "discount_codes_specialist_all" ON "discount_codes";

CREATE POLICY "discount_codes_specialist_all"
  ON "discount_codes" FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "profiles"
      WHERE id = auth.uid()::text AND role = 'specialist'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "profiles"
      WHERE id = auth.uid()::text AND role = 'specialist'
    )
  );

-- ---------------------------------------------------------------------------
-- gift_cards — specialist manages; owner can read their own
-- ---------------------------------------------------------------------------

ALTER TABLE "gift_cards" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gift_cards_specialist_all"     ON "gift_cards";
DROP POLICY IF EXISTS "gift_cards_purchaser_select"   ON "gift_cards";
DROP POLICY IF EXISTS "gift_cards_redeemer_select"    ON "gift_cards";

CREATE POLICY "gift_cards_specialist_all"
  ON "gift_cards" FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "profiles"
      WHERE id = auth.uid()::text AND role = 'specialist'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "profiles"
      WHERE id = auth.uid()::text AND role = 'specialist'
    )
  );

CREATE POLICY "gift_cards_purchaser_select"
  ON "gift_cards" FOR SELECT
  USING (auth.uid()::text = "purchasedById");

CREATE POLICY "gift_cards_redeemer_select"
  ON "gift_cards" FOR SELECT
  USING (auth.uid()::text = "redeemedById");

-- ---------------------------------------------------------------------------
-- newsletter_subscribers — specialist reads all; anyone can insert their own
-- ---------------------------------------------------------------------------

ALTER TABLE "newsletter_subscribers" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "newsletter_subscribers_specialist_select" ON "newsletter_subscribers";
DROP POLICY IF EXISTS "newsletter_subscribers_public_insert"     ON "newsletter_subscribers";

CREATE POLICY "newsletter_subscribers_specialist_select"
  ON "newsletter_subscribers" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "profiles"
      WHERE id = auth.uid()::text AND role = 'specialist'
    )
  );

-- Allow unauthenticated newsletter sign-ups (public-facing form)
CREATE POLICY "newsletter_subscribers_public_insert"
  ON "newsletter_subscribers" FOR INSERT
  WITH CHECK (true);
