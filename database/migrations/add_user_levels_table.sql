-- Add user_levels table for gamification/leveling system
-- This table tracks user progression and achievements

-- Create user_levels table
CREATE TABLE IF NOT EXISTS user_levels (
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

-- Create level_requirements table for defining level thresholds
CREATE TABLE IF NOT EXISTS level_requirements (
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

-- Insert default level requirements
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
  (10, 'Master Explorer', 5500, 50, 30, 550, 'Master of all adventures')
ON CONFLICT (level) DO NOTHING;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_user_levels_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_levels_updated_at_trigger
  BEFORE UPDATE ON user_levels
  FOR EACH ROW
  EXECUTE FUNCTION update_user_levels_updated_at();

-- Function to get user level info with progress
CREATE OR REPLACE FUNCTION get_user_level_info(user_id_param UUID)
RETURNS TABLE (
  current_level INTEGER,
  current_title VARCHAR(50),
  total_experience INTEGER,
  next_level INTEGER,
  next_title VARCHAR(50),
  experience_to_next INTEGER,
  progress_percentage INTEGER
) AS $$
DECLARE
  user_data RECORD;
  next_req RECORD;
BEGIN
  -- Get user's current level data
  SELECT ul.current_level, ul.current_title, ul.total_experience
  INTO user_data
  FROM user_levels ul
  WHERE ul.user_id = user_id_param;

  -- If user has no level data, return default
  IF NOT FOUND THEN
    RETURN QUERY SELECT
      1::INTEGER,
      'Explorer'::VARCHAR(50),
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
      user_data.current_level::INTEGER,
      user_data.current_title,
      0::INTEGER,
      100::INTEGER;
    RETURN;
  END IF;

  -- Calculate progress
  RETURN QUERY SELECT
    user_data.current_level,
    user_data.current_title,
    user_data.total_experience,
    next_req.level,
    next_req.title,
    next_req.experience_required - user_data.total_experience,
    LEAST(100, ROUND((user_data.total_experience::DECIMAL / NULLIF(next_req.experience_required, 0)::DECIMAL) * 100))::INTEGER;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user level based on current stats
CREATE OR REPLACE FUNCTION update_user_level(user_id_param UUID)
RETURNS TABLE (
  new_level INTEGER,
  new_title VARCHAR(50),
  level_up BOOLEAN
) AS $$
DECLARE
  current_stats RECORD;
  highest_level RECORD;
  old_level INTEGER;
BEGIN
  -- Get current user stats
  SELECT
    COALESCE(ul.current_level, 1) as level,
    COALESCE(ul.total_experience, 0) as exp,
    COALESCE(ul.albums_created, 0) as albums,
    COALESCE(ul.countries_visited, 0) as countries,
    COALESCE(ul.photos_uploaded, 0) as photos
  INTO current_stats
  FROM user_levels ul
  WHERE ul.user_id = user_id_param;

  old_level := COALESCE(current_stats.level, 1);

  -- Find highest level user qualifies for
  SELECT lr.level, lr.title
  INTO highest_level
  FROM level_requirements lr
  WHERE
    lr.experience_required <= COALESCE(current_stats.exp, 0)
    AND lr.albums_required <= COALESCE(current_stats.albums, 0)
    AND lr.countries_required <= COALESCE(current_stats.countries, 0)
    AND lr.photos_required <= COALESCE(current_stats.photos, 0)
  ORDER BY lr.level DESC
  LIMIT 1;

  -- Update user level if changed
  IF highest_level.level IS NOT NULL AND highest_level.level != old_level THEN
    INSERT INTO user_levels (
      user_id,
      current_level,
      current_title,
      level_up_date
    ) VALUES (
      user_id_param,
      highest_level.level,
      highest_level.title,
      timezone('utc'::text, now())
    )
    ON CONFLICT (user_id) DO UPDATE SET
      current_level = highest_level.level,
      current_title = highest_level.title,
      level_up_date = timezone('utc'::text, now()),
      updated_at = timezone('utc'::text, now());

    RETURN QUERY SELECT
      highest_level.level,
      highest_level.title,
      TRUE;
  ELSE
    RETURN QUERY SELECT
      COALESCE(highest_level.level, old_level),
      COALESCE(highest_level.title, 'Explorer'::VARCHAR(50)),
      FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment user stats
CREATE OR REPLACE FUNCTION increment_user_stat(
  user_id_param UUID,
  stat_type TEXT,
  increment_by INTEGER DEFAULT 1
)
RETURNS VOID AS $$
BEGIN
  -- Initialize user level if doesn't exist
  INSERT INTO user_levels (user_id)
  VALUES (user_id_param)
  ON CONFLICT (user_id) DO NOTHING;

  -- Update the specific stat
  CASE stat_type
    WHEN 'albums_created' THEN
      UPDATE user_levels
      SET albums_created = albums_created + increment_by,
          total_experience = total_experience + (increment_by * 10)
      WHERE user_id = user_id_param;
    WHEN 'countries_visited' THEN
      UPDATE user_levels
      SET countries_visited = countries_visited + increment_by,
          total_experience = total_experience + (increment_by * 20)
      WHERE user_id = user_id_param;
    WHEN 'photos_uploaded' THEN
      UPDATE user_levels
      SET photos_uploaded = photos_uploaded + increment_by,
          total_experience = total_experience + (increment_by * 2)
      WHERE user_id = user_id_param;
    WHEN 'social_interactions' THEN
      UPDATE user_levels
      SET social_interactions = social_interactions + increment_by,
          total_experience = total_experience + (increment_by * 5)
      WHERE user_id = user_id_param;
  END CASE;

  -- Check and update level
  PERFORM update_user_level(user_id_param);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_levels_user_id ON user_levels(user_id);
CREATE INDEX IF NOT EXISTS idx_user_levels_level ON user_levels(current_level);
CREATE INDEX IF NOT EXISTS idx_level_requirements_level ON level_requirements(level);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON user_levels TO authenticated;
GRANT SELECT ON level_requirements TO authenticated, anon;
