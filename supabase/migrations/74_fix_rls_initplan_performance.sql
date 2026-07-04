-- 74_fix_rls_initplan_performance.sql
--
-- Fixes the 2026-07-03 production burst of Postgres 57014 statement timeouts:
--   GET /rest/v1/albums?...user_id=eq.<u>&status=neq.draft&order=created_at.desc -> 500
--   GET /rest/v1/albums?select=*,photos(id)&user_id=eq.<u>...                    -> 500
--   GET /rest/v1/likes?select=id&user_id=eq.<u>&...&limit=1                      -> 500
--   ("Error fetching album location data" / ProfileContent / useTravelTimeline)
--
-- ROOT CAUSE
-- ----------------------------------------------------------------------------
-- Migration 39 (Clerk -> Supabase auth revert) recreated the `<table>_owner_all`
-- policy on EVERY user-owned table — and the users-table policies — with a bare
-- `auth.uid()` call:
--
--     USING (user_id = auth.uid())
--
-- Bare `auth.uid()` in a policy expression is re-evaluated for every candidate
-- row. Written as `(select auth.uid())` it becomes an InitPlan: evaluated once
-- per statement and treated as a constant (this is Supabase's documented
-- `auth_rls_initplan` lint, and exactly what migration 08 fixed before 39
-- regressed it). The cost explodes on row-heavy scans — e.g. the leaderboard's
-- `users?select=photos(count),followers(count)&limit=50`, which evaluates the
-- photos policies for every photo of 50 users. In the incident log that query
-- took ~9s, pinned the shared compute, and every cheap query queued behind it
-- blew the 8s statement_timeout (57014) until the burst cleared.
--
-- FIX
-- ----------------------------------------------------------------------------
-- 1. Mechanically rewrite every LIVE policy (pg_policies) in `public` and
--    `storage` whose expression still contains a bare auth.uid()/jwt()/role()/
--    email() call, wrapping it as `(select auth.<fn>())`. Rewriting the live
--    catalog (instead of re-running old CREATE POLICY statements) fixes every
--    policy shape that actually exists in prod, regardless of which migration
--    created it. Semantics are IDENTICAL — same rows, same privacy.
-- 2. Add two composite indexes matching the exact failing query shapes.
--
-- Idempotent: already-wrapped policies are skipped; indexes use IF NOT EXISTS.
-- Runs in one transaction; each policy is rewritten in its own subtransaction,
-- so one problematic policy is skipped with a WARNING instead of aborting the
-- rest.

BEGIN;

