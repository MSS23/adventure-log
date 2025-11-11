-- Migration: Security Hardening for SECURITY DEFINER Functions
-- Description: Add SET search_path restrictions to SECURITY DEFINER functions to prevent schema attacks
-- Author: Claude Code
-- Date: 2025-01-11

-- ============================================================================
-- SECURITY HARDENING: AI Features Functions
-- ============================================================================

-- Drop and recreate functions to avoid return type conflicts
DROP FUNCTION IF EXISTS public.get_or_create_ai_usage(UUID, TEXT);
DROP FUNCTION IF EXISTS public.increment_ai_usage(UUID, TEXT);
DROP FUNCTION IF EXISTS public.get_cached_trip(UUID, TEXT);
-- Drop all overloaded versions of cache_trip
DROP FUNCTION IF EXISTS public.cache_trip(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.cache_trip(UUID, TEXT, TEXT, TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.cleanup_trip_cache();
DROP FUNCTION IF EXISTS public.get_or_create_hashtag(TEXT);
DROP FUNCTION IF EXISTS public.update_trending_hashtags();
DROP FUNCTION IF EXISTS public.cleanup_search_history();
DROP FUNCTION IF EXISTS public.create_album_activity() CASCADE;
DROP FUNCTION IF EXISTS public.create_mention_activity() CASCADE;

-- Harden get_or_create_ai_usage function
CREATE FUNCTION public.get_or_create_ai_usage(
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

  -- Try to get existing usage record
  SELECT ai_usage.usage_count INTO v_usage_count
  FROM public.ai_usage
  WHERE ai_usage.user_id = p_user_id
    AND ai_usage.feature_type = p_feature_type
    AND ai_usage.usage_month = v_current_month;

  -- If no record exists, create one
  IF v_usage_count IS NULL THEN
    INSERT INTO public.ai_usage (user_id, feature_type, usage_month, usage_count)
    VALUES (p_user_id, p_feature_type, v_current_month, 0)
    ON CONFLICT (user_id, feature_type, usage_month) DO NOTHING;

    v_usage_count := 0;
  END IF;

  -- Return usage info
  RETURN QUERY SELECT
    v_usage_count,
    v_usage_count >= v_monthly_limit AS limit_exceeded;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp;

-- Harden increment_ai_usage function
CREATE FUNCTION public.increment_ai_usage(
  p_user_id UUID,
  p_feature_type TEXT
)
RETURNS TABLE(
  new_count INTEGER,
  limit_exceeded BOOLEAN
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
    v_new_count <= v_monthly_limit AS limit_exceeded;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp;

-- Harden get_cached_trip function
CREATE FUNCTION public.get_cached_trip(
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
  -- Try to get cached trip
  SELECT trip.itinerary INTO v_itinerary
  FROM public.trip_planner_cache trip
  WHERE trip.user_id = p_user_id
    AND trip.cache_key = p_cache_key
    AND trip.expires_at > NOW();

  -- Return result
  IF v_itinerary IS NOT NULL THEN
    RETURN QUERY SELECT v_itinerary, TRUE;
  ELSE
    RETURN QUERY SELECT NULL::TEXT, FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp;

-- Harden cache_trip function
CREATE FUNCTION public.cache_trip(
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
    expires_at
  )
  VALUES (
    p_user_id,
    p_cache_key,
    p_country,
    p_region,
    p_travel_dates,
    p_travel_style,
    p_budget,
    p_additional_details,
    p_itinerary,
    NOW() + INTERVAL '30 days'
  )
  ON CONFLICT (user_id, cache_key)
  DO UPDATE SET
    country = EXCLUDED.country,
    region = EXCLUDED.region,
    travel_dates = EXCLUDED.travel_dates,
    travel_style = EXCLUDED.travel_style,
    budget = EXCLUDED.budget,
    additional_details = EXCLUDED.additional_details,
    itinerary = EXCLUDED.itinerary,
    expires_at = EXCLUDED.expires_at,
    accessed_at = NOW();

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp;

-- Harden cleanup_trip_cache function (this can run with invoker rights)
CREATE FUNCTION public.cleanup_trip_cache()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Delete expired cache entries
  DELETE FROM public.trip_planner_cache
  WHERE expires_at < NOW();

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql
SET search_path = public, pg_temp;
-- Note: SECURITY DEFINER removed - cleanup can run with caller privileges

-- ============================================================================
-- SECURITY HARDENING: Social Features Functions
-- ============================================================================

-- Harden get_or_create_hashtag function
CREATE FUNCTION public.get_or_create_hashtag(p_tag TEXT)
RETURNS UUID AS $$
DECLARE
  v_hashtag_id UUID;
  v_normalized_tag TEXT;
BEGIN
  -- Normalize hashtag (lowercase, no special chars except underscore)
  v_normalized_tag := LOWER(REGEXP_REPLACE(p_tag, '[^a-zA-Z0-9_]', '', 'g'));

  -- Try to get existing hashtag
  SELECT id INTO v_hashtag_id
  FROM public.hashtags
  WHERE tag = v_normalized_tag;

  -- If not found, create it
  IF v_hashtag_id IS NULL THEN
    INSERT INTO public.hashtags (tag, usage_count)
    VALUES (v_normalized_tag, 1)
    ON CONFLICT (tag) DO UPDATE
    SET usage_count = hashtags.usage_count + 1
    RETURNING id INTO v_hashtag_id;
  ELSE
    -- Increment usage count
    UPDATE public.hashtags
    SET usage_count = usage_count + 1,
        updated_at = NOW()
    WHERE id = v_hashtag_id;
  END IF;

  RETURN v_hashtag_id;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp;

-- Harden update_trending_hashtags function (can run with invoker rights)
CREATE FUNCTION public.update_trending_hashtags()
RETURNS void AS $$
BEGIN
  -- Update trending status based on recent usage
  UPDATE public.hashtags
  SET is_trending = (
    SELECT COUNT(*) > 5
    FROM public.album_hashtags ah
    WHERE ah.hashtag_id = hashtags.id
    AND ah.created_at > NOW() - INTERVAL '7 days'
  );
END;
$$ LANGUAGE plpgsql
SET search_path = public, pg_temp;
-- Note: SECURITY DEFINER removed - can run with caller privileges

-- Harden cleanup_search_history function (can run with invoker rights)
CREATE FUNCTION public.cleanup_search_history()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Delete search history older than 90 days
  DELETE FROM public.search_history
  WHERE created_at < NOW() - INTERVAL '90 days';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql
SET search_path = public, pg_temp;
-- Note: SECURITY DEFINER removed - cleanup can run with caller privileges

-- Harden trigger functions with SET search_path only
-- Note: Trigger functions often need SECURITY DEFINER to insert into activity_feed
-- which the triggering user may not have direct INSERT access to

CREATE FUNCTION public.create_album_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create activity for published albums
  IF NEW.status = 'published' AND (OLD IS NULL OR OLD.status != 'published') THEN
    INSERT INTO public.activity_feed (
      user_id,
      activity_type,
      related_album_id,
      created_at
    ) VALUES (
      NEW.user_id,
      'album_created',
      NEW.id,
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp;

CREATE FUNCTION public.create_mention_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Create activity for the mentioned user
  INSERT INTO public.activity_feed (
    user_id,
    activity_type,
    related_album_id,
    related_user_id,
    created_at
  ) VALUES (
    NEW.mentioned_user_id,
    'mention',
    NEW.album_id,
    NEW.mentioning_user_id,
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp;

-- ============================================================================
-- SECURITY DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION public.get_or_create_ai_usage IS
'SECURITY DEFINER: Required for atomic get-or-create operation on ai_usage table. Protected by SET search_path.';

COMMENT ON FUNCTION public.increment_ai_usage IS
'SECURITY DEFINER: Required for atomic increment operation. Protected by SET search_path.';

COMMENT ON FUNCTION public.get_cached_trip IS
'SECURITY DEFINER: Required to read cache with user_id check. Protected by SET search_path.';

COMMENT ON FUNCTION public.cache_trip IS
'SECURITY DEFINER: Required for upsert operation on cache. Protected by SET search_path.';

COMMENT ON FUNCTION public.cleanup_trip_cache IS
'No longer SECURITY DEFINER - runs with caller privileges. Protected by SET search_path.';

COMMENT ON FUNCTION public.get_or_create_hashtag IS
'SECURITY DEFINER: Required for atomic get-or-create on hashtags table. Protected by SET search_path.';

COMMENT ON FUNCTION public.update_trending_hashtags IS
'No longer SECURITY DEFINER - runs with caller privileges. Protected by SET search_path.';

COMMENT ON FUNCTION public.cleanup_search_history IS
'No longer SECURITY DEFINER - runs with caller privileges. Protected by SET search_path.';

COMMENT ON FUNCTION public.create_album_activity IS
'SECURITY DEFINER: Trigger function needs elevated privileges to insert into activity_feed. Protected by SET search_path.';

COMMENT ON FUNCTION public.create_mention_activity IS
'SECURITY DEFINER: Trigger function needs elevated privileges to insert into activity_feed. Protected by SET search_path.';

-- ============================================================================
-- RECREATE TRIGGERS (dropped by CASCADE)
-- ============================================================================

-- Recreate album activity trigger
CREATE TRIGGER trigger_album_activity
  AFTER INSERT ON public.albums
  FOR EACH ROW
  EXECUTE FUNCTION public.create_album_activity();

-- Recreate mention activity trigger
CREATE TRIGGER trigger_mention_activity
  AFTER INSERT ON public.mentions
  FOR EACH ROW
  EXECUTE FUNCTION public.create_mention_activity();
