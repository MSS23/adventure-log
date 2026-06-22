-- 54_signup_privacy_level.sql
--
-- Lets a new user choose their account visibility (public / private / friends)
-- at sign-up. The signup form passes the choice through
-- supabase.auth.signUp's `options.data`, which Supabase stores on
-- auth.users.raw_user_meta_data->>'privacy_level'. This rewrites
-- handle_new_user() to honor that value (validated against the allowed set)
-- instead of always hard-coding 'public'.
--
-- SECURITY: raw_user_meta_data is client-writable, but privacy_level only
-- controls the user's OWN account visibility (the same thing they can change in
-- Settings) — it is not an authorization grant for other users' data, so
-- trusting it here is not a privilege-escalation vector. The value is still
-- validated to the allowed enum below.
--
-- Builds on migration 44's definition. Idempotent and safe to re-run. On
-- CONFLICT we deliberately do NOT overwrite privacy_level, so re-running the
-- trigger never clobbers a value the user later changed in Settings.

BEGIN;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  requested_privacy text;
BEGIN
  -- Account visibility chosen at signup. Anything outside the allowed set
  -- (or absent, e.g. OAuth signups that never set it) falls back to 'public'.
  requested_privacy := NEW.raw_user_meta_data->>'privacy_level';
  IF requested_privacy IS NULL OR requested_privacy NOT IN ('public', 'private', 'friends') THEN
    requested_privacy := 'public';
  END IF;

  INSERT INTO public.users (id, email, username, display_name, privacy_level, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    'user_' || substr(replace(NEW.id::text, '-', ''), 1, 8),
    -- NULLIF guards against an empty-string full_name; no placeholder fallback.
    NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'full_name', '')), ''),
    requested_privacy,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
    SET email      = EXCLUDED.email,
        updated_at = NOW();
  RETURN NEW;
END;
$$;

COMMIT;
