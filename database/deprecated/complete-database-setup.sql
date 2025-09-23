-- Adventure Log - Complete Database Setup
-- Copy and paste this entire file into Supabase SQL Editor and run it
-- This will set up everything needed for the application to work

-- =============================================================================
-- CLEAN SLATE - Drop all existing tables and dependencies
-- =============================================================================

-- Drop views first (they depend on tables)
DROP VIEW IF EXISTS travel_timeline_view CASCADE;
DROP VIEW IF EXISTS travel_animation_data CASCADE;

-- Drop functions and triggers
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS get_user_dashboard_stats(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_user_travel_years(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_user_travel_by_year(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS search_cities(TEXT, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS calculate_distance(DECIMAL, DECIMAL, DECIMAL, DECIMAL) CASCADE;
DROP FUNCTION IF EXISTS generate_travel_timeline(UUID) CASCADE;
DROP FUNCTION IF EXISTS calculate_travel_statistics(UUID, INTEGER) CASCADE;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS travel_statistics CASCADE;
DROP TABLE IF EXISTS travel_timeline CASCADE;
DROP TABLE IF EXISTS flight_paths CASCADE;
DROP TABLE IF EXISTS user_travel_stats CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS likes CASCADE;
DROP TABLE IF EXISTS followers CASCADE;
DROP TABLE IF EXISTS photos CASCADE;
DROP TABLE IF EXISTS albums CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS islands CASCADE;
DROP TABLE IF EXISTS cities CASCADE;
DROP TABLE IF EXISTS countries CASCADE;

-- =============================================================================
-- EXTENSIONS
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- CORE REFERENCE TABLES
-- =============================================================================

-- Countries table with enhanced geographical data
CREATE TABLE countries (
  id SERIAL PRIMARY KEY,
  code CHAR(2) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Constraints
  CONSTRAINT countries_code_format CHECK (code ~ '^[A-Z]{2}$'),
  CONSTRAINT countries_coordinates CHECK (
    (latitude IS NULL AND longitude IS NULL) OR
    (latitude IS NOT NULL AND longitude IS NOT NULL AND
     latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
  )
);

-- Cities table with comprehensive location data
CREATE TABLE cities (
  id SERIAL PRIMARY KEY,
  country_id INTEGER REFERENCES countries(id) ON DELETE CASCADE NOT NULL,
  country_code CHAR(2) NOT NULL,
  name VARCHAR(100) NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  population INTEGER,
  city_type VARCHAR(20) DEFAULT 'city' CHECK (city_type IN ('city', 'island', 'archipelago', 'capital')),
  airport_code VARCHAR(3),
  timezone VARCHAR(50),
  is_major_destination BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Constraints
  CONSTRAINT cities_coordinates CHECK (
    latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180
  ),
  CONSTRAINT cities_population_positive CHECK (population IS NULL OR population > 0),
  CONSTRAINT cities_airport_code_format CHECK (
    airport_code IS NULL OR airport_code ~ '^[A-Z]{3}$'
  ),

  -- Unique constraint to prevent duplicate cities
  UNIQUE(name, country_code)
);

-- Islands table for specialized island destinations
CREATE TABLE islands (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  country_code CHAR(2) NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  island_group VARCHAR(100),
  area_km2 DECIMAL(10, 2),
  is_inhabited BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Constraints
  CONSTRAINT islands_coordinates CHECK (
    latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180
  ),
  CONSTRAINT islands_area_positive CHECK (area_km2 IS NULL OR area_km2 > 0),

  -- Unique constraint to prevent duplicate islands
  UNIQUE(name, country_code)
);

-- =============================================================================
-- USER AND CONTENT TABLES
-- =============================================================================

-- User profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  bio TEXT,
  avatar_url TEXT,
  website TEXT,
  location VARCHAR(100),
  privacy_level VARCHAR(20) DEFAULT 'public' CHECK (privacy_level IN ('private', 'friends', 'public')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Constraints
  CONSTRAINT profiles_username_format CHECK (username ~ '^[a-zA-Z0-9_]{3,50}$'),
  CONSTRAINT profiles_display_name_length CHECK (length(display_name) >= 1),
  CONSTRAINT profiles_bio_length CHECK (length(bio) <= 1000),
  CONSTRAINT profiles_website_format CHECK (
    website IS NULL OR website ~ '^https?://'
  )
);

-- Albums table with enhanced location linking
CREATE TABLE albums (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  cover_photo_url TEXT,
  start_date DATE,
  end_date DATE,
  visibility VARCHAR(20) DEFAULT 'public' CHECK (visibility IN ('private', 'friends', 'public')),
  tags TEXT[],

  -- Location data (flexible - can reference city, island, or just coordinates)
  location_name VARCHAR(200),
  country_id INTEGER REFERENCES countries(id),
  country_code CHAR(2),
  city_id INTEGER REFERENCES cities(id),
  island_id INTEGER REFERENCES islands(id),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Constraints
  CONSTRAINT albums_title_length CHECK (length(title) >= 1),
  CONSTRAINT albums_date_order CHECK (start_date IS NULL OR end_date IS NULL OR start_date <= end_date),
  CONSTRAINT albums_coordinates CHECK (
    (latitude IS NULL AND longitude IS NULL) OR
    (latitude IS NOT NULL AND longitude IS NOT NULL AND
     latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
  )
);

-- Photos table with enhanced metadata
CREATE TABLE photos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  album_id UUID REFERENCES albums(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  width INTEGER,
  height INTEGER,
  caption TEXT,
  taken_at TIMESTAMP WITH TIME ZONE,

  -- Location data (can be more precise than album location)
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  country VARCHAR(100),
  city VARCHAR(100),
  city_id INTEGER REFERENCES cities(id),
  island_id INTEGER REFERENCES islands(id),

  exif_data JSONB,
  processing_status VARCHAR(20) DEFAULT 'processing' CHECK (
    processing_status IN ('processing', 'completed', 'error')
  ),
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Constraints
  CONSTRAINT photos_file_size_positive CHECK (file_size IS NULL OR file_size > 0),
  CONSTRAINT photos_dimensions_positive CHECK (
    (width IS NULL AND height IS NULL) OR
    (width > 0 AND height > 0)
  ),
  CONSTRAINT photos_coordinates CHECK (
    (latitude IS NULL AND longitude IS NULL) OR
    (latitude IS NOT NULL AND longitude IS NOT NULL AND
     latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
  ),
  CONSTRAINT photos_order_index_non_negative CHECK (order_index >= 0)
);

-- =============================================================================
-- SOCIAL FEATURES TABLES
-- =============================================================================

-- Followers table for social networking
CREATE TABLE followers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Constraints
  CONSTRAINT followers_no_self_follow CHECK (follower_id != following_id),
  UNIQUE(follower_id, following_id)
);

-- Likes table (flexible for albums and photos)
CREATE TABLE likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('album', 'photo')),
  target_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Ensure user can only like something once
  UNIQUE(user_id, target_type, target_id)
);

-- Comments table (flexible for albums and photos)
CREATE TABLE comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('album', 'photo')),
  target_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Constraints
  CONSTRAINT comments_content_length CHECK (length(content) >= 1 AND length(content) <= 2000)
);

-- =============================================================================
-- ANALYTICS TABLES
-- =============================================================================

-- User travel statistics (derived data for performance)
CREATE TABLE user_travel_stats (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  countries_visited INTEGER DEFAULT 0,
  cities_visited INTEGER DEFAULT 0,
  islands_visited INTEGER DEFAULT 0,
  total_photos INTEGER DEFAULT 0,
  total_albums INTEGER DEFAULT 0,
  first_trip_date DATE,
  last_trip_date DATE,
  total_distance_km DECIMAL(10, 2) DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Constraints
  CONSTRAINT user_travel_stats_non_negative CHECK (
    countries_visited >= 0 AND cities_visited >= 0 AND islands_visited >= 0 AND
    total_photos >= 0 AND total_albums >= 0 AND total_distance_km >= 0
  ),
  CONSTRAINT user_travel_stats_date_order CHECK (
    first_trip_date IS NULL OR last_trip_date IS NULL OR first_trip_date <= last_trip_date
  )
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Primary lookup indexes
CREATE INDEX idx_countries_code ON countries(code);
CREATE INDEX idx_cities_country ON cities(country_id);
CREATE INDEX idx_cities_country_code ON cities(country_code);
CREATE INDEX idx_cities_coordinates ON cities(latitude, longitude);
CREATE INDEX idx_islands_country_code ON islands(country_code);
CREATE INDEX idx_islands_coordinates ON islands(latitude, longitude);

-- User content indexes
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_albums_user_id ON albums(user_id);
CREATE INDEX idx_albums_visibility ON albums(visibility);
CREATE INDEX idx_albums_dates ON albums(start_date, end_date);
CREATE INDEX idx_albums_country ON albums(country_id);
CREATE INDEX idx_albums_city ON albums(city_id);
CREATE INDEX idx_albums_island ON albums(island_id);
CREATE INDEX idx_photos_album_id ON photos(album_id);
CREATE INDEX idx_photos_user_id ON photos(user_id);
CREATE INDEX idx_photos_coordinates ON photos(latitude, longitude);

-- Social features indexes
CREATE INDEX idx_followers_follower_id ON followers(follower_id);
CREATE INDEX idx_followers_following_id ON followers(following_id);
CREATE INDEX idx_likes_user_target ON likes(user_id, target_type, target_id);
CREATE INDEX idx_likes_target ON likes(target_type, target_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_target ON comments(target_type, target_id);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS on all user-related tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_travel_stats ENABLE ROW LEVEL SECURITY;

-- Reference data is publicly readable
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE islands ENABLE ROW LEVEL SECURITY;

-- Public data policies
CREATE POLICY "Countries are viewable by everyone" ON countries
  FOR SELECT USING (true);

CREATE POLICY "Cities are viewable by everyone" ON cities
  FOR SELECT USING (true);

CREATE POLICY "Islands are viewable by everyone" ON islands
  FOR SELECT USING (true);

-- User profile policies
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (privacy_level = 'public');

CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Album policies
CREATE POLICY "Public albums are viewable by everyone" ON albums
  FOR SELECT USING (visibility = 'public');

CREATE POLICY "Users can view their own albums" ON albums
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own albums" ON albums
  FOR ALL USING (auth.uid() = user_id);

-- Photo policies
CREATE POLICY "Photos in public albums are viewable by everyone" ON photos
  FOR SELECT USING (
    album_id IN (
      SELECT id FROM albums WHERE visibility = 'public'
    )
  );

CREATE POLICY "Users can view their own photos" ON photos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own photos" ON photos
  FOR ALL USING (auth.uid() = user_id);

-- Social feature policies
CREATE POLICY "Followers are viewable by everyone" ON followers
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their own follows" ON followers
  FOR ALL USING (auth.uid() = follower_id);

CREATE POLICY "Likes are viewable by everyone" ON likes
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their own likes" ON likes
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Comments are viewable by everyone" ON comments
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their own comments" ON comments
  FOR ALL USING (auth.uid() = user_id);

-- Travel data policies
CREATE POLICY "Users can view their own travel stats" ON user_travel_stats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own travel stats" ON user_travel_stats
  FOR ALL USING (auth.uid() = user_id);

-- =============================================================================
-- CORE FUNCTIONS AND TRIGGERS
-- =============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_albums_updated_at
  BEFORE UPDATE ON albums
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_travel_stats_updated_at
  BEFORE UPDATE ON user_travel_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to handle new user signup (creates profile automatically)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, privacy_level, created_at, updated_at)
  VALUES (
    new.id,
    'user_' || substr(replace(new.id::text, '-', ''), 1, 8),
    COALESCE(new.raw_user_meta_data->>'full_name', 'New User'),
    'public',
    now(),
    now()
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================================================
-- REFERENCE DATA - Essential countries
-- =============================================================================

INSERT INTO countries (code, name, latitude, longitude) VALUES
('US', 'United States', 40.7128, -74.0060),
('GB', 'United Kingdom', 51.5074, -0.1278),
('CA', 'Canada', 43.6532, -79.3832),
('AU', 'Australia', -33.8688, 151.2093),
('FR', 'France', 48.8566, 2.3522),
('DE', 'Germany', 52.5200, 13.4050),
('IT', 'Italy', 41.9028, 12.4964),
('ES', 'Spain', 40.4168, -3.7038),
('JP', 'Japan', 35.6762, 139.6503),
('BR', 'Brazil', -23.5505, -46.6333),
('IN', 'India', 28.6139, 77.2090),
('CN', 'China', 39.9042, 116.4074),
('MX', 'Mexico', 19.4326, -99.1332),
('RU', 'Russia', 55.7558, 37.6176),
('ZA', 'South Africa', -26.2041, 28.0473),
('EG', 'Egypt', 30.0444, 31.2357),
('TH', 'Thailand', 13.7563, 100.5018),
('TR', 'Turkey', 39.9334, 32.8597),
('GR', 'Greece', 37.9838, 23.7275),
('NL', 'Netherlands', 52.3676, 4.9041)

ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Adventure Log database setup completed successfully!';
  RAISE NOTICE 'Tables created: %', (
    SELECT COUNT(*)
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
  );
  RAISE NOTICE 'Countries loaded: %', (SELECT COUNT(*) FROM countries);
  RAISE NOTICE '✅ Database is ready for Adventure Log!';
END
$$;