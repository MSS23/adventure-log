-- 60_age_gate.sql  (file kept as 60_parental_controls.sql for ordering)
--
-- Adventure Log is an ADULTS-ONLY (18+) service. This records the user's
-- self-declared date of birth at sign-up so we have an auditable age record.
--
-- The signup UI hard-blocks under-18s; this just persists the DOB the form
-- collected (passed through supabase.auth.signUp's options.data, which Supabase
-- stores on auth.users.raw_user_meta_data). DOB is self-declared — like every
-- consumer app, we make reasonable efforts, we don't biometrically verify age.
--
-- Builds on migration 54's handle_new_user(). Idempotent and safe to re-run.

BEGIN;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS date_of_birth date;

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

  INSERT INTO public.users (id, email, username, display_name, privacy_level, date_of_birth, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    'user_' || substr(replace(NEW.id::text, '-', ''), 1, 8),
    NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'full_name', '')), ''),
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
