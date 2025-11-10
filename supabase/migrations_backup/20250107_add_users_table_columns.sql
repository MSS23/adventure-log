-- Ensure profiles table has all required columns
-- The app expects username, display_name, bio, avatar_url, etc.
-- Note: The table is named 'profiles' but the TypeScript types use 'User'

-- Add missing columns to profiles table if they don't exist
DO $$
BEGIN
  -- Add username column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'username'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN username TEXT UNIQUE;
  END IF;

  -- Add display_name column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'display_name'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN display_name TEXT;
  END IF;

  -- Add bio column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'bio'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN bio TEXT;
  END IF;

  -- Add avatar_url column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
  END IF;

  -- Add website column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'website'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN website TEXT;
  END IF;

  -- Add location column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'location'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN location TEXT;
  END IF;

  -- Add privacy_level column (if doesn't exist with proper constraint)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'privacy_level'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN privacy_level TEXT DEFAULT 'public' CHECK (privacy_level IN ('public', 'private', 'friends'));
  END IF;

  -- Add email column (nullable - email comes from auth.users)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'email'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN email TEXT;
  END IF;

  -- Ensure created_at exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;
  END IF;

  -- Ensure updated_at exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;
  END IF;
END $$;

-- Drop NOT NULL constraints if they exist
DO $$
BEGIN
  -- Make email nullable
  ALTER TABLE public.profiles ALTER COLUMN email DROP NOT NULL;
EXCEPTION
  WHEN undefined_column THEN
    -- Column doesn't exist yet, that's ok
    NULL;
  WHEN others THEN
    -- Column exists but constraint doesn't, that's ok
    NULL;
END $$;

-- Create index on username for fast lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- Create index on email for lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies are already managed by fix_signup_trigger.sql
-- We don't recreate them here to avoid conflicts

COMMENT ON TABLE public.profiles IS 'User profiles with social features (username, bio, avatar, privacy settings)';
