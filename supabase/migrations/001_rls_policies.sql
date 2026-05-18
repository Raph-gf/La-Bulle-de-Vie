-- ============================================================================
-- 001_rls_policies.sql
-- La Bulle De Vie — Row Level Security policies
--
-- Prisma stores all String PKs/FKs as text in PostgreSQL.
-- auth.uid() returns uuid — cast to ::text on every comparison.
--
-- Idempotent: DROP POLICY IF EXISTS before each CREATE POLICY.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_client_own_select"      ON "profiles";
DROP POLICY IF EXISTS "profiles_client_own_update"      ON "profiles";
DROP POLICY IF EXISTS "profiles_insert_own"             ON "profiles";
DROP POLICY IF EXISTS "profiles_specialist_select_all"  ON "profiles";

CREATE POLICY "profiles_client_own_select"
  ON "profiles" FOR SELECT
  USING (auth.uid()::text = id);

CREATE POLICY "profiles_client_own_update"
  ON "profiles" FOR UPDATE
  USING (auth.uid()::text = id)
  WITH CHECK (auth.uid()::text = id);

CREATE POLICY "profiles_insert_own"
  ON "profiles" FOR INSERT
  WITH CHECK (auth.uid()::text = id);

CREATE POLICY "profiles_specialist_select_all"
  ON "profiles" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "profiles" p
      WHERE p.id = auth.uid()::text AND p.role = 'specialist'
    )
  );

-- ---------------------------------------------------------------------------
-- services
-- ---------------------------------------------------------------------------

ALTER TABLE "services" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "services_public_select"    ON "services";
DROP POLICY IF EXISTS "services_specialist_all"   ON "services";

CREATE POLICY "services_public_select"
  ON "services" FOR SELECT
  USING ("isPublished" = true);

CREATE POLICY "services_specialist_all"
  ON "services" FOR ALL
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
-- availability_slots
-- ---------------------------------------------------------------------------

ALTER TABLE "availability_slots" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "availability_slots_public_select"    ON "availability_slots";
DROP POLICY IF EXISTS "availability_slots_specialist_all"   ON "availability_slots";

CREATE POLICY "availability_slots_public_select"
  ON "availability_slots" FOR SELECT
  USING (true);

CREATE POLICY "availability_slots_specialist_all"
  ON "availability_slots" FOR ALL
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
-- appointments
-- ---------------------------------------------------------------------------

ALTER TABLE "appointments" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "appointments_client_own_select"      ON "appointments";
DROP POLICY IF EXISTS "appointments_client_own_insert"      ON "appointments";
DROP POLICY IF EXISTS "appointments_client_own_update"      ON "appointments";
DROP POLICY IF EXISTS "appointments_specialist_select_all"  ON "appointments";
DROP POLICY IF EXISTS "appointments_specialist_update"      ON "appointments";

CREATE POLICY "appointments_client_own_select"
  ON "appointments" FOR SELECT
  USING (auth.uid()::text = "clientId");

CREATE POLICY "appointments_client_own_insert"
  ON "appointments" FOR INSERT
  WITH CHECK (auth.uid()::text = "clientId");

CREATE POLICY "appointments_client_own_update"
  ON "appointments" FOR UPDATE
  USING (auth.uid()::text = "clientId")
  WITH CHECK (auth.uid()::text = "clientId");

-- No DELETE policy — soft-cancel via status field only.

CREATE POLICY "appointments_specialist_select_all"
  ON "appointments" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "profiles"
      WHERE id = auth.uid()::text AND role = 'specialist'
    )
  );

CREATE POLICY "appointments_specialist_update"
  ON "appointments" FOR UPDATE
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
-- reviews
-- ---------------------------------------------------------------------------

ALTER TABLE "reviews" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "reviews"
  DROP CONSTRAINT IF EXISTS "reviews_stars_range";
ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_stars_range" CHECK (stars >= 1 AND stars <= 5);

DROP POLICY IF EXISTS "reviews_public_select"       ON "reviews";
DROP POLICY IF EXISTS "reviews_client_own_select"   ON "reviews";
DROP POLICY IF EXISTS "reviews_client_insert"       ON "reviews";
DROP POLICY IF EXISTS "reviews_specialist_all"      ON "reviews";

CREATE POLICY "reviews_public_select"
  ON "reviews" FOR SELECT
  USING ("approved" = true);

CREATE POLICY "reviews_client_own_select"
  ON "reviews" FOR SELECT
  USING (auth.uid()::text = "clientId");

