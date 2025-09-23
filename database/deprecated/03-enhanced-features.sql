-- Adventure Log Enhanced Features - Views and Advanced Functionality
-- Travel animation, timeline views, and performance optimizations
-- Run this THIRD after 01-core-schema.sql and 02-reference-data.sql

-- =============================================================================
-- TRAVEL TIMELINE VIEW
-- =============================================================================

-- Enhanced travel timeline view for chronological ordering and animation
CREATE OR REPLACE VIEW travel_timeline_view AS
SELECT
  a.id as album_id,
  a.user_id,
  a.title,
  a.start_date,
  a.end_date,

  -- Location data with fallback hierarchy
  COALESCE(c.latitude, i.latitude, a.latitude) as latitude,
  COALESCE(c.longitude, i.longitude, a.longitude) as longitude,
  COALESCE(c.name, i.name, a.location_name) as location_name,
  COALESCE(c.country_code, i.country_code, a.country_code) as country_code,

  -- Time calculations
  EXTRACT(YEAR FROM COALESCE(a.start_date, a.created_at))::INTEGER as year,
  EXTRACT(MONTH FROM COALESCE(a.start_date, a.created_at))::INTEGER as month,
  EXTRACT(DAY FROM COALESCE(a.start_date, a.created_at))::INTEGER as day,

  -- Location type and metadata
  COALESCE(c.city_type,
    CASE WHEN i.id IS NOT NULL THEN 'island' ELSE 'country' END
  ) as location_type,
  c.airport_code,
  c.timezone,
  i.island_group,

  -- Statistics
  COUNT(p.id) as photo_count,
  CASE
    WHEN a.end_date IS NOT NULL THEN
      (a.end_date - a.start_date) + 1
    ELSE 1
  END as duration_days,

  -- Sequence ordering for animation
  ROW_NUMBER() OVER (
    PARTITION BY a.user_id, EXTRACT(YEAR FROM COALESCE(a.start_date, a.created_at))
    ORDER BY COALESCE(a.start_date, a.created_at)
  ) as sequence_order

FROM albums a
LEFT JOIN cities c ON a.city_id = c.id
LEFT JOIN islands i ON a.island_id = i.id
LEFT JOIN photos p ON a.id = p.album_id

WHERE COALESCE(a.start_date, a.created_at) IS NOT NULL
  AND (a.latitude IS NOT NULL OR c.latitude IS NOT NULL OR i.latitude IS NOT NULL)

GROUP BY
  a.id, a.user_id, a.title, a.start_date, a.end_date,
  c.id, c.latitude, c.longitude, c.name, c.country_code, c.city_type, c.airport_code, c.timezone,
  i.id, i.latitude, i.longitude, i.name, i.country_code, i.island_group,
  a.latitude, a.longitude, a.location_name, a.country_code

ORDER BY a.user_id, COALESCE(a.start_date, a.created_at);

-- =============================================================================
-- TRAVEL ANIMATION DATA VIEW
-- =============================================================================

-- Simplified view optimized for flight animation frontend
CREATE OR REPLACE VIEW travel_animation_data AS
SELECT
  tl.user_id,
  tl.year,
  tl.sequence_order,
  tl.visit_date,

  -- Location information
  COALESCE(c.name, i.name, ct.name) as location_name,
  COALESCE(c.city_type,
    CASE WHEN i.id IS NOT NULL THEN 'island' ELSE 'country' END
  ) as location_type,
  tl.latitude,
  tl.longitude,

  -- Travel statistics
  tl.album_count,
  tl.photo_count,

  -- Reference data
  ct.name as country_name,
  c.airport_code,
  c.timezone,
  i.island_group

FROM travel_timeline tl
LEFT JOIN cities c ON tl.city_id = c.id
LEFT JOIN islands i ON tl.island_id = i.id
LEFT JOIN countries ct ON tl.country_id = ct.id

ORDER BY tl.user_id, tl.year, tl.sequence_order;

-- =============================================================================
-- USER DASHBOARD STATISTICS VIEW
-- =============================================================================

