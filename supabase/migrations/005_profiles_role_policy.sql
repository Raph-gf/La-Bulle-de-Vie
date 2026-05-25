-- ============================================================================
-- 005_profiles_role_policy.sql
-- M2: Prevent role self-escalation via RLS
--
-- The original profiles_client_own_update policy only checked ownership.
-- A client could POST { role: "specialist" } through the Supabase client
-- and the WITH CHECK would pass. This splits the policy by role so each
-- side can only keep their own role after any update.
-- ============================================================================

-- Recreate the client update policy with a role lock.
-- WITH CHECK (role = 'client') means: after the update the role must still be 'client'.
-- This prevents a client from escalating to 'specialist'.
DROP POLICY IF EXISTS "profiles_client_own_update" ON "profiles";

CREATE POLICY "profiles_client_own_update"
  ON "profiles" FOR UPDATE
  USING  (auth.uid()::text = id AND role = 'client')
  WITH CHECK (auth.uid()::text = id AND role = 'client');

-- Specialist's own update policy (they can update their profile, role stays 'specialist').
DROP POLICY IF EXISTS "profiles_specialist_own_update" ON "profiles";

CREATE POLICY "profiles_specialist_own_update"
  ON "profiles" FOR UPDATE
  USING  (auth.uid()::text = id AND role = 'specialist')
  WITH CHECK (auth.uid()::text = id AND role = 'specialist');
