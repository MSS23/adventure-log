-- ============================================================================
-- Complete Schema Fix - Drop and recreate everything properly
-- ============================================================================

-- Drop existing tables and functions to start fresh
DROP TABLE IF EXISTS user_levels CASCADE;
DROP TABLE IF EXISTS level_requirements CASCADE;
DROP FUNCTION IF EXISTS get_user_level_info(UUID);
DROP FUNCTION IF EXISTS get_user_travel_years(UUID);
DROP FUNCTION IF EXISTS update_user_levels_updated_at();

-- ============================================================================
-- Create user_levels table
-- ============================================================================

CREATE TABLE user_levels (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_level INTEGER DEFAULT 1 NOT NULL,
  current_title VARCHAR(50) DEFAULT 'Explorer' NOT NULL,
  total_experience INTEGER DEFAULT 0 NOT NULL,
  albums_created INTEGER DEFAULT 0 NOT NULL,
  countries_visited INTEGER DEFAULT 0 NOT NULL,
  photos_uploaded INTEGER DEFAULT 0 NOT NULL,
  social_interactions INTEGER DEFAULT 0 NOT NULL,
  level_up_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  CONSTRAINT user_levels_level_positive CHECK (current_level > 0),
  CONSTRAINT user_levels_experience_positive CHECK (total_experience >= 0),
  CONSTRAINT user_levels_albums_positive CHECK (albums_created >= 0),
  CONSTRAINT user_levels_countries_positive CHECK (countries_visited >= 0),
  CONSTRAINT user_levels_photos_positive CHECK (photos_uploaded >= 0),
  CONSTRAINT user_levels_social_positive CHECK (social_interactions >= 0)
);

-- Create level_requirements table
CREATE TABLE level_requirements (
  level INTEGER PRIMARY KEY,
  title VARCHAR(50) NOT NULL,
  experience_required INTEGER NOT NULL,
  albums_required INTEGER DEFAULT 0 NOT NULL,
  countries_required INTEGER DEFAULT 0 NOT NULL,
  photos_required INTEGER DEFAULT 0 NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  CONSTRAINT level_requirements_level_positive CHECK (level > 0),
  CONSTRAINT level_requirements_experience_positive CHECK (experience_required >= 0),
  CONSTRAINT level_requirements_albums_positive CHECK (albums_required >= 0),
  CONSTRAINT level_requirements_countries_positive CHECK (countries_required >= 0),
  CONSTRAINT level_requirements_photos_positive CHECK (photos_required >= 0)
);

-- Insert level requirements
INSERT INTO level_requirements (level, title, experience_required, albums_required, countries_required, photos_required, description) VALUES
  (1, 'Explorer', 0, 0, 0, 0, 'Welcome to your adventure journey!'),
  (2, 'Wanderer', 100, 1, 1, 10, 'You''ve started exploring the world'),
  (3, 'Traveler', 300, 3, 2, 30, 'Your adventures are taking shape'),
  (4, 'Adventurer', 600, 5, 3, 60, 'A true adventurer emerges'),
  (5, 'Voyager', 1000, 8, 5, 100, 'Voyaging across continents'),
  (6, 'Globetrotter', 1500, 12, 8, 150, 'The world is your playground'),
  (7, 'Pathfinder', 2200, 18, 12, 220, 'Blazing new trails'),
  (8, 'Pioneer', 3000, 25, 15, 300, 'A pioneer of exploration'),
  (9, 'Legend', 4000, 35, 20, 400, 'Your adventures inspire others'),
  (10, 'Master Explorer', 5500, 50, 30, 550, 'Master of all adventures');

-- ============================================================================
-- Add missing columns to albums table (if they don't exist)
-- ============================================================================

DO $$
BEGIN
  -- Add location_country column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'albums' AND column_name = 'location_country'
  ) THEN
    ALTER TABLE albums ADD COLUMN location_country VARCHAR(100);
  END IF;

  -- Add location_city column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'albums' AND column_name = 'location_city'
  ) THEN
    ALTER TABLE albums ADD COLUMN location_city VARCHAR(200);
  END IF;
END $$;

-- ============================================================================
-- Create get_user_level_info function
-- ============================================================================

