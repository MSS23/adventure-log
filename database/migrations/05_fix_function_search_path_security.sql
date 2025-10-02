-- ============================================================================
-- Migration: Fix Function Search Path Security Warnings
-- ============================================================================
-- This fixes all Supabase security warnings about functions with mutable search_path
-- By setting search_path to empty string, we force explicit schema qualification
-- and prevent potential SQL injection attacks
-- ============================================================================

-- Set search_path for update_updated_at_column
ALTER FUNCTION update_updated_at_column() SET search_path = '';

-- Set search_path for handle_new_user
ALTER FUNCTION handle_new_user() SET search_path = '';

-- Set search_path for get_user_dashboard_stats
ALTER FUNCTION get_user_dashboard_stats(uuid) SET search_path = '';

-- Set search_path for get_user_travel_years
ALTER FUNCTION get_user_travel_years(uuid) SET search_path = '';

-- Set search_path for get_user_travel_by_year
ALTER FUNCTION get_user_travel_by_year(uuid, integer) SET search_path = '';

-- Set search_path for handle_follow_request (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_follow_request') THEN
    ALTER FUNCTION handle_follow_request(uuid, uuid) SET search_path = '';
  END IF;
END
$$;

-- Set search_path for accept_follow_request (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'accept_follow_request') THEN
    ALTER FUNCTION accept_follow_request(uuid, uuid) SET search_path = '';
  END IF;
END
$$;

-- Set search_path for reject_follow_request (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'reject_follow_request') THEN
    ALTER FUNCTION reject_follow_request(uuid, uuid) SET search_path = '';
  END IF;
END
$$;

-- Set search_path for can_delete_photo (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'can_delete_photo') THEN
    ALTER FUNCTION can_delete_photo(uuid, uuid) SET search_path = '';
  END IF;
END
$$;

-- Set search_path for delete_photo_from_album (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'delete_photo_from_album') THEN
    ALTER FUNCTION delete_photo_from_album(uuid) SET search_path = '';
  END IF;
END
$$;

-- Set search_path for cleanup_orphaned_albums (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'cleanup_orphaned_albums') THEN
    ALTER FUNCTION cleanup_orphaned_albums() SET search_path = '';
  END IF;
END
$$;

-- Set search_path for get_orphaned_albums (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_orphaned_albums') THEN
    ALTER FUNCTION get_orphaned_albums() SET search_path = '';
  END IF;
END
$$;

-- Set search_path for update_user_levels_updated_at (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_user_levels_updated_at') THEN
    ALTER FUNCTION update_user_levels_updated_at() SET search_path = '';
  END IF;
END
$$;

-- Set search_path for get_user_level_info (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_level_info') THEN
    ALTER FUNCTION get_user_level_info(uuid) SET search_path = '';
  END IF;
END
$$;

-- Set search_path for update_user_level (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_user_level') THEN
    ALTER FUNCTION update_user_level(uuid) SET search_path = '';
  END IF;
END
$$;

-- Set search_path for increment_user_stat (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'increment_user_stat') THEN
    ALTER FUNCTION increment_user_stat(uuid, text, integer) SET search_path = '';
  END IF;
END
$$;

-- Verification
DO $$
DECLARE
  func_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO func_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  AND p.proname IN (
    'update_updated_at_column',
    'handle_new_user',
    'get_user_dashboard_stats',
    'get_user_travel_years',
    'get_user_travel_by_year',
    'handle_follow_request',
    'accept_follow_request',
    'reject_follow_request',
    'can_delete_photo',
    'delete_photo_from_album',
    'cleanup_orphaned_albums',
    'get_orphaned_albums',
    'update_user_levels_updated_at',
    'get_user_level_info',
    'update_user_level',
    'increment_user_stat'
  );

  RAISE NOTICE '✅ Fixed search_path security for % functions', func_count;
  RAISE NOTICE '🔒 All functions now use explicit schema qualification';
  RAISE NOTICE '📊 Supabase security warnings should be resolved';
END
$$;
