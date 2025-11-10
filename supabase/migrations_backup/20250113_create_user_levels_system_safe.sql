-- Migration: User Levels & Gamification System (Safe Version)
-- Created: 2025-01-13
-- Description: Complete user leveling system with defensive checks for users table

-- =============================================================================
-- SAFETY CHECK: Ensure users table exists
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users'
  ) THEN
    RAISE EXCEPTION 'The users table does not exist. Please run migration 20250107_fix_users_profiles_schema.sql first.';
  END IF;
END $$;

-- =============================================================================
-- TABLES
-- =============================================================================

-- Create level_requirements table first (no dependencies)
CREATE TABLE IF NOT EXISTS level_requirements (
  level integer PRIMARY KEY CHECK (level >= 1),
  title text NOT NULL,
  experience_required integer NOT NULL DEFAULT 0 CHECK (experience_required >= 0),
  albums_required integer NOT NULL DEFAULT 0 CHECK (albums_required >= 0),
  countries_required integer NOT NULL DEFAULT 0 CHECK (countries_required >= 0),
  photos_required integer NOT NULL DEFAULT 0 CHECK (photos_required >= 0),
  description text
);

-- Create user_levels table with foreign key to users
CREATE TABLE IF NOT EXISTS user_levels (
  user_id uuid PRIMARY KEY,
  current_level integer NOT NULL DEFAULT 1 CHECK (current_level >= 1),
  current_title text NOT NULL DEFAULT 'Explorer',
  total_experience integer NOT NULL DEFAULT 0 CHECK (total_experience >= 0),
  albums_created integer NOT NULL DEFAULT 0 CHECK (albums_created >= 0),
  countries_visited integer NOT NULL DEFAULT 0 CHECK (countries_visited >= 0),
  photos_uploaded integer NOT NULL DEFAULT 0 CHECK (photos_uploaded >= 0),
  social_interactions integer NOT NULL DEFAULT 0 CHECK (social_interactions >= 0),
  level_up_date timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_levels_user_id_fkey'
  ) THEN
    ALTER TABLE user_levels
    ADD CONSTRAINT user_levels_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_user_levels_level ON user_levels(current_level);
CREATE INDEX IF NOT EXISTS idx_user_levels_experience ON user_levels(total_experience DESC);
CREATE INDEX IF NOT EXISTS idx_user_levels_updated_at ON user_levels(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_level_requirements_level ON level_requirements(level);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

ALTER TABLE user_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE level_requirements ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view level requirements" ON level_requirements;
DROP POLICY IF EXISTS "Users can view their own level" ON user_levels;
DROP POLICY IF EXISTS "Users can view public profile levels" ON user_levels;
DROP POLICY IF EXISTS "System can insert user levels" ON user_levels;
DROP POLICY IF EXISTS "Users can update their own level" ON user_levels;

-- Policy: Users can view all level requirements (public data)
CREATE POLICY "Anyone can view level requirements"
  ON level_requirements FOR SELECT
  USING (true);

-- Policy: Users can view their own level data
CREATE POLICY "Users can view their own level"
  ON user_levels FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can view levels of public profiles
CREATE POLICY "Users can view public profile levels"
  ON user_levels FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = user_id
      AND users.privacy_level = 'public'
    )
  );

-- Policy: System can insert new user levels (via trigger/function)
CREATE POLICY "System can insert user levels"
  ON user_levels FOR INSERT
  WITH CHECK (true);

-- Policy: System and users can update their own levels
CREATE POLICY "Users can update their own level"
  ON user_levels FOR UPDATE
  USING (auth.uid() = user_id);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Function: Calculate user statistics from database
