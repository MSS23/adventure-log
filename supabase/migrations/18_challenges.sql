-- Travel Challenges system
-- Challenges provide goals that drive content creation and engagement

CREATE TABLE IF NOT EXISTS challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🏆',
  badge_color TEXT NOT NULL DEFAULT '#14b8a6',
  category TEXT NOT NULL DEFAULT 'exploration',
  target_count INTEGER NOT NULL,
  target_type TEXT NOT NULL, -- 'countries', 'albums', 'photos', 'followers', 'streak', 'continents'
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, challenge_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_challenges_user ON user_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_challenges_completed ON user_challenges(completed_at) WHERE completed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_challenges_active ON challenges(is_active, sort_order);

-- RLS
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_challenges ENABLE ROW LEVEL SECURITY;

-- Anyone can read challenges
CREATE POLICY "Challenges are readable by all" ON challenges
  FOR SELECT USING (true);

-- Users manage their own challenge progress
CREATE POLICY "Users can read own challenge progress" ON user_challenges
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own challenge progress" ON user_challenges
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own challenge progress" ON user_challenges
  FOR UPDATE USING ((select auth.uid()) = user_id);

-- Seed initial challenges
INSERT INTO challenges (title, description, icon, badge_color, category, target_count, target_type, sort_order) VALUES
  ('First Steps', 'Create your first travel album', '🎒', '#10b981', 'exploration', 1, 'albums', 1),
  ('Weekend Explorer', 'Log 5 travel adventures', '🗺️', '#06b6d4', 'exploration', 5, 'albums', 2),
  ('Storyteller', 'Share 25 travel albums', '📖', '#8b5cf6', 'exploration', 25, 'albums', 3),
  ('Shutterbug', 'Upload 100 travel photos', '📸', '#f59e0b', 'photography', 100, 'photos', 4),
  ('Master Photographer', 'Capture 500 moments', '🎞️', '#ef4444', 'photography', 500, 'photos', 5),
  ('Country Hopper', 'Visit 5 different countries', '✈️', '#3b82f6', 'exploration', 5, 'countries', 6),
  ('Globe Trotter', 'Explore 10 countries', '🌍', '#14b8a6', 'exploration', 10, 'countries', 7),
  ('World Citizen', 'Visit 25 countries', '🌐', '#7c3aed', 'exploration', 25, 'countries', 8),
  ('Social Butterfly', 'Gain 10 followers', '🦋', '#ec4899', 'social', 10, 'followers', 9),
  ('Community Leader', 'Build a following of 50', '👥', '#f43f5e', 'social', 50, 'followers', 10),
  ('Dedicated Traveler', 'Maintain a 7-day streak', '🔥', '#f97316', 'engagement', 7, 'streak', 11),
  ('Streak Master', 'Keep a 30-day activity streak', '⚡', '#eab308', 'engagement', 30, 'streak', 12)
ON CONFLICT DO NOTHING;

-- Function to update challenge progress for a user
CREATE OR REPLACE FUNCTION update_challenge_progress(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_challenge RECORD;
  v_current_value INTEGER;
BEGIN
  FOR v_challenge IN SELECT * FROM challenges WHERE is_active = true
  LOOP
    -- Calculate current value based on target_type
    CASE v_challenge.target_type
      WHEN 'albums' THEN
        SELECT COUNT(*)::INTEGER INTO v_current_value
        FROM albums WHERE user_id = p_user_id AND (status IS NULL OR status = 'published');
      WHEN 'photos' THEN
        SELECT COUNT(*)::INTEGER INTO v_current_value
        FROM photos p JOIN albums a ON p.album_id = a.id WHERE a.user_id = p_user_id;
      WHEN 'countries' THEN
        SELECT COUNT(DISTINCT country_code)::INTEGER INTO v_current_value
        FROM albums WHERE user_id = p_user_id AND country_code IS NOT NULL;
      WHEN 'followers' THEN
        SELECT COUNT(*)::INTEGER INTO v_current_value
        FROM follows WHERE following_id = p_user_id AND status = 'accepted';
      WHEN 'streak' THEN
        -- Get current streak from albums (consecutive days with activity)
        WITH daily_activity AS (
          SELECT DISTINCT DATE(created_at) as activity_date
          FROM albums WHERE user_id = p_user_id
          ORDER BY activity_date DESC
        ),
        streaks AS (
          SELECT activity_date,
            activity_date - (ROW_NUMBER() OVER (ORDER BY activity_date DESC))::INTEGER * INTERVAL '1 day' AS grp
          FROM daily_activity
        )
        SELECT COALESCE(MAX(cnt), 0)::INTEGER INTO v_current_value
        FROM (SELECT COUNT(*) AS cnt FROM streaks GROUP BY grp) sub;
      ELSE
        v_current_value := 0;
    END CASE;

    -- Upsert challenge progress
    INSERT INTO user_challenges (user_id, challenge_id, progress, completed_at)
    VALUES (
      p_user_id,
      v_challenge.id,
      LEAST(v_current_value, v_challenge.target_count),
      CASE WHEN v_current_value >= v_challenge.target_count THEN NOW() ELSE NULL END
    )
    ON CONFLICT (user_id, challenge_id) DO UPDATE SET
      progress = LEAST(v_current_value, v_challenge.target_count),
      completed_at = CASE
        WHEN user_challenges.completed_at IS NOT NULL THEN user_challenges.completed_at
        WHEN v_current_value >= v_challenge.target_count THEN NOW()
        ELSE NULL
      END;
  END LOOP;
END;
$$;
