-- ============================================================================
-- QUICKSTART: Complete Database Schema Setup
-- ============================================================================
-- This migration sets up ALL required tables for Adventure Log
-- Safe to run on fresh database - checks for existing tables
-- ============================================================================

-- Check what tables currently exist
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Starting Adventure Log Database Setup';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Checking existing tables...';

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
    RAISE NOTICE '✓ users table exists';
  ELSE
    RAISE NOTICE '✗ users table missing - will create';
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'albums') THEN
    RAISE NOTICE '✓ albums table exists';
  ELSE
    RAISE NOTICE '✗ albums table missing - will create';
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'photos') THEN
    RAISE NOTICE '✓ photos table exists';
  ELSE
    RAISE NOTICE '✗ photos table missing - will create';
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'likes') THEN
    RAISE NOTICE '✓ likes table exists';
  ELSE
    RAISE NOTICE '✗ likes table missing - will create';
  END IF;
END $$;

-- ============================================================================
-- 1. USERS TABLE (if not exists)
-- ============================================================================

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

CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- ============================================================================
-- 2. ALBUMS TABLE (if not exists)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.albums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  location_name text,
  location_country text,
  country_code text,
  latitude double precision,
  longitude double precision,
  date_start date,
  date_end date,
  start_date date, -- Alias for compatibility
  end_date date,   -- Alias for compatibility
  cover_photo_url text,
  cover_image_url text, -- Alias for compatibility
  visibility text DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'friends')),
  status text DEFAULT 'published' CHECK (status IN ('draft', 'published')),
  photo_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_albums_user_id ON public.albums(user_id);
CREATE INDEX IF NOT EXISTS idx_albums_created_at ON public.albums(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_albums_visibility ON public.albums(visibility);
CREATE INDEX IF NOT EXISTS idx_albums_status ON public.albums(status);

-- ============================================================================
-- 3. PHOTOS TABLE (if not exists)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id uuid NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  storage_path text, -- Alias for compatibility
  title text,
  description text,
  latitude double precision,
  longitude double precision,
  taken_at timestamp with time zone,
  exif_data jsonb,
  order_index integer DEFAULT 0,
  photo_hash text, -- For duplicate detection
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_photos_album_id ON public.photos(album_id);
CREATE INDEX IF NOT EXISTS idx_photos_user_id ON public.photos(user_id);
CREATE INDEX IF NOT EXISTS idx_photos_order ON public.photos(album_id, order_index);
CREATE INDEX IF NOT EXISTS idx_photos_hash ON public.photos(photo_hash);

-- ============================================================================
-- 4. SOCIAL TABLES (followers, likes, comments)
-- ============================================================================

-- Followers table
CREATE TABLE IF NOT EXISTS public.followers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(follower_id, following_id)
);

CREATE INDEX IF NOT EXISTS idx_followers_follower_id ON public.followers(follower_id);
CREATE INDEX IF NOT EXISTS idx_followers_following_id ON public.followers(following_id);

-- Follows table (alias for followers - some code uses this name)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'follows') THEN
    CREATE TABLE public.follows (
      follower_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      following_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      status text DEFAULT 'accepted' CHECK (status IN ('pending', 'accepted', 'rejected')),
      created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
      updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
      PRIMARY KEY (follower_id, following_id)
    );
    CREATE INDEX idx_follows_follower ON public.follows(follower_id);
    CREATE INDEX idx_follows_following ON public.follows(following_id);
  END IF;
END $$;

