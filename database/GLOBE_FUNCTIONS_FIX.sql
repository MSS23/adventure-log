-- =============================================================================
-- COMPREHENSIVE GLOBE FUNCTIONS FIX - Adventure Log
-- =============================================================================
-- This file resolves the parameter naming conflict and enables all globe functionality
--
-- ERROR BEING FIXED: "cannot change name of input parameter 'user_id_param'"
-- SOLUTION: DROP existing functions before recreating with consistent parameter names
-- =============================================================================

-- =============================================================================
-- STEP 1: CLEAN SLATE - DROP ALL CONFLICTING FUNCTIONS
-- =============================================================================

-- Drop functions that may exist with conflicting parameter names
DROP FUNCTION IF EXISTS public.get_user_travel_by_year(UUID, INTEGER);
DROP FUNCTION IF EXISTS public.get_user_dashboard_stats(UUID);
DROP FUNCTION IF EXISTS public.get_user_level_info(UUID);
DROP FUNCTION IF EXISTS public.get_user_travel_years(UUID);
DROP FUNCTION IF EXISTS public.update_user_level(UUID);

-- Drop any variations that might exist
DROP FUNCTION IF EXISTS public.get_user_travel_by_year(user_id_param UUID, year_param INTEGER);
DROP FUNCTION IF EXISTS public.get_user_dashboard_stats(user_id_param UUID);
DROP FUNCTION IF EXISTS public.get_user_level_info(user_id_param UUID);
DROP FUNCTION IF EXISTS public.get_user_travel_years(user_id_param UUID);
DROP FUNCTION IF EXISTS public.update_user_level(user_id_param UUID);

-- =============================================================================
-- STEP 2: CREATE CONSISTENT FUNCTIONS WITH p_user_id NAMING
-- =============================================================================

-- 1. get_user_travel_by_year - Powers the globe timeline
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
    -- Comprehensive input validation
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID cannot be null';
    END IF;

    IF p_year IS NULL OR p_year < 1900 OR p_year > EXTRACT(YEAR FROM NOW()) + 1 THEN
        RAISE EXCEPTION 'Invalid year provided: %. Must be between 1900 and %',
            p_year, EXTRACT(YEAR FROM NOW()) + 1;
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
    ORDER BY a.created_at ASC; -- Chronological order for timeline animation
END;
$$;

-- 2. get_user_travel_years - Provides available years for year selector
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
        AND a.created_at IS NOT NULL
        AND EXTRACT(YEAR FROM a.created_at) IS NOT NULL
    ORDER BY year DESC;
END;
$$;

-- 3. get_user_dashboard_stats - Powers dashboard statistics
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

-- =============================================================================
-- STEP 3: CREATE USER LEVEL FUNCTIONS (IF NEEDED)
-- =============================================================================

-- Create user_levels table if it doesn't exist
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

-- 4. get_user_level_info - Powers user level system
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
    exp_for_next INTEGER;
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

    -- Calculate experience needed for next level (simple progressive system)
    exp_for_next := (user_data.current_level * 100);

    RETURN QUERY
    SELECT
        user_data.current_level,
        user_data.current_title,
        user_data.total_experience,
        user_data.current_level + 1,
        CASE
            WHEN user_data.current_level + 1 = 2 THEN 'Adventurer'
            WHEN user_data.current_level + 1 = 3 THEN 'Explorer'
            WHEN user_data.current_level + 1 = 4 THEN 'Wanderer'
            WHEN user_data.current_level + 1 = 5 THEN 'Globetrotter'
            ELSE 'World Traveler'
        END::TEXT as next_title,
        GREATEST(exp_for_next - user_data.total_experience, 0) as experience_to_next,
        LEAST(ROUND(user_data.total_experience::NUMERIC / exp_for_next * 100), 100)::INTEGER as progress_percentage;
END;
$$;

-- 5. update_user_level - Maintains user level progression
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
    new_level_title TEXT;
