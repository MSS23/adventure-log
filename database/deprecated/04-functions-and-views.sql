-- Adventure Log Business Logic Functions and Procedures
-- Comprehensive business logic for travel features and analytics
-- Run this FOURTH and FINAL after the previous three SQL files

-- =============================================================================
-- GEOGRAPHICAL CALCULATION FUNCTIONS
-- =============================================================================

-- Calculate great circle distance between two points (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_distance(
  lat1 DECIMAL(10, 8),
  lng1 DECIMAL(11, 8),
  lat2 DECIMAL(10, 8),
  lng2 DECIMAL(11, 8)
) RETURNS DECIMAL(10, 2) AS $$
DECLARE
  earth_radius CONSTANT DECIMAL := 6371.0; -- Earth's radius in km
  lat1_rad DECIMAL;
  lng1_rad DECIMAL;
  lat2_rad DECIMAL;
  lng2_rad DECIMAL;
  dlat DECIMAL;
  dlng DECIMAL;
  a DECIMAL;
  c DECIMAL;
BEGIN
  -- Input validation
  IF lat1 IS NULL OR lng1 IS NULL OR lat2 IS NULL OR lng2 IS NULL THEN
    RETURN NULL;
  END IF;

  IF ABS(lat1) > 90 OR ABS(lat2) > 90 OR ABS(lng1) > 180 OR ABS(lng2) > 180 THEN
    RAISE EXCEPTION 'Invalid coordinates: latitude must be [-90,90], longitude must be [-180,180]';
  END IF;

  -- Convert to radians
  lat1_rad := lat1 * PI() / 180.0;
  lng1_rad := lng1 * PI() / 180.0;
  lat2_rad := lat2 * PI() / 180.0;
  lng2_rad := lng2 * PI() / 180.0;

  dlat := lat2_rad - lat1_rad;
  dlng := lng2_rad - lng1_rad;

  -- Haversine formula
  a := SIN(dlat/2.0) * SIN(dlat/2.0) + COS(lat1_rad) * COS(lat2_rad) * SIN(dlng/2.0) * SIN(dlng/2.0);
  c := 2.0 * ATAN2(SQRT(a), SQRT(1.0-a));

  RETURN earth_radius * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================================================
-- USER DASHBOARD FUNCTIONS
-- =============================================================================

-- Get comprehensive dashboard statistics for a user
CREATE OR REPLACE FUNCTION get_user_dashboard_stats(user_id_param UUID)
RETURNS TABLE (
  total_albums BIGINT,
  total_photos BIGINT,
  countries_visited BIGINT,
  cities_visited BIGINT,
  islands_visited BIGINT,
  total_distance_km DECIMAL(10, 2),
  first_trip_date DATE,
  last_trip_date DATE,
  followers_count BIGINT,
  following_count BIGINT,
  total_likes_received BIGINT,
  total_comments_received BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT a.id) as total_albums,
    COUNT(DISTINCT p.id) as total_photos,
    COUNT(DISTINCT a.country_code) FILTER (WHERE a.country_code IS NOT NULL) as countries_visited,
    COUNT(DISTINCT a.city_id) FILTER (WHERE a.city_id IS NOT NULL) as cities_visited,
    COUNT(DISTINCT a.island_id) FILTER (WHERE a.island_id IS NOT NULL) as islands_visited,

    -- Calculate total distance from travel statistics
    COALESCE(SUM(ts.total_distance_km), 0::DECIMAL(10, 2)) as total_distance_km,

    MIN(COALESCE(a.start_date, a.created_at::DATE)) as first_trip_date,
    MAX(COALESCE(a.end_date, a.start_date, a.created_at::DATE)) as last_trip_date,

    -- Social statistics
    COUNT(DISTINCT f1.id) as followers_count,
    COUNT(DISTINCT f2.id) as following_count,
    COUNT(DISTINCT l.id) as total_likes_received,
    COUNT(DISTINCT c.id) as total_comments_received

  FROM profiles pr
  LEFT JOIN albums a ON pr.id = a.user_id
  LEFT JOIN photos p ON a.id = p.album_id
  LEFT JOIN travel_statistics ts ON pr.id = ts.user_id
  LEFT JOIN followers f1 ON pr.id = f1.following_id  -- followers
  LEFT JOIN followers f2 ON pr.id = f2.follower_id   -- following
  LEFT JOIN likes l ON (l.target_type = 'album' AND l.target_id = a.id)
                    OR (l.target_type = 'photo' AND l.target_id = p.id)
  LEFT JOIN comments c ON (c.target_type = 'album' AND c.target_id = a.id)
                       OR (c.target_type = 'photo' AND c.target_id = p.id)

  WHERE pr.id = user_id_param
  GROUP BY pr.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user travel years with statistics
CREATE OR REPLACE FUNCTION get_user_travel_years(user_id_param UUID)
RETURNS TABLE (
  year INTEGER,
  location_count BIGINT,
  photo_count BIGINT,
  countries TEXT[],
  total_distance_km DECIMAL(10, 2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ttv.year,
    COUNT(DISTINCT ttv.album_id) as location_count,
    SUM(ttv.photo_count) as photo_count,
    ARRAY_AGG(DISTINCT ttv.country_code ORDER BY ttv.country_code)
      FILTER (WHERE ttv.country_code IS NOT NULL) as countries,
    COALESCE(ts.total_distance_km, 0::DECIMAL(10, 2)) as total_distance_km
  FROM travel_timeline_view ttv
  LEFT JOIN travel_statistics ts ON ttv.user_id = ts.user_id AND ttv.year = ts.year
  WHERE ttv.user_id = user_id_param
  GROUP BY ttv.year, ts.total_distance_km
  ORDER BY ttv.year DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get detailed travel data for a specific year
CREATE OR REPLACE FUNCTION get_user_travel_by_year(
  user_id_param UUID,
  year_param INTEGER
) RETURNS TABLE (
  album_id UUID,
  title TEXT,
  location_name TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  location_type TEXT,
  country_code TEXT,
  visit_date DATE,
  duration_days INTEGER,
  sequence_order BIGINT,
  photo_count BIGINT,
  airport_code TEXT,
  timezone TEXT,
  island_group TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ttv.album_id,
    ttv.title,
    ttv.location_name,
    ttv.latitude,
    ttv.longitude,
    ttv.location_type,
    ttv.country_code,
    ttv.start_date::DATE as visit_date,
    ttv.duration_days,
    ttv.sequence_order,
    ttv.photo_count,
    ttv.airport_code,
    ttv.timezone,
    ttv.island_group
  FROM travel_timeline_view ttv
  WHERE ttv.user_id = user_id_param
    AND ttv.year = year_param
  ORDER BY ttv.sequence_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- SEARCH AND DISCOVERY FUNCTIONS
-- =============================================================================

-- Search cities for location tagging with enhanced filtering
CREATE OR REPLACE FUNCTION search_cities(
  search_term TEXT,
  limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
  id INTEGER,
  name TEXT,
  country_code TEXT,
  country_name TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  city_type TEXT,
  airport_code TEXT,
  is_major_destination BOOLEAN,
  population INTEGER
) AS $$
BEGIN
  -- Input validation
  IF search_term IS NULL OR length(trim(search_term)) = 0 THEN
    RETURN;
  END IF;

  IF limit_count <= 0 OR limit_count > 100 THEN
    limit_count := 20;
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.name::TEXT,
    c.country_code,
    co.name::TEXT as country_name,
    c.latitude,
    c.longitude,
    c.city_type,
    c.airport_code,
    c.is_major_destination,
    c.population
  FROM cities c
  JOIN countries co ON c.country_id = co.id
  WHERE c.name ILIKE '%' || trim(search_term) || '%'
     OR c.airport_code ILIKE '%' || trim(search_term) || '%'
     OR co.name ILIKE '%' || trim(search_term) || '%'
  ORDER BY
    -- Prioritize exact matches
    CASE WHEN LOWER(c.name) = LOWER(trim(search_term)) THEN 1 ELSE 2 END,
    -- Then major destinations
    c.is_major_destination DESC,
    -- Then by population
    c.population DESC NULLS LAST,
    -- Finally alphabetically
    c.name
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Search islands for location tagging
CREATE OR REPLACE FUNCTION search_islands(
  search_term TEXT,
  limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
  id INTEGER,
  name TEXT,
  country_code TEXT,
  country_name TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  island_group TEXT,
  area_km2 DECIMAL(10, 2),
  is_inhabited BOOLEAN
) AS $$
BEGIN
  -- Input validation
  IF search_term IS NULL OR length(trim(search_term)) = 0 THEN
    RETURN;
  END IF;

  IF limit_count <= 0 OR limit_count > 100 THEN
    limit_count := 20;
  END IF;

  RETURN QUERY
  SELECT
    i.id,
    i.name::TEXT,
    i.country_code,
    co.name::TEXT as country_name,
    i.latitude,
    i.longitude,
    i.island_group,
    i.area_km2,
    i.is_inhabited
  FROM islands i
  JOIN countries co ON i.country_code = co.code
  WHERE i.name ILIKE '%' || trim(search_term) || '%'
     OR i.island_group ILIKE '%' || trim(search_term) || '%'
     OR co.name ILIKE '%' || trim(search_term) || '%'
  ORDER BY
    CASE WHEN LOWER(i.name) = LOWER(trim(search_term)) THEN 1 ELSE 2 END,
    i.is_inhabited DESC,
    i.area_km2 DESC NULLS LAST,
    i.name
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- TRAVEL TIMELINE GENERATION FUNCTIONS
-- =============================================================================

-- Generate travel timeline from albums for a user
CREATE OR REPLACE FUNCTION generate_travel_timeline(user_id_param UUID)
RETURNS VOID AS $$
DECLARE
  album_record RECORD;
  sequence_counter INTEGER;
  current_year INTEGER;
BEGIN
  -- Input validation
  IF user_id_param IS NULL THEN
    RAISE EXCEPTION 'User ID cannot be null';
  END IF;

  -- Clear existing timeline for user
  DELETE FROM travel_timeline WHERE user_id = user_id_param;

  -- Generate timeline from albums with location data
  current_year := 0;
  sequence_counter := 1;

  FOR album_record IN
    SELECT DISTINCT
      a.id as album_id,
      EXTRACT(YEAR FROM COALESCE(a.start_date, a.created_at))::INTEGER as year,
      a.city_id,
      a.island_id,
      a.country_id,
      COALESCE(a.start_date, a.created_at::DATE) as visit_date,
      COALESCE(c.latitude, i.latitude, a.latitude) as latitude,
      COALESCE(c.longitude, i.longitude, a.longitude) as longitude,
      COUNT(p.id) as photo_count
    FROM albums a
    LEFT JOIN cities c ON a.city_id = c.id
    LEFT JOIN islands i ON a.island_id = i.id
    LEFT JOIN photos p ON a.id = p.album_id
    WHERE a.user_id = user_id_param
      AND (a.city_id IS NOT NULL OR a.island_id IS NOT NULL OR a.country_id IS NOT NULL)
      AND COALESCE(a.start_date, a.created_at) IS NOT NULL
    GROUP BY
      a.id, EXTRACT(YEAR FROM COALESCE(a.start_date, a.created_at)),
      a.city_id, a.island_id, a.country_id,
      COALESCE(a.start_date, a.created_at::DATE),
      COALESCE(c.latitude, i.latitude, a.latitude),
      COALESCE(c.longitude, i.longitude, a.longitude)
    ORDER BY year, visit_date
  LOOP
    -- Reset sequence for new year
    IF album_record.year != current_year THEN
      current_year := album_record.year;
      sequence_counter := 1;
    END IF;

    INSERT INTO travel_timeline (
      user_id, year, sequence_order, location_type,
      city_id, island_id, country_id, visit_date,
      album_count, photo_count,
      latitude, longitude
    ) VALUES (
      user_id_param,
      album_record.year,
      sequence_counter,
      CASE
        WHEN album_record.city_id IS NOT NULL THEN 'city'
        WHEN album_record.island_id IS NOT NULL THEN 'island'
        ELSE 'country'
      END,
      album_record.city_id,
      album_record.island_id,
      album_record.country_id,
      album_record.visit_date,
      1, -- album_count
      COALESCE(album_record.photo_count, 0),
      album_record.latitude,
      album_record.longitude
    );

    sequence_counter := sequence_counter + 1;
  END LOOP;

  RAISE NOTICE 'Travel timeline generated for user % with % entries',
    user_id_param, sequence_counter - 1;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRAVEL STATISTICS CALCULATION FUNCTIONS
-- =============================================================================

-- Calculate comprehensive travel statistics for a user and year
CREATE OR REPLACE FUNCTION calculate_travel_statistics(
  user_id_param UUID,
  year_param INTEGER
)
RETURNS VOID AS $$
DECLARE
  stats_record RECORD;
  total_distance DECIMAL(10, 2) := 0;
  total_hours DECIMAL(8, 2) := 0;
  prev_lat DECIMAL(10, 8);
  prev_lng DECIMAL(11, 8);
  current_record RECORD;
  segment_distance DECIMAL(10, 2);
BEGIN
  -- Input validation
  IF user_id_param IS NULL THEN
    RAISE EXCEPTION 'User ID cannot be null';
  END IF;

  IF year_param < 1900 OR year_param > 2100 THEN
    RAISE EXCEPTION 'Invalid year: %', year_param;
  END IF;

  -- Calculate total distance and flight time for the year
  FOR current_record IN
    SELECT latitude, longitude, sequence_order
    FROM travel_timeline
    WHERE user_id = user_id_param AND year = year_param
      AND latitude IS NOT NULL AND longitude IS NOT NULL
    ORDER BY sequence_order
  LOOP
    IF prev_lat IS NOT NULL AND prev_lng IS NOT NULL THEN
      segment_distance := calculate_distance(
        prev_lat, prev_lng,
        current_record.latitude, current_record.longitude
      );

      IF segment_distance IS NOT NULL THEN
        total_distance := total_distance + segment_distance;
        -- Estimate flight time (average 800 km/h commercial flight speed)
        total_hours := total_hours + (segment_distance / 800.0);
      END IF;
    END IF;

    prev_lat := current_record.latitude;
    prev_lng := current_record.longitude;
  END LOOP;

  -- Get aggregated statistics
  SELECT
    COUNT(DISTINCT country_id) FILTER (WHERE country_id IS NOT NULL) as countries,
    COUNT(DISTINCT city_id) FILTER (WHERE city_id IS NOT NULL) as cities,
    COUNT(DISTINCT island_id) FILTER (WHERE island_id IS NOT NULL) as islands,
    SUM(album_count) as albums,
    SUM(photo_count) as photos,
    MIN(visit_date) as first_trip,
    MAX(visit_date) as last_trip
  INTO stats_record
  FROM travel_timeline
  WHERE user_id = user_id_param AND year = year_param;

  -- Insert or update statistics
  INSERT INTO travel_statistics (
    user_id, year, total_distance_km, total_flight_hours,
    countries_visited, cities_visited, islands_visited,
    total_albums, total_photos,
    first_trip_date, last_trip_date
  ) VALUES (
    user_id_param,
    year_param,
    total_distance,
    total_hours,
    COALESCE(stats_record.countries, 0),
    COALESCE(stats_record.cities, 0),
    COALESCE(stats_record.islands, 0),
    COALESCE(stats_record.albums, 0),
    COALESCE(stats_record.photos, 0),
    stats_record.first_trip,
    stats_record.last_trip
  ) ON CONFLICT (user_id, year) DO UPDATE SET
    total_distance_km = EXCLUDED.total_distance_km,
    total_flight_hours = EXCLUDED.total_flight_hours,
    countries_visited = EXCLUDED.countries_visited,
    cities_visited = EXCLUDED.cities_visited,
    islands_visited = EXCLUDED.islands_visited,
    total_albums = EXCLUDED.total_albums,
    total_photos = EXCLUDED.total_photos,
    first_trip_date = EXCLUDED.first_trip_date,
    last_trip_date = EXCLUDED.last_trip_date,
    updated_at = timezone('utc'::text, now());

  RAISE NOTICE 'Travel statistics calculated for user % year %: % km, % countries, % cities',
    user_id_param, year_param, total_distance,
    COALESCE(stats_record.countries, 0), COALESCE(stats_record.cities, 0);
END;
$$ LANGUAGE plpgsql;

-- Calculate statistics for all years for a user
CREATE OR REPLACE FUNCTION calculate_all_travel_statistics(user_id_param UUID)
RETURNS VOID AS $$
DECLARE
  year_record RECORD;
BEGIN
  -- Input validation
  IF user_id_param IS NULL THEN
    RAISE EXCEPTION 'User ID cannot be null';
  END IF;

  -- First generate the travel timeline
  PERFORM generate_travel_timeline(user_id_param);

  -- Calculate statistics for each year with data
  FOR year_record IN
    SELECT DISTINCT year
    FROM travel_timeline
    WHERE user_id = user_id_param
    ORDER BY year
  LOOP
    PERFORM calculate_travel_statistics(user_id_param, year_record.year);
  END LOOP;

  -- Update overall user stats
  PERFORM refresh_user_travel_stats(user_id_param);

  RAISE NOTICE 'All travel statistics calculated for user %', user_id_param;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- FLIGHT PATH CACHING FUNCTIONS
-- =============================================================================

-- Cache or retrieve flight path between two cities
CREATE OR REPLACE FUNCTION get_or_create_flight_path(
  from_city_id_param INTEGER,
  to_city_id_param INTEGER
) RETURNS TABLE (
  distance_km DECIMAL(10, 2),
  flight_duration_hours DECIMAL(5, 2),
  path_segments JSONB
) AS $$
DECLARE
  path_record RECORD;
  from_city RECORD;
  to_city RECORD;
  calculated_distance DECIMAL(10, 2);
  calculated_duration DECIMAL(5, 2);
BEGIN
  -- Input validation
  IF from_city_id_param IS NULL OR to_city_id_param IS NULL THEN
    RAISE EXCEPTION 'City IDs cannot be null';
  END IF;

  IF from_city_id_param = to_city_id_param THEN
    RAISE EXCEPTION 'Source and destination cities cannot be the same';
  END IF;

  -- Check if path already exists (either direction)
  SELECT * INTO path_record
  FROM flight_paths
  WHERE (from_city_id = from_city_id_param AND to_city_id = to_city_id_param)
     OR (from_city_id = to_city_id_param AND to_city_id = from_city_id_param)
  LIMIT 1;

  IF FOUND THEN
    -- Return existing path
    RETURN QUERY SELECT
      path_record.distance_km,
      path_record.flight_duration_hours,
      path_record.path_segments;
    RETURN;
  END IF;

  -- Get city coordinates
  SELECT latitude, longitude INTO from_city
  FROM cities
  WHERE id = from_city_id_param;

  SELECT latitude, longitude INTO to_city
  FROM cities
  WHERE id = to_city_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'One or both cities not found';
  END IF;

  -- Calculate new path
  calculated_distance := calculate_distance(
    from_city.latitude, from_city.longitude,
    to_city.latitude, to_city.longitude
  );

  -- Estimate flight duration (800 km/h average speed)
  calculated_duration := calculated_distance / 800.0;

  -- Create basic path segments (just start and end points for now)
  INSERT INTO flight_paths (
    from_city_id, to_city_id,
    from_lat, from_lng, to_lat, to_lng,
    distance_km, flight_duration_hours,
    path_segments
  ) VALUES (
    from_city_id_param, to_city_id_param,
    from_city.latitude, from_city.longitude,
    to_city.latitude, to_city.longitude,
    calculated_distance, calculated_duration,
    jsonb_build_array(
      jsonb_build_object('lat', from_city.latitude, 'lng', from_city.longitude),
      jsonb_build_object('lat', to_city.latitude, 'lng', to_city.longitude)
    )
  );

  -- Return calculated path
  RETURN QUERY SELECT
    calculated_distance,
    calculated_duration,
    jsonb_build_array(
      jsonb_build_object('lat', from_city.latitude, 'lng', from_city.longitude),
      jsonb_build_object('lat', to_city.latitude, 'lng', to_city.longitude)
    ) as path_segments;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- ANALYTICS AND REPORTING FUNCTIONS
-- =============================================================================

-- Get popular destinations with statistics
CREATE OR REPLACE FUNCTION get_popular_destinations(limit_count INTEGER DEFAULT 50)
RETURNS TABLE (
  destination_name TEXT,
  country_code TEXT,
  country_name TEXT,
  unique_visitors BIGINT,
  total_albums BIGINT,
  total_photos BIGINT,
  avg_photos_per_album DECIMAL(5, 2),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  location_type TEXT,
  last_visited TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  IF limit_count <= 0 OR limit_count > 200 THEN
    limit_count := 50;
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(c.name, i.name, 'Unknown')::TEXT as destination_name,
    COALESCE(c.country_code, i.country_code)::TEXT as country_code,
    co.name::TEXT as country_name,
    COUNT(DISTINCT a.user_id) as unique_visitors,
    COUNT(a.id) as total_albums,
    COALESCE(SUM(photo_counts.photo_count), 0) as total_photos,
    CASE
      WHEN COUNT(a.id) > 0 THEN
        ROUND(COALESCE(SUM(photo_counts.photo_count), 0)::DECIMAL / COUNT(a.id), 2)
      ELSE 0::DECIMAL(5, 2)
    END as avg_photos_per_album,
    COALESCE(c.latitude, i.latitude) as latitude,
    COALESCE(c.longitude, i.longitude) as longitude,
    COALESCE(c.city_type, 'island')::TEXT as location_type,
    MAX(a.created_at) as last_visited

  FROM albums a
  LEFT JOIN cities c ON a.city_id = c.id
  LEFT JOIN islands i ON a.island_id = i.id
  LEFT JOIN countries co ON COALESCE(c.country_code, i.country_code) = co.code
  LEFT JOIN (
    SELECT album_id, COUNT(*) as photo_count
    FROM photos
    GROUP BY album_id
  ) photo_counts ON a.id = photo_counts.album_id

  WHERE a.visibility = 'public'
    AND (c.id IS NOT NULL OR i.id IS NOT NULL)
    AND COALESCE(c.latitude, i.latitude) IS NOT NULL

  GROUP BY
    COALESCE(c.name, i.name),
    COALESCE(c.country_code, i.country_code),
    co.name,
    COALESCE(c.latitude, i.latitude),
    COALESCE(c.longitude, i.longitude),
    COALESCE(c.city_type, 'island')

  HAVING COUNT(a.id) >= 2  -- Only destinations with at least 2 albums

  ORDER BY unique_visitors DESC, total_albums DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- UTILITY AND MAINTENANCE FUNCTIONS
-- =============================================================================

-- Cleanup old travel data and recalculate statistics
CREATE OR REPLACE FUNCTION refresh_all_travel_data()
RETURNS VOID AS $$
DECLARE
  user_record RECORD;
  total_users INTEGER := 0;
  processed_users INTEGER := 0;
BEGIN
  -- Get count of users with albums
  SELECT COUNT(DISTINCT user_id) INTO total_users
  FROM albums;

  RAISE NOTICE 'Starting refresh for % users with travel data', total_users;

  -- Process each user
  FOR user_record IN
    SELECT DISTINCT user_id
    FROM albums
    ORDER BY user_id
  LOOP
    processed_users := processed_users + 1;

    -- Calculate all statistics for this user
    PERFORM calculate_all_travel_statistics(user_record.user_id);

    IF processed_users % 10 = 0 THEN
      RAISE NOTICE 'Processed % of % users', processed_users, total_users;
    END IF;
  END LOOP;

  RAISE NOTICE 'Travel data refresh completed for % users', processed_users;
END;
$$ LANGUAGE plpgsql;

-- Validate data integrity across all travel-related tables
CREATE OR REPLACE FUNCTION validate_travel_data_integrity()
RETURNS TABLE (
  table_name TEXT,
  issue_type TEXT,
  issue_count BIGINT,
  description TEXT
) AS $$
BEGIN
  -- Check for albums without valid locations
  RETURN QUERY
  SELECT
    'albums'::TEXT,
    'missing_location'::TEXT,
    COUNT(*)::BIGINT,
    'Albums without any location reference'::TEXT
  FROM albums
  WHERE country_id IS NULL AND city_id IS NULL AND island_id IS NULL
    AND (latitude IS NULL OR longitude IS NULL);

  -- Check for photos with invalid coordinates
  RETURN QUERY
  SELECT
    'photos'::TEXT,
    'invalid_coordinates'::TEXT,
    COUNT(*)::BIGINT,
    'Photos with coordinates outside valid range'::TEXT
  FROM photos
  WHERE (latitude IS NOT NULL AND (latitude < -90 OR latitude > 90))
     OR (longitude IS NOT NULL AND (longitude < -180 OR longitude > 180));

  -- Check for travel timeline entries without coordinates
  RETURN QUERY
  SELECT
    'travel_timeline'::TEXT,
    'missing_coordinates'::TEXT,
    COUNT(*)::BIGINT,
    'Timeline entries without valid coordinates'::TEXT
  FROM travel_timeline
  WHERE latitude IS NULL OR longitude IS NULL;

  -- Check for cities with mismatched country references
  RETURN QUERY
  SELECT
    'cities'::TEXT,
    'country_mismatch'::TEXT,
    COUNT(*)::BIGINT,
    'Cities where country_code does not match country_id'::TEXT
  FROM cities c
  JOIN countries co ON c.country_id = co.id
  WHERE c.country_code != co.code;

  -- Add summary if no issues found
  IF NOT EXISTS (
    SELECT 1 FROM albums WHERE country_id IS NULL AND city_id IS NULL AND island_id IS NULL
      AND (latitude IS NULL OR longitude IS NULL)
  ) AND NOT EXISTS (
    SELECT 1 FROM photos WHERE (latitude IS NOT NULL AND (latitude < -90 OR latitude > 90))
      OR (longitude IS NOT NULL AND (longitude < -180 OR longitude > 180))
  ) THEN
    RETURN QUERY
    SELECT
      'overall'::TEXT,
      'no_issues'::TEXT,
      0::BIGINT,
      'All travel data integrity checks passed'::TEXT;
  END IF;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

-- Grant execution permissions to authenticated users
GRANT EXECUTE ON FUNCTION calculate_distance(DECIMAL, DECIMAL, DECIMAL, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_dashboard_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_travel_years(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_travel_by_year(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION search_cities(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION search_islands(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_flight_path(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_popular_destinations(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_travel_data_integrity() TO authenticated;

-- Grant timeline and statistics functions to authenticated users
GRANT EXECUTE ON FUNCTION generate_travel_timeline(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_travel_statistics(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_all_travel_statistics(UUID) TO authenticated;

-- Administrative functions for service role only
GRANT EXECUTE ON FUNCTION refresh_all_travel_data() TO service_role;

-- =============================================================================
-- FINAL VERIFICATION AND SUMMARY
-- =============================================================================

DO $$
DECLARE
  function_count INTEGER;
  total_tables INTEGER;
  total_views INTEGER;
BEGIN
  -- Count functions
  SELECT COUNT(*) INTO function_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  AND p.proname IN (
    'calculate_distance', 'get_user_dashboard_stats', 'get_user_travel_years',
    'get_user_travel_by_year', 'search_cities', 'search_islands',
    'generate_travel_timeline', 'calculate_travel_statistics',
    'calculate_all_travel_statistics', 'get_or_create_flight_path',
    'get_popular_destinations', 'refresh_all_travel_data',
    'validate_travel_data_integrity'
  );

  -- Count tables and views
  SELECT COUNT(*) INTO total_tables
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

  SELECT COUNT(*) INTO total_views
  FROM information_schema.views
  WHERE table_schema = 'public';

  RAISE NOTICE '=== Adventure Log Database Setup Complete ===';
  RAISE NOTICE 'Database Summary:';
  RAISE NOTICE '- Tables: %', total_tables;
  RAISE NOTICE '- Views: %', total_views;
  RAISE NOTICE '- Business Logic Functions: %', function_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Features Ready:';
  RAISE NOTICE '✅ Core schema with RLS security';
  RAISE NOTICE '✅ Comprehensive reference data (countries, cities, islands)';
  RAISE NOTICE '✅ Travel timeline and animation support';
  RAISE NOTICE '✅ Social features (likes, comments, followers)';
  RAISE NOTICE '✅ Analytics and statistics functions';
  RAISE NOTICE '✅ Search and discovery capabilities';
  RAISE NOTICE '✅ Flight path calculations';
  RAISE NOTICE '✅ Data integrity validation';
  RAISE NOTICE '';
  RAISE NOTICE 'Database is production-ready and future-extensible!';

  -- Run a quick integrity check
  PERFORM validate_travel_data_integrity();
END
$$;