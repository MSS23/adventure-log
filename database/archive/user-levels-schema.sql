-- User Levels System Schema Update
-- Add user level tracking and progression system

-- =============================================================================
-- USER LEVELS TABLE
-- =============================================================================

-- Create user_levels table to track progression
CREATE TABLE IF NOT EXISTS user_levels (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  current_level INTEGER DEFAULT 1 NOT NULL,
  current_title VARCHAR(100) DEFAULT 'Explorer' NOT NULL,
  total_experience INTEGER DEFAULT 0 NOT NULL,
  albums_created INTEGER DEFAULT 0 NOT NULL,
  countries_visited INTEGER DEFAULT 0 NOT NULL,
  photos_uploaded INTEGER DEFAULT 0 NOT NULL,
  social_interactions INTEGER DEFAULT 0 NOT NULL,
  level_up_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  CONSTRAINT user_levels_positive_values CHECK (
    current_level >= 1 AND total_experience >= 0 AND
    albums_created >= 0 AND countries_visited >= 0 AND
    photos_uploaded >= 0 AND social_interactions >= 0
  )
);

-- Enable RLS on user_levels table
ALTER TABLE user_levels ENABLE ROW LEVEL SECURITY;

-- User levels policies
CREATE POLICY "Users can view their own level data" ON user_levels
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own level data" ON user_levels
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own level data" ON user_levels
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_levels_user_id ON user_levels(user_id);
CREATE INDEX IF NOT EXISTS idx_user_levels_current_level ON user_levels(current_level);

-- =============================================================================
-- LEVEL PROGRESSION DEFINITIONS
-- =============================================================================

-- Create level requirements lookup table
CREATE TABLE IF NOT EXISTS level_requirements (
  level INTEGER PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  experience_required INTEGER NOT NULL,
  albums_required INTEGER DEFAULT 0,
  countries_required INTEGER DEFAULT 0,
  photos_required INTEGER DEFAULT 0,
  description TEXT
);

-- Insert level definitions
INSERT INTO level_requirements (level, title, experience_required, albums_required, countries_required, photos_required, description) VALUES
(1, 'Explorer', 0, 0, 0, 0, 'Welcome to your adventure journey!'),
(2, 'Wanderer', 100, 2, 1, 10, 'You''ve started exploring the world'),
(3, 'Traveler', 250, 5, 2, 25, 'A seasoned traveler with multiple destinations'),
(4, 'Adventurer', 500, 10, 3, 50, 'Your wanderlust is taking you places'),
(5, 'Globetrotter', 1000, 15, 5, 100, 'You''re becoming a true world explorer'),
(6, 'World Explorer', 2000, 25, 8, 200, 'The world is your playground'),
(7, 'Travel Master', 3500, 40, 12, 350, 'Few places remain unexplored by you'),
(8, 'Adventure Legend', 5500, 60, 18, 500, 'Your adventures inspire others'),
(9, 'Globe Master', 8000, 80, 25, 750, 'You''ve mastered the art of exploration'),
(10, 'Ultimate Explorer', 12000, 100, 35, 1000, 'The pinnacle of world exploration')
ON CONFLICT (level) DO UPDATE SET
  title = EXCLUDED.title,
  experience_required = EXCLUDED.experience_required,
  albums_required = EXCLUDED.albums_required,
  countries_required = EXCLUDED.countries_required,
  photos_required = EXCLUDED.photos_required,
  description = EXCLUDED.description;

-- =============================================================================
-- FUNCTIONS FOR LEVEL PROGRESSION
-- =============================================================================

