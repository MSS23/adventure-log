-- =====================================================================
-- COPY THIS ENTIRE FILE INTO SUPABASE SQL EDITOR AND CLICK "RUN"
-- Dashboard → SQL Editor → New Query → Paste → Run
-- =====================================================================

-- 1. WISHLIST ITEMS
CREATE TABLE IF NOT EXISTS wishlist_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_name TEXT NOT NULL,
  country_code TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  notes TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'from_album', 'shared')),
  shared_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_wishlist_items_user ON wishlist_items(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_completed ON wishlist_items(user_id, completed_at);

ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can manage own wishlist"
    ON wishlist_items FOR ALL
    USING (user_id = (SELECT auth.uid()))
    WITH CHECK (user_id = (SELECT auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. USER PREFERENCES (key-value store)
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, key)
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can manage own preferences"
    ON user_preferences FOR ALL
    USING (user_id = (SELECT auth.uid()))
    WITH CHECK (user_id = (SELECT auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. REACTIONS WITH USERS VIEW (reactions table already exists)
CREATE OR REPLACE VIEW reactions_with_users AS
SELECT
  r.id,
  r.user_id,
  r.target_type,
  r.target_id,
  r.reaction_type,
  r.created_at,
  u.username,
  u.display_name,
  u.avatar_url
FROM reactions r
LEFT JOIN users u ON r.user_id = u.id;

-- 4. CHALLENGES
CREATE TABLE IF NOT EXISTS challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🏆',
  badge_color TEXT NOT NULL DEFAULT '#4A5D23',
  category TEXT NOT NULL DEFAULT 'exploration',
  target_count INTEGER NOT NULL,
  target_type TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Anyone can view active challenges"
    ON challenges FOR SELECT
    USING (is_active = true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 5. USER CHALLENGES
CREATE TABLE IF NOT EXISTS user_challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, challenge_id)
);

ALTER TABLE user_challenges ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can manage own challenge progress"
    ON user_challenges FOR ALL
    USING (user_id = (SELECT auth.uid()))
    WITH CHECK (user_id = (SELECT auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 6. SEED CHALLENGES
INSERT INTO challenges (title, description, icon, badge_color, category, target_count, target_type, sort_order) VALUES
  ('First Steps', 'Create your first album', '👣', '#4A5D23', 'exploration', 1, 'albums', 1),
  ('Shutterbug', 'Upload 50 photos', '📸', '#99B169', 'photography', 50, 'photos', 2),
  ('Explorer', 'Visit 5 countries', '🧭', '#2563EB', 'exploration', 5, 'countries', 3),
  ('Globe Trotter', 'Visit 10 countries', '🌍', '#7C3AED', 'exploration', 10, 'countries', 4),
  ('World Traveler', 'Visit 25 countries', '✈️', '#DC2626', 'exploration', 25, 'countries', 5),
  ('Social Butterfly', 'Get 10 followers', '🦋', '#EC4899', 'social', 10, 'followers', 6),
  ('Memory Maker', 'Create 10 albums', '📖', '#F59E0B', 'photography', 10, 'albums', 7),
  ('Photographer', 'Upload 200 photos', '🎞️', '#14B8A6', 'photography', 200, 'photos', 8),
  ('Continent Hopper', 'Visit 3 continents', '🗺️', '#8B5CF6', 'exploration', 3, 'continents', 9),
  ('Storyteller', 'Create 25 albums', '📚', '#F97316', 'photography', 25, 'albums', 10)
ON CONFLICT DO NOTHING;

-- DONE! All tables created successfully.
SELECT 'Migration complete!' as status;