CREATE FUNCTION get_user_level_info(user_id_param UUID)
RETURNS TABLE (
  current_level INTEGER,
  current_title VARCHAR(50),
  total_experience INTEGER,
  albums_created INTEGER,
  countries_visited INTEGER,
  photos_uploaded INTEGER,
  next_level INTEGER,
  next_title VARCHAR(50),
  experience_to_next INTEGER,
  progress_percentage INTEGER
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  user_data RECORD;
  next_req RECORD;
BEGIN
  -- Get user's current level data
  SELECT
    ul.current_level,
    ul.current_title,
    ul.total_experience,
    ul.albums_created,
    ul.countries_visited,
    ul.photos_uploaded
  INTO user_data
  FROM user_levels ul
  WHERE ul.user_id = user_id_param;

  -- If user has no level data, return default
  IF NOT FOUND THEN
    RETURN QUERY SELECT
      1::INTEGER,
      'Explorer'::VARCHAR(50),
      0::INTEGER,
      0::INTEGER,
      0::INTEGER,
      0::INTEGER,
      2::INTEGER,
      'Wanderer'::VARCHAR(50),
      100::INTEGER,
      0::INTEGER;
    RETURN;
  END IF;

  -- Get next level requirements
  SELECT lr.level, lr.title, lr.experience_required
  INTO next_req
  FROM level_requirements lr
  WHERE lr.level = user_data.current_level + 1
  LIMIT 1;

  -- If no next level exists, return max level info
  IF NOT FOUND THEN
    RETURN QUERY SELECT
      user_data.current_level,
      user_data.current_title,
      user_data.total_experience,
      user_data.albums_created,
      user_data.countries_visited,
      user_data.photos_uploaded,
      user_data.current_level::INTEGER,
      user_data.current_title,
      0::INTEGER,
      100::INTEGER;
    RETURN;
  END IF;

  -- Calculate progress and return
  RETURN QUERY SELECT
    user_data.current_level,
    user_data.current_title,
    user_data.total_experience,
    user_data.albums_created,
    user_data.countries_visited,
    user_data.photos_uploaded,
    next_req.level,
    next_req.title,
    next_req.experience_required - user_data.total_experience,
    LEAST(100, ROUND((user_data.total_experience::DECIMAL / NULLIF(next_req.experience_required, 0)::DECIMAL) * 100))::INTEGER;
END;
$$;

-- ============================================================================
-- Create get_user_travel_years function
-- ============================================================================

CREATE FUNCTION get_user_travel_years(p_user_id UUID)
RETURNS TABLE (year INTEGER, album_count BIGINT)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID cannot be null';
    END IF;

    RETURN QUERY
    SELECT
        EXTRACT(YEAR FROM a.created_at)::INTEGER as year,
        COUNT(*)::BIGINT as album_count
    FROM albums a
    WHERE
        a.user_id = p_user_id
        AND a.latitude IS NOT NULL
        AND a.longitude IS NOT NULL
    GROUP BY EXTRACT(YEAR FROM a.created_at)
    ORDER BY year DESC;
END;
$$;

-- ============================================================================
-- Create updated_at trigger for user_levels
-- ============================================================================

CREATE FUNCTION update_user_levels_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_user_levels_updated_at_trigger
  BEFORE UPDATE ON user_levels
  FOR EACH ROW
  EXECUTE FUNCTION update_user_levels_updated_at();

-- ============================================================================
-- Enable RLS and create policies
-- ============================================================================

ALTER TABLE user_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE level_requirements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_levels
CREATE POLICY "Users can view their own level"
  ON user_levels FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own level"
  ON user_levels FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own level"
  ON user_levels FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for level_requirements (public read)
CREATE POLICY "Anyone can view level requirements"
  ON level_requirements FOR SELECT
  USING (true);

-- ============================================================================
-- Create indexes and grant permissions
-- ============================================================================

CREATE INDEX idx_user_levels_user_id ON user_levels(user_id);
CREATE INDEX idx_user_levels_level ON user_levels(current_level);
CREATE INDEX idx_level_requirements_level ON level_requirements(level);

GRANT SELECT, INSERT, UPDATE ON user_levels TO authenticated;
GRANT SELECT ON level_requirements TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_user_level_info(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_travel_years(UUID) TO authenticated;

-- Done!
COMMENT ON TABLE user_levels IS 'User gamification and leveling system';
COMMENT ON TABLE level_requirements IS 'Level requirements and thresholds';
COMMENT ON FUNCTION get_user_level_info(UUID) IS 'Get user level info with progress to next level';
COMMENT ON FUNCTION get_user_travel_years(UUID) IS 'Get years where user has albums with location data';
