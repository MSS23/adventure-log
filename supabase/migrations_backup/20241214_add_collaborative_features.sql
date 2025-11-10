-- Migration: Add Collaborative Albums and Smart Features Support
-- Description: Adds tables and columns needed for collaborative albums, trip collections, and social features
-- Date: 2024-12-14

-- =====================================================
-- TABLE: album_collaborators
-- Purpose: Enable multiple users to collaborate on albums
-- =====================================================
CREATE TABLE IF NOT EXISTS public.album_collaborators (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  album_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role character varying NOT NULL CHECK (role::text = ANY (ARRAY['owner'::character varying, 'editor'::character varying, 'viewer'::character varying]::text[])),
  status character varying NOT NULL DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'accepted'::character varying, 'declined'::character varying]::text[])),
  invited_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT album_collaborators_pkey PRIMARY KEY (id),
  CONSTRAINT album_collaborators_album_id_fkey FOREIGN KEY (album_id) REFERENCES public.albums(id) ON DELETE CASCADE,
  CONSTRAINT album_collaborators_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT album_collaborators_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT album_collaborators_unique UNIQUE (album_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_album_collaborators_album_id ON public.album_collaborators(album_id);
CREATE INDEX IF NOT EXISTS idx_album_collaborators_user_id ON public.album_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_album_collaborators_status ON public.album_collaborators(status);
CREATE INDEX IF NOT EXISTS idx_album_collaborators_role ON public.album_collaborators(role);

-- =====================================================
-- TABLE: album_templates
-- Purpose: Store album templates for quick creation
-- =====================================================
CREATE TABLE IF NOT EXISTS public.album_templates (
  id character varying NOT NULL,
  name character varying NOT NULL,
  description text,
  default_title character varying NOT NULL,
  default_description text,
  suggested_tags text[],
  icon_name character varying,
  category character varying,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT album_templates_pkey PRIMARY KEY (id)
);

-- Insert default templates
INSERT INTO public.album_templates (id, name, description, default_title, default_description, suggested_tags, icon_name, category, sort_order) VALUES
  ('weekend-trip', 'Weekend Getaway', 'Quick escape from the daily routine', 'Weekend in [Location]', 'A refreshing weekend getaway filled with relaxation and adventure.', ARRAY['weekend', 'short-trip', 'getaway'], 'palmtree', 'leisure', 1),
  ('city-exploration', 'City Explorer', 'Urban adventures and city discoveries', '[City] City Adventure', 'Exploring the sights, sounds, and culture of the city.', ARRAY['city', 'urban', 'exploration'], 'building', 'urban', 2),
  ('nature-adventure', 'Nature Adventure', 'Hiking, camping, and outdoor activities', 'Nature Adventure in [Location]', 'Connecting with nature through hiking, camping, and outdoor exploration.', ARRAY['nature', 'outdoors', 'hiking'], 'mountain', 'nature', 3),
  ('international-trip', 'International Journey', 'Cross-border travels and cultural experiences', 'Journey to [Country]', 'An international adventure discovering new cultures, cuisines, and landscapes.', ARRAY['international', 'travel', 'culture'], 'plane', 'international', 4),
  ('food-tour', 'Culinary Tour', 'Food-focused travel experiences', 'Culinary Journey through [Location]', 'A delicious exploration of local cuisine and dining experiences.', ARRAY['food', 'culinary', 'restaurants'], 'utensils', 'food', 5),
  ('romantic-trip', 'Romantic Escape', 'Couples travel and romantic destinations', 'Romantic Getaway to [Location]', 'A memorable romantic journey filled with special moments.', ARRAY['romantic', 'couples', 'special'], 'heart', 'romance', 6)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- TABLE: user_achievements
-- Purpose: Track user achievements and badges
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  achievement_type character varying NOT NULL CHECK (achievement_type::text = ANY (ARRAY['globe_trotter'::character varying, 'photographer'::character varying, 'travel_enthusiast'::character varying, 'explorer'::character varying, 'social_butterfly'::character varying, 'storyteller'::character varying]::text[])),
  achievement_name character varying NOT NULL,
  achievement_description text,
  icon_emoji character varying,
  earned_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  metadata jsonb,
  CONSTRAINT user_achievements_pkey PRIMARY KEY (id),
  CONSTRAINT user_achievements_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT user_achievements_unique UNIQUE (user_id, achievement_type)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON public.user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_type ON public.user_achievements(achievement_type);

-- =====================================================
-- TABLE: travel_recommendations
-- Purpose: Store and cache travel recommendations
-- =====================================================
CREATE TABLE IF NOT EXISTS public.travel_recommendations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  recommended_location character varying NOT NULL,
  recommended_country character varying,
  match_score integer NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
  reason text,
  tags text[],
  popularity_count integer DEFAULT 0,
  is_visited boolean DEFAULT false,
  generated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  expires_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()) + interval '7 days',
  CONSTRAINT travel_recommendations_pkey PRIMARY KEY (id),
  CONSTRAINT travel_recommendations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_travel_recommendations_user_id ON public.travel_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_travel_recommendations_expires_at ON public.travel_recommendations(expires_at);
