-- Migration: Create users table from scratch
-- Created: 2025-01-13
-- Description: Creates the users table if it doesn't exist (handles fresh database)

-- =============================================================================
-- CREATE USERS TABLE
-- =============================================================================

-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  display_name text,
  bio text,
  avatar_url text,
  website text,
  location text,
  privacy_level text DEFAULT 'public' CHECK (privacy_level IN ('public', 'private', 'friends')),
  email text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_privacy_level ON public.users(privacy_level);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON users;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;

-- Create RLS policies
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

-- =============================================================================
-- FUNCTIONS & TRIGGERS
-- =============================================================================

-- Drop existing trigger/function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- Create function to handle new user signups
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

-- Create trigger on auth.users for new signups
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- =============================================================================
-- INITIALIZE EXISTING AUTH USERS
-- =============================================================================

-- Create user profiles for any existing authenticated users that don't have profiles
INSERT INTO public.users (id, username, display_name, privacy_level, created_at, updated_at)
SELECT
  au.id,
  'user_' || substr(replace(au.id::text, '-', ''), 1, 8),
  COALESCE(au.raw_user_meta_data->>'full_name', 'User'),
  'public',
  au.created_at,
  now()
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users u WHERE u.id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- PERMISSIONS
-- =============================================================================

GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE public.users IS 'User profiles with social features (username, bio, avatar, privacy settings)';
COMMENT ON COLUMN public.users.id IS 'Foreign key to auth.users';
COMMENT ON COLUMN public.users.username IS 'Unique username for the user';
COMMENT ON COLUMN public.users.privacy_level IS 'Controls profile visibility: public, private, or friends';