-- Likes table (polymorphic)
CREATE TABLE IF NOT EXISTS public.likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('photo', 'album', 'comment', 'story', 'location')),
  target_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_user_id ON public.likes(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_target ON public.likes(target_type, target_id);

-- Comments table
CREATE TABLE IF NOT EXISTS public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('photo', 'album', 'story')),
  target_id uuid NOT NULL,
  content text NOT NULL,
  text text, -- Alias for compatibility
  parent_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_target ON public.comments(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON public.comments(parent_id);

-- ============================================================================
-- 5. USER LEVELS TABLES
-- ============================================================================

-- Level requirements
CREATE TABLE IF NOT EXISTS public.level_requirements (
  level integer PRIMARY KEY CHECK (level >= 1),
  title text NOT NULL,
  experience_required integer NOT NULL DEFAULT 0,
  albums_required integer NOT NULL DEFAULT 0,
  countries_required integer NOT NULL DEFAULT 0,
  photos_required integer NOT NULL DEFAULT 0,
  description text
);

-- User levels
CREATE TABLE IF NOT EXISTS public.user_levels (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  current_level integer NOT NULL DEFAULT 1 CHECK (current_level >= 1),
  current_title text NOT NULL DEFAULT 'Explorer',
  total_experience integer NOT NULL DEFAULT 0,
  albums_created integer NOT NULL DEFAULT 0,
  countries_visited integer NOT NULL DEFAULT 0,
  photos_uploaded integer NOT NULL DEFAULT 0,
  social_interactions integer NOT NULL DEFAULT 0,
  level_up_date timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_levels_level ON public.user_levels(current_level);

-- ============================================================================
-- 6. ALBUM SHARES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.album_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id uuid NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
  shared_by uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  shared_with uuid REFERENCES public.users(id) ON DELETE CASCADE,
  share_token text UNIQUE,
  permission_level text NOT NULL DEFAULT 'view' CHECK (permission_level IN ('view', 'contribute', 'edit')),
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_album_shares_album_id ON public.album_shares(album_id);
CREATE INDEX IF NOT EXISTS idx_album_shares_token ON public.album_shares(share_token);

-- ============================================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.level_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.album_shares ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'follows') THEN
    ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- ============================================================================
-- 8. BASIC RLS POLICIES
-- ============================================================================

-- Users policies
DROP POLICY IF EXISTS "Users can view public profiles" ON users;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;

CREATE POLICY "Users can view their own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can view public profiles" ON users FOR SELECT USING (privacy_level = 'public');
CREATE POLICY "Users can update their own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- Albums policies
DROP POLICY IF EXISTS "Users can view their own albums" ON albums;
DROP POLICY IF EXISTS "Users can view public albums" ON albums;
DROP POLICY IF EXISTS "Users can manage their own albums" ON albums;

CREATE POLICY "Users can view their own albums" ON albums FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view public albums" ON albums FOR SELECT USING (visibility = 'public' AND status = 'published');
CREATE POLICY "Users can manage their own albums" ON albums FOR ALL USING (auth.uid() = user_id);

-- Photos policies
DROP POLICY IF EXISTS "Users can view photos in accessible albums" ON photos;
DROP POLICY IF EXISTS "Users can manage their own photos" ON photos;

CREATE POLICY "Users can view photos in accessible albums" ON photos FOR SELECT USING (
  EXISTS (SELECT 1 FROM albums WHERE albums.id = photos.album_id AND (albums.visibility = 'public' OR albums.user_id = auth.uid()))
);
CREATE POLICY "Users can manage their own photos" ON photos FOR ALL USING (auth.uid() = user_id);

-- Likes policies
DROP POLICY IF EXISTS "Anyone can view likes" ON likes;
DROP POLICY IF EXISTS "Users can manage their own likes" ON likes;

CREATE POLICY "Anyone can view likes" ON likes FOR SELECT USING (true);
CREATE POLICY "Users can manage their own likes" ON likes FOR ALL USING (auth.uid() = user_id);

-- Level requirements (public)
DROP POLICY IF EXISTS "Anyone can view level requirements" ON level_requirements;
CREATE POLICY "Anyone can view level requirements" ON level_requirements FOR SELECT USING (true);

-- User levels
DROP POLICY IF EXISTS "Users can view their own level" ON user_levels;
DROP POLICY IF EXISTS "Users can view public levels" ON user_levels;

CREATE POLICY "Users can view their own level" ON user_levels FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view public levels" ON user_levels FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = user_id AND users.privacy_level = 'public')
);

-- ============================================================================
-- 9. INSERT DEFAULT DATA
-- ============================================================================

-- Insert level requirements (10 levels)
INSERT INTO level_requirements (level, title, experience_required, albums_required, countries_required, photos_required, description)
VALUES
  (1, 'Explorer', 0, 0, 0, 0, 'Welcome to your adventure journey!'),
  (2, 'Wanderer', 500, 3, 1, 20, 'First steps into the world.'),
  (3, 'Adventurer', 1500, 8, 3, 50, 'Discovering new places.'),
  (4, 'Voyager', 3000, 15, 5, 100, 'Building travel memories.'),
  (5, 'Navigator', 5500, 25, 8, 200, 'Growing confidence.'),
  (6, 'Trailblazer', 9000, 40, 12, 350, 'Forging your own path.'),
  (7, 'Globetrotter', 14000, 60, 18, 550, 'The world is your playground.'),
  (8, 'World Traveler', 21000, 85, 25, 800, 'Seen more than most.'),
  (9, 'Explorer Elite', 30000, 120, 35, 1200, 'Inspiring others.'),
  (10, 'Legend', 45000, 175, 50, 1750, 'Legendary explorer status!')
ON CONFLICT (level) DO NOTHING;

-- Initialize user_levels for existing users
INSERT INTO user_levels (user_id, current_level, current_title)
SELECT id, 1, 'Explorer'
FROM users
WHERE NOT EXISTS (SELECT 1 FROM user_levels WHERE user_levels.user_id = users.id)
ON CONFLICT (user_id) DO NOTHING;

-- Initialize users from auth.users if needed
INSERT INTO users (id, username, display_name, privacy_level)
SELECT
  au.id,
  'user_' || substr(replace(au.id::text, '-', ''), 1, 8),
  COALESCE(au.raw_user_meta_data->>'full_name', 'User'),
  'public'
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = au.id)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 10. GRANT PERMISSIONS
-- ============================================================================

GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON level_requirements TO authenticated, anon;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ Adventure Log Database Setup Complete!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tables created:';
  RAISE NOTICE '  ✓ users, albums, photos';
  RAISE NOTICE '  ✓ likes, comments, followers/follows';
  RAISE NOTICE '  ✓ user_levels, level_requirements';
  RAISE NOTICE '  ✓ album_shares';
  RAISE NOTICE '';
  RAISE NOTICE 'Default data inserted:';
  RAISE NOTICE '  ✓ 10 user levels (Explorer to Legend)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Hard refresh your browser (Ctrl+Shift+R)';
  RAISE NOTICE '  2. Visit /profile to see your Level 1 badge';
  RAISE NOTICE '  3. Start creating albums!';
  RAISE NOTICE '========================================';
END $$;