CREATE OR REPLACE FUNCTION calculate_user_stats(user_id_param uuid)
RETURNS TABLE (
  albums_count integer,
  countries_count integer,
  photos_count integer,
  social_count integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Count published albums
    (SELECT COUNT(*)::integer FROM albums WHERE albums.user_id = user_id_param AND albums.status != 'draft')::integer,
    -- Count distinct countries visited (using location_name if country_code not available)
    (SELECT COUNT(DISTINCT COALESCE(country_code,
      NULLIF(TRIM(SPLIT_PART(location_name, ',', -1)), '')))::integer
     FROM albums
     WHERE albums.user_id = user_id_param
     AND (country_code IS NOT NULL OR location_name IS NOT NULL))::integer,
    -- Count photos uploaded
    (SELECT COUNT(*)::integer FROM photos WHERE photos.user_id = user_id_param)::integer,
    -- Count social interactions (likes given + comments made + followers)
    (
      COALESCE((SELECT COUNT(*)::integer FROM likes WHERE likes.user_id = user_id_param), 0) +
      COALESCE((SELECT COUNT(*)::integer FROM comments WHERE comments.user_id = user_id_param), 0) +
      COALESCE((SELECT COUNT(*)::integer FROM follows WHERE follows.follower_id = user_id_param AND follows.status = 'accepted'), 0)
    )::integer;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Calculate experience points based on user activity
CREATE OR REPLACE FUNCTION calculate_user_experience(user_id_param uuid)
RETURNS integer AS $$
DECLARE
  total_exp integer := 0;
  albums_count integer;
  countries_count integer;
  photos_count integer;
  social_count integer;
BEGIN
  -- Get user stats
  SELECT * INTO albums_count, countries_count, photos_count, social_count
  FROM calculate_user_stats(user_id_param);

  -- Calculate experience points
  -- Albums: 100 XP each
  total_exp := total_exp + (albums_count * 100);

  -- Countries: 200 XP each (exploring new places is valuable)
  total_exp := total_exp + (countries_count * 200);

  -- Photos: 10 XP each
  total_exp := total_exp + (photos_count * 10);

  -- Social interactions: 5 XP each
  total_exp := total_exp + (social_count * 5);

  RETURN total_exp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Determine user level based on experience and requirements
CREATE OR REPLACE FUNCTION determine_user_level(
  total_exp integer,
  albums_count integer,
  countries_count integer,
  photos_count integer
)
RETURNS TABLE (
  level integer,
  title text
) AS $$
BEGIN
  -- Find the highest level that user qualifies for
  RETURN QUERY
  SELECT lr.level, lr.title
  FROM level_requirements lr
  WHERE
    lr.experience_required <= total_exp
    AND lr.albums_required <= albums_count
    AND lr.countries_required <= countries_count
    AND lr.photos_required <= photos_count
  ORDER BY lr.level DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get user level info with progress to next level
CREATE OR REPLACE FUNCTION get_user_level_info(user_id_param uuid)
RETURNS TABLE (
  current_level integer,
  current_title text,
  total_experience integer,
  next_level integer,
  next_title text,
  experience_to_next integer,
  progress_percentage numeric
) AS $$
DECLARE
  user_level_record RECORD;
  next_level_record RECORD;
  exp_needed integer;
  current_level_exp integer;
BEGIN
  -- Get current user level data
  SELECT ul.* INTO user_level_record
  FROM user_levels ul
  WHERE ul.user_id = user_id_param;

  -- If no record exists, return default level 1 data
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 1, 'Explorer'::text, 0,
           2,
           COALESCE((SELECT title FROM level_requirements WHERE level = 2), 'Adventurer'),
           COALESCE((SELECT experience_required FROM level_requirements WHERE level = 2), 500),
           0.0::numeric;
    RETURN;
  END IF;

  -- Get next level requirements
  SELECT lr.* INTO next_level_record
  FROM level_requirements lr
  WHERE lr.level = user_level_record.current_level + 1
  LIMIT 1;

  -- If at max level, return data indicating max level
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT
      user_level_record.current_level,
      user_level_record.current_title,
      user_level_record.total_experience,
      user_level_record.current_level,
      user_level_record.current_title,
      0,
      100.0::numeric;
    RETURN;
  END IF;

  -- Get experience required for current level
  SELECT COALESCE(experience_required, 0) INTO current_level_exp
  FROM level_requirements
  WHERE level = user_level_record.current_level;

  -- Calculate experience needed and progress
  exp_needed := next_level_record.experience_required - user_level_record.total_experience;

  RETURN QUERY
  SELECT
    user_level_record.current_level,
    user_level_record.current_title,
    user_level_record.total_experience,
    next_level_record.level,
    next_level_record.title,
    GREATEST(exp_needed, 0),
    CASE
      WHEN next_level_record.experience_required = current_level_exp THEN 100.0::numeric
      ELSE LEAST(
        ((user_level_record.total_experience - current_level_exp)::numeric /
         NULLIF((next_level_record.experience_required - current_level_exp), 0)::numeric * 100),
        100.0::numeric
      )
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Update user level based on current activity
CREATE OR REPLACE FUNCTION update_user_level(user_id_param uuid)
RETURNS TABLE (
  new_level integer,
  new_title text,
  level_up boolean
) AS $$
DECLARE
  old_level integer;
  new_level_num integer;
  new_level_title text;
  total_exp integer;
  albums_count integer;
  countries_count integer;
  photos_count integer;
  social_count integer;
BEGIN
  -- Get current level
  SELECT current_level INTO old_level
  FROM user_levels
  WHERE user_id = user_id_param;

  -- If no record exists, create one with default values
  IF NOT FOUND THEN
    old_level := 1;
  END IF;

  -- Calculate current stats
  SELECT * INTO albums_count, countries_count, photos_count, social_count
  FROM calculate_user_stats(user_id_param);

  -- Calculate experience
  total_exp := calculate_user_experience(user_id_param);

  -- Determine new level
  SELECT dl.level, dl.title INTO new_level_num, new_level_title
  FROM determine_user_level(total_exp, albums_count, countries_count, photos_count) dl;

  -- Default to level 1 if no level found
  IF new_level_num IS NULL THEN
    new_level_num := 1;
    new_level_title := 'Explorer';
  END IF;

  -- Insert or update user_levels
  INSERT INTO user_levels (
    user_id,
    current_level,
    current_title,
    total_experience,
    albums_created,
    countries_visited,
    photos_uploaded,
    social_interactions,
    level_up_date,
    updated_at
  )
  VALUES (
    user_id_param,
    new_level_num,
    new_level_title,
    total_exp,
    albums_count,
    countries_count,
    photos_count,
    social_count,
    CASE WHEN new_level_num > old_level THEN now() ELSE (SELECT level_up_date FROM user_levels WHERE user_id = user_id_param) END,
    now()
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    current_level = EXCLUDED.current_level,
    current_title = EXCLUDED.current_title,
    total_experience = EXCLUDED.total_experience,
    albums_created = EXCLUDED.albums_created,
    countries_visited = EXCLUDED.countries_visited,
    photos_uploaded = EXCLUDED.photos_uploaded,
    social_interactions = EXCLUDED.social_interactions,
    level_up_date = CASE
      WHEN EXCLUDED.current_level > user_levels.current_level THEN now()
      ELSE user_levels.level_up_date
    END,
    updated_at = now();

  RETURN QUERY
  SELECT
    new_level_num,
    new_level_title,
    (new_level_num > old_level);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS user_levels_updated_at ON user_levels;
DROP TRIGGER IF EXISTS initialize_user_level_on_signup ON users;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_levels_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_levels_updated_at
  BEFORE UPDATE ON user_levels
  FOR EACH ROW
  EXECUTE FUNCTION update_user_levels_updated_at();

-- Trigger to initialize user level on user creation
CREATE OR REPLACE FUNCTION initialize_user_level()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_levels (
    user_id,
    current_level,
    current_title,
    total_experience,
    albums_created,
    countries_visited,
    photos_uploaded,
    social_interactions,
    level_up_date,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    1,
    'Explorer',
    0,
    0,
    0,
    0,
    0,
    now(),
    now(),
    now()
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on users table
CREATE TRIGGER initialize_user_level_on_signup
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION initialize_user_level();

-- =============================================================================
-- DEFAULT DATA: LEVEL REQUIREMENTS
-- =============================================================================

-- Insert default level requirements (10 levels)
INSERT INTO level_requirements (level, title, experience_required, albums_required, countries_required, photos_required, description)
VALUES
  (1, 'Explorer', 0, 0, 0, 0, 'Welcome to your adventure journey! Start exploring the world.'),
  (2, 'Wanderer', 500, 3, 1, 20, 'You''ve taken your first steps into the world of travel.'),
  (3, 'Adventurer', 1500, 8, 3, 50, 'Your curiosity drives you to discover new places.'),
  (4, 'Voyager', 3000, 15, 5, 100, 'You''re building an impressive collection of travel memories.'),
  (5, 'Navigator', 5500, 25, 8, 200, 'You navigate the world with growing confidence and experience.'),
  (6, 'Trailblazer', 9000, 40, 12, 350, 'You''re forging your own path through the world.'),
  (7, 'Globetrotter', 14000, 60, 18, 550, 'The world is truly your playground now.'),
  (8, 'World Traveler', 21000, 85, 25, 800, 'You''ve seen more of the world than most ever will.'),
  (9, 'Explorer Elite', 30000, 120, 35, 1200, 'Your travels inspire others to explore.'),
  (10, 'Legend', 45000, 175, 50, 1750, 'You''ve achieved legendary status as a world explorer!')
ON CONFLICT (level) DO UPDATE SET
  title = EXCLUDED.title,
  experience_required = EXCLUDED.experience_required,
  albums_required = EXCLUDED.albums_required,
  countries_required = EXCLUDED.countries_required,
  photos_required = EXCLUDED.photos_required,
  description = EXCLUDED.description;

-- =============================================================================
-- INITIALIZE EXISTING USERS
-- =============================================================================

-- Create user_levels entries for all existing users
INSERT INTO user_levels (user_id, current_level, current_title, total_experience, albums_created, countries_visited, photos_uploaded, social_interactions)
SELECT
  u.id,
  1,
  'Explorer',
  0,
  0,
  0,
  0,
  0
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM user_levels ul WHERE ul.user_id = u.id
)
ON CONFLICT (user_id) DO NOTHING;

-- Update levels for all existing users based on their current activity
-- This may take a moment for large databases
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT id FROM users LOOP
    PERFORM update_user_level(user_record.id);
  END LOOP;
END $$;

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

GRANT SELECT ON level_requirements TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON user_levels TO authenticated;

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE user_levels IS 'Tracks individual user progression through the leveling system';
COMMENT ON TABLE level_requirements IS 'Defines requirements for each level in the progression system';
COMMENT ON COLUMN user_levels.total_experience IS 'Total experience points earned from all activities';
COMMENT ON COLUMN user_levels.albums_created IS 'Number of albums created by the user';
COMMENT ON COLUMN user_levels.countries_visited IS 'Number of unique countries visited';
COMMENT ON COLUMN user_levels.photos_uploaded IS 'Total number of photos uploaded';
COMMENT ON COLUMN user_levels.social_interactions IS 'Count of social activities (likes, comments, follows)';
COMMENT ON COLUMN user_levels.level_up_date IS 'Date when user last leveled up';
COMMENT ON FUNCTION get_user_level_info IS 'Returns detailed level progression info including progress to next level';
COMMENT ON FUNCTION update_user_level IS 'Recalculates and updates user level based on current activity';
COMMENT ON FUNCTION calculate_user_stats IS 'Calculates user statistics from database tables';
COMMENT ON FUNCTION calculate_user_experience IS 'Calculates total experience points based on user activity';
COMMENT ON FUNCTION determine_user_level IS 'Determines appropriate level based on stats and requirements';
