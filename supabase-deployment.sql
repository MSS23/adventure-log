-- ============================================================================
-- ADVENTURE LOG - COMPLETE SUPABASE DEPLOYMENT SCHEMA
-- ============================================================================
-- Version: 1.0.0
-- Last Updated: 2025-10-02
--
-- INSTRUCTIONS:
-- 1. Copy this entire file
-- 2. Go to Supabase SQL Editor
-- 3. Paste and run this script
-- 4. Database will be fully configured and ready to use
--
-- This includes:
-- - All tables with proper relationships
-- - RLS (Row Level Security) policies
-- - Database functions and triggers
-- - Sample reference data (countries, cities)
-- ============================================================================

-- ============================================================================
-- CLEANUP: Remove existing objects (if re-deploying)
-- ============================================================================

-- Drop tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS favorites CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS likes CASCADE;
DROP TABLE IF EXISTS followers CASCADE;
DROP TABLE IF EXISTS user_travel_stats CASCADE;
DROP TABLE IF EXISTS user_levels CASCADE;
DROP TABLE IF EXISTS level_requirements CASCADE;
DROP TABLE IF EXISTS photos CASCADE;
DROP TABLE IF EXISTS albums CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS islands CASCADE;
DROP TABLE IF EXISTS cities CASCADE;
DROP TABLE IF EXISTS countries CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS get_user_dashboard_stats(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_user_travel_years(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_user_travel_by_year(uuid, integer) CASCADE;

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- LOCATION REFERENCE TABLES
-- ============================================================================

-- Countries
CREATE TABLE countries (
  id SERIAL PRIMARY KEY,
  code CHAR(2) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  CONSTRAINT countries_code_format CHECK (code ~ '^[A-Z]{2}$')
);

-- Cities
CREATE TABLE cities (
  id SERIAL PRIMARY KEY,
  country_id INTEGER REFERENCES countries(id) ON DELETE CASCADE NOT NULL,
  country_code CHAR(2) NOT NULL,
  name VARCHAR(100) NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  population INTEGER,
  city_type VARCHAR(20) DEFAULT 'city',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  UNIQUE(name, country_code)
);

-- Islands
CREATE TABLE islands (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  country_code CHAR(2) NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  island_group VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  UNIQUE(name, country_code)
);

-- ============================================================================
-- USER TABLES
-- ============================================================================

-- Profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  name VARCHAR(100),
  bio TEXT,
  avatar_url TEXT,
  website TEXT,
  location VARCHAR(100),
  privacy_level VARCHAR(20) DEFAULT 'public' CHECK (privacy_level IN ('private', 'friends', 'public')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_]{3,50}$'),
  CONSTRAINT bio_length CHECK (char_length(bio) <= 1000),
  CONSTRAINT website_format CHECK (website IS NULL OR website ~ '^https?://')
);

-- Albums
CREATE TABLE albums (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  cover_photo_url TEXT,
  favorite_photo_urls TEXT[],
  date_start DATE,
  date_end DATE,
  visibility VARCHAR(20) DEFAULT 'public' CHECK (visibility IN ('private', 'friends', 'followers', 'public')),
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  tags TEXT[],

  -- Location fields
  location_name VARCHAR(200),
  location_display VARCHAR(200),
  country_code CHAR(2),
  country_id INTEGER REFERENCES countries(id),
  city_id INTEGER REFERENCES cities(id),
  island_id INTEGER REFERENCES islands(id),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  CONSTRAINT title_not_empty CHECK (char_length(trim(title)) > 0)
);

-- Photos
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  album_id UUID REFERENCES albums(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  file_path TEXT NOT NULL,
  storage_path TEXT,
  file_size INTEGER,
  width INTEGER,
  height INTEGER,
  caption TEXT,
  taken_at TIMESTAMP WITH TIME ZONE,
  processing_status VARCHAR(20) DEFAULT 'completed' CHECK (processing_status IN ('processing', 'completed', 'error')),
  order_index INTEGER DEFAULT 0,

  -- Location from EXIF
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  country VARCHAR(100),
  city VARCHAR(100),
  city_id INTEGER REFERENCES cities(id),
  island_id INTEGER REFERENCES islands(id),

  -- EXIF metadata
  exif_data JSONB,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- GAMIFICATION TABLES
-- ============================================================================

-- Level Requirements
CREATE TABLE level_requirements (
  level INTEGER PRIMARY KEY,
  min_countries INTEGER NOT NULL,
  min_cities INTEGER NOT NULL,
  min_photos INTEGER NOT NULL,
  title VARCHAR(50) NOT NULL,
  badge_icon TEXT
);

-- User Levels
CREATE TABLE user_levels (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  current_level INTEGER DEFAULT 1 REFERENCES level_requirements(level),
  total_points INTEGER DEFAULT 0,
  countries_visited INTEGER DEFAULT 0,
  cities_visited INTEGER DEFAULT 0,
  photos_uploaded INTEGER DEFAULT 0,
  last_level_up TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- User Travel Stats
CREATE TABLE user_travel_stats (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  total_countries INTEGER DEFAULT 0,
  total_cities INTEGER DEFAULT 0,
  total_albums INTEGER DEFAULT 0,
  total_photos INTEGER DEFAULT 0,
  first_trip_date DATE,
  last_trip_date DATE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- SOCIAL FEATURE TABLES
-- ============================================================================

-- Followers
CREATE TABLE followers (
  follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status VARCHAR(20) DEFAULT 'accepted' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

-- Likes
CREATE TABLE likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  album_id UUID REFERENCES albums(id) ON DELETE CASCADE,
  photo_id UUID REFERENCES photos(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  CONSTRAINT like_target CHECK (
    (album_id IS NOT NULL AND photo_id IS NULL) OR
    (album_id IS NULL AND photo_id IS NOT NULL)
  ),
  UNIQUE(user_id, album_id),
  UNIQUE(user_id, photo_id)
);

-- Comments
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  album_id UUID REFERENCES albums(id) ON DELETE CASCADE,
  photo_id UUID REFERENCES photos(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  CONSTRAINT comment_content_length CHECK (char_length(content) BETWEEN 1 AND 2000),
  CONSTRAINT comment_target CHECK (
    (album_id IS NOT NULL AND photo_id IS NULL) OR
    (album_id IS NULL AND photo_id IS NOT NULL)
  )
);

-- Favorites (Bookmarks)
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  target_id VARCHAR(255) NOT NULL,
  target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('photo', 'album', 'location')),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  UNIQUE(user_id, target_id, target_type)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Profiles indexes
CREATE INDEX idx_profiles_username ON profiles(username);

-- Albums indexes
CREATE INDEX idx_albums_user_id ON albums(user_id);
CREATE INDEX idx_albums_visibility ON albums(visibility);
CREATE INDEX idx_albums_created_at ON albums(created_at DESC);
CREATE INDEX idx_albums_location ON albums(latitude, longitude) WHERE latitude IS NOT NULL;
CREATE INDEX idx_albums_country ON albums(country_code) WHERE country_code IS NOT NULL;

-- Photos indexes
CREATE INDEX idx_photos_album_id ON photos(album_id);
CREATE INDEX idx_photos_user_id ON photos(user_id);
CREATE INDEX idx_photos_order ON photos(album_id, order_index);

-- Social indexes
CREATE INDEX idx_followers_following ON followers(following_id);
CREATE INDEX idx_followers_follower ON followers(follower_id);
CREATE INDEX idx_likes_album ON likes(album_id);
CREATE INDEX idx_likes_photo ON likes(photo_id);
CREATE INDEX idx_comments_album ON comments(album_id);
CREATE INDEX idx_comments_photo ON comments(photo_id);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_albums_updated_at BEFORE UPDATE ON albums
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_photos_updated_at BEFORE UPDATE ON photos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- New user handler
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username, display_name, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substring(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Dashboard stats function
CREATE OR REPLACE FUNCTION get_user_dashboard_stats(user_id_param UUID)
RETURNS TABLE (
  total_albums BIGINT,
  total_photos BIGINT,
  total_countries BIGINT,
  total_cities BIGINT,
  total_likes BIGINT,
  recent_album_id UUID,
  recent_album_title TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT a.id) as total_albums,
    COUNT(DISTINCT p.id) as total_photos,
    COUNT(DISTINCT a.country_id) as total_countries,
    COUNT(DISTINCT a.city_id) as total_cities,
    COUNT(DISTINCT l.id) as total_likes,
    (SELECT id FROM albums WHERE user_id = user_id_param ORDER BY created_at DESC LIMIT 1) as recent_album_id,
    (SELECT title FROM albums WHERE user_id = user_id_param ORDER BY created_at DESC LIMIT 1) as recent_album_title
  FROM albums a
  LEFT JOIN photos p ON a.id = p.album_id
  LEFT JOIN likes l ON a.id = l.album_id
  WHERE a.user_id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_travel_stats ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (privacy_level = 'public' OR auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Albums policies
CREATE POLICY "Public albums are viewable by everyone"
  ON albums FOR SELECT
  USING (visibility = 'public' OR user_id = auth.uid());

CREATE POLICY "Users can CRUD own albums"
  ON albums FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Photos policies
CREATE POLICY "Photos viewable if album is viewable"
  ON photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM albums
      WHERE albums.id = photos.album_id
      AND (albums.visibility = 'public' OR albums.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can CRUD own photos"
  ON photos FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Social policies
CREATE POLICY "Users can view own follow relationships"
  ON followers FOR SELECT
  USING (follower_id = auth.uid() OR following_id = auth.uid());

CREATE POLICY "Users can create follow relationships"
  ON followers FOR INSERT
  WITH CHECK (follower_id = auth.uid());

CREATE POLICY "Users can delete own follows"
  ON followers FOR DELETE
  USING (follower_id = auth.uid());

CREATE POLICY "Likes are viewable by everyone"
  ON likes FOR SELECT
  USING (true);

CREATE POLICY "Users can manage own likes"
  ON likes FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Comments are viewable by everyone"
  ON comments FOR SELECT
  USING (true);

CREATE POLICY "Users can manage own comments"
  ON comments FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- SAMPLE DATA: Countries
-- ============================================================================

INSERT INTO countries (code, name, latitude, longitude) VALUES
('US', 'United States', 37.0902, -95.7129),
('GB', 'United Kingdom', 55.3781, -3.4360),
('FR', 'France', 46.2276, 2.2137),
('ES', 'Spain', 40.4637, -3.7492),
('IT', 'Italy', 41.8719, 12.5674),
('DE', 'Germany', 51.1657, 10.4515),
('JP', 'Japan', 36.2048, 138.2529),
('AU', 'Australia', -25.2744, 133.7751),
('CA', 'Canada', 56.1304, -106.3468),
('MX', 'Mexico', 23.6345, -102.5528)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- SAMPLE DATA: Level Requirements
-- ============================================================================

INSERT INTO level_requirements (level, min_countries, min_cities, min_photos, title, badge_icon) VALUES
(1, 0, 0, 0, 'Beginner Explorer', '🌱'),
(2, 1, 2, 10, 'City Wanderer', '🏙️'),
(3, 3, 5, 50, 'Country Hopper', '🌍'),
(4, 5, 10, 100, 'Continent Traveler', '✈️'),
(5, 10, 20, 250, 'World Explorer', '🌎'),
(6, 20, 50, 500, 'Globe Trotter', '🌏'),
(7, 30, 75, 1000, 'Adventure Master', '⭐'),
(8, 50, 100, 2000, 'Travel Legend', '👑'),
(9, 75, 150, 5000, 'Journey Sage', '🔮'),
(10, 100, 200, 10000, 'Ultimate Voyager', '🏆')
ON CONFLICT (level) DO NOTHING;

-- ============================================================================
-- VERIFICATION & COMPLETION
-- ============================================================================

DO $$
DECLARE
  table_count INTEGER;
  country_count INTEGER;
  level_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

  SELECT COUNT(*) INTO country_count FROM countries;
  SELECT COUNT(*) INTO level_count FROM level_requirements;

  RAISE NOTICE '✅ Adventure Log Database Deployment Complete!';
  RAISE NOTICE '📊 Tables created: %', table_count;
  RAISE NOTICE '🌍 Countries loaded: %', country_count;
  RAISE NOTICE '⭐ Levels configured: %', level_count;
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Your database is ready to use!';
  RAISE NOTICE '🔒 Row Level Security (RLS) is enabled';
  RAISE NOTICE '🚀 You can now start using the Adventure Log app';
END
$$;