-- Function to calculate experience points
CREATE OR REPLACE FUNCTION calculate_user_experience(user_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  exp_points INTEGER := 0;
  albums_count INTEGER := 0;
  countries_count INTEGER := 0;
  photos_count INTEGER := 0;
  social_count INTEGER := 0;
BEGIN
  -- Count user's achievements
  SELECT
    COUNT(DISTINCT a.id),
    COUNT(DISTINCT a.country_code),
    COUNT(DISTINCT p.id),
    0 -- Social interactions will be calculated later
  INTO albums_count, countries_count, photos_count, social_count
  FROM albums a
  LEFT JOIN photos p ON a.id = p.album_id
  WHERE a.user_id = user_id_param;

  -- Calculate experience points based on activities
  exp_points :=
    (albums_count * 50) +          -- 50 XP per album
    (countries_count * 100) +      -- 100 XP per country
    (photos_count * 5) +           -- 5 XP per photo
    (social_count * 10);           -- 10 XP per social interaction

  RETURN exp_points;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user level based on experience
CREATE OR REPLACE FUNCTION update_user_level(user_id_param UUID)
RETURNS TABLE (
  new_level INTEGER,
  new_title VARCHAR(100),
  level_up BOOLEAN
) AS $$
DECLARE
  current_exp INTEGER;
  current_user_level INTEGER;
  new_user_level INTEGER;
  new_user_title VARCHAR(100);
  albums_count INTEGER;
  countries_count INTEGER;
  photos_count INTEGER;
  level_changed BOOLEAN := FALSE;
BEGIN
  -- Calculate current experience
  current_exp := calculate_user_experience(user_id_param);

  -- Get current stats
  SELECT
    COUNT(DISTINCT a.id),
    COUNT(DISTINCT a.country_code),
    COUNT(DISTINCT p.id)
  INTO albums_count, countries_count, photos_count
  FROM albums a
  LEFT JOIN photos p ON a.id = p.album_id
  WHERE a.user_id = user_id_param;

  -- Get current level
  SELECT current_level INTO current_user_level
  FROM user_levels
  WHERE user_id = user_id_param;

  -- If no level record exists, create one
  IF current_user_level IS NULL THEN
    INSERT INTO user_levels (
      user_id, current_level, current_title, total_experience,
      albums_created, countries_visited, photos_uploaded
    ) VALUES (
      user_id_param, 1, 'Explorer', current_exp,
      albums_count, countries_count, photos_count
    );
    current_user_level := 1;
  END IF;

  -- Find the highest level user qualifies for
  SELECT level, title INTO new_user_level, new_user_title
  FROM level_requirements
  WHERE experience_required <= current_exp
    AND albums_required <= albums_count
    AND countries_required <= countries_count
    AND photos_required <= photos_count
  ORDER BY level DESC
  LIMIT 1;

  -- If no level found, default to level 1
  IF new_user_level IS NULL THEN
    new_user_level := 1;
    new_user_title := 'Explorer';
  END IF;

  -- Check if level changed
  IF new_user_level > current_user_level THEN
    level_changed := TRUE;
  END IF;

  -- Update user level data
  UPDATE user_levels SET
    current_level = new_user_level,
    current_title = new_user_title,
    total_experience = current_exp,
    albums_created = albums_count,
    countries_visited = countries_count,
    photos_uploaded = photos_count,
    level_up_date = CASE WHEN level_changed THEN timezone('utc'::text, now()) ELSE level_up_date END,
    updated_at = timezone('utc'::text, now())
  WHERE user_id = user_id_param;

  RETURN QUERY SELECT new_user_level, new_user_title, level_changed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- TRIGGERS FOR AUTOMATIC LEVEL UPDATES
-- =============================================================================

-- Function to handle level updates after album creation
CREATE OR REPLACE FUNCTION trigger_update_user_level()
RETURNS TRIGGER AS $$
BEGIN
  -- Update user level after any album/photo changes
  PERFORM update_user_level(COALESCE(NEW.user_id, OLD.user_id));
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers for automatic level updates
CREATE TRIGGER update_level_after_album_insert
  AFTER INSERT ON albums
  FOR EACH ROW EXECUTE FUNCTION trigger_update_user_level();

CREATE TRIGGER update_level_after_album_update
  AFTER UPDATE ON albums
  FOR EACH ROW EXECUTE FUNCTION trigger_update_user_level();

CREATE TRIGGER update_level_after_album_delete
  AFTER DELETE ON albums
  FOR EACH ROW EXECUTE FUNCTION trigger_update_user_level();

CREATE TRIGGER update_level_after_photo_insert
  AFTER INSERT ON photos
  FOR EACH ROW EXECUTE FUNCTION trigger_update_user_level();

CREATE TRIGGER update_level_after_photo_delete
  AFTER DELETE ON photos
  FOR EACH ROW EXECUTE FUNCTION trigger_update_user_level();

-- =============================================================================
-- UPDATE PROFILE CREATION TO INITIALIZE LEVELS
-- =============================================================================

-- Update the handle_new_user function to create initial level data
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, username, display_name, privacy_level, created_at, updated_at)
  VALUES (
    new.id,
    'user_' || substr(replace(new.id::text, '-', ''), 1, 8),
    COALESCE(new.raw_user_meta_data->>'full_name', 'New User'),
    'public',
    now(),
    now()
  );

  -- Initialize user level as Level 1 Explorer
  INSERT INTO public.user_levels (user_id, current_level, current_title, total_experience)
  VALUES (new.id, 1, 'Explorer', 0);

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- UTILITY FUNCTIONS
-- =============================================================================

-- Function to get user level info
CREATE OR REPLACE FUNCTION get_user_level_info(user_id_param UUID)
RETURNS TABLE (
  current_level INTEGER,
  current_title VARCHAR(100),
  total_experience INTEGER,
  next_level INTEGER,
  next_title VARCHAR(100),
  experience_to_next INTEGER,
  progress_percentage DECIMAL(5,2)
) AS $$
DECLARE
  level_info RECORD;
  next_level_info RECORD;
BEGIN
  -- Get current level info
  SELECT ul.current_level, ul.current_title, ul.total_experience
  INTO level_info
  FROM user_levels ul
  WHERE ul.user_id = user_id_param;

  -- Get next level info
  SELECT lr.level, lr.title, lr.experience_required
  INTO next_level_info
  FROM level_requirements lr
  WHERE lr.level = level_info.current_level + 1;

  -- Calculate progress
  RETURN QUERY SELECT
    level_info.current_level,
    level_info.current_title,
    level_info.total_experience,
    COALESCE(next_level_info.level, level_info.current_level),
    COALESCE(next_level_info.title, 'Max Level'),
    CASE
      WHEN next_level_info.experience_required IS NOT NULL
      THEN next_level_info.experience_required - level_info.total_experience
      ELSE 0
    END,
    CASE
      WHEN next_level_info.experience_required IS NOT NULL
      THEN ROUND(
        (level_info.total_experience::DECIMAL / next_level_info.experience_required::DECIMAL) * 100, 2
      )
      ELSE 100.00
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT ON level_requirements TO postgres, anon, authenticated, service_role;
GRANT ALL ON user_levels TO postgres, anon, authenticated, service_role;

-- Add updated_at trigger
CREATE TRIGGER update_user_levels_updated_at
  BEFORE UPDATE ON user_levels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ User levels system installed successfully!';
  RAISE NOTICE '📈 Level definitions loaded: %', (SELECT COUNT(*) FROM level_requirements);
  RAISE NOTICE '🎯 Ready to track user progression!';
END
$$;