CREATE INDEX IF NOT EXISTS idx_travel_recommendations_match_score ON public.travel_recommendations(match_score DESC);

-- =====================================================
-- COLUMNS: Add missing columns to existing tables
-- =====================================================

-- Add start_date alias to albums if not exists (some queries use this)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public'
                 AND table_name = 'albums'
                 AND column_name = 'start_date') THEN
    ALTER TABLE public.albums ADD COLUMN start_date date;
    -- Copy data from date_start if it exists
    UPDATE public.albums SET start_date = date_start WHERE date_start IS NOT NULL;
  END IF;
END $$;

-- Add end_date alias if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public'
                 AND table_name = 'albums'
                 AND column_name = 'end_date') THEN
    ALTER TABLE public.albums ADD COLUMN end_date date;
    -- Copy data from date_end if it exists
    UPDATE public.albums SET end_date = date_end WHERE date_end IS NOT NULL;
  END IF;
END $$;

-- Add location_name to photos if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public'
                 AND table_name = 'photos'
                 AND column_name = 'location_name') THEN
    ALTER TABLE public.photos ADD COLUMN location_name character varying;
  END IF;
END $$;

-- =====================================================
-- RLS POLICIES: Row Level Security
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE public.album_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.album_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_recommendations ENABLE ROW LEVEL SECURITY;

-- album_collaborators policies
CREATE POLICY "Users can view their own collaborations"
  ON public.album_collaborators FOR SELECT
  USING (
    auth.uid() = user_id
    OR auth.uid() IN (SELECT user_id FROM public.albums WHERE id = album_id)
    OR auth.uid() IN (SELECT user_id FROM public.album_collaborators WHERE album_id = album_collaborators.album_id AND status = 'accepted')
  );

CREATE POLICY "Album owners can insert collaborators"
  ON public.album_collaborators FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM public.albums WHERE id = album_id)
  );

CREATE POLICY "Album owners can update collaborators"
  ON public.album_collaborators FOR UPDATE
  USING (
    auth.uid() IN (SELECT user_id FROM public.albums WHERE id = album_id)
  );

CREATE POLICY "Album owners and users can delete their collaborations"
  ON public.album_collaborators FOR DELETE
  USING (
    auth.uid() IN (SELECT user_id FROM public.albums WHERE id = album_id)
    OR auth.uid() = user_id
  );

-- album_templates policies (read-only for all users)
CREATE POLICY "Anyone can view album templates"
  ON public.album_templates FOR SELECT
  USING (is_active = true);

-- user_achievements policies
CREATE POLICY "Users can view their own achievements"
  ON public.user_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view public achievements"
  ON public.user_achievements FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM public.users
      WHERE privacy_level = 'public'
      OR (privacy_level = 'friends' AND id IN (
        SELECT following_id FROM public.follows
        WHERE follower_id = auth.uid() AND status = 'approved'
      ))
    )
  );

CREATE POLICY "System can insert achievements"
  ON public.user_achievements FOR INSERT
  WITH CHECK (true);