DO $$
DECLARE
  pol           RECORD;
  bare_pattern  CONSTANT text := 'auth\.(uid|jwt|role|email)\(\)';
  -- Deparsed form of an already-wrapped call: "( SELECT auth.uid() AS uid)"
  wrap_pattern  CONSTANT text := '\(\s*SELECT\s+auth\.(uid|jwt|role|email)\(\)\s+AS\s+[a-zA-Z_]+\s*\)';
  new_qual      text;
  new_check     text;
  stripped      text;
  roles_sql     text;
  fixed_count   int := 0;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname IN ('public', 'storage')
      AND (COALESCE(qual, '') ~ bare_pattern OR COALESCE(with_check, '') ~ bare_pattern)
    ORDER BY schemaname, tablename, policyname
  LOOP
    -- Ignore policies whose only auth.* calls are already initplan-wrapped:
    -- strip the wrapped forms, then look for remaining bare calls.
    stripped := regexp_replace(COALESCE(pol.qual, '') || ' ' || COALESCE(pol.with_check, ''),
                               wrap_pattern, '', 'gi');
    IF stripped !~ bare_pattern THEN
      CONTINUE;
    END IF;

    -- Protect wrapped calls with a placeholder, wrap the bare ones, restore.
    new_qual := pol.qual;
    IF new_qual IS NOT NULL THEN
      new_qual := regexp_replace(new_qual, wrap_pattern, '@@WRAPPED_AUTH_\1@@', 'gi');
      new_qual := regexp_replace(new_qual, bare_pattern, '(select auth.\1())', 'g');
      new_qual := regexp_replace(new_qual, '@@WRAPPED_AUTH_(uid|jwt|role|email)@@', '(select auth.\1())', 'g');
    END IF;

    new_check := pol.with_check;
    IF new_check IS NOT NULL THEN
      new_check := regexp_replace(new_check, wrap_pattern, '@@WRAPPED_AUTH_\1@@', 'gi');
      new_check := regexp_replace(new_check, bare_pattern, '(select auth.\1())', 'g');
      new_check := regexp_replace(new_check, '@@WRAPPED_AUTH_(uid|jwt|role|email)@@', '(select auth.\1())', 'g');
    END IF;

    roles_sql := array_to_string(ARRAY(SELECT quote_ident(r) FROM unnest(pol.roles) AS r), ', ');

    BEGIN
      EXECUTE format('DROP POLICY %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
      EXECUTE format(
        'CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s %s %s',
        pol.policyname, pol.schemaname, pol.tablename,
        pol.permissive,                -- PERMISSIVE | RESTRICTIVE
        pol.cmd,                       -- ALL | SELECT | INSERT | UPDATE | DELETE
        roles_sql,
        CASE WHEN new_qual  IS NOT NULL THEN 'USING ('      || new_qual  || ')' ELSE '' END,
        CASE WHEN new_check IS NOT NULL THEN 'WITH CHECK (' || new_check || ')' ELSE '' END
      );
      fixed_count := fixed_count + 1;
      RAISE NOTICE 'initplan-wrapped policy % on %.%', pol.policyname, pol.schemaname, pol.tablename;
    EXCEPTION WHEN OTHERS THEN
      -- Subtransaction rollback restores the original policy; nothing is lost.
      RAISE WARNING 'skipped policy % on %.%: %', pol.policyname, pol.schemaname, pol.tablename, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE 'rewrote % policies to initplan-wrapped auth calls', fixed_count;
END $$;

-- ----------------------------------------------------------------------------
-- Indexes matching the exact query shapes that timed out.
-- ----------------------------------------------------------------------------

-- albums?user_id=eq.X&status=neq.draft&order=created_at.desc
-- (idx_albums_user_visibility_created has visibility in the middle, which
-- breaks the (user_id, created_at) ordered scan)
CREATE INDEX IF NOT EXISTS idx_albums_user_created
  ON public.albums (user_id, created_at DESC);

-- likes?select=id&user_id=eq.X&target_type=eq.album&target_id=eq.Y&limit=1
-- (existing idx_likes_user_target_type stops at target_type)
CREATE INDEX IF NOT EXISTS idx_likes_user_target
  ON public.likes (user_id, target_type, target_id);

ANALYZE public.albums;
ANALYZE public.photos;
ANALYZE public.likes;
ANALYZE public.users;
ANALYZE public.follows;

COMMIT;

-- ----------------------------------------------------------------------------
-- VERIFY (run after applying)
-- ----------------------------------------------------------------------------
-- 1. No live policy should contain a bare auth call anymore (every remaining
--    match must show "( SELECT auth.uid() ...)" wrapping):
--
--      SELECT schemaname, tablename, policyname, cmd, qual, with_check
--      FROM pg_policies
--      WHERE schemaname IN ('public','storage')
--        AND regexp_replace(COALESCE(qual,'') || ' ' || COALESCE(with_check,''),
--              '\(\s*SELECT\s+auth\.(uid|jwt|role|email)\(\)\s+AS\s+[a-zA-Z_]+\s*\)',
--              '', 'gi') ~ 'auth\.(uid|jwt|role|email)\(\)';
--
--    Expect: 0 rows.
--
-- 2. The previously-timing-out shape should now show an InitPlan and finish in
--    milliseconds (run in the SQL editor with `SET ROLE authenticated` +
--    `SET request.jwt.claims`, or just eyeball the plan as postgres):
--
--      EXPLAIN ANALYZE
--      SELECT id, title FROM public.albums
--      WHERE user_id = '<uuid>' AND status <> 'draft'
--      ORDER BY created_at DESC;
--
-- 3. Supabase Dashboard -> Advisors -> Performance: the `auth_rls_initplan`
--    warnings for these tables should clear.
