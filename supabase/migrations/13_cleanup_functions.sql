-- =============================================================================
-- Migration: 13_cleanup_functions.sql
-- Description: Create comprehensive cleanup functions for data maintenance
-- Date: 2025-02-04
-- =============================================================================

-- =============================================================================
-- EXPIRED STORIES CLEANUP
-- Purpose: Delete stories past their 24-hour expiration
-- Schedule: Run hourly via pg_cron or external scheduler
-- =============================================================================

-- Drop existing functions first (to handle return type changes)
DROP FUNCTION IF EXISTS public.cleanup_expired_stories();
DROP FUNCTION IF EXISTS public.cleanup_old_activity_feed();
DROP FUNCTION IF EXISTS public.cleanup_old_notifications();
DROP FUNCTION IF EXISTS public.get_orphaned_storage_paths();
DROP FUNCTION IF EXISTS public.queue_orphaned_storage_cleanup();
DROP FUNCTION IF EXISTS public.run_all_cleanups();
DROP FUNCTION IF EXISTS public.cleanup_storage_queue();

CREATE OR REPLACE FUNCTION public.cleanup_expired_stories()
RETURNS TABLE(deleted_count INTEGER, oldest_deleted TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_deleted_count INTEGER;
  v_oldest_deleted TIMESTAMPTZ;
BEGIN
  -- Get oldest story to be deleted (for logging)
  SELECT MIN(expires_at) INTO v_oldest_deleted
  FROM public.stories
  WHERE expires_at < NOW();

  -- Delete expired stories
  WITH deleted AS (
    DELETE FROM public.stories
    WHERE expires_at < NOW()
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted_count FROM deleted;

  RETURN QUERY SELECT v_deleted_count, v_oldest_deleted;
END;
$$;

COMMENT ON FUNCTION public.cleanup_expired_stories IS
  'Delete stories past 24-hour expiration. Schedule: hourly';

-- =============================================================================
-- OLD ACTIVITY FEED CLEANUP
-- Purpose: Remove activity feed entries older than 90 days
-- Schedule: Run daily via pg_cron or external scheduler
-- =============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_old_activity_feed()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM public.activity_feed
    WHERE created_at < NOW() - INTERVAL '90 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted_count FROM deleted;

  RETURN v_deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_activity_feed IS
  'Delete activity feed entries older than 90 days. Schedule: daily';

-- =============================================================================
-- OLD NOTIFICATIONS CLEANUP
-- Purpose: Remove read notifications older than 30 days, unread older than 90 days
-- Schedule: Run daily via pg_cron or external scheduler
-- =============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS TABLE(read_deleted INTEGER, unread_deleted INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_read_deleted INTEGER;
  v_unread_deleted INTEGER;
BEGIN
  -- Delete read notifications older than 30 days
  WITH deleted_read AS (
    DELETE FROM public.notifications
    WHERE is_read = TRUE
    AND created_at < NOW() - INTERVAL '30 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_read_deleted FROM deleted_read;

  -- Delete unread notifications older than 90 days
  WITH deleted_unread AS (
    DELETE FROM public.notifications
    WHERE is_read = FALSE
    AND created_at < NOW() - INTERVAL '90 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_unread_deleted FROM deleted_unread;

  RETURN QUERY SELECT v_read_deleted, v_unread_deleted;
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_notifications IS
  'Delete old notifications. Read: 30 days, Unread: 90 days. Schedule: daily';

-- =============================================================================
-- STORAGE CLEANUP QUEUE TABLE
-- Purpose: Track orphaned storage files for external cleanup process
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.storage_cleanup_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_bucket TEXT NOT NULL,
  file_path TEXT NOT NULL,
  orphan_type TEXT NOT NULL,
  original_user_id UUID,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  UNIQUE(storage_bucket, file_path)
);

CREATE INDEX IF NOT EXISTS idx_storage_cleanup_status
  ON public.storage_cleanup_queue(status, created_at);

ALTER TABLE public.storage_cleanup_queue ENABLE ROW LEVEL SECURITY;

-- Only service role can manage cleanup queue
CREATE POLICY "Service role manages cleanup queue" ON public.storage_cleanup_queue
  FOR ALL USING ((SELECT (auth.jwt()->>'role')) = 'service_role');

COMMENT ON TABLE public.storage_cleanup_queue IS
  'Queue of orphaned storage files to be cleaned up by external process';

-- =============================================================================
-- GET ORPHANED STORAGE PATHS
-- Purpose: Return list of storage paths that need deletion
-- Note: Actual file deletion must be done via Supabase Storage API
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_orphaned_storage_paths()
RETURNS TABLE(
  storage_bucket TEXT,
  file_path TEXT,
  orphan_type TEXT,
  user_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Photos from soft-deleted users past recovery period (30 days)
  RETURN QUERY
  SELECT
    'photos'::TEXT as storage_bucket,
    p.file_path,
    'deleted_user'::TEXT as orphan_type,
    p.user_id
  FROM public.photos p
  JOIN public.users u ON u.id = p.user_id
  WHERE u.deleted_at IS NOT NULL
  AND u.deleted_at < NOW() - INTERVAL '30 days';

  -- Avatar URLs from deleted users
  RETURN QUERY
  SELECT
    'avatars'::TEXT as storage_bucket,
    u.avatar_url,
    'deleted_user_avatar'::TEXT as orphan_type,
    u.id
  FROM public.users u
  WHERE u.deleted_at IS NOT NULL
  AND u.deleted_at < NOW() - INTERVAL '30 days'
  AND u.avatar_url IS NOT NULL
  AND u.avatar_url != '';

  -- Story media from stories that expired more than 7 days ago
  -- (gives buffer for any edge cases before cleanup)
  RETURN QUERY
  SELECT
    'stories'::TEXT as storage_bucket,
    s.media_url,
    'expired_story'::TEXT as orphan_type,
    s.user_id
  FROM public.stories s
  WHERE s.expires_at < NOW() - INTERVAL '7 days'
  AND s.media_url IS NOT NULL
  AND s.media_url != '';
END;
$$;

COMMENT ON FUNCTION public.get_orphaned_storage_paths IS
  'Returns list of storage paths that are orphaned and should be deleted';

-- =============================================================================
-- QUEUE ORPHANED STORAGE CLEANUP
-- Purpose: Add orphaned files to the cleanup queue
-- =============================================================================

CREATE OR REPLACE FUNCTION public.queue_orphaned_storage_cleanup()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_queued_count INTEGER;
BEGIN
  INSERT INTO public.storage_cleanup_queue (storage_bucket, file_path, orphan_type, original_user_id)
  SELECT storage_bucket, file_path, orphan_type, user_id
  FROM public.get_orphaned_storage_paths()
  ON CONFLICT (storage_bucket, file_path) DO NOTHING;

  GET DIAGNOSTICS v_queued_count = ROW_COUNT;

  RETURN v_queued_count;
END;
$$;

COMMENT ON FUNCTION public.queue_orphaned_storage_cleanup IS
  'Queue orphaned storage files for cleanup. Schedule: weekly';

-- =============================================================================
-- MASTER CLEANUP FUNCTION
-- Purpose: Run all cleanup jobs in sequence
-- Schedule: Daily at 3 AM UTC via pg_cron or external scheduler
-- =============================================================================

CREATE OR REPLACE FUNCTION public.run_all_cleanups()
RETURNS TABLE(
  cleanup_name TEXT,
  items_processed INTEGER,
  execution_time_ms INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_start_time TIMESTAMPTZ;
  v_count INTEGER;
  v_read_count INTEGER;
  v_unread_count INTEGER;
BEGIN
  -- 1. Cleanup expired stories
  v_start_time := clock_timestamp();
  SELECT deleted_count INTO v_count FROM public.cleanup_expired_stories();
  RETURN QUERY SELECT
    'expired_stories'::TEXT,
    COALESCE(v_count, 0),
    EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER;

  -- 2. Cleanup trip planner cache (if function exists)
  v_start_time := clock_timestamp();
  BEGIN
    SELECT public.cleanup_trip_cache() INTO v_count;
  EXCEPTION WHEN undefined_function THEN
    v_count := 0;
  END;
  RETURN QUERY SELECT
    'trip_cache'::TEXT,
    COALESCE(v_count, 0),
    EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER;

  -- 3. Cleanup search history (if function exists)
  v_start_time := clock_timestamp();
  BEGIN
    SELECT public.cleanup_search_history() INTO v_count;
  EXCEPTION WHEN undefined_function THEN
    v_count := 0;
  END;
  RETURN QUERY SELECT
    'search_history'::TEXT,
    COALESCE(v_count, 0),
    EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER;

  -- 4. Cleanup activity feed
  v_start_time := clock_timestamp();
  SELECT public.cleanup_old_activity_feed() INTO v_count;
  RETURN QUERY SELECT
    'activity_feed'::TEXT,
    COALESCE(v_count, 0),
    EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER;

  -- 5. Cleanup notifications
  v_start_time := clock_timestamp();
  SELECT r.read_deleted, r.unread_deleted INTO v_read_count, v_unread_count
  FROM public.cleanup_old_notifications() r;
  v_count := COALESCE(v_read_count, 0) + COALESCE(v_unread_count, 0);
  RETURN QUERY SELECT
    'notifications'::TEXT,
    v_count,
    EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER;

  -- 6. Permanently delete expired users (if function exists)
  v_start_time := clock_timestamp();
  BEGIN
    SELECT COUNT(*) INTO v_count FROM public.permanently_delete_expired_users();
  EXCEPTION WHEN undefined_function THEN
    v_count := 0;
  END;
  RETURN QUERY SELECT
    'expired_users'::TEXT,
    COALESCE(v_count, 0),
    EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER;

  -- 7. Queue orphaned storage for cleanup
  v_start_time := clock_timestamp();
  SELECT public.queue_orphaned_storage_cleanup() INTO v_count;
  RETURN QUERY SELECT
    'storage_orphans_queued'::TEXT,
    COALESCE(v_count, 0),
    EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER;

  -- 8. Cleanup old rate limit records (if table exists)
  v_start_time := clock_timestamp();
  BEGIN
    DELETE FROM public.rate_limits
    WHERE window_start < NOW() - INTERVAL '1 hour';
    GET DIAGNOSTICS v_count = ROW_COUNT;
  EXCEPTION WHEN undefined_table THEN
    v_count := 0;
  END;
  RETURN QUERY SELECT
    'rate_limits'::TEXT,
    COALESCE(v_count, 0),
    EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER;
END;
$$;

COMMENT ON FUNCTION public.run_all_cleanups IS
  'Master function to run all cleanup jobs. Schedule: daily at 3 AM UTC';

-- =============================================================================
-- CLEANUP OLD STORAGE QUEUE
-- Purpose: Remove completed/failed cleanup queue items older than 30 days
-- =============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_storage_queue()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM public.storage_cleanup_queue
  WHERE (status IN ('completed', 'failed'))
  AND created_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- =============================================================================
-- GRANT EXECUTE PERMISSIONS
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.cleanup_expired_stories TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_old_activity_feed TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_old_notifications TO service_role;
GRANT EXECUTE ON FUNCTION public.get_orphaned_storage_paths TO service_role;
GRANT EXECUTE ON FUNCTION public.queue_orphaned_storage_cleanup TO service_role;
GRANT EXECUTE ON FUNCTION public.run_all_cleanups TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_storage_queue TO service_role;

-- =============================================================================
-- PG_CRON SCHEDULING (Optional - requires pg_cron extension)
-- =============================================================================
-- Uncomment these if you have pg_cron enabled (requires Supabase Pro or manual setup)
--
-- -- Enable pg_cron extension
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
--
-- -- Cleanup expired stories - every hour at :05
-- SELECT cron.schedule(
--   'cleanup-expired-stories',
--   '5 * * * *',
--   $$SELECT public.cleanup_expired_stories()$$
-- );
--
-- -- Run all cleanups - daily at 3:00 AM UTC
-- SELECT cron.schedule(
--   'daily-cleanup-all',
--   '0 3 * * *',
--   $$SELECT * FROM public.run_all_cleanups()$$
-- );
--
-- -- Update trending hashtags - every 6 hours (if function exists)
-- SELECT cron.schedule(
--   'update-trending-hashtags',
--   '0 */6 * * *',
--   $$SELECT public.update_trending_hashtags()$$
-- );
--
-- -- Weekly storage orphan check - Sunday at 4:00 AM UTC
-- SELECT cron.schedule(
--   'weekly-storage-orphan-check',
--   '0 4 * * 0',
--   $$SELECT public.queue_orphaned_storage_cleanup()$$
-- );

-- =============================================================================
-- ALTERNATIVE: External Scheduler API Endpoint Support
-- =============================================================================
-- If you don't have pg_cron, create an API endpoint that calls these functions.
-- Example: /api/maintenance/cleanup (protected by API key or service role)
--
-- The endpoint would call:
-- 1. SELECT * FROM run_all_cleanups(); -- Daily
-- 2. Process storage_cleanup_queue and delete files via Storage API

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================
-- Run these to verify the migration:
--
-- -- List all cleanup functions
-- SELECT proname, prosrc
-- FROM pg_proc
-- WHERE proname LIKE 'cleanup%' OR proname = 'run_all_cleanups';
--
-- -- Check storage cleanup queue
-- SELECT status, COUNT(*) FROM storage_cleanup_queue GROUP BY status;
--
-- -- Test run (does actual cleanup!)
-- SELECT * FROM run_all_cleanups();

-- =============================================================================
-- ROLLBACK INSTRUCTIONS
-- =============================================================================
-- To rollback this migration:
--
-- DROP FUNCTION IF EXISTS public.cleanup_expired_stories();
-- DROP FUNCTION IF EXISTS public.cleanup_old_activity_feed();
-- DROP FUNCTION IF EXISTS public.cleanup_old_notifications();
-- DROP FUNCTION IF EXISTS public.get_orphaned_storage_paths();
-- DROP FUNCTION IF EXISTS public.queue_orphaned_storage_cleanup();
-- DROP FUNCTION IF EXISTS public.run_all_cleanups();
-- DROP FUNCTION IF EXISTS public.cleanup_storage_queue();
-- DROP TABLE IF EXISTS public.storage_cleanup_queue;
--
-- If pg_cron was enabled:
-- SELECT cron.unschedule('cleanup-expired-stories');
-- SELECT cron.unschedule('daily-cleanup-all');
-- SELECT cron.unschedule('update-trending-hashtags');
-- SELECT cron.unschedule('weekly-storage-orphan-check');
