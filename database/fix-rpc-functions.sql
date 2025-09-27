-- =============================================================================
-- RPC FUNCTION FIXES - Adventure Log
-- =============================================================================
-- This file creates the essential RPC functions with the correct parameter names
-- to fix 400 errors in the application
-- =============================================================================

-- 1. get_user_travel_by_year function
CREATE OR REPLACE FUNCTION public.get_user_travel_by_year(
    p_user_id UUID,
    p_year INTEGER
)
RETURNS TABLE (
    album_id UUID,
    album_name TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    created_at TIMESTAMPTZ,
    location_name TEXT,
    photo_count BIGINT,
    country_code TEXT,
    location_type TEXT
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    -- Input validation
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID cannot be null';
    END IF;

    IF p_year IS NULL OR p_year < 1900 OR p_year > EXTRACT(YEAR FROM NOW()) + 1 THEN
        RAISE EXCEPTION 'Invalid year provided: %', p_year;
    END IF;

    -- Return albums with location data for the specified year
    RETURN QUERY
    SELECT
        a.id::UUID as album_id,
        COALESCE(a.title, 'Untitled Album')::TEXT as album_name,
        a.latitude::DOUBLE PRECISION,
        a.longitude::DOUBLE PRECISION,
        a.created_at::TIMESTAMPTZ,
        COALESCE(a.location_name, 'Unknown Location')::TEXT as location_name,
        COUNT(p.id)::BIGINT as photo_count,
        a.country_code::TEXT,
        CASE
            WHEN a.city_id IS NOT NULL THEN 'city'
            WHEN a.country_id IS NOT NULL THEN 'country'
            ELSE 'custom'
        END::TEXT as location_type
    FROM public.albums a
    LEFT JOIN public.photos p ON a.id = p.album_id
    WHERE
        a.user_id = p_user_id
        AND EXTRACT(YEAR FROM a.created_at) = p_year
        AND a.latitude IS NOT NULL
        AND a.longitude IS NOT NULL
        AND a.latitude BETWEEN -90 AND 90
        AND a.longitude BETWEEN -180 AND 180
    GROUP BY a.id, a.title, a.latitude, a.longitude, a.created_at, a.location_name, a.country_code, a.city_id, a.country_id
    ORDER BY a.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users only
GRANT EXECUTE ON FUNCTION public.get_user_travel_by_year(UUID, INTEGER) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_travel_by_year(UUID, INTEGER) FROM anon;

-- 2. get_user_travel_years function
CREATE OR REPLACE FUNCTION public.get_user_travel_years(p_user_id UUID)
RETURNS TABLE (year INTEGER)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID cannot be null';
    END IF;

    RETURN QUERY
    SELECT DISTINCT EXTRACT(YEAR FROM a.created_at)::INTEGER as year
    FROM public.albums a
    WHERE
        a.user_id = p_user_id
        AND a.latitude IS NOT NULL
        AND a.longitude IS NOT NULL
    ORDER BY year DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_travel_years(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_travel_years(UUID) FROM anon;

-- 3. get_user_dashboard_stats function
CREATE OR REPLACE FUNCTION public.get_user_dashboard_stats(p_user_id UUID)
RETURNS TABLE (
    total_albums BIGINT,
    total_photos BIGINT,
    countries_visited BIGINT,
    cities_visited BIGINT
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID cannot be null';
    END IF;

    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM public.albums WHERE user_id = p_user_id) as total_albums,
        (SELECT COUNT(*) FROM public.photos WHERE user_id = p_user_id) as total_photos,
        (SELECT COUNT(DISTINCT country_code) FROM public.albums WHERE user_id = p_user_id AND country_code IS NOT NULL) as countries_visited,
        (SELECT COUNT(DISTINCT city_id) FROM public.albums WHERE user_id = p_user_id AND city_id IS NOT NULL) as cities_visited;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_dashboard_stats(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_dashboard_stats(UUID) FROM anon;

-- 4. User level functions (create basic versions if they don't exist)
DO $$
BEGIN
    -- Check if user_levels table exists
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_levels') THEN
        CREATE TABLE public.user_levels (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
            current_level INTEGER DEFAULT 1,
            current_title TEXT DEFAULT 'Explorer',
            total_experience INTEGER DEFAULT 0,
            albums_created INTEGER DEFAULT 0,
            countries_visited INTEGER DEFAULT 0,
            photos_uploaded INTEGER DEFAULT 0,
            social_interactions INTEGER DEFAULT 0,
            level_up_date TIMESTAMPTZ DEFAULT NOW(),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Enable RLS
        ALTER TABLE public.user_levels ENABLE ROW LEVEL SECURITY;

        -- Create RLS policy
        CREATE POLICY "Users can view and edit their own level data" ON public.user_levels
        FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- get_user_level_info function
CREATE OR REPLACE FUNCTION public.get_user_level_info(p_user_id UUID)
RETURNS TABLE (
    current_level INTEGER,
    current_title TEXT,
    total_experience INTEGER,
    next_level INTEGER,
    next_title TEXT,
    experience_to_next INTEGER,
    progress_percentage INTEGER
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    user_data RECORD;
BEGIN
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID cannot be null';
    END IF;

    -- Get current user level data
    SELECT * INTO user_data FROM public.user_levels WHERE user_id = p_user_id;

    IF NOT FOUND THEN
        -- Return default values for new users
        RETURN QUERY SELECT 1, 'Explorer'::TEXT, 0, 2, 'Adventurer'::TEXT, 100, 0;
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        user_data.current_level,
        user_data.current_title,
        user_data.total_experience,
        user_data.current_level + 1,
        'Next Level'::TEXT, -- Simplified for now
        GREATEST(100 - user_data.total_experience, 0), -- Simplified calculation
        LEAST(user_data.total_experience, 100); -- Simplified percentage
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_level_info(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_level_info(UUID) FROM anon;

-- update_user_level function
CREATE OR REPLACE FUNCTION public.update_user_level(p_user_id UUID)
RETURNS TABLE (
    new_level INTEGER,
    new_title TEXT,
    level_up BOOLEAN
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    current_data RECORD;
    album_count INTEGER;
    photo_count INTEGER;
    country_count INTEGER;
    new_experience INTEGER;
    calculated_level INTEGER;
    level_up_occurred BOOLEAN := FALSE;
BEGIN
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID cannot be null';
    END IF;

    -- Calculate current stats
    SELECT COUNT(*) INTO album_count FROM public.albums WHERE user_id = p_user_id;
    SELECT COUNT(*) INTO photo_count FROM public.photos WHERE user_id = p_user_id;
    SELECT COUNT(DISTINCT country_code) INTO country_count FROM public.albums WHERE user_id = p_user_id AND country_code IS NOT NULL;

    -- Simple experience calculation
    new_experience := (album_count * 10) + (photo_count * 2) + (country_count * 20);

    -- Simple level calculation
    calculated_level := GREATEST(1, (new_experience / 100) + 1);

    -- Get current level data
    SELECT * INTO current_data FROM public.user_levels WHERE user_id = p_user_id;

    IF NOT FOUND THEN
        -- Insert new record
        INSERT INTO public.user_levels (
            user_id, current_level, current_title, total_experience,
            albums_created, countries_visited, photos_uploaded
        ) VALUES (
            p_user_id, calculated_level, 'Explorer', new_experience,
            album_count, country_count, photo_count
        );
        level_up_occurred := TRUE;
    ELSE
        -- Update existing record
        IF calculated_level > current_data.current_level THEN
            level_up_occurred := TRUE;
        END IF;

        UPDATE public.user_levels SET
            current_level = calculated_level,
            total_experience = new_experience,
            albums_created = album_count,
            countries_visited = country_count,
            photos_uploaded = photo_count,
            updated_at = NOW()
        WHERE user_id = p_user_id;
    END IF;

    RETURN QUERY SELECT calculated_level, 'Explorer'::TEXT, level_up_occurred;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_user_level(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.update_user_level(UUID) FROM anon;

-- Add helpful comments
COMMENT ON FUNCTION public.get_user_travel_by_year(UUID, INTEGER) IS 'Returns travel data for a specific user and year, used by the globe visualization component.';
COMMENT ON FUNCTION public.get_user_travel_years(UUID) IS 'Returns list of years that have travel data for a user.';
COMMENT ON FUNCTION public.get_user_dashboard_stats(UUID) IS 'Returns dashboard statistics for a user.';
COMMENT ON FUNCTION public.get_user_level_info(UUID) IS 'Returns user level information with progress.';
COMMENT ON FUNCTION public.update_user_level(UUID) IS 'Updates user level based on current activity.';