-- Comprehensive user statistics view for dashboard
CREATE OR REPLACE VIEW user_dashboard_stats AS
SELECT
  p.id as user_id,
  p.username,
  p.display_name,

  -- Album statistics
  COUNT(DISTINCT a.id) as total_albums,
  COUNT(DISTINCT CASE WHEN a.visibility = 'public' THEN a.id END) as public_albums,

  -- Photo statistics
  COUNT(DISTINCT ph.id) as total_photos,

  -- Location statistics
  COUNT(DISTINCT a.country_code) as countries_visited,
  COUNT(DISTINCT a.city_id) as cities_visited,
  COUNT(DISTINCT a.island_id) as islands_visited,

  -- Time span
  MIN(COALESCE(a.start_date, a.created_at)) as first_trip_date,
  MAX(COALESCE(a.end_date, a.start_date, a.created_at)) as last_trip_date,

  -- Activity metrics
  (MAX(a.created_at)::DATE - MIN(a.created_at)::DATE) as active_days,

  -- Social statistics
  COUNT(DISTINCT l.id) as total_likes_received,
  COUNT(DISTINCT c.id) as total_comments_received,
  COUNT(DISTINCT f1.id) as followers_count,
  COUNT(DISTINCT f2.id) as following_count

FROM profiles p
LEFT JOIN albums a ON p.id = a.user_id
LEFT JOIN photos ph ON a.id = ph.album_id
LEFT JOIN likes l ON (l.target_type = 'album' AND l.target_id = a.id)
                   OR (l.target_type = 'photo' AND l.target_id = ph.id)
LEFT JOIN comments c ON (c.target_type = 'album' AND c.target_id = a.id)
                      OR (c.target_type = 'photo' AND c.target_id = ph.id)
LEFT JOIN followers f1 ON p.id = f1.following_id  -- followers
LEFT JOIN followers f2 ON p.id = f2.follower_id   -- following

GROUP BY p.id, p.username, p.display_name;

-- =============================================================================
-- TRAVEL YEARS SUMMARY VIEW
-- =============================================================================

-- Summary of travel activity by year for users
CREATE OR REPLACE VIEW travel_years_summary AS
SELECT
  ttv.user_id,
  ttv.year,
  COUNT(DISTINCT ttv.album_id) as location_count,
  SUM(ttv.photo_count) as total_photos,
  COUNT(DISTINCT ttv.country_code) as countries_count,
  ARRAY_AGG(DISTINCT ttv.country_code ORDER BY ttv.country_code)
    FILTER (WHERE ttv.country_code IS NOT NULL) as countries_visited,

  -- Distance calculation placeholder (can be implemented in app layer)
  0::DECIMAL(10,2) as estimated_distance_km,

  MIN(ttv.start_date) as first_trip_date,
  MAX(COALESCE(ttv.end_date, ttv.start_date)) as last_trip_date

FROM travel_timeline_view ttv
GROUP BY ttv.user_id, ttv.year
ORDER BY ttv.user_id, ttv.year DESC;

-- =============================================================================
-- POPULAR DESTINATIONS VIEW
-- =============================================================================

-- Track popular destinations across all users
CREATE OR REPLACE VIEW popular_destinations AS
SELECT
  COALESCE(c.name, i.name, 'Unknown') as destination_name,
  COALESCE(c.country_code, i.country_code) as country_code,
  COUNT(DISTINCT a.user_id) as unique_visitors,
  COUNT(a.id) as total_albums,
  SUM(photo_counts.photo_count) as total_photos,
  AVG(photo_counts.photo_count) as avg_photos_per_album,

  -- Location data
  COALESCE(c.latitude, i.latitude) as latitude,
  COALESCE(c.longitude, i.longitude) as longitude,
  COALESCE(c.city_type, 'island') as location_type,
  c.airport_code,
  i.island_group,

  -- Recent activity
  MAX(a.created_at) as last_visited,
  COUNT(CASE WHEN a.created_at >= NOW() - INTERVAL '1 year' THEN 1 END) as visits_last_year

FROM albums a
LEFT JOIN cities c ON a.city_id = c.id
LEFT JOIN islands i ON a.island_id = i.id
LEFT JOIN (
  SELECT album_id, COUNT(*) as photo_count
  FROM photos
  GROUP BY album_id
) photo_counts ON a.id = photo_counts.album_id

WHERE a.visibility = 'public'
  AND (c.id IS NOT NULL OR i.id IS NOT NULL)

GROUP BY
  COALESCE(c.name, i.name, 'Unknown'),
  COALESCE(c.country_code, i.country_code),
  COALESCE(c.latitude, i.latitude),
  COALESCE(c.longitude, i.longitude),
  COALESCE(c.city_type, 'island'),
  c.airport_code,
  i.island_group

HAVING COUNT(a.id) >= 3  -- Only destinations with at least 3 albums

