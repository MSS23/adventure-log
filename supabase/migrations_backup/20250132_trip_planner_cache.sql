-- Create trip planner cache table
CREATE TABLE IF NOT EXISTS trip_planner_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Request parameters (used to match identical requests)
  country TEXT NOT NULL,
  region TEXT NOT NULL,
  travel_dates TEXT,
  travel_style TEXT,
  budget TEXT,
  additional_details TEXT,

  -- Cache key (hash of all inputs for fast lookup)
  cache_key TEXT NOT NULL,

  -- Generated itinerary
  itinerary TEXT NOT NULL,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accessed_at TIMESTAMPTZ DEFAULT NOW(),
  access_count INTEGER DEFAULT 1,

  -- Index for fast lookups
  UNIQUE(user_id, cache_key)
);

-- Create index for cache key lookups
CREATE INDEX IF NOT EXISTS idx_trip_cache_user_key
  ON trip_planner_cache(user_id, cache_key);

-- Create index for cleanup (delete old entries)
CREATE INDEX IF NOT EXISTS idx_trip_cache_accessed
  ON trip_planner_cache(accessed_at);

-- Enable RLS
ALTER TABLE trip_planner_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only view their own cached trips
CREATE POLICY "Users can view own cached trips"
  ON trip_planner_cache
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only the backend can insert/update cache (through service role)
CREATE POLICY "Service role can manage trip cache"
  ON trip_planner_cache
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Function to get cached trip or return null
CREATE OR REPLACE FUNCTION get_cached_trip(
  p_user_id UUID,
  p_cache_key TEXT
)
RETURNS TABLE(
  itinerary TEXT,
  was_cached BOOLEAN
) AS $$
DECLARE
  v_itinerary TEXT;
BEGIN
  -- Try to get cached result
  SELECT trip_planner_cache.itinerary INTO v_itinerary
  FROM trip_planner_cache
  WHERE trip_planner_cache.user_id = p_user_id
    AND trip_planner_cache.cache_key = p_cache_key
    AND trip_planner_cache.accessed_at > NOW() - INTERVAL '30 days'; -- Cache expires after 30 days

  IF v_itinerary IS NOT NULL THEN
    -- Update access tracking
    UPDATE trip_planner_cache
    SET accessed_at = NOW(),
        access_count = access_count + 1
    WHERE trip_planner_cache.user_id = p_user_id
      AND trip_planner_cache.cache_key = p_cache_key;

    -- Return cached result
    RETURN QUERY SELECT v_itinerary, TRUE;
  ELSE
    -- No cached result found
    RETURN QUERY SELECT NULL::TEXT, FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to store trip in cache
CREATE OR REPLACE FUNCTION cache_trip(
  p_user_id UUID,
  p_cache_key TEXT,
  p_country TEXT,
  p_region TEXT,
  p_travel_dates TEXT,
  p_travel_style TEXT,
  p_budget TEXT,
  p_additional_details TEXT,
  p_itinerary TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Insert or update cache entry
  INSERT INTO trip_planner_cache (
    user_id,
    cache_key,
    country,
    region,
    travel_dates,
    travel_style,
    budget,
    additional_details,
    itinerary,
    created_at,
    accessed_at,
    access_count
  ) VALUES (
    p_user_id,
    p_cache_key,
    p_country,
    p_region,
    p_travel_dates,
    p_travel_style,
    p_budget,
    p_additional_details,
    p_itinerary,
    NOW(),
    NOW(),
    1
  )
  ON CONFLICT (user_id, cache_key)
  DO UPDATE SET
    itinerary = EXCLUDED.itinerary,
    accessed_at = NOW(),
    access_count = trip_planner_cache.access_count + 1;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old cache entries (run periodically)
CREATE OR REPLACE FUNCTION cleanup_trip_cache()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Delete entries older than 90 days
  WITH deleted AS (
    DELETE FROM trip_planner_cache
    WHERE accessed_at < NOW() - INTERVAL '90 days'
    RETURNING *
  )
  SELECT COUNT(*) INTO v_deleted_count FROM deleted;

  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_cached_trip TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION cache_trip TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION cleanup_trip_cache TO service_role;

-- Add comments
COMMENT ON TABLE trip_planner_cache IS 'Caches generated trip itineraries to avoid redundant AI API calls for identical requests';
COMMENT ON FUNCTION get_cached_trip IS 'Retrieves cached trip itinerary if available (30-day expiry)';
COMMENT ON FUNCTION cache_trip IS 'Stores generated trip itinerary in cache';
COMMENT ON FUNCTION cleanup_trip_cache IS 'Removes trip cache entries older than 90 days';
