-- 44_fix_new_user_display_name.sql
--
-- Stops the literal placeholder "New User" from being written as a profile's
-- display_name. Migration 39's handle_new_user() trigger defaulted
-- display_name to 'New User' when auth metadata had no full_name, which then
-- surfaced in the UI (leaderboard, comments, profiles, …).
--
-- This migration:
--   1. Makes display_name nullable (no-op if it already is).
--   2. Rewrites handle_new_user() to leave display_name NULL when no real name
--      is provided, so the app's getDisplayName() helper falls back to the
--      @username instead.
--   3. Backfills existing rows: any display_name of 'New User' becomes NULL.
--
-- Idempotent and safe to re-run.

BEGIN;

-- 1. Allow NULL display names (the app treats NULL/placeholder identically).
ALTER TABLE public.users ALTER COLUMN display_name DROP NOT NULL;

-- 2. Rewrite the signup trigger to stop hard-coding 'New User'.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.users (id, email, username, display_name, privacy_level, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    'user_' || substr(replace(NEW.id::text, '-', ''), 1, 8),
    -- NULLIF guards against an empty-string full_name; no placeholder fallback.
    NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'full_name', '')), ''),
    'public',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
    SET email      = EXCLUDED.email,
        updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 3. Backfill: clear the placeholder from existing profiles so the UI falls
--    back to their username.
UPDATE public.users
SET display_name = NULL
WHERE display_name = 'New User';

COMMIT;
