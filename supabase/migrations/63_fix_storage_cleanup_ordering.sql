-- 63_fix_storage_cleanup_ordering.sql
--
-- Account-deletion erasure bug: `run_all_cleanups()` queued orphaned storage
-- paths (step 7) AFTER it had already permanently deleted the expired users
-- (step 6) and expired stories (step 1). Because `get_orphaned_storage_paths()`
-- reads the file paths FROM the photos/stories rows, those rows were already
-- gone by the time queueing ran — so a deleted user's actual photo files (and
-- expired story media) were never queued, never deleted, and lingered forever
-- in the public buckets. That makes the "we permanently delete everything"
-- promise false (GDPR Art. 17) and leaves users' GPS-bearing originals public.
--
-- Fix:
--   1. Recreate get_orphaned_storage_paths() so expired-story media is captured
--      using the same threshold the deletion uses (expires_at < now), instead
--      of a now-7-days window that the daily story cleanup had already deleted.
--   2. Recreate run_all_cleanups() so the storage-queue step runs FIRST, while
--      the photos/users/stories rows still exist.
--
-- The actual file bytes are removed by /api/maintenance/cleanup, which drains
-- storage_cleanup_queue via the Storage API after this function queues them.
--
-- Idempotent and safe to re-run.

BEGIN;

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
  -- Photos from soft-deleted users past the 30-day recovery period.
  RETURN QUERY
  SELECT 'photos'::TEXT, p.file_path, 'deleted_user'::TEXT, p.user_id
  FROM public.photos p
  JOIN public.users u ON u.id = p.user_id
  WHERE u.deleted_at IS NOT NULL
    AND u.deleted_at < NOW() - INTERVAL '30 days';

  -- Avatars from those same deleted users.
  RETURN QUERY
  SELECT 'avatars'::TEXT, u.avatar_url, 'deleted_user_avatar'::TEXT, u.id
  FROM public.users u
  WHERE u.deleted_at IS NOT NULL
    AND u.deleted_at < NOW() - INTERVAL '30 days'
    AND u.avatar_url IS NOT NULL
    AND u.avatar_url != '';

  -- Story media for stories that have expired. Use the SAME threshold the
  -- story cleanup uses (expires_at < now) so the media is queued before the
  -- row is deleted in the same maintenance run.
  RETURN QUERY
  SELECT 'stories'::TEXT, s.media_url, 'expired_story'::TEXT, s.user_id
  FROM public.stories s
  WHERE s.expires_at < NOW()
    AND s.media_url IS NOT NULL
    AND s.media_url != '';
END;
$$;

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
  -- 0. Queue orphaned storage FIRST, while the source rows (photos/users/
  --    stories) still exist — otherwise the deletes below erase the paths.
  v_start_time := clock_timestamp();
  SELECT public.queue_orphaned_storage_cleanup() INTO v_count;
  RETURN QUERY SELECT
    'storage_orphans_queued'::TEXT,
    COALESCE(v_count, 0),
    EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER;

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

  -- 6. Permanently delete expired users (if function exists). Runs AFTER the
  --    storage queue step so their photo paths were already captured above.
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

  -- 7. Cleanup old rate limit records (if table exists)
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

GRANT EXECUTE ON FUNCTION public.get_orphaned_storage_paths TO service_role;
GRANT EXECUTE ON FUNCTION public.run_all_cleanups TO service_role;

COMMIT;