-- travel_recommendations policies
CREATE POLICY "Users can view their own recommendations"
  ON public.travel_recommendations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own recommendations"
  ON public.travel_recommendations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert recommendations"
  ON public.travel_recommendations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can delete their own recommendations"
  ON public.travel_recommendations FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- FUNCTIONS: Helper functions and triggers
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for album_collaborators
DROP TRIGGER IF EXISTS update_album_collaborators_updated_at ON public.album_collaborators;
CREATE TRIGGER update_album_collaborators_updated_at
  BEFORE UPDATE ON public.album_collaborators
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to check and award achievements
CREATE OR REPLACE FUNCTION public.check_and_award_achievements()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id uuid;
  v_countries_count integer;
  v_photos_count integer;
  v_albums_count integer;
BEGIN
  -- Get user_id from the updated record
  IF TG_TABLE_NAME = 'albums' THEN
    v_user_id := NEW.user_id;
  ELSIF TG_TABLE_NAME = 'photos' THEN
    v_user_id := NEW.user_id;
  ELSE
    RETURN NEW;
  END IF;

  -- Count user's statistics
  SELECT COUNT(DISTINCT country_code) INTO v_countries_count
  FROM public.albums
  WHERE user_id = v_user_id AND country_code IS NOT NULL;

  SELECT COUNT(*) INTO v_photos_count
  FROM public.photos
  WHERE user_id = v_user_id;

  SELECT COUNT(*) INTO v_albums_count
  FROM public.albums
  WHERE user_id = v_user_id AND status != 'draft';

  -- Award achievements based on thresholds
  IF v_countries_count >= 10 THEN
    INSERT INTO public.user_achievements (user_id, achievement_type, achievement_name, achievement_description, icon_emoji)
    VALUES (v_user_id, 'globe_trotter', 'Globe Trotter', 'Visited 10 or more countries', '🌍')
    ON CONFLICT (user_id, achievement_type) DO NOTHING;
  END IF;

  IF v_photos_count >= 500 THEN
    INSERT INTO public.user_achievements (user_id, achievement_type, achievement_name, achievement_description, icon_emoji)
    VALUES (v_user_id, 'photographer', 'Photographer', 'Uploaded 500 or more photos', '📸')
    ON CONFLICT (user_id, achievement_type) DO NOTHING;
  END IF;

  IF v_albums_count >= 20 THEN
    INSERT INTO public.user_achievements (user_id, achievement_type, achievement_name, achievement_description, icon_emoji)
    VALUES (v_user_id, 'travel_enthusiast', 'Travel Enthusiast', 'Created 20 or more albums', '✈️')
    ON CONFLICT (user_id, achievement_type) DO NOTHING;
  END IF;

  IF v_countries_count >= 5 THEN
    INSERT INTO public.user_achievements (user_id, achievement_type, achievement_name, achievement_description, icon_emoji)
    VALUES (v_user_id, 'explorer', 'Explorer', 'Visited 5 or more countries', '🗺️')
    ON CONFLICT (user_id, achievement_type) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers to check achievements on album and photo creation
DROP TRIGGER IF EXISTS check_achievements_on_album ON public.albums;
CREATE TRIGGER check_achievements_on_album
  AFTER INSERT OR UPDATE ON public.albums
  FOR EACH ROW
  EXECUTE FUNCTION public.check_and_award_achievements();

DROP TRIGGER IF EXISTS check_achievements_on_photo ON public.photos;
CREATE TRIGGER check_achievements_on_photo
  AFTER INSERT ON public.photos
  FOR EACH ROW
  EXECUTE FUNCTION public.check_and_award_achievements();

