-- Fix users/profiles table schema confusion
-- The codebase uses both 'users' and 'profiles' table names
-- This migration ensures both work properly

-- First, check if users table exists, if not create it as same as profiles
DO $$
BEGIN
  -- If users table doesn't exist but profiles does, create users as a copy
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users')
     AND EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN

    -- Rename profiles to users (the app code mostly uses 'users')
    ALTER TABLE public.profiles RENAME TO users;

    -- Update all index names
    ALTER INDEX IF EXISTS idx_profiles_username RENAME TO idx_users_username;
    ALTER INDEX IF EXISTS idx_profiles_email RENAME TO idx_users_email;

  -- If users table exists, ensure it has all required columns
  ELSIF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN

    -- Add missing columns to users table
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS username TEXT;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS display_name TEXT;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bio TEXT;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS website TEXT;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS location TEXT;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS privacy_level TEXT DEFAULT 'public';
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email TEXT;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

    -- Drop NOT NULL constraint on email
    ALTER TABLE public.users ALTER COLUMN email DROP NOT NULL;

    -- Add unique constraint on username if not exists
    DO $inner$
    BEGIN
      ALTER TABLE public.users ADD CONSTRAINT users_username_key UNIQUE (username);
    EXCEPTION
      WHEN duplicate_table THEN NULL;
      WHEN duplicate_object THEN NULL;
    END $inner$;

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
    CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

    -- Add check constraint on privacy_level if not exists
    DO $inner$
    BEGIN
      ALTER TABLE public.users ADD CONSTRAINT users_privacy_level_check
        CHECK (privacy_level IN ('public', 'private', 'friends'));
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $inner$;

  END IF;
END $$;

-- Ensure RLS is enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop and recreate RLS policies for users table
DROP POLICY IF EXISTS "Users can view public profiles" ON users;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON users;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

-- Create comprehensive RLS policies
CREATE POLICY "Enable insert for authenticated users only"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Public profiles are viewable by everyone"
  ON users FOR SELECT
  TO authenticated
  USING (privacy_level = 'public');

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Update trigger function to use 'users' table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into users table with generated username
  INSERT INTO public.users (
    id,
    username,
    display_name,
    privacy_level,
    created_at,
    updated_at
  )
  VALUES (
    new.id,
    'user_' || substr(replace(new.id::text, '-', ''), 1, 8),
    COALESCE(new.raw_user_meta_data->>'full_name', 'New User'),
    'public',
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;

-- Update follow-related functions to use users table
DROP FUNCTION IF EXISTS public.handle_follow_request(UUID, UUID);
DROP FUNCTION IF EXISTS public.accept_follow_request(UUID, UUID);
DROP FUNCTION IF EXISTS public.reject_follow_request(UUID, UUID);

CREATE FUNCTION public.handle_follow_request(
    follower_id_param UUID,
    following_id_param UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_user_privacy TEXT;
    result_status TEXT;
BEGIN
    -- Get the privacy level of the user being followed
    SELECT privacy_level INTO target_user_privacy
    FROM public.users
    WHERE id = following_id_param;

    -- Determine initial status based on privacy
    IF target_user_privacy = 'private' THEN
        result_status := 'pending';
    ELSE
        result_status := 'accepted';
    END IF;

    -- Insert or update the follow relationship
    INSERT INTO public.follows (follower_id, following_id, status)
    VALUES (follower_id_param, following_id_param, result_status)
    ON CONFLICT (follower_id, following_id)
    DO UPDATE SET
        status = result_status,
        updated_at = now();

    RETURN result_status;
END;
$$;

CREATE FUNCTION public.accept_follow_request(
    follower_id_param UUID,
    following_id_param UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.follows
    SET status = 'accepted', updated_at = now()
    WHERE follower_id = follower_id_param
        AND following_id = following_id_param
        AND status = 'pending';
END;
$$;

CREATE FUNCTION public.reject_follow_request(
    follower_id_param UUID,
    following_id_param UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.follows
    SET status = 'rejected', updated_at = now()
    WHERE follower_id = follower_id_param
        AND following_id = following_id_param
        AND status = 'pending';
END;
$$;

COMMENT ON TABLE public.users IS 'User profiles with social features (username, bio, avatar, privacy settings)';
