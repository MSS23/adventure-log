-- Fix get_user_travel_by_year function type mismatch
-- Issue: Function was returning VARCHAR/CHAR columns as TEXT without explicit casting
-- This caused PostgreSQL error 42804: "structure of query does not match function result type"

CREATE OR REPLACE FUNCTION get_user_travel_by_year(user_id_param UUID, year_param INTEGER)
RETURNS TABLE (
  album_id UUID,
  location_name TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  location_type TEXT,
  visit_date TIMESTAMP WITH TIME ZONE,
  sequence_order INTEGER,
  photo_count BIGINT,
  country_code TEXT,
  duration_days INTEGER,
  airport_code TEXT,
  timezone TEXT,
  island_group TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id as album_id,
    COALESCE(a.location_name, c.name, co.name, 'Unknown Location')::TEXT as location_name,
    a.latitude,
    a.longitude,
    CASE
      WHEN a.city_id IS NOT NULL THEN 'city'
      WHEN a.island_id IS NOT NULL THEN 'island'
      WHEN a.country_id IS NOT NULL THEN 'country'
      ELSE 'unknown'
    END::TEXT as location_type,
    a.created_at as visit_date,
    ROW_NUMBER() OVER (ORDER BY a.created_at)::INTEGER as sequence_order,
    COUNT(p.id) as photo_count,
    a.country_code::TEXT,
    1 as duration_days, -- Default to 1 day
    NULL::TEXT as airport_code,
    NULL::TEXT as timezone,
    i.island_group::TEXT
  FROM albums a
  LEFT JOIN photos p ON a.id = p.album_id
  LEFT JOIN cities c ON a.city_id = c.id
  LEFT JOIN countries co ON a.country_id = co.id
  LEFT JOIN islands i ON a.island_id = i.id
  WHERE a.user_id = user_id_param
    AND EXTRACT(YEAR FROM a.created_at) = year_param
    AND a.latitude IS NOT NULL
    AND a.longitude IS NOT NULL
  GROUP BY a.id, a.location_name, a.country_code, a.latitude, a.longitude, a.created_at, a.city_id, a.island_id, a.country_id, c.name, co.name, i.island_group
  ORDER BY a.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION get_user_travel_by_year IS 'Fixed version - explicitly casts VARCHAR/CHAR columns to TEXT to match return type';
