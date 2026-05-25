-- ─────────────────────────────────────────────────────────────────────────────
-- Revoke public execute permission on handle_new_user().
--
-- The function is SECURITY DEFINER (runs with elevated privileges) and must
-- only be invoked by the on_auth_user_created trigger — never directly by
-- anon or authenticated users. PostgreSQL grants EXECUTE to PUBLIC by default,
-- which is what Supabase's security advisor flags.
-- ─────────────────────────────────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