CREATE POLICY "reviews_client_insert"
  ON "reviews" FOR INSERT
  WITH CHECK (auth.uid()::text = "clientId");

CREATE POLICY "reviews_specialist_all"
  ON "reviews" FOR ALL
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
-- products
-- ---------------------------------------------------------------------------

ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_public_select"    ON "products";
DROP POLICY IF EXISTS "products_specialist_all"   ON "products";

CREATE POLICY "products_public_select"
  ON "products" FOR SELECT
  USING ("isPublished" = true);

CREATE POLICY "products_specialist_all"
  ON "products" FOR ALL
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
-- orders
-- ---------------------------------------------------------------------------

ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_client_own_select"      ON "orders";
DROP POLICY IF EXISTS "orders_client_own_insert"      ON "orders";
DROP POLICY IF EXISTS "orders_client_own_update"      ON "orders";
DROP POLICY IF EXISTS "orders_specialist_select_all"  ON "orders";
DROP POLICY IF EXISTS "orders_specialist_update"      ON "orders";

CREATE POLICY "orders_client_own_select"
  ON "orders" FOR SELECT
  USING (auth.uid()::text = "clientId");

CREATE POLICY "orders_client_own_insert"
  ON "orders" FOR INSERT
  WITH CHECK (auth.uid()::text = "clientId");

CREATE POLICY "orders_client_own_update"
  ON "orders" FOR UPDATE
  USING (auth.uid()::text = "clientId")
  WITH CHECK (auth.uid()::text = "clientId");

CREATE POLICY "orders_specialist_select_all"
  ON "orders" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "profiles"
      WHERE id = auth.uid()::text AND role = 'specialist'
    )
  );

CREATE POLICY "orders_specialist_update"
  ON "orders" FOR UPDATE
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
-- order_items
-- ---------------------------------------------------------------------------

ALTER TABLE "order_items" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_items_client_own_select"       ON "order_items";
DROP POLICY IF EXISTS "order_items_client_own_insert"       ON "order_items";
DROP POLICY IF EXISTS "order_items_specialist_select_all"   ON "order_items";

CREATE POLICY "order_items_client_own_select"
  ON "order_items" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "orders"
      WHERE "orders".id = "order_items"."orderId"
        AND "orders"."clientId" = auth.uid()::text
    )
  );

CREATE POLICY "order_items_client_own_insert"
  ON "order_items" FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "orders"
      WHERE "orders".id = "order_items"."orderId"
        AND "orders"."clientId" = auth.uid()::text
    )
  );

CREATE POLICY "order_items_specialist_select_all"
  ON "order_items" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "profiles"
      WHERE id = auth.uid()::text AND role = 'specialist'
    )
  );

-- ============================================================================
-- Indexes (idempotent via IF NOT EXISTS)
-- ============================================================================

CREATE INDEX IF NOT EXISTS "idx_appointments_client_id"       ON "appointments" ("clientId");
CREATE INDEX IF NOT EXISTS "idx_appointments_service_id"      ON "appointments" ("serviceId");
CREATE INDEX IF NOT EXISTS "idx_appointments_slot_id"         ON "appointments" ("slotId");
CREATE INDEX IF NOT EXISTS "idx_appointments_status"          ON "appointments" ("status");

CREATE INDEX IF NOT EXISTS "idx_reviews_service_id"           ON "reviews" ("serviceId");
CREATE INDEX IF NOT EXISTS "idx_reviews_client_id"            ON "reviews" ("clientId");
CREATE INDEX IF NOT EXISTS "idx_reviews_approved"             ON "reviews" ("approved");

CREATE INDEX IF NOT EXISTS "idx_orders_client_id"             ON "orders" ("clientId");
CREATE INDEX IF NOT EXISTS "idx_orders_status"                ON "orders" ("status");

CREATE INDEX IF NOT EXISTS "idx_order_items_order_id"         ON "order_items" ("orderId");
CREATE INDEX IF NOT EXISTS "idx_order_items_product_id"       ON "order_items" ("productId");

CREATE INDEX IF NOT EXISTS "idx_availability_slots_date"      ON "availability_slots" ("date");
CREATE INDEX IF NOT EXISTS "idx_availability_slots_is_booked" ON "availability_slots" ("isBooked");

CREATE INDEX IF NOT EXISTS "idx_services_slug"                ON "services" ("slug");
CREATE INDEX IF NOT EXISTS "idx_services_category"            ON "services" ("category");
CREATE INDEX IF NOT EXISTS "idx_services_published"           ON "services" ("isPublished");

CREATE INDEX IF NOT EXISTS "idx_products_published"           ON "products" ("isPublished");
