-- ============================================================================
-- AI FEATURES MIGRATION
-- ============================================================================
-- Description: AI usage tracking and trip planner caching system
-- Version: 1.0
-- Date: 2025-01-31
-- ============================================================================

-- ============================================================================
-- TABLE: ai_usage
-- Purpose: Track AI feature usage per user per month for billing and limits
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  feature_type TEXT NOT NULL, -- 'trip_planner', 'photo_caption', etc.
  usage_month DATE NOT NULL, -- First day of the month for tracking
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, feature_type, usage_month)
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_month
  ON public.ai_usage(user_id, usage_month);

CREATE INDEX IF NOT EXISTS idx_ai_usage_feature
  ON public.ai_usage(feature_type);

-- Enable RLS
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only view their own usage
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ai_usage'
    AND policyname = 'Users can view own AI usage'
  ) THEN
    CREATE POLICY "Users can view own AI usage"
      ON public.ai_usage FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Only the backend can insert/update usage (through service role)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ai_usage'
    AND policyname = 'Service role can manage AI usage'
  ) THEN
    CREATE POLICY "Service role can manage AI usage"
      ON public.ai_usage FOR ALL
      USING (auth.jwt()->>'role' = 'service_role');
  END IF;
END $$;

-- ============================================================================
-- TABLE: trip_planner_cache
-- Purpose: Cache generated trip itineraries to avoid redundant AI API calls
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.trip_planner_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Cache key (SHA-256 hash of all inputs for fast lookup)
  cache_key TEXT NOT NULL,

  -- Request parameters (stored for reference)
  country TEXT NOT NULL,
  region TEXT NOT NULL,
  travel_dates TEXT,
  travel_style TEXT,
  budget TEXT,
  additional_details TEXT,

  -- Generated itinerary
  itinerary TEXT NOT NULL,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accessed_at TIMESTAMPTZ DEFAULT NOW(),
  access_count INTEGER DEFAULT 1,

  -- Unique constraint: each user can have one entry per unique request
  UNIQUE(user_id, cache_key)
);

-- Indexes for cache key lookups
CREATE INDEX IF NOT EXISTS idx_trip_cache_user_key
  ON public.trip_planner_cache(user_id, cache_key);

-- Index for cleanup (delete old entries)
CREATE INDEX IF NOT EXISTS idx_trip_cache_accessed
  ON public.trip_planner_cache(accessed_at);

-- Enable RLS
ALTER TABLE public.trip_planner_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only view their own cached trips
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'trip_planner_cache'
    AND policyname = 'Users can view own cached trips'
  ) THEN
    CREATE POLICY "Users can view own cached trips"
      ON public.trip_planner_cache FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Only the backend can insert/update cache (through service role)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'trip_planner_cache'
    AND policyname = 'Service role can manage trip cache'
  ) THEN
    CREATE POLICY "Service role can manage trip cache"
      ON public.trip_planner_cache FOR ALL
      USING (auth.jwt()->>'role' = 'service_role');
  END IF;
END $$;

-- ============================================================================
-- FUNCTIONS: AI Usage Tracking
-- ============================================================================

-- Function to get or create usage record for current month
CREATE OR REPLACE FUNCTION public.get_or_create_ai_usage(
  p_user_id UUID,
  p_feature_type TEXT
)
RETURNS TABLE(
  usage_count INTEGER,
  limit_exceeded BOOLEAN
) AS $$
DECLARE
  v_current_month DATE;
  v_usage_count INTEGER;
  v_monthly_limit INTEGER := 3; -- Free tier limit
BEGIN
  -- Get first day of current month
  v_current_month := DATE_TRUNC('month', CURRENT_DATE)::DATE;

  -- Get or create usage record
  INSERT INTO public.ai_usage (user_id, feature_type, usage_month, usage_count)
  VALUES (p_user_id, p_feature_type, v_current_month, 0)
  ON CONFLICT (user_id, feature_type, usage_month)
  DO NOTHING;

  -- Get current usage count
  SELECT ai_usage.usage_count INTO v_usage_count
  FROM public.ai_usage
  WHERE ai_usage.user_id = p_user_id
    AND ai_usage.feature_type = p_feature_type
    AND ai_usage.usage_month = v_current_month;

  -- Return usage info
  RETURN QUERY SELECT
    v_usage_count,
    v_usage_count >= v_monthly_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment usage count
CREATE OR REPLACE FUNCTION public.increment_ai_usage(
  p_user_id UUID,
  p_feature_type TEXT
)
RETURNS TABLE(
  new_count INTEGER,
  success BOOLEAN
) AS $$
DECLARE
  v_current_month DATE;
  v_new_count INTEGER;
  v_monthly_limit INTEGER := 3; -- Free tier limit
BEGIN
  -- Get first day of current month
  v_current_month := DATE_TRUNC('month', CURRENT_DATE)::DATE;

  -- Update usage count
  UPDATE public.ai_usage
  SET usage_count = usage_count + 1,
      updated_at = NOW()
  WHERE user_id = p_user_id
    AND feature_type = p_feature_type
    AND usage_month = v_current_month
  RETURNING usage_count INTO v_new_count;

  -- Return result
  RETURN QUERY SELECT
    v_new_count,
    v_new_count <= v_monthly_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTIONS: Trip Planner Cache
-- ============================================================================

-- Function to get cached trip or return null
CREATE OR REPLACE FUNCTION public.get_cached_trip(
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
  -- Try to get cached result (30-day expiry)
  SELECT trip_planner_cache.itinerary INTO v_itinerary
  FROM public.trip_planner_cache
  WHERE trip_planner_cache.user_id = p_user_id
    AND trip_planner_cache.cache_key = p_cache_key
    AND trip_planner_cache.accessed_at > NOW() - INTERVAL '30 days';

  IF v_itinerary IS NOT NULL THEN
    -- Update access tracking
    UPDATE public.trip_planner_cache
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
CREATE OR REPLACE FUNCTION public.cache_trip(
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
  INSERT INTO public.trip_planner_cache (
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
CREATE OR REPLACE FUNCTION public.cleanup_trip_cache()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Delete entries older than 90 days
  WITH deleted AS (
    DELETE FROM public.trip_planner_cache
    WHERE accessed_at < NOW() - INTERVAL '90 days'
    RETURNING *
  )
  SELECT COUNT(*) INTO v_deleted_count FROM deleted;

  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GRANTS: Ensure proper permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.get_or_create_ai_usage TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_ai_usage TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_cached_trip TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cache_trip TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_trip_cache TO service_role;

-- ============================================================================
-- COMMENTS: Documentation
-- ============================================================================

COMMENT ON TABLE public.ai_usage IS 'Tracks AI feature usage per user per month for billing and limits';
COMMENT ON TABLE public.trip_planner_cache IS 'Caches generated trip itineraries to avoid redundant AI API calls for identical requests';

COMMENT ON FUNCTION public.get_or_create_ai_usage IS 'Retrieves or creates AI usage record for current month';
COMMENT ON FUNCTION public.increment_ai_usage IS 'Increments AI usage count for a user and feature';
COMMENT ON FUNCTION public.get_cached_trip IS 'Retrieves cached trip itinerary if available (30-day expiry)';
COMMENT ON FUNCTION public.cache_trip IS 'Stores generated trip itinerary in cache';
COMMENT ON FUNCTION public.cleanup_trip_cache IS 'Removes trip cache entries older than 90 days';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
