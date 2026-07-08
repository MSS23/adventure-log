-- 79: Carry the OAuth avatar (and name) into the profile at signup
--
-- "Continue with Google" signups landed with a blank avatar: Google puts the
-- photo URL in raw_user_meta_data ('avatar_url', also 'picture') and the
-- display name in 'full_name'/'name', but handle_new_user() (m54/m60) only
-- copied full_name — avatar_url was never read, so every OAuth profile
-- started with the initial-letter placeholder.
--
-- getPhotoUrl() passes absolute http(s) URLs through untouched, so storing
-- the Google URL in users.avatar_url renders as-is (next.config.ts allows
-- *.googleusercontent.com). Users who later upload a custom avatar overwrite
-- this value; the trigger only runs at signup, so it can't clobber edits.
--
-- Rest of the function is m60's body verbatim (privacy_level validation,
-- 18+ DOB backstop). Idempotent and safe to re-run.

BEGIN;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  requested_privacy text;
  dob               date;
BEGIN
  -- Account visibility chosen at signup (validated; defaults to 'public').
  requested_privacy := NEW.raw_user_meta_data->>'privacy_level';
  IF requested_privacy IS NULL OR requested_privacy NOT IN ('public', 'private', 'friends') THEN
    requested_privacy := 'public';
  END IF;

  -- Self-declared date of birth (email/password signups collect it).
  BEGIN
    dob := (NEW.raw_user_meta_data->>'date_of_birth')::date;
  EXCEPTION WHEN others THEN
    dob := NULL;
  END;

  -- Server-side backstop for the 18+ gate. The signup UI blocks under-18s
  -- client-side, but a crafted call straight to supabase.auth.signUp could
  -- bypass that. If a DOB was supplied and it is under 18, refuse to provision
  -- the profile — raising here rolls back the auth.users insert, so the signup
  -- fails. OAuth signups don't collect a DOB (dob IS NULL) and are not blocked
  -- at this layer; their age is gated at the client.
  IF dob IS NOT NULL AND dob > (CURRENT_DATE - INTERVAL '18 years') THEN
    RAISE EXCEPTION 'You must be at least 18 years old to use this service'
      USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO public.users (id, email, username, display_name, avatar_url, privacy_level, date_of_birth, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    'user_' || substr(replace(NEW.id::text, '-', ''), 1, 8),
    NULLIF(trim(COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      ''
    )), ''),
    NULLIF(trim(COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture',
      ''
    )), ''),
    requested_privacy,
    dob,
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
