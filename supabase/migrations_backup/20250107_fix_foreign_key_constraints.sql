-- Fix foreign key constraints to reference 'users' table instead of 'profiles'
-- This fixes the error: "Key is not present in table 'profiles'"

-- Step 1: Drop existing foreign key constraints that reference profiles
DO $$
BEGIN
  -- Drop albums foreign key
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'albums_user_id_fkey'
    AND table_name = 'albums'
  ) THEN
    ALTER TABLE public.albums DROP CONSTRAINT albums_user_id_fkey;
  END IF;

  -- Drop photos foreign key
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'photos_user_id_fkey'
    AND table_name = 'photos'
  ) THEN
    ALTER TABLE public.photos DROP CONSTRAINT photos_user_id_fkey;
  END IF;

  -- Drop stories foreign key
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'stories_user_id_fkey'
    AND table_name = 'stories'
  ) THEN
    ALTER TABLE public.stories DROP CONSTRAINT stories_user_id_fkey;
  END IF;

  -- Drop likes foreign key
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'likes_user_id_fkey'
    AND table_name = 'likes'
  ) THEN
    ALTER TABLE public.likes DROP CONSTRAINT likes_user_id_fkey;
  END IF;

  -- Drop comments foreign key
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'comments_user_id_fkey'
    AND table_name = 'comments'
  ) THEN
    ALTER TABLE public.comments DROP CONSTRAINT comments_user_id_fkey;
  END IF;
END $$;

-- Step 2: Add new foreign key constraints that reference users table
DO $$
BEGIN
  -- Add albums foreign key to users
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'albums_user_id_fkey'
    AND table_name = 'albums'
  ) THEN
    ALTER TABLE public.albums
      ADD CONSTRAINT albums_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES public.users(id)
      ON DELETE CASCADE;
  END IF;

  -- Add photos foreign key to users
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'photos_user_id_fkey'
    AND table_name = 'photos'
  ) THEN
    ALTER TABLE public.photos
      ADD CONSTRAINT photos_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES public.users(id)
      ON DELETE CASCADE;
  END IF;

  -- Add stories foreign key to users
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'stories_user_id_fkey'
    AND table_name = 'stories'
  ) THEN
    ALTER TABLE public.stories
      ADD CONSTRAINT stories_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES public.users(id)
      ON DELETE CASCADE;
  END IF;

  -- Add likes foreign key to users
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'likes_user_id_fkey'
    AND table_name = 'likes'
  ) THEN
    ALTER TABLE public.likes
      ADD CONSTRAINT likes_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES public.users(id)
      ON DELETE CASCADE;
  END IF;

  -- Add comments foreign key to users
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'comments_user_id_fkey'
    AND table_name = 'comments'
  ) THEN
    ALTER TABLE public.comments
      ADD CONSTRAINT comments_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES public.users(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- Step 3: Fix cities table RLS and add missing columns
ALTER TABLE IF EXISTS public.cities ENABLE ROW LEVEL SECURITY;

-- Drop and recreate RLS policies for cities
DROP POLICY IF EXISTS "Anyone can view cities" ON public.cities;
DROP POLICY IF EXISTS "Public read access to cities" ON public.cities;

CREATE POLICY "Public read access to cities"
  ON public.cities FOR SELECT
  TO public
  USING (true);

-- Ensure cities table has all required columns
DO $$
BEGIN
  -- Add population column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'cities'
    AND column_name = 'population'
  ) THEN
    ALTER TABLE public.cities ADD COLUMN population INTEGER;
  END IF;
END $$;

COMMENT ON TABLE public.albums IS 'Travel albums - foreign key now references users table';
COMMENT ON TABLE public.cities IS 'City/location data with public read access';
