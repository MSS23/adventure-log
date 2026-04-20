-- ============================================================================
-- Migration 27: Trip Planner Phase 2
-- Adds: public sharing, live-trip mode, pin check-ins
-- ============================================================================

-- Trip status + public sharing
ALTER TABLE public.trips
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'planning'
        CHECK (status IN ('planning', 'live', 'completed')),
    ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS share_slug TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS trips_share_slug_idx ON public.trips(share_slug) WHERE share_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS trips_is_public_idx ON public.trips(is_public) WHERE is_public = TRUE;

-- Pin check-ins (live mode)
ALTER TABLE public.trip_pins
    ADD COLUMN IF NOT EXISTS visited_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS visited_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS scheduled_day INTEGER;

-- Generate random 10-char slug helper
CREATE OR REPLACE FUNCTION public.generate_trip_slug()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'abcdefghijkmnopqrstuvwxyz23456789'; -- no 0/1/l/o to reduce confusion
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..10 LOOP
        result := result || substr(chars, floor(random() * length(chars))::int + 1, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Add public-read policy to trips when is_public = true
DROP POLICY IF EXISTS "trips_select_public" ON public.trips;
CREATE POLICY "trips_select_public" ON public.trips
    FOR SELECT USING (is_public = TRUE);

-- Mirror public read to members & pins for public trips
DROP POLICY IF EXISTS "trip_members_select_public" ON public.trip_members;
CREATE POLICY "trip_members_select_public" ON public.trip_members
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.is_public = TRUE)
    );

DROP POLICY IF EXISTS "trip_pins_select_public" ON public.trip_pins;
CREATE POLICY "trip_pins_select_public" ON public.trip_pins
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.is_public = TRUE)
    );

-- Allow anon role to read public trips (for unauthenticated /t/[slug] pages)
GRANT SELECT ON public.trips TO anon;
GRANT SELECT ON public.trip_members TO anon;
GRANT SELECT ON public.trip_pins TO anon;
GRANT SELECT ON public.users TO anon;

-- ============================================================================
-- Memory lane helper: albums from N years ago today
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_memory_albums(_user_id UUID)
RETURNS TABLE (
    id UUID,
    title TEXT,
    location_name TEXT,
    country_code TEXT,
    date_start DATE,
    cover_photo_url TEXT,
    years_ago INTEGER
)
LANGUAGE SQL STABLE SECURITY DEFINER
AS $$
    SELECT
        a.id,
        a.title,
        a.location_name,
        a.country_code,
        a.date_start,
        a.cover_photo_url,
        EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.date_start))::INTEGER AS years_ago
    FROM public.albums a
    WHERE a.user_id = _user_id
      AND a.date_start IS NOT NULL
      AND EXTRACT(MONTH FROM a.date_start) = EXTRACT(MONTH FROM CURRENT_DATE)
      AND EXTRACT(DAY FROM a.date_start) = EXTRACT(DAY FROM CURRENT_DATE)
      AND a.date_start < CURRENT_DATE
    ORDER BY a.date_start DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_memory_albums(UUID) TO authenticated;

-- ============================================================================
-- Travel twins: users who share countries with me
-- Returns up to 10 users, ranked by overlap count
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_travel_twins(_user_id UUID, _limit INTEGER DEFAULT 10)
RETURNS TABLE (
    user_id UUID,
    username TEXT,
    display_name TEXT,
    avatar_url TEXT,
    overlap_count INTEGER,
    their_country_count INTEGER,
    my_country_count INTEGER
)
LANGUAGE SQL STABLE SECURITY DEFINER
AS $$
    WITH my_countries AS (
        SELECT DISTINCT country_code
        FROM public.albums
        WHERE user_id = _user_id AND country_code IS NOT NULL
    ),
    their_stats AS (
        SELECT
            a.user_id,
            COUNT(DISTINCT a.country_code) FILTER (
                WHERE a.country_code IN (SELECT country_code FROM my_countries)
            ) AS overlap,
            COUNT(DISTINCT a.country_code) AS their_total
        FROM public.albums a
        WHERE a.user_id <> _user_id
          AND a.country_code IS NOT NULL
          AND a.visibility = 'public'
        GROUP BY a.user_id
    )
    SELECT
        u.id AS user_id,
        u.username,
        u.display_name,
        u.avatar_url,
        ts.overlap::INTEGER,
        ts.their_total::INTEGER,
        (SELECT COUNT(*)::INTEGER FROM my_countries)
    FROM their_stats ts
    JOIN public.users u ON u.id = ts.user_id
    WHERE ts.overlap > 0 AND u.privacy_level = 'public'
    ORDER BY ts.overlap DESC, ts.their_total DESC
    LIMIT _limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_travel_twins(UUID, INTEGER) TO authenticated;

-- ============================================================================
-- Places a travel twin has been that I haven't
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_twin_recommendations(_user_id UUID, _twin_id UUID, _limit INTEGER DEFAULT 10)
RETURNS TABLE (
    album_id UUID,
    title TEXT,
    location_name TEXT,
    country_code TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    cover_photo_url TEXT,
    date_start DATE
)
LANGUAGE SQL STABLE SECURITY DEFINER
AS $$
    WITH my_locations AS (
        SELECT DISTINCT LOWER(location_name) AS loc
        FROM public.albums
        WHERE user_id = _user_id AND location_name IS NOT NULL
    )
    SELECT
        a.id AS album_id,
        a.title,
        a.location_name,
        a.country_code,
        a.latitude,
        a.longitude,
        a.cover_photo_url,
        a.date_start
    FROM public.albums a
    WHERE a.user_id = _twin_id
      AND a.visibility = 'public'
      AND a.location_name IS NOT NULL
      AND LOWER(a.location_name) NOT IN (SELECT loc FROM my_locations)
    ORDER BY a.created_at DESC
    LIMIT _limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_twin_recommendations(UUID, UUID, INTEGER) TO authenticated;