ORDER BY unique_visitors DESC, total_albums DESC;

-- =============================================================================
-- ENHANCED PERFORMANCE INDEXES
-- =============================================================================

-- Travel timeline optimizations
CREATE INDEX IF NOT EXISTS idx_travel_timeline_coordinates
ON travel_timeline(latitude, longitude) WHERE latitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_travel_timeline_location_type
ON travel_timeline(location_type, user_id);

CREATE INDEX IF NOT EXISTS idx_travel_timeline_visit_date
ON travel_timeline(visit_date) WHERE visit_date IS NOT NULL;

-- Album location indexes for views
CREATE INDEX IF NOT EXISTS idx_albums_location_complete
ON albums(user_id, start_date, city_id, island_id)
WHERE start_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_albums_public_with_location
ON albums(visibility, city_id, island_id)
WHERE visibility = 'public';

-- Photo aggregation indexes
CREATE INDEX IF NOT EXISTS idx_photos_album_user
ON photos(album_id, user_id);

-- Social features indexes for dashboard
CREATE INDEX IF NOT EXISTS idx_likes_target_lookup
ON likes(target_type, target_id, user_id);

CREATE INDEX IF NOT EXISTS idx_comments_target_lookup
ON comments(target_type, target_id, user_id);

-- Flight paths optimization
CREATE INDEX IF NOT EXISTS idx_flight_paths_reverse
ON flight_paths(to_city_id, from_city_id);

CREATE INDEX IF NOT EXISTS idx_flight_paths_distance
ON flight_paths(distance_km) WHERE distance_km IS NOT NULL;

-- =============================================================================
-- MATERIALIZED VIEW REFRESH FUNCTIONS
-- =============================================================================

