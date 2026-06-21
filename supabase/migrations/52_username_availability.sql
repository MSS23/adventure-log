-- 52_username_availability.sql
--
-- Make "change your username only if it's available" reliable and
-- case-insensitive.
--
-- Problems this fixes:
--   1. The edit-profile availability check queried public.users directly from
--      the browser, so its accuracy depended on the caller's RLS view. If the
--      account-privacy policies (migration 47) aren't applied, a username held
--      by a private account reads as "available" and the save then fails.
--   2. Both the check and the existing users_username_key UNIQUE constraint are
--      CASE-SENSITIVE, so "Jane" and "jane" can co-exist — confusable handles
--      that also break case-insensitive profile lookups.
--
-- Fixes:
--   A. is_username_available(p_username) — SECURITY DEFINER, so it sees every
--      row regardless of RLS/privacy. Case-insensitive, and excludes the
--      caller's own row so keeping (or re-casing) your own handle reads as free.
--   B. A case-insensitive UNIQUE index as the DB-level backstop. Created
--      defensively: if case-variant duplicates already exist it logs a NOTICE
--      instead of failing the whole migration (resolve dupes, then re-run).
--
-- Idempotent and safe to re-run.
-- ============================================================================

-- A. Availability check that bypasses RLS and is case-insensitive. -----------
CREATE OR REPLACE FUNCTION public.is_username_available(p_username text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.users
    WHERE lower(username) = lower(btrim(p_username))
      -- Exclude the caller's own row so keeping your handle reads as available.
      -- auth.uid() is NULL for anon (signup) — then count every match.
      AND (auth.uid() IS NULL OR id <> auth.uid())
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_username_available(text) TO authenticated, anon;

-- B. Case-insensitive uniqueness backstop, created without aborting the
--    migration when legacy case-variant duplicates are present. ------------
DO $$
BEGIN
  BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_unique
      ON public.users (lower(username))
      WHERE username IS NOT NULL;
  EXCEPTION
    WHEN unique_violation THEN
      RAISE NOTICE 'Skipped users_username_lower_unique: case-insensitive duplicate usernames exist. Resolve duplicates, then re-run this migration.';
  END;
END $$;
