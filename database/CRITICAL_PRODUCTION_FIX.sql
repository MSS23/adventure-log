-- =============================================================================
-- CRITICAL PRODUCTION FIX - Adventure Log Database Function
-- =============================================================================
-- Copy and paste this entire script into your Supabase SQL Editor
-- This fixes the 400 errors preventing globe pins from displaying
-- Expected result: Globe will show 3 pins (2 Paris, 1 Munich)
-- =============================================================================

-- =============================================================================
-- 1. CREATE MISSING get_user_travel_by_year FUNCTION (CRITICAL FIX)
-- =============================================================================

-- Drop existing function if it exists (safe to run multiple times)
DROP FUNCTION IF EXISTS public.get_user_travel_by_year(UUID, INTEGER);

-- Create the get_user_travel_by_year function with enhanced security and validation
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
DECLARE
    return_count INTEGER;
BEGIN
    -- Input validation
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID cannot be null';
    END IF;

    IF p_year IS NULL OR p_year < 1900 OR p_year > EXTRACT(YEAR FROM NOW()) + 1 THEN
        RAISE EXCEPTION 'Invalid year provided: %', p_year;
    END IF;

    -- Log function call for debugging (remove in production)
    RAISE NOTICE 'get_user_travel_by_year called with user_id: %, year: %', p_user_id, p_year;

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

    -- Log result count for debugging
    GET DIAGNOSTICS return_count = ROW_COUNT;
    RAISE NOTICE 'get_user_travel_by_year returning % rows', return_count;
END;
$$;

-- Grant execute permission to authenticated users only
GRANT EXECUTE ON FUNCTION public.get_user_travel_by_year(UUID, INTEGER) TO authenticated;

-- Explicitly revoke from anonymous users for security
REVOKE EXECUTE ON FUNCTION public.get_user_travel_by_year(UUID, INTEGER) FROM anon;

-- Add helpful comment
COMMENT ON FUNCTION public.get_user_travel_by_year(UUID, INTEGER) IS
'Returns travel data for a specific user and year, used by the globe visualization component. Requires authentication.';

-- =============================================================================
-- 2. ENSURE PROPER ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Enable RLS on albums table (safe if already enabled)
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (safe to run multiple times)
DROP POLICY IF EXISTS "Users can view their own albums" ON public.albums;
DROP POLICY IF EXISTS "Users can manage their own albums" ON public.albums;

-- Create comprehensive RLS policies for albums
CREATE POLICY "Users can view their own albums"
ON public.albums
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can manage their own albums"
ON public.albums
FOR ALL
TO authenticated
USING ((SELECT auth.uid()) = user_id);

-- Enable RLS on photos table (safe if already enabled)
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

-- Drop existing photo policies if they exist
DROP POLICY IF EXISTS "Users can view their own photos" ON public.photos;
DROP POLICY IF EXISTS "Users can manage their own photos" ON public.photos;

-- Create RLS policies for photos
CREATE POLICY "Users can view their own photos"
ON public.photos
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can manage their own photos"
ON public.photos
FOR ALL
TO authenticated
USING ((SELECT auth.uid()) = user_id);

-- =============================================================================
-- 3. PERFORMANCE OPTIMIZATION INDEXES
-- =============================================================================

-- Create performance indexes for the function queries
-- Simple index on user_id and created_at for efficient year filtering
CREATE INDEX IF NOT EXISTS idx_albums_user_created_coords
ON public.albums(user_id, created_at)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Index for photo count aggregation
CREATE INDEX IF NOT EXISTS idx_photos_album_user
ON public.photos(album_id, user_id);

-- Composite index for efficient location queries
CREATE INDEX IF NOT EXISTS idx_albums_coords_user_date
ON public.albums(user_id, created_at, latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- =============================================================================
-- 4. TEST THE FUNCTION (VERIFICATION QUERIES)
-- =============================================================================

-- Function to test with your user ID (replace with actual user_id)
-- You can get your user ID from: SELECT auth.uid();

/*
-- TEST QUERY 1: Check if function exists
SELECT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'get_user_travel_by_year'
) as function_exists;

-- TEST QUERY 2: Test function with current user (run after replacing YOUR-USER-ID)
SELECT * FROM public.get_user_travel_by_year(
    (SELECT auth.uid())::UUID,
    2025
);

-- TEST QUERY 3: Check albums with coordinates
SELECT
    id,
    title,
    location_name,
    latitude,
    longitude,
    created_at,
    EXTRACT(YEAR FROM created_at) as year
FROM public.albums
WHERE
    user_id = (SELECT auth.uid())
    AND latitude IS NOT NULL
    AND longitude IS NOT NULL
ORDER BY created_at DESC;

-- TEST QUERY 4: Expected result verification
-- Should show 3 albums: 2 in Paris area, 1 in Munich area
SELECT
    COUNT(*) as total_albums_with_coords,
    COUNT(CASE WHEN EXTRACT(YEAR FROM created_at) = 2025 THEN 1 END) as albums_2025,
    string_agg(DISTINCT location_name, ', ') as locations
FROM public.albums
WHERE
    user_id = (SELECT auth.uid())
    AND latitude IS NOT NULL
    AND longitude IS NOT NULL;
*/

-- =============================================================================
-- 5. ADDITIONAL HELPER FUNCTIONS (OPTIONAL)
-- =============================================================================

-- Function to get available years with travel data
CREATE OR REPLACE FUNCTION public.get_user_travel_years(p_user_id UUID)
RETURNS TABLE (year INTEGER, album_count BIGINT)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID cannot be null';
    END IF;

    RETURN QUERY
    SELECT
        EXTRACT(YEAR FROM a.created_at)::INTEGER as year,
        COUNT(*)::BIGINT as album_count
    FROM public.albums a
    WHERE
        a.user_id = p_user_id
        AND a.latitude IS NOT NULL
        AND a.longitude IS NOT NULL
    GROUP BY EXTRACT(YEAR FROM a.created_at)
    ORDER BY year DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_user_travel_years(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_travel_years(UUID) FROM anon;

-- =============================================================================
-- DEPLOYMENT VERIFICATION
-- =============================================================================

-- After running this script, you should see success messages like:
-- ✅ CREATE FUNCTION
-- ✅ GRANT
-- ✅ CREATE INDEX (multiple)
-- ✅ CREATE POLICY (multiple)

-- Expected Frontend Results After Deployment:
-- Console Debug Info should show:
-- ✅ Available Years: 1
-- ✅ Current Year Locations: 3  (instead of 0)
-- ✅ Total Albums: 3           (instead of 0)
-- ✅ Pins on Globe: 3          (instead of 0)
-- ✅ With Coordinates: 3       (confirmed)

-- No more 400 errors on:
-- ✅ /rest/v1/rpc/get_user_travel_by_year

-- =============================================================================
-- DEPLOYMENT SUCCESS NOTIFICATION
-- =============================================================================
DO $$
BEGIN
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE '✅ CRITICAL PRODUCTION FIX DEPLOYMENT COMPLETE!';
    RAISE NOTICE '🌍 get_user_travel_by_year function: DEPLOYED';
    RAISE NOTICE '🔒 Row Level Security policies: ACTIVE';
    RAISE NOTICE '⚡ Performance indexes: CREATED';
    RAISE NOTICE '🧪 Test queries available above (uncomment to run)';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE '🚀 Your Adventure Log globe should now display 3 pins!';
    RAISE NOTICE '📍 Expected: 2 pins in Paris area, 1 pin in Munich area';
    RAISE NOTICE '✨ Refresh your /globe page to see the results';
    RAISE NOTICE '=============================================================================';
END $$;