-- Migration: Add get_user_travel_years function
-- Description: Function to get years where user has traveled (has albums with location data)
-- Date: 2025-10-03

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.get_user_travel_years(UUID);

-- Create function to get travel years for a user
CREATE OR REPLACE FUNCTION public.get_user_travel_years(p_user_id UUID)
RETURNS TABLE (year INTEGER, album_count BIGINT)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_travel_years(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.get_user_travel_years(UUID) IS 'Returns years where user has albums with location data';