-- Function to refresh user travel statistics
CREATE OR REPLACE FUNCTION refresh_user_travel_stats(user_id_param UUID DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
  -- If specific user, update only that user
  IF user_id_param IS NOT NULL THEN
    INSERT INTO user_travel_stats (
      user_id, countries_visited, cities_visited, islands_visited,
      total_photos, total_albums, first_trip_date, last_trip_date,
      total_distance_km
    )
    SELECT
      p.id,
      COALESCE(stats.countries_visited, 0),
      COALESCE(stats.cities_visited, 0),
      COALESCE(stats.islands_visited, 0),
      COALESCE(stats.total_photos, 0),
      COALESCE(stats.total_albums, 0),
      stats.first_trip_date,
      stats.last_trip_date,
      COALESCE(stats.total_distance_km, 0)
    FROM profiles p
    LEFT JOIN (
      SELECT
        uds.user_id,
        uds.countries_visited,
        uds.cities_visited,
        uds.islands_visited,
        uds.total_photos,
        uds.total_albums,
        uds.first_trip_date,
        uds.last_trip_date,
        COALESCE(SUM(tys.estimated_distance_km), 0) as total_distance_km
      FROM user_dashboard_stats uds
      LEFT JOIN travel_years_summary tys ON uds.user_id = tys.user_id
      WHERE uds.user_id = user_id_param
      GROUP BY uds.user_id, uds.countries_visited, uds.cities_visited,
               uds.islands_visited, uds.total_photos, uds.total_albums,
               uds.first_trip_date, uds.last_trip_date
    ) stats ON p.id = stats.user_id
    WHERE p.id = user_id_param

    ON CONFLICT (user_id) DO UPDATE SET
      countries_visited = EXCLUDED.countries_visited,
      cities_visited = EXCLUDED.cities_visited,
      islands_visited = EXCLUDED.islands_visited,
      total_photos = EXCLUDED.total_photos,
      total_albums = EXCLUDED.total_albums,
      first_trip_date = EXCLUDED.first_trip_date,
      last_trip_date = EXCLUDED.last_trip_date,
      total_distance_km = EXCLUDED.total_distance_km,
      updated_at = timezone('utc'::text, now());

  ELSE
    -- Refresh all users (for batch operations)
    TRUNCATE user_travel_stats;

    INSERT INTO user_travel_stats (
      user_id, countries_visited, cities_visited, islands_visited,
      total_photos, total_albums, first_trip_date, last_trip_date,
      total_distance_km
    )
    SELECT
      uds.user_id,
      uds.countries_visited,
      uds.cities_visited,
      uds.islands_visited,
      uds.total_photos,
      uds.total_albums,
      uds.first_trip_date,
      uds.last_trip_date,
      COALESCE(SUM(tys.estimated_distance_km), 0) as total_distance_km
    FROM user_dashboard_stats uds
    LEFT JOIN travel_years_summary tys ON uds.user_id = tys.user_id
    GROUP BY uds.user_id, uds.countries_visited, uds.cities_visited,
             uds.islands_visited, uds.total_photos, uds.total_albums,
             uds.first_trip_date, uds.last_trip_date;
  END IF;

  RAISE NOTICE 'User travel stats refreshed for user: %',
    COALESCE(user_id_param::text, 'ALL');
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- SOCIAL FEATURES ENHANCEMENTS
-- =============================================================================

-- View for user feed (albums from followed users)
CREATE OR REPLACE VIEW user_social_feed AS
SELECT DISTINCT
  f.follower_id as user_id,
  a.id as album_id,
  a.user_id as creator_id,
  p.username as creator_username,
  p.display_name as creator_display_name,
  p.avatar_url as creator_avatar_url,
  a.title,
  a.description,
  a.cover_photo_url,
  a.location_name,
  a.country_code,
  a.start_date,
  a.end_date,
  a.created_at,

  -- Engagement metrics
  COALESCE(like_counts.like_count, 0) as like_count,
  COALESCE(comment_counts.comment_count, 0) as comment_count,

  -- User interaction status
  CASE WHEN user_likes.id IS NOT NULL THEN true ELSE false END as is_liked_by_user

FROM followers f
JOIN albums a ON f.following_id = a.user_id
JOIN profiles p ON a.user_id = p.id
LEFT JOIN (
  SELECT target_id, COUNT(*) as like_count
  FROM likes
  WHERE target_type = 'album'
  GROUP BY target_id
) like_counts ON a.id = like_counts.target_id
LEFT JOIN (
  SELECT target_id, COUNT(*) as comment_count
  FROM comments
  WHERE target_type = 'album'
  GROUP BY target_id
) comment_counts ON a.id = comment_counts.target_id
LEFT JOIN likes user_likes ON (
  user_likes.target_type = 'album'
  AND user_likes.target_id = a.id
  AND user_likes.user_id = f.follower_id
)

WHERE a.visibility IN ('public', 'friends')
  AND a.created_at >= NOW() - INTERVAL '30 days'  -- Recent content only

ORDER BY a.created_at DESC;

-- =============================================================================
-- PERFORMANCE HINTS AND CONSTRAINTS
-- =============================================================================

-- Add check constraints for data quality
ALTER TABLE travel_timeline
ADD CONSTRAINT travel_timeline_photo_count_valid
CHECK (photo_count >= album_count);

ALTER TABLE travel_statistics
ADD CONSTRAINT travel_statistics_totals_consistent
CHECK (
  total_albums >= 0 AND
  total_photos >= total_albums AND
  countries_visited >= 0 AND
  cities_visited >= 0 AND
  islands_visited >= 0
);

-- =============================================================================
-- GRANTS AND PERMISSIONS
-- =============================================================================

-- Grant access to views for authenticated users
GRANT SELECT ON travel_timeline_view TO authenticated;
GRANT SELECT ON travel_animation_data TO authenticated;
GRANT SELECT ON user_dashboard_stats TO authenticated;
GRANT SELECT ON travel_years_summary TO authenticated;
GRANT SELECT ON popular_destinations TO authenticated;
GRANT SELECT ON user_social_feed TO authenticated;

-- Grant execution of utility functions
GRANT EXECUTE ON FUNCTION refresh_user_travel_stats(UUID) TO authenticated;

-- =============================================================================
-- FINAL VERIFICATION
-- =============================================================================

DO $$
DECLARE
  view_count INTEGER;
  index_count INTEGER;
BEGIN
  -- Count views
  SELECT COUNT(*) INTO view_count
  FROM information_schema.views
  WHERE table_schema = 'public'
  AND table_name LIKE '%travel%' OR table_name LIKE '%dashboard%' OR table_name LIKE '%social%';

  -- Count indexes (approximate)
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%';

  RAISE NOTICE 'Enhanced features installed successfully:';
  RAISE NOTICE '- Views created: %', view_count;
  RAISE NOTICE '- Performance indexes: %', index_count;
  RAISE NOTICE '- Social features: Enhanced';
  RAISE NOTICE '- Travel animation: Ready';
  RAISE NOTICE 'Ready for business logic functions';
END
$$;