BEGIN
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID cannot be null';
    END IF;

    -- Calculate current stats
    SELECT COUNT(*) INTO album_count FROM public.albums WHERE user_id = p_user_id;
    SELECT COUNT(*) INTO photo_count FROM public.photos WHERE user_id = p_user_id;
    SELECT COUNT(DISTINCT country_code) INTO country_count FROM public.albums WHERE user_id = p_user_id AND country_code IS NOT NULL;

    -- Calculate experience: albums=10pts, photos=2pts, countries=20pts
    new_experience := (album_count * 10) + (photo_count * 2) + (country_count * 20);

    -- Calculate level (every 100 experience = 1 level)
    calculated_level := GREATEST(1, (new_experience / 100) + 1);

    -- Determine title
    new_level_title := CASE
        WHEN calculated_level >= 5 THEN 'World Traveler'
        WHEN calculated_level >= 4 THEN 'Globetrotter'
        WHEN calculated_level >= 3 THEN 'Wanderer'
        WHEN calculated_level >= 2 THEN 'Adventurer'
        ELSE 'Explorer'
    END;

    -- Get current level data
    SELECT * INTO current_data FROM public.user_levels WHERE user_id = p_user_id;

    IF NOT FOUND THEN
        -- Insert new record
        INSERT INTO public.user_levels (
            user_id, current_level, current_title, total_experience,
            albums_created, countries_visited, photos_uploaded
        ) VALUES (
            p_user_id, calculated_level, new_level_title, new_experience,
            album_count, country_count, photo_count
        );
        level_up_occurred := TRUE;
    ELSE
        -- Check if level increased
        IF calculated_level > current_data.current_level THEN
            level_up_occurred := TRUE;
        END IF;

        -- Update existing record
        UPDATE public.user_levels SET
            current_level = calculated_level,
            current_title = new_level_title,
            total_experience = new_experience,
            albums_created = album_count,
            countries_visited = country_count,
            photos_uploaded = photo_count,
            updated_at = NOW()
        WHERE user_id = p_user_id;
    END IF;

    RETURN QUERY SELECT calculated_level, new_level_title, level_up_occurred;
END;
$$;

-- =============================================================================
-- STEP 4: GRANT PROPER PERMISSIONS
-- =============================================================================

-- Grant execute permissions to authenticated users only
GRANT EXECUTE ON FUNCTION public.get_user_travel_by_year(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_travel_years(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_dashboard_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_level_info(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_level(UUID) TO authenticated;

-- Revoke from anonymous users for security
REVOKE EXECUTE ON FUNCTION public.get_user_travel_by_year(UUID, INTEGER) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_travel_years(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_dashboard_stats(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_level_info(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_user_level(UUID) FROM anon;

-- =============================================================================
-- STEP 5: ADD HELPFUL METADATA
-- =============================================================================

-- Add function comments for documentation
COMMENT ON FUNCTION public.get_user_travel_by_year(UUID, INTEGER) IS 'Returns chronologically ordered travel data for globe timeline animation. Fixed parameter naming conflict.';
COMMENT ON FUNCTION public.get_user_travel_years(UUID) IS 'Returns available travel years for year selector dropdown.';
COMMENT ON FUNCTION public.get_user_dashboard_stats(UUID) IS 'Returns comprehensive dashboard statistics for user.';
COMMENT ON FUNCTION public.get_user_level_info(UUID) IS 'Returns user level progression information with next level details.';
COMMENT ON FUNCTION public.update_user_level(UUID) IS 'Updates user level based on current activity and returns level change status.';

-- =============================================================================
-- VERIFICATION QUERY (Optional - for testing)
-- =============================================================================

/*
-- Test the functions after creation:

-- Check if functions exist
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%user%'
ORDER BY routine_name;

-- Test with a real user ID (replace with actual UUID):
-- SELECT * FROM get_user_travel_years('your-user-id-here');
-- SELECT * FROM get_user_dashboard_stats('your-user-id-here');
-- SELECT * FROM get_user_level_info('your-user-id-here');
*/

-- =============================================================================
-- SUCCESS!
-- =============================================================================
-- All functions created with consistent p_user_id parameter naming
-- Globe timeline, dashboard stats, and user levels will now work correctly
-- Execute this entire file in your Supabase SQL Editor
-- =============================================================================