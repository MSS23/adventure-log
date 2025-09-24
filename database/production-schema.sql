-- CORRECTED Adventure Log Database Schema
-- This schema exactly matches what the application code expects
-- Copy and paste this entire file into Supabase SQL Editor and run it

-- =============================================================================
-- CRITICAL FIX: This corrects the database schema to match application expectations
-- The previous schema used target_type/target_id but the app expects album_id/photo_id
-- =============================================================================

-- Drop existing tables if they exist (clean slate)
DROP TABLE IF EXISTS favorites CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS likes CASCADE;
DROP TABLE IF EXISTS followers CASCADE;
DROP TABLE IF EXISTS photos CASCADE;
DROP TABLE IF EXISTS albums CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS user_travel_stats CASCADE;
DROP TABLE IF EXISTS islands CASCADE;
DROP TABLE IF EXISTS cities CASCADE;
DROP TABLE IF EXISTS countries CASCADE;

-- Drop existing functions and triggers
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS get_user_dashboard_stats(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_user_travel_years(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_user_travel_by_year(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS handle_follow_request(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS accept_follow_request(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS reject_follow_request(uuid, uuid) CASCADE;

-- =============================================================================
-- EXTENSIONS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- REFERENCE DATA TABLES
-- =============================================================================

-- Countries table
CREATE TABLE countries (
  id SERIAL PRIMARY KEY,
  code CHAR(2) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  CONSTRAINT countries_code_format CHECK (code ~ '^[A-Z]{2}$'),
  CONSTRAINT countries_coordinates CHECK (
    (latitude IS NULL AND longitude IS NULL) OR
    (latitude IS NOT NULL AND longitude IS NOT NULL AND
     latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
  )
);

-- Cities table
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

  CONSTRAINT cities_coordinates CHECK (
    latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180
  ),
  CONSTRAINT cities_population_positive CHECK (population IS NULL OR population > 0),
  UNIQUE(name, country_code)
);

-- Islands table
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

  CONSTRAINT islands_coordinates CHECK (
    latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180
  ),
  UNIQUE(name, country_code)
);

-- =============================================================================
-- USER CONTENT TABLES
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

  CONSTRAINT profiles_username_format CHECK (username ~ '^[a-zA-Z0-9_]{3,50}$'),
  CONSTRAINT profiles_display_name_length CHECK (length(display_name) >= 1),
  CONSTRAINT profiles_bio_length CHECK (length(bio) <= 1000),
  CONSTRAINT profiles_website_format CHECK (
    website IS NULL OR website ~ '^https?://'
  )
);

-- Albums table
CREATE TABLE albums (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  cover_photo_url TEXT,
  favorite_photo_urls TEXT[], -- Up to 3 favorite photos for globe pin tooltips
  start_date DATE,
  end_date DATE,
  visibility VARCHAR(20) DEFAULT 'public' CHECK (visibility IN ('private', 'friends', 'followers', 'public')),
  tags TEXT[],

  -- Location data
  location_name VARCHAR(200),
  country_id INTEGER REFERENCES countries(id),
  country_code CHAR(2),
  city_id INTEGER REFERENCES cities(id),
  island_id INTEGER REFERENCES islands(id),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  CONSTRAINT albums_title_length CHECK (length(title) >= 1),
  CONSTRAINT albums_date_order CHECK (start_date IS NULL OR end_date IS NULL OR start_date <= end_date),
  CONSTRAINT albums_coordinates CHECK (
    (latitude IS NULL AND longitude IS NULL) OR
    (latitude IS NOT NULL AND longitude IS NOT NULL AND
     latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
  )
);

-- Photos table
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

  -- Location data
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
-- SOCIAL FEATURES TABLES - CORRECTED TO MATCH APP EXPECTATIONS
-- =============================================================================

-- FIXED: Likes table with separate album_id and photo_id columns (NOT target_type/target_id)
CREATE TABLE likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  album_id UUID REFERENCES albums(id) ON DELETE CASCADE,
  photo_id UUID REFERENCES photos(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Ensure either album_id or photo_id is set, but not both
  CONSTRAINT likes_album_or_photo CHECK (
    (album_id IS NOT NULL AND photo_id IS NULL) OR
    (album_id IS NULL AND photo_id IS NOT NULL)
  ),

  -- Prevent duplicate likes from same user
  CONSTRAINT likes_unique_user_album UNIQUE (user_id, album_id),
  CONSTRAINT likes_unique_user_photo UNIQUE (user_id, photo_id)
);

-- FIXED: Comments table with separate album_id and photo_id columns (NOT target_type/target_id)
CREATE TABLE comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  album_id UUID REFERENCES albums(id) ON DELETE CASCADE,
  photo_id UUID REFERENCES photos(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Ensure either album_id or photo_id is set, but not both
  CONSTRAINT comments_album_or_photo CHECK (
    (album_id IS NOT NULL AND photo_id IS NULL) OR
    (album_id IS NULL AND photo_id IS NOT NULL)
  ),

  CONSTRAINT comments_content_length CHECK (length(content) >= 1 AND length(content) <= 2000)
);

-- Followers table
CREATE TABLE followers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  CONSTRAINT followers_no_self_follow CHECK (follower_id != following_id),
  UNIQUE(follower_id, following_id)
);

-- Favorites table (for photos, albums, and locations)
CREATE TABLE favorites (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  target_id VARCHAR(255) NOT NULL,
  target_type VARCHAR(20) CHECK (target_type IN ('photo', 'album', 'location')) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Prevent duplicate favorites for the same target by the same user
  UNIQUE(user_id, target_id, target_type)
);

-- User travel statistics
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

  CONSTRAINT user_travel_stats_non_negative CHECK (
    countries_visited >= 0 AND cities_visited >= 0 AND islands_visited >= 0 AND
    total_photos >= 0 AND total_albums >= 0 AND total_distance_km >= 0
  )
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Reference data indexes
CREATE INDEX idx_countries_code ON countries(code);
CREATE INDEX idx_cities_country ON cities(country_id);
CREATE INDEX idx_cities_country_code ON cities(country_code);
CREATE INDEX idx_cities_coordinates ON cities(latitude, longitude);
CREATE INDEX idx_islands_country_code ON islands(country_code);

-- User content indexes
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_albums_user_id ON albums(user_id);
CREATE INDEX idx_albums_visibility ON albums(visibility);
CREATE INDEX idx_albums_dates ON albums(start_date, end_date);
CREATE INDEX idx_photos_album_id ON photos(album_id);
CREATE INDEX idx_photos_user_id ON photos(user_id);

-- FIXED: Social features indexes matching new schema
CREATE INDEX idx_likes_user_id ON likes(user_id);
CREATE INDEX idx_likes_album_id ON likes(album_id);
CREATE INDEX idx_likes_photo_id ON likes(photo_id);
CREATE INDEX idx_likes_created_at ON likes(created_at);

CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_album_id ON comments(album_id);
CREATE INDEX idx_comments_photo_id ON comments(photo_id);
CREATE INDEX idx_comments_created_at ON comments(created_at);

CREATE INDEX idx_followers_follower_id ON followers(follower_id);
CREATE INDEX idx_followers_following_id ON followers(following_id);

CREATE INDEX idx_favorites_user_id ON favorites(user_id);
CREATE INDEX idx_favorites_target_type ON favorites(target_type);
CREATE INDEX idx_favorites_created_at ON favorites(created_at);
CREATE INDEX idx_favorites_target_id ON favorites(target_id);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_travel_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE islands ENABLE ROW LEVEL SECURITY;

-- Reference data policies (public read)
CREATE POLICY "Countries are viewable by everyone" ON countries FOR SELECT USING (true);
CREATE POLICY "Cities are viewable by everyone" ON cities FOR SELECT USING (true);
CREATE POLICY "Islands are viewable by everyone" ON islands FOR SELECT USING (true);

-- Profile policies
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (privacy_level = 'public');

CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Friends-level profiles are viewable by accepted followers" ON profiles
  FOR SELECT USING (
    privacy_level = 'friends'
    AND (
      id IN (
        SELECT following_id FROM followers
        WHERE follower_id = auth.uid() AND status = 'accepted'
      )
      OR auth.uid() = id
    )
  );

CREATE POLICY "Private profiles are viewable by accepted followers" ON profiles
  FOR SELECT USING (
    privacy_level = 'private'
    AND (
      id IN (
        SELECT following_id FROM followers
        WHERE follower_id = auth.uid() AND status = 'accepted'
      )
      OR auth.uid() = id
    )
  );

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Album policies
CREATE POLICY "Public albums are viewable by everyone" ON albums
  FOR SELECT USING (visibility = 'public');

CREATE POLICY "Users can view their own albums" ON albums
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Followers can view followers-only albums from public accounts" ON albums
  FOR SELECT USING (
    visibility = 'followers'
    AND user_id IN (
      SELECT id FROM profiles WHERE privacy_level = 'public'
    )
    AND (
      user_id IN (
        SELECT following_id FROM followers
        WHERE follower_id = auth.uid() AND status = 'accepted'
      )
      OR auth.uid() = user_id
    )
  );

CREATE POLICY "Accepted followers can view content from private accounts" ON albums
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM profiles WHERE privacy_level = 'private'
    )
    AND (
      user_id IN (
        SELECT following_id FROM followers
        WHERE follower_id = auth.uid() AND status = 'accepted'
      )
      OR auth.uid() = user_id
    )
  );

CREATE POLICY "Friends can view friends-only albums" ON albums
  FOR SELECT USING (
    visibility = 'friends'
    AND (
      user_id IN (
        SELECT following_id FROM followers
        WHERE follower_id = auth.uid() AND status = 'accepted'
      )
      OR auth.uid() = user_id
    )
  );

CREATE POLICY "Users can manage their own albums" ON albums
  FOR ALL USING (auth.uid() = user_id);

-- Photo policies (inherit album privacy)
CREATE POLICY "Photos are viewable based on album privacy" ON photos
  FOR SELECT USING (
    album_id IN (
      SELECT id FROM albums WHERE (
        -- Public albums
        visibility = 'public'
        -- Own photos
        OR user_id = auth.uid()
        -- Followers-only albums from public accounts (to accepted followers)
        OR (
          visibility = 'followers'
          AND user_id IN (SELECT id FROM profiles WHERE privacy_level = 'public')
          AND user_id IN (
            SELECT following_id FROM followers
            WHERE follower_id = auth.uid() AND status = 'accepted'
          )
        )
        -- Content from private accounts (to accepted followers only)
        OR (
          user_id IN (SELECT id FROM profiles WHERE privacy_level = 'private')
          AND user_id IN (
            SELECT following_id FROM followers
            WHERE follower_id = auth.uid() AND status = 'accepted'
          )
        )
        -- Friends-only albums (to accepted followers)
        OR (
          visibility = 'friends'
          AND user_id IN (
            SELECT following_id FROM followers
            WHERE follower_id = auth.uid() AND status = 'accepted'
          )
        )
      )
    )
  );

CREATE POLICY "Users can manage their own photos" ON photos
  FOR ALL USING (auth.uid() = user_id);

-- FIXED: Social feature policies matching new schema
CREATE POLICY "Likes are viewable by everyone" ON likes FOR SELECT USING (true);
CREATE POLICY "Users can manage their own likes" ON likes FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Comments are viewable by everyone" ON comments FOR SELECT USING (true);
CREATE POLICY "Users can manage their own comments" ON comments FOR ALL USING (auth.uid() = user_id);

-- Follower policies
CREATE POLICY "Users can view follow relationships they're involved in" ON followers
  FOR SELECT USING (auth.uid() = follower_id OR auth.uid() = following_id);

CREATE POLICY "Users can create follow requests" ON followers
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can manage follow requests they initiated" ON followers
  FOR UPDATE USING (auth.uid() = follower_id);

CREATE POLICY "Users can manage follow requests directed at them" ON followers
  FOR UPDATE USING (auth.uid() = following_id);

CREATE POLICY "Users can delete their own follow relationships" ON followers
  FOR DELETE USING (auth.uid() = follower_id OR auth.uid() = following_id);

-- Favorites policies
CREATE POLICY "Users can view their own favorites" ON favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own favorites" ON favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own favorites" ON favorites
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites" ON favorites
  FOR DELETE USING (auth.uid() = user_id);

-- Travel stats policies
CREATE POLICY "Users can view their own travel stats" ON user_travel_stats
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own travel stats" ON user_travel_stats
  FOR ALL USING (auth.uid() = user_id);

-- =============================================================================
-- FUNCTIONS AND TRIGGERS
-- =============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at columns
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

-- Trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================================================
-- REFERENCE DATA - ESSENTIAL COUNTRIES
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

-- =============================================================================
-- MISSING DATABASE FUNCTIONS AND VIEWS
-- =============================================================================

-- Function: get_user_dashboard_stats (fixes 400 error)
CREATE OR REPLACE FUNCTION get_user_dashboard_stats(user_id_param UUID)
RETURNS TABLE (
  total_albums BIGINT,
  total_photos BIGINT,
  countries_visited BIGINT,
  cities_visited BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM albums WHERE user_id = user_id_param) as total_albums,
    (SELECT COUNT(*) FROM photos WHERE user_id = user_id_param) as total_photos,
    (SELECT COUNT(DISTINCT country_code) FROM albums WHERE user_id = user_id_param AND country_code IS NOT NULL) as countries_visited,
    (SELECT COUNT(DISTINCT city_id) FROM albums WHERE user_id = user_id_param AND city_id IS NOT NULL) as cities_visited;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: get_user_travel_years (fixes 404 error)
CREATE OR REPLACE FUNCTION get_user_travel_years(user_id_param UUID)
RETURNS TABLE (year INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT EXTRACT(YEAR FROM created_at)::INTEGER as year
  FROM albums
  WHERE user_id = user_id_param
  AND created_at IS NOT NULL
  ORDER BY year DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View: travel_timeline_view (fixes "relation does not exist" error)
CREATE OR REPLACE VIEW travel_timeline_view AS
SELECT
  a.id,
  a.user_id,
  a.title,
  a.location_name,
  a.country_code,
  c.name as city_name,
  co.name as country_name,
  a.latitude,
  a.longitude,
  a.created_at,
  EXTRACT(YEAR FROM a.created_at)::INTEGER as year,
  COUNT(p.id) as photo_count
FROM albums a
LEFT JOIN photos p ON a.id = p.album_id
LEFT JOIN cities c ON a.city_id = c.id
LEFT JOIN countries co ON a.country_id = co.id
GROUP BY a.id, a.user_id, a.title, a.location_name, a.country_code, c.name, co.name, a.latitude, a.longitude, a.created_at;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT SELECT ON travel_timeline_view TO postgres, anon, authenticated, service_role;

-- Function: handle follow request (auto-approve for public accounts)
CREATE OR REPLACE FUNCTION handle_follow_request(follower_id_param UUID, following_id_param UUID)
RETURNS TEXT AS $$
DECLARE
  account_privacy TEXT;
  existing_follow_id UUID;
BEGIN
  -- Check if already following or request exists
  SELECT id INTO existing_follow_id
  FROM followers
  WHERE follower_id = follower_id_param AND following_id = following_id_param;

  IF existing_follow_id IS NOT NULL THEN
    RETURN 'already_exists';
  END IF;

  -- Get the privacy level of the account being followed
  SELECT privacy_level INTO account_privacy
  FROM profiles
  WHERE id = following_id_param;

  -- Insert follow request
  IF account_privacy = 'public' THEN
    -- Auto-approve for public accounts
    INSERT INTO followers (follower_id, following_id, status)
    VALUES (follower_id_param, following_id_param, 'accepted');
    RETURN 'accepted';
  ELSE
    -- Require approval for private/friends accounts
    INSERT INTO followers (follower_id, following_id, status)
    VALUES (follower_id_param, following_id_param, 'pending');
    RETURN 'pending';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: accept follow request
CREATE OR REPLACE FUNCTION accept_follow_request(follower_id_param UUID, following_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE followers
  SET status = 'accepted', updated_at = now()
  WHERE follower_id = follower_id_param
    AND following_id = following_id_param
    AND status = 'pending';

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: reject follow request
CREATE OR REPLACE FUNCTION reject_follow_request(follower_id_param UUID, following_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE followers
  SET status = 'rejected', updated_at = now()
  WHERE follower_id = follower_id_param
    AND following_id = following_id_param
    AND status = 'pending';

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: get_user_travel_by_year (powers the globe timeline)
CREATE OR REPLACE FUNCTION get_user_travel_by_year(user_id_param UUID, year_param INTEGER)
RETURNS TABLE (
  album_id UUID,
  location_name TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  location_type TEXT,
  visit_date TIMESTAMP WITH TIME ZONE,
  sequence_order INTEGER,
  photo_count BIGINT,
  country_code TEXT,
  duration_days INTEGER,
  airport_code TEXT,
  timezone TEXT,
  island_group TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id as album_id,
    COALESCE(a.location_name, c.name, co.name, 'Unknown Location') as location_name,
    a.latitude,
    a.longitude,
    CASE
      WHEN a.city_id IS NOT NULL THEN 'city'
      WHEN a.island_id IS NOT NULL THEN 'island'
      WHEN a.country_id IS NOT NULL THEN 'country'
      ELSE 'unknown'
    END::TEXT as location_type,
    a.created_at as visit_date,
    ROW_NUMBER() OVER (ORDER BY a.created_at)::INTEGER as sequence_order,
    COUNT(p.id) as photo_count,
    a.country_code,
    1 as duration_days, -- Default to 1 day
    NULL::TEXT as airport_code,
    NULL::TEXT as timezone,
    i.island_group
  FROM albums a
  LEFT JOIN photos p ON a.id = p.album_id
  LEFT JOIN cities c ON a.city_id = c.id
  LEFT JOIN countries co ON a.country_id = co.id
  LEFT JOIN islands i ON a.island_id = i.id
  WHERE a.user_id = user_id_param
    AND EXTRACT(YEAR FROM a.created_at) = year_param
    AND a.latitude IS NOT NULL
    AND a.longitude IS NOT NULL
  GROUP BY a.id, a.location_name, a.country_code, a.latitude, a.longitude, a.created_at, a.city_id, a.island_id, a.country_id, c.name, co.name, i.island_group
  ORDER BY a.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ CORRECTED Adventure Log database schema applied successfully!';
  RAISE NOTICE '📊 Tables created: %', (
    SELECT COUNT(*)
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
  );
  RAISE NOTICE '🌍 Countries loaded: %', (SELECT COUNT(*) FROM countries);
  RAISE NOTICE '🔧 CRITICAL FIX: likes/comments tables now use album_id/photo_id columns';
  RAISE NOTICE '✨ Database ready - social features should work now!';
END
$$;