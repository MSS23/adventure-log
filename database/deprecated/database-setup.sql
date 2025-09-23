-- Adventure Log Database Schema - Complete Setup
-- Run this in your Supabase SQL Editor

-- Clean slate - Drop all existing tables first
DROP TABLE IF EXISTS user_travel_stats CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS likes CASCADE;
DROP TABLE IF EXISTS followers CASCADE;
DROP TABLE IF EXISTS photos CASCADE;
DROP TABLE IF EXISTS albums CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS cities CASCADE;
DROP TABLE IF EXISTS countries CASCADE;
DROP TABLE IF EXISTS islands CASCADE;

-- Drop existing functions and triggers
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable PostGIS for geographic data
CREATE EXTENSION IF NOT EXISTS postgis;

-- Countries table
CREATE TABLE countries (
  id SERIAL PRIMARY KEY,
  code VARCHAR(2) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Cities table  
CREATE TABLE cities (
  id SERIAL PRIMARY KEY,
  country_id INTEGER REFERENCES countries(id),
  name VARCHAR(100) NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- User profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  bio TEXT,
  avatar_url TEXT,
  website TEXT,
  location VARCHAR(100),
  privacy_level VARCHAR(20) DEFAULT 'public' CHECK (privacy_level IN ('private', 'friends', 'public')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Albums table
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
  location_name VARCHAR(200),
  country_id INTEGER REFERENCES countries(id),
  city_id INTEGER REFERENCES cities(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
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
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  country VARCHAR(100),
  city VARCHAR(100),
  exif_data JSONB,
  processing_status VARCHAR(20) DEFAULT 'processing',
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Followers table for social features
CREATE TABLE followers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(follower_id, following_id)
);

-- Likes table
CREATE TABLE likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('album', 'photo')),
  target_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, target_type, target_id)
);

-- Comments table
CREATE TABLE comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('album', 'photo')),
  target_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- User travel stats (derived data)
CREATE TABLE user_travel_stats (
  user_id UUID REFERENCES profiles(id) PRIMARY KEY,
  countries_visited INTEGER DEFAULT 0,
  cities_visited INTEGER DEFAULT 0,
  total_photos INTEGER DEFAULT 0,
  total_albums INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_albums_user_id ON albums(user_id);
CREATE INDEX idx_albums_visibility ON albums(visibility);
CREATE INDEX idx_photos_album_id ON photos(album_id);
CREATE INDEX idx_photos_user_id ON photos(user_id);
CREATE INDEX idx_photos_coordinates ON photos(latitude, longitude);
CREATE INDEX idx_followers_follower_id ON followers(follower_id);
CREATE INDEX idx_followers_following_id ON followers(following_id);
CREATE INDEX idx_likes_user_target ON likes(user_id, target_type, target_id);
CREATE INDEX idx_comments_target ON comments(target_type, target_id);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_travel_stats ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (privacy_level = 'public');

CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Albums policies
CREATE POLICY "Public albums are viewable by everyone" ON albums
  FOR SELECT USING (visibility = 'public');

CREATE POLICY "Users can view their own albums" ON albums
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create albums" ON albums
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own albums" ON albums
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own albums" ON albums
  FOR DELETE USING (auth.uid() = user_id);

-- Photos policies
CREATE POLICY "Photos in public albums are viewable by everyone" ON photos
  FOR SELECT USING (
    album_id IN (
      SELECT id FROM albums WHERE visibility = 'public'
    )
  );

CREATE POLICY "Users can view their own photos" ON photos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create photos" ON photos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own photos" ON photos
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own photos" ON photos
  FOR DELETE USING (auth.uid() = user_id);

-- Followers policies
CREATE POLICY "Followers are viewable by everyone" ON followers
  FOR SELECT USING (true);

CREATE POLICY "Users can follow others" ON followers
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow others" ON followers
  FOR DELETE USING (auth.uid() = follower_id);

-- Likes policies
CREATE POLICY "Likes are viewable by everyone" ON likes
  FOR SELECT USING (true);

CREATE POLICY "Users can like content" ON likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike content" ON likes
  FOR DELETE USING (auth.uid() = user_id);

-- Comments policies
CREATE POLICY "Comments are viewable by everyone" ON comments
  FOR SELECT USING (true);

CREATE POLICY "Users can comment" ON comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" ON comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON comments
  FOR DELETE USING (auth.uid() = user_id);

-- User travel stats policies
CREATE POLICY "Travel stats are viewable by everyone" ON user_travel_stats
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own travel stats" ON user_travel_stats
  FOR ALL USING (auth.uid() = user_id);

-- Insert some sample countries
INSERT INTO countries (code, name, latitude, longitude) VALUES
('US', 'United States', 39.8283, -98.5795),
('CA', 'Canada', 56.1304, -106.3468),
('GB', 'United Kingdom', 55.3781, -3.4360),
('FR', 'France', 46.2276, 2.2137),
('DE', 'Germany', 51.1657, 10.4515),
('IT', 'Italy', 41.8719, 12.5674),
('ES', 'Spain', 40.4637, -3.7492),
('JP', 'Japan', 36.2048, 138.2529),
('AU', 'Australia', -25.2744, 133.7751),
('BR', 'Brazil', -14.2350, -51.9253);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_albums_updated_at BEFORE UPDATE ON albums
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_travel_stats_updated_at BEFORE UPDATE ON user_travel_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();