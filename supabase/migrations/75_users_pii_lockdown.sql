-- ============================================================================
-- Migration 75: users PII lockdown — column-level SELECT privileges
-- ============================================================================
--
-- THE LEAK (confirmed in production):
--   Any logged-in user could read EVERY user's email, date_of_birth, phone,
--   two_factor_secret, parent_email, minor/parental-consent status, precise
--   home coordinates, and referred_by straight through PostgREST
--   (`.from('users').select('*')`). Anonymous clients could do the same for
--   public profiles.
--
-- ROOT CAUSES:
--   1. The users_authenticated_read RLS policy is USING (true) — row-level
--      visibility is intentionally broad (profiles are a social surface),
--      so RLS never protected the sensitive COLUMNS.
--   2. Table-level `GRANT SELECT ON public.users TO anon` (migration 27) plus
--      the default table-level SELECT grant to authenticated.
--   3. Migrations 35/38 tried column-level REVOKEs
--      (`REVOKE SELECT (email) ON public.users FROM authenticated`), which
--      are INEFFECTIVE by design: in PostgreSQL, privileges are additive and
--      a column-specific REVOKE can only remove a matching column-specific
--      GRANT. It cannot subtract a column from a whole-table GRANT — the
--      table-level SELECT continued to cover every column.
--
-- THE FIX (this migration):
--   Revoke table-level SELECT entirely, then grant SELECT back on an
--   explicit safe-column allowlist. This is the only privilege shape in
--   which "everything except these columns" is actually enforceable.
--
--   * ROW visibility is unchanged — no RLS policy is touched.
--   * INSERT / UPDATE / DELETE grants are unchanged (profile edits keep
--     working; supabase-js updates default to Prefer: return=minimal, and no
--     app code chains .select() onto a users update).
--   * The service_role client bypasses grants and RLS — admin code paths
--     (email notify, passport connect, collaborator admin fallback) are
--     unaffected.
--   * Views are unaffected or already safe: reactions_with_users (m30) and
--     users_public (m36/m38) are security_invoker views that select only
--     columns present in the allowlist below.
--
-- COLUMNS DELIBERATELY NOT GRANTED (unreadable via anon/authenticated after
-- this migration; still readable by the owner via get_my_profile()):
--   email                     — PII; the leak that triggered this migration
--   date_of_birth             — PII / minor-protection data
--   phone                     — PII; no client code reads it
--   two_factor_secret         — account-takeover material; nothing may read it
--   parent_email              — third-party PII
--   is_minor, parental_consent_status, parental_consent_at — COPPA data
--   email_notifications       — preference; only read via service role
--   home_latitude, home_longitude — precise home coordinates (self-only use)
--   referred_by               — referral graph; only used via SECURITY
--                               DEFINER RPCs (claim_referral / count_referrals)
--   plan                      — (migration 69, not applied everywhere) if/when
--                               it exists it must be granted explicitly or the
--                               two routes selecting it get 42501 instead of
--                               the currently-tolerated 42703.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Drop ALL table-level SELECT on public.users for client roles
-- ----------------------------------------------------------------------------
REVOKE SELECT ON public.users FROM PUBLIC;
REVOKE SELECT ON public.users FROM anon;
REVOKE SELECT ON public.users FROM authenticated;

-- ----------------------------------------------------------------------------
-- 2. Grant back SELECT on the explicit safe-column allowlist
-- ----------------------------------------------------------------------------
-- The allowlist is intersected against information_schema.columns so this
-- migration never errors in an environment whose users table is missing one
-- of these columns (older self-hosted DBs, partial migration history).
DO $$
DECLARE
  v_cols text;
BEGIN
  SELECT string_agg(quote_ident(c.column_name), ', ' ORDER BY c.ordinal_position)
  INTO v_cols
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'users'
    AND c.column_name = ANY (ARRAY[
      'id',
      'username',
      'display_name',
      'name',
      'bio',
      'avatar_url',
      'cover_photo_url',
      'website',
      'privacy_level',
      'is_private',
      'is_verified',
      'created_at',
      'updated_at',
      'deleted_at',
      'location',
      'home_city',
      'home_country',
      'current_streak_days',
      'longest_streak_days',
      'last_activity_date'
    ]);

  IF v_cols IS NULL THEN
    RAISE EXCEPTION 'users PII lockdown: none of the safe columns exist on public.users — aborting so the app is not left with zero readable columns';
  END IF;

  EXECUTE format('GRANT SELECT (%s) ON public.users TO anon, authenticated', v_cols);
END $$;

-- ----------------------------------------------------------------------------
-- 3. get_my_profile() — the owner's escape hatch for their OWN full row
-- ----------------------------------------------------------------------------
-- AuthProvider and the GDPR data export legitimately need the caller's own
-- complete row (email, date_of_birth, home coordinates, ...). SECURITY
-- DEFINER runs with the function owner's privileges, so the column grants
-- above don't apply — but the WHERE id = auth.uid() predicate hard-limits it
-- to the caller's own row. Anonymous callers get zero rows (auth.uid() IS
-- NULL never matches).
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS SETOF public.users
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT * FROM public.users WHERE id = auth.uid()
$$;

REVOKE ALL ON FUNCTION public.get_my_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

COMMENT ON FUNCTION public.get_my_profile() IS
  'Returns the calling user''s own full public.users row (including columns '
  'excluded from the column-level SELECT grants of migration 75). SECURITY '
  'DEFINER + WHERE id = auth.uid(): callers can never read another user''s row.';

-- ----------------------------------------------------------------------------
-- 4. find_user_id_by_email() — email → user id lookup for sharing/invites
-- ----------------------------------------------------------------------------
-- Album sharing (share-with-email) and collaborator invites resolve an email
-- address to a user id. With column grants, even `.select('id').eq('email',x)`
-- is permission-denied because the WHERE clause references a revoked column.
-- This RPC returns ONLY the id (or NULL) — exactly the information those
-- features exposed before the lockdown, no new enumeration surface.
CREATE OR REPLACE FUNCTION public.find_user_id_by_email(p_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT u.id
  FROM public.users u
  WHERE lower(u.email) = lower(trim(p_email))
    AND u.deleted_at IS NULL
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.find_user_id_by_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_user_id_by_email(text) TO authenticated;

COMMENT ON FUNCTION public.find_user_id_by_email(text) IS
  'Resolves an email address to a user id for album sharing / collaborator '
  'invites (authenticated only). Returns only the id — parity with the '
  'pre-migration-75 lookup, which any authenticated user could already do.';


-- ============================================================================
-- VERIFY (run after applying)
-- ============================================================================
--
-- A. Column privileges: expect ONLY the safe allowlist for anon/authenticated,
--    and in particular NO rows for email, date_of_birth, phone,
--    two_factor_secret, parent_email, is_minor, parental_consent_status,
--    parental_consent_at, email_notifications, home_latitude, home_longitude,
--    referred_by:
--
--      SELECT grantee, column_name
--      FROM information_schema.column_privileges
--      WHERE table_schema = 'public'
--        AND table_name = 'users'
--        AND privilege_type = 'SELECT'
--        AND grantee IN ('anon', 'authenticated')
--      ORDER BY grantee, column_name;
--
-- B. No lingering table-level SELECT for client roles (expect zero rows):
--
--      SELECT grantee, privilege_type
--      FROM information_schema.role_table_grants
--      WHERE table_schema = 'public'
--        AND table_name = 'users'
--        AND privilege_type = 'SELECT'
--        AND grantee IN ('PUBLIC', 'anon', 'authenticated');
--
-- C. PostgREST smoke test (as a normal signed-in user, e.g. browser console):
--      1. supabase.from('users').select('id, username, avatar_url').limit(1)
--           → 200, rows returned (safe columns still readable).
--      2. supabase.from('users').select('email').limit(1)
--           → error 42501 "permission denied for table users".
--      3. supabase.from('users').select('*').limit(1)
--           → error 42501 (star expansion includes revoked columns).
--      4. supabase.rpc('get_my_profile')
--           → 200, exactly one row: the caller's own full profile incl. email.
--      5. As anon (signed out): supabase.rpc('get_my_profile')
--           → error (no EXECUTE grant for anon).
-- ============================================================================
