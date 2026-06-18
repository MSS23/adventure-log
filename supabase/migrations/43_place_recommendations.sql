-- ============================================================================
-- Migration 43: Place Recommendations (crowdsourced pre-trip research)
-- ============================================================================
-- Lets users recommend real places (eat / visit / stay / activity) tied to a
-- city + coordinates, and lets other users "bump" (upvote) them. Bumped recs
-- rank to the top so the community surfaces the best tips for a destination.
--
--   place_recommendations       - one recommended place, owned by its creator
--   place_recommendation_bumps   - one upvote per user per recommendation
--
-- All recommendations are public-read (this is a shared research tool). Writes
-- are restricted to the authenticated owner. A denormalized bump_count is kept
-- in sync by trigger so the common "sort by top" query stays a single index
-- scan instead of an aggregate join.
-- ============================================================================

-- 1. place_recommendations: a single recommended place
CREATE TABLE IF NOT EXISTS public.place_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
    place_type TEXT NOT NULL CHECK (place_type IN ('eat', 'visit', 'stay', 'activity')),
    tip TEXT CHECK (tip IS NULL OR length(tip) <= 1000),
    city TEXT NOT NULL CHECK (length(city) BETWEEN 1 AND 200),
    country_code TEXT CHECK (country_code IS NULL OR length(country_code) <= 2),
    location_name TEXT,
    latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    bump_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS place_recommendations_created_by_idx ON public.place_recommendations(created_by);
CREATE INDEX IF NOT EXISTS place_recommendations_city_idx ON public.place_recommendations(lower(city));
CREATE INDEX IF NOT EXISTS place_recommendations_country_idx ON public.place_recommendations(country_code);
CREATE INDEX IF NOT EXISTS place_recommendations_type_idx ON public.place_recommendations(place_type);
CREATE INDEX IF NOT EXISTS place_recommendations_rank_idx ON public.place_recommendations(bump_count DESC, created_at DESC);

-- 2. place_recommendation_bumps: one upvote per user per recommendation
CREATE TABLE IF NOT EXISTS public.place_recommendation_bumps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recommendation_id UUID NOT NULL REFERENCES public.place_recommendations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (recommendation_id, user_id)
);

CREATE INDEX IF NOT EXISTS place_recommendation_bumps_rec_idx ON public.place_recommendation_bumps(recommendation_id);
CREATE INDEX IF NOT EXISTS place_recommendation_bumps_user_idx ON public.place_recommendation_bumps(user_id);

-- Updated-at trigger (reuses the same shape as the trips planner trigger)
CREATE OR REPLACE FUNCTION public.set_place_recommendation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS place_recommendations_set_updated_at ON public.place_recommendations;
CREATE TRIGGER place_recommendations_set_updated_at
    BEFORE UPDATE ON public.place_recommendations
    FOR EACH ROW EXECUTE FUNCTION public.set_place_recommendation_updated_at();

-- Keep the denormalized bump_count in sync with the bumps table
CREATE OR REPLACE FUNCTION public.sync_place_recommendation_bump_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.place_recommendations
            SET bump_count = bump_count + 1
            WHERE id = NEW.recommendation_id;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.place_recommendations
            SET bump_count = GREATEST(bump_count - 1, 0)
            WHERE id = OLD.recommendation_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS place_recommendation_bumps_sync_count ON public.place_recommendation_bumps;
CREATE TRIGGER place_recommendation_bumps_sync_count
    AFTER INSERT OR DELETE ON public.place_recommendation_bumps
    FOR EACH ROW EXECUTE FUNCTION public.sync_place_recommendation_bump_count();

-- ============================================================================
-- Row Level Security
-- ============================================================================

ALTER TABLE public.place_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.place_recommendation_bumps ENABLE ROW LEVEL SECURITY;

-- place_recommendations: public-read research tool; owner-only writes
DROP POLICY IF EXISTS "place_recs_select_all" ON public.place_recommendations;
CREATE POLICY "place_recs_select_all" ON public.place_recommendations
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "place_recs_insert_own" ON public.place_recommendations;
CREATE POLICY "place_recs_insert_own" ON public.place_recommendations
    FOR INSERT WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "place_recs_update_own" ON public.place_recommendations;
CREATE POLICY "place_recs_update_own" ON public.place_recommendations
    FOR UPDATE USING (created_by = auth.uid());

DROP POLICY IF EXISTS "place_recs_delete_own" ON public.place_recommendations;
CREATE POLICY "place_recs_delete_own" ON public.place_recommendations
    FOR DELETE USING (created_by = auth.uid());

-- place_recommendation_bumps: anyone can read counts; users manage their own bump
DROP POLICY IF EXISTS "place_rec_bumps_select_all" ON public.place_recommendation_bumps;
CREATE POLICY "place_rec_bumps_select_all" ON public.place_recommendation_bumps
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "place_rec_bumps_insert_own" ON public.place_recommendation_bumps;
CREATE POLICY "place_rec_bumps_insert_own" ON public.place_recommendation_bumps
    FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "place_rec_bumps_delete_own" ON public.place_recommendation_bumps;
CREATE POLICY "place_rec_bumps_delete_own" ON public.place_recommendation_bumps
    FOR DELETE USING (user_id = auth.uid());

-- Grants (authenticated app users)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.place_recommendations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.place_recommendation_bumps TO authenticated;
-- Anonymous visitors may browse recommendations (read-only)
GRANT SELECT ON public.place_recommendations TO anon;
GRANT SELECT ON public.place_recommendation_bumps TO anon;
