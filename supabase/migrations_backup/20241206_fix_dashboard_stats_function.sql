-- Fix get_user_dashboard_stats function to return correct column names
-- The TypeScript interface expects citiesExplored, not cities_visited

DROP FUNCTION IF EXISTS get_user_dashboard_stats(UUID);

CREATE OR REPLACE FUNCTION get_user_dashboard_stats(user_id_param UUID)
RETURNS TABLE (
  total_albums BIGINT,
  total_photos BIGINT,
  countries_visited BIGINT,
  cities_explored BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM albums WHERE user_id = user_id_param AND status != 'draft') as total_albums,
    (SELECT COUNT(*) FROM photos WHERE user_id = user_id_param) as total_photos,
    (SELECT COUNT(DISTINCT country_code) FROM albums WHERE user_id = user_id_param AND country_code IS NOT NULL AND status != 'draft') as countries_visited,
    (SELECT COUNT(DISTINCT location_name) FROM albums WHERE user_id = user_id_param AND location_name IS NOT NULL AND status != 'draft') as cities_explored;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