-- Function to clean up expired recommendations
CREATE OR REPLACE FUNCTION public.cleanup_expired_recommendations()
RETURNS void AS $$
BEGIN
  DELETE FROM public.travel_recommendations
  WHERE expires_at < timezone('utc'::text, now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VIEWS: Useful views for queries
-- =====================================================

-- View for album with collaborator count
CREATE OR REPLACE VIEW public.albums_with_collaborators AS
SELECT
  a.*,
  COALESCE(c.collaborator_count, 0) as collaborator_count,
  COALESCE(c.accepted_count, 0) as accepted_collaborator_count
FROM public.albums a
LEFT JOIN (
  SELECT
    album_id,
    COUNT(*) as collaborator_count,
    COUNT(*) FILTER (WHERE status = 'accepted') as accepted_count
  FROM public.album_collaborators
  GROUP BY album_id
) c ON a.id = c.album_id;

-- View for user statistics with achievements
CREATE OR REPLACE VIEW public.user_stats_with_achievements AS
SELECT
  u.id,
  u.username,
  u.display_name,
  u.avatar_url,
  COALESCE(s.total_albums, 0) as total_albums,
  COALESCE(s.total_photos, 0) as total_photos,
  COALESCE(s.total_countries, 0) as total_countries,
  COALESCE(s.total_cities, 0) as total_cities,
  s.first_trip_date,
  s.last_trip_date,
  COALESCE(a.achievement_count, 0) as achievement_count,
  COALESCE(a.achievements, '[]'::jsonb) as achievements
FROM public.users u
LEFT JOIN public.user_travel_stats s ON u.id = s.user_id
LEFT JOIN (
  SELECT
    user_id,
    COUNT(*) as achievement_count,
    jsonb_agg(
      jsonb_build_object(
        'type', achievement_type,
        'name', achievement_name,
        'icon', icon_emoji,
        'earned_at', earned_at
      )
    ) as achievements
  FROM public.user_achievements
  GROUP BY user_id
) a ON u.id = a.user_id;

-- =====================================================
-- GRANTS: Ensure proper permissions
-- =====================================================

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.album_collaborators TO authenticated;
GRANT SELECT ON public.album_templates TO authenticated;
GRANT SELECT, INSERT ON public.user_achievements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.travel_recommendations TO authenticated;

-- Grant access to views
GRANT SELECT ON public.albums_with_collaborators TO authenticated;
GRANT SELECT ON public.user_stats_with_achievements TO authenticated;

-- =====================================================
-- COMMENTS: Documentation
-- =====================================================

COMMENT ON TABLE public.album_collaborators IS 'Enables collaborative photo albums with role-based permissions';
COMMENT ON TABLE public.album_templates IS 'Pre-configured templates for quick album creation';
COMMENT ON TABLE public.user_achievements IS 'Tracks user achievements and badges earned through travel activities';
COMMENT ON TABLE public.travel_recommendations IS 'Personalized travel destination recommendations based on user history';

COMMENT ON COLUMN public.album_collaborators.role IS 'User role: owner (full control), editor (can add/edit), viewer (read-only)';
COMMENT ON COLUMN public.album_collaborators.status IS 'Invitation status: pending, accepted, or declined';
COMMENT ON COLUMN public.user_achievements.achievement_type IS 'Type of achievement: globe_trotter, photographer, travel_enthusiast, explorer';
COMMENT ON COLUMN public.travel_recommendations.match_score IS 'How well this recommendation matches user preferences (0-100)';

-- =====================================================
-- INDEXES: Additional performance indexes
-- =====================================================

-- Index for faster album queries with collaborators
CREATE INDEX IF NOT EXISTS idx_albums_user_id_status ON public.albums(user_id, status) WHERE status != 'draft';
CREATE INDEX IF NOT EXISTS idx_albums_start_date ON public.albums(start_date DESC) WHERE start_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_albums_country_code ON public.albums(country_code) WHERE country_code IS NOT NULL;

-- Index for photo queries
CREATE INDEX IF NOT EXISTS idx_photos_album_user ON public.photos(album_id, user_id);
CREATE INDEX IF NOT EXISTS idx_photos_taken_at ON public.photos(taken_at DESC) WHERE taken_at IS NOT NULL;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully: Collaborative albums and smart features added';
  RAISE NOTICE 'New tables: album_collaborators, album_templates, user_achievements, travel_recommendations';
  RAISE NOTICE 'New views: albums_with_collaborators, user_stats_with_achievements';
  RAISE NOTICE 'Achievement system enabled with automatic detection';
END $$;
