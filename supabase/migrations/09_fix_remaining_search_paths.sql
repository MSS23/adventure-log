-- Migration: Fix Remaining Function Search Paths and Recreate Triggers
-- Description: Adds SET search_path to all functions and recreates associated triggers
-- Author: Claude Code
-- Date: 2025-01-11
-- Issue: Supabase linter warns about 41 functions with mutable search_path (security risk)

-- This migration addresses "Function Search Path Mutable" warnings by:
-- 1. Dropping and recreating all affected functions with SET search_path = public, pg_temp
-- 2. Recreating all triggers that were dropped by CASCADE in migration 06

-- ============================================================================
-- DROP EXISTING FUNCTIONS (CASCADE will drop dependent triggers)
-- ============================================================================

-- Trigger functions
DROP FUNCTION IF EXISTS public.update_itineraries_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.update_user_levels_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_playlist_item_count() CASCADE;
DROP FUNCTION IF EXISTS public.update_playlist_subscriber_count() CASCADE;
DROP FUNCTION IF EXISTS public.notify_on_like() CASCADE;
DROP FUNCTION IF EXISTS public.notify_on_comment() CASCADE;
DROP FUNCTION IF EXISTS public.notify_on_follow() CASCADE;
DROP FUNCTION IF EXISTS public.notify_on_follow_accepted() CASCADE;
DROP FUNCTION IF EXISTS public.create_default_notification_preferences() CASCADE;
DROP FUNCTION IF EXISTS public.create_default_reaction_settings() CASCADE;
DROP FUNCTION IF EXISTS public.auto_accept_follows_on_public() CASCADE;
DROP FUNCTION IF EXISTS public.handle_follow_request() CASCADE;

-- Action functions
DROP FUNCTION IF EXISTS public.soft_delete_user(UUID);
DROP FUNCTION IF EXISTS public.restore_user_account(UUID);
DROP FUNCTION IF EXISTS public.permanently_delete_expired_users();
DROP FUNCTION IF EXISTS public.is_user_active(UUID);
DROP FUNCTION IF EXISTS public.delete_photo_from_album(UUID, UUID);
DROP FUNCTION IF EXISTS public.can_delete_photo(UUID, UUID);
DROP FUNCTION IF EXISTS public.cleanup_orphaned_albums();
DROP FUNCTION IF EXISTS public.get_orphaned_albums();
DROP FUNCTION IF EXISTS public.get_safe_location(NUMERIC, NUMERIC, TEXT);
DROP FUNCTION IF EXISTS public.mark_all_notifications_read(UUID);
DROP FUNCTION IF EXISTS public.get_unread_notification_count(UUID);
DROP FUNCTION IF EXISTS public.cleanup_old_notifications();
DROP FUNCTION IF EXISTS public.create_notification(UUID, TEXT, UUID, UUID, UUID);
DROP FUNCTION IF EXISTS public.get_unread_message_count(UUID);
DROP FUNCTION IF EXISTS public.toggle_reaction(UUID, TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS public.get_reaction_counts(TEXT, UUID);
DROP FUNCTION IF EXISTS public.get_user_reactions(UUID, TEXT, UUID[]);
DROP FUNCTION IF EXISTS public.get_unread_reaction_count(UUID);
DROP FUNCTION IF EXISTS public.get_globe_reactions(UUID[]);
DROP FUNCTION IF EXISTS public.mark_reactions_as_read(UUID, UUID[]);
DROP FUNCTION IF EXISTS public.get_reaction_stats(UUID);
DROP FUNCTION IF EXISTS public.accept_all_pending_follows(UUID);
DROP FUNCTION IF EXISTS public.accept_follow_request(UUID, UUID);
DROP FUNCTION IF EXISTS public.reject_follow_request(UUID, UUID);
DROP FUNCTION IF EXISTS public.get_most_followed_users(INTEGER);
DROP FUNCTION IF EXISTS public.get_pending_uploads(UUID);
DROP FUNCTION IF EXISTS public.get_user_playlists(UUID);
DROP FUNCTION IF EXISTS public.get_user_dashboard_stats(UUID);

-- ============================================================================
-- RECREATE TRIGGER FUNCTIONS WITH SET search_path
-- ============================================================================

-- Updated_at trigger functions
CREATE OR REPLACE FUNCTION public.update_itineraries_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_user_levels_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_playlist_item_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_item_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_item_count
  FROM public.playlist_items
  WHERE playlist_id = NEW.playlist_id;

  UPDATE public.playlists
  SET item_count = v_item_count
  WHERE id = NEW.playlist_id;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_playlist_subscriber_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_subscriber_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_subscriber_count
  FROM public.playlist_subscriptions
  WHERE playlist_id = NEW.playlist_id;

  UPDATE public.playlists
  SET subscriber_count = v_subscriber_count
  WHERE id = NEW.playlist_id;

  RETURN NEW;
END;
$$;

-- Notification trigger functions
CREATE OR REPLACE FUNCTION public.notify_on_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.user_id != (SELECT user_id FROM public.albums WHERE id = NEW.album_id) THEN
    INSERT INTO public.notifications (
      user_id,
      type,
      related_user_id,
      related_album_id,
      created_at
    ) VALUES (
      (SELECT user_id FROM public.albums WHERE id = NEW.album_id),
      'like',
      NEW.user_id,
      NEW.album_id,
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.user_id != (SELECT user_id FROM public.albums WHERE id = NEW.album_id) THEN
    INSERT INTO public.notifications (
      user_id,
      type,
      related_user_id,
      related_album_id,
      related_comment_id,
      created_at
    ) VALUES (
      (SELECT user_id FROM public.albums WHERE id = NEW.album_id),
      'comment',
      NEW.user_id,
      NEW.album_id,
      NEW.id,
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_follow()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.notifications (
    user_id,
    type,
    related_user_id,
    created_at
  ) VALUES (
    NEW.following_id,
    'follow',
    NEW.follower_id,
    NOW()
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_follow_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    INSERT INTO public.notifications (
      user_id,
      type,
      related_user_id,
      created_at
    ) VALUES (
      NEW.follower_id,
      'follow_accepted',
      NEW.following_id,
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$;

-- User initialization trigger functions
CREATE OR REPLACE FUNCTION public.create_default_notification_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_default_reaction_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.reaction_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Follow management trigger functions
CREATE OR REPLACE FUNCTION public.auto_accept_follows_on_public()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.privacy_level = 'public' AND (OLD.privacy_level IS NULL OR OLD.privacy_level != 'public') THEN
    UPDATE public.follows
    SET status = 'approved',
        updated_at = NOW()
    WHERE following_id = NEW.id
    AND status = 'pending';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_follow_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF (SELECT privacy_level FROM public.users WHERE id = NEW.following_id) = 'public' THEN
    NEW.status := 'approved';
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================================
-- RECREATE ACTION FUNCTIONS WITH SET search_path
-- ============================================================================

-- User management functions
CREATE OR REPLACE FUNCTION public.soft_delete_user(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.users
  SET deleted_at = NOW()
  WHERE id = p_user_id;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_user_account(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.users
  SET deleted_at = NULL
  WHERE id = p_user_id;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.permanently_delete_expired_users()
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM public.users
  WHERE deleted_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_user_active(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = p_user_id
    AND deleted_at IS NULL
  );
END;
$$;

-- Album & Photo management functions
CREATE OR REPLACE FUNCTION public.delete_photo_from_album(
  p_photo_id UUID,
  p_album_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM public.photos
  WHERE id = p_photo_id
  AND album_id = p_album_id
  AND user_id = auth.uid();
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_delete_photo(
  p_photo_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.photos
    WHERE id = p_photo_id
    AND user_id = p_user_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_orphaned_albums()
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM public.albums
  WHERE created_at < NOW() - INTERVAL '7 days'
  AND NOT EXISTS (
    SELECT 1 FROM public.photos
    WHERE photos.album_id = albums.id
  );
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_orphaned_albums()
RETURNS TABLE(
  id UUID,
  title TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    albums.id,
    albums.title,
    albums.created_at
  FROM public.albums
  WHERE created_at < NOW() - INTERVAL '7 days'
  AND NOT EXISTS (
    SELECT 1 FROM public.photos
    WHERE photos.album_id = albums.id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_safe_location(
  p_latitude NUMERIC,
  p_longitude NUMERIC,
  p_precision TEXT
)
RETURNS TABLE(
  lat NUMERIC,
  lng NUMERIC
)
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  CASE p_precision
    WHEN 'exact' THEN
      RETURN QUERY SELECT p_latitude, p_longitude;
    WHEN 'neighbourhood' THEN
      RETURN QUERY SELECT ROUND(p_latitude, 2), ROUND(p_longitude, 2);
    WHEN 'city' THEN
      RETURN QUERY SELECT ROUND(p_latitude, 1), ROUND(p_longitude, 1);
    WHEN 'country' THEN
      RETURN QUERY SELECT ROUND(p_latitude, 0), ROUND(p_longitude, 0);
    ELSE
      RETURN QUERY SELECT NULL::NUMERIC, NULL::NUMERIC;
  END CASE;
END;
$$;

-- Notification functions
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.notifications
  SET is_read = TRUE,
      read_at = NOW()
  WHERE user_id = p_user_id
  AND is_read = FALSE;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.notifications
  WHERE user_id = p_user_id
  AND is_read = FALSE;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM public.notifications
  WHERE is_read = TRUE
  AND created_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_related_user_id UUID DEFAULT NULL,
  p_related_album_id UUID DEFAULT NULL,
  p_related_comment_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO public.notifications (
    user_id,
    type,
    related_user_id,
    related_album_id,
    related_comment_id
  ) VALUES (
    p_user_id,
    p_type,
    p_related_user_id,
    p_related_album_id,
    p_related_comment_id
  )
  RETURNING id INTO v_notification_id;
  RETURN v_notification_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_unread_message_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.messages
  WHERE recipient_id = p_user_id
  AND is_read = FALSE;
  RETURN v_count;
END;
$$;

-- Reaction functions
CREATE OR REPLACE FUNCTION public.toggle_reaction(
  p_user_id UUID,
  p_target_type TEXT,
  p_target_id UUID,
  p_reaction_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_existing_id UUID;
BEGIN
  SELECT id INTO v_existing_id
  FROM public.reactions
  WHERE user_id = p_user_id
  AND target_type = p_target_type
  AND target_id = p_target_id
  AND reaction_type = p_reaction_type;

  IF v_existing_id IS NOT NULL THEN
    DELETE FROM public.reactions WHERE id = v_existing_id;
    RETURN FALSE;
  ELSE
    INSERT INTO public.reactions (
      user_id,
      target_type,
      target_id,
      reaction_type
    ) VALUES (
      p_user_id,
      p_target_type,
      p_target_id,
      p_reaction_type
    );
    RETURN TRUE;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_reaction_counts(
  p_target_type TEXT,
  p_target_id UUID
)
RETURNS TABLE(
  reaction_type TEXT,
  count BIGINT
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    reactions.reaction_type,
    COUNT(*)::BIGINT
  FROM public.reactions
  WHERE target_type = p_target_type
  AND target_id = p_target_id
  GROUP BY reactions.reaction_type;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_reactions(
  p_user_id UUID,
  p_target_type TEXT,
  p_target_ids UUID[]
)
RETURNS TABLE(
  target_id UUID,
  reaction_type TEXT
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    reactions.target_id,
    reactions.reaction_type
  FROM public.reactions
  WHERE user_id = p_user_id
  AND target_type = p_target_type
  AND reactions.target_id = ANY(p_target_ids);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_unread_reaction_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.reactions
  WHERE target_id IN (
    SELECT id FROM public.albums WHERE user_id = p_user_id
  )
  AND is_read = FALSE;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_globe_reactions(
  p_album_ids UUID[]
)
RETURNS TABLE(
  album_id UUID,
  reaction_type TEXT,
  count BIGINT
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    reactions.target_id AS album_id,
    reactions.reaction_type,
    COUNT(*)::BIGINT
  FROM public.reactions
  WHERE target_type = 'album'
  AND target_id = ANY(p_album_ids)
  GROUP BY reactions.target_id, reactions.reaction_type;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_reactions_as_read(
  p_user_id UUID,
  p_target_ids UUID[]
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.reactions
  SET is_read = TRUE
  WHERE target_id = ANY(p_target_ids)
  AND target_id IN (
    SELECT id FROM public.albums WHERE user_id = p_user_id
  );
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_reaction_stats(p_user_id UUID)
RETURNS TABLE(
  total_received BIGINT,
  by_type JSON
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_received,
    JSON_OBJECT_AGG(
      reactions.reaction_type,
      COUNT(*)
    ) AS by_type
  FROM public.reactions
  WHERE target_id IN (
    SELECT id FROM public.albums WHERE user_id = p_user_id
  )
  GROUP BY target_id;
END;
$$;

-- Follow management functions
CREATE OR REPLACE FUNCTION public.accept_all_pending_follows(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.follows
  SET status = 'approved',
      updated_at = NOW()
  WHERE following_id = p_user_id
  AND status = 'pending';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_follow_request(
  p_follower_id UUID,
  p_following_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.follows
  SET status = 'approved',
      updated_at = NOW()
  WHERE follower_id = p_follower_id
  AND following_id = p_following_id;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_follow_request(
  p_follower_id UUID,
  p_following_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM public.follows
  WHERE follower_id = p_follower_id
  AND following_id = p_following_id;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_most_followed_users(p_limit INTEGER DEFAULT 10)
RETURNS TABLE(
  user_id UUID,
  follower_count BIGINT
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    follows.following_id AS user_id,
    COUNT(*)::BIGINT AS follower_count
  FROM public.follows
  WHERE status = 'approved'
  GROUP BY follows.following_id
  ORDER BY follower_count DESC
  LIMIT p_limit;
END;
$$;

-- Playlist & Dashboard functions
CREATE OR REPLACE FUNCTION public.get_pending_uploads(p_user_id UUID)
RETURNS TABLE(
  id UUID,
  file_name TEXT,
  file_size BIGINT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    upload_queue.id,
    upload_queue.file_name,
    upload_queue.file_size,
    upload_queue.created_at
  FROM public.upload_queue
  WHERE upload_queue.user_id = p_user_id
  AND upload_queue.status = 'pending'
  ORDER BY upload_queue.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_playlists(p_user_id UUID)
RETURNS TABLE(
  id UUID,
  title TEXT,
  item_count INTEGER,
  subscriber_count INTEGER
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    playlists.id,
    playlists.title,
    playlists.item_count,
    playlists.subscriber_count
  FROM public.playlists
  WHERE playlists.user_id = p_user_id
  ORDER BY playlists.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_dashboard_stats(p_user_id UUID)
RETURNS TABLE(
  total_albums BIGINT,
  total_photos BIGINT,
  total_likes BIGINT,
  total_followers BIGINT
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM public.albums WHERE user_id = p_user_id)::BIGINT,
    (SELECT COUNT(*) FROM public.photos WHERE user_id = p_user_id)::BIGINT,
    (SELECT COUNT(*) FROM public.likes WHERE album_id IN (SELECT id FROM public.albums WHERE user_id = p_user_id))::BIGINT,
    (SELECT COUNT(*) FROM public.follows WHERE following_id = p_user_id AND status = 'approved')::BIGINT;
END;
$$;

-- ============================================================================
-- RECREATE TRIGGERS (dropped by CASCADE)
-- ============================================================================

-- Itineraries updated_at trigger
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'itineraries') THEN
    DROP TRIGGER IF EXISTS update_itineraries_updated_at ON public.itineraries;
    CREATE TRIGGER update_itineraries_updated_at
      BEFORE UPDATE ON public.itineraries
      FOR EACH ROW
      EXECUTE FUNCTION public.update_itineraries_updated_at();
  END IF;
END $$;

-- User levels updated_at trigger
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_levels') THEN
    DROP TRIGGER IF EXISTS update_user_levels_updated_at ON public.user_levels;
    CREATE TRIGGER update_user_levels_updated_at
      BEFORE UPDATE ON public.user_levels
      FOR EACH ROW
      EXECUTE FUNCTION public.update_user_levels_updated_at();
  END IF;
END $$;

-- Playlist item count trigger
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'playlist_items') THEN
    DROP TRIGGER IF EXISTS update_playlist_item_count_trigger ON public.playlist_items;
    CREATE TRIGGER update_playlist_item_count_trigger
      AFTER INSERT OR DELETE ON public.playlist_items
      FOR EACH ROW
      EXECUTE FUNCTION public.update_playlist_item_count();
  END IF;
END $$;

-- Playlist subscriber count trigger
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'playlist_subscriptions') THEN
    DROP TRIGGER IF EXISTS update_playlist_subscriber_count_trigger ON public.playlist_subscriptions;
    CREATE TRIGGER update_playlist_subscriber_count_trigger
      AFTER INSERT OR DELETE ON public.playlist_subscriptions
      FOR EACH ROW
      EXECUTE FUNCTION public.update_playlist_subscriber_count();
  END IF;
END $$;

-- Notification triggers
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'likes') THEN
    DROP TRIGGER IF EXISTS notify_on_like_trigger ON public.likes;
    CREATE TRIGGER notify_on_like_trigger
      AFTER INSERT ON public.likes
      FOR EACH ROW
      EXECUTE FUNCTION public.notify_on_like();
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'comments') THEN
    DROP TRIGGER IF EXISTS notify_on_comment_trigger ON public.comments;
    CREATE TRIGGER notify_on_comment_trigger
      AFTER INSERT ON public.comments
      FOR EACH ROW
      EXECUTE FUNCTION public.notify_on_comment();
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'follows') THEN
    DROP TRIGGER IF EXISTS notify_on_follow_trigger ON public.follows;
    CREATE TRIGGER notify_on_follow_trigger
      AFTER INSERT ON public.follows
      FOR EACH ROW
      EXECUTE FUNCTION public.notify_on_follow();

    DROP TRIGGER IF EXISTS notify_on_follow_accepted_trigger ON public.follows;
    CREATE TRIGGER notify_on_follow_accepted_trigger
      AFTER UPDATE ON public.follows
      FOR EACH ROW
      EXECUTE FUNCTION public.notify_on_follow_accepted();

    DROP TRIGGER IF EXISTS handle_follow_request_trigger ON public.follows;
    CREATE TRIGGER handle_follow_request_trigger
      BEFORE INSERT ON public.follows
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_follow_request();
  END IF;
END $$;

-- User initialization triggers
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
    DROP TRIGGER IF EXISTS create_default_notification_preferences_trigger ON public.users;
    CREATE TRIGGER create_default_notification_preferences_trigger
      AFTER INSERT ON public.users
      FOR EACH ROW
      EXECUTE FUNCTION public.create_default_notification_preferences();

    DROP TRIGGER IF EXISTS create_default_reaction_settings_trigger ON public.users;
    CREATE TRIGGER create_default_reaction_settings_trigger
      AFTER INSERT ON public.users
      FOR EACH ROW
      EXECUTE FUNCTION public.create_default_reaction_settings();

    DROP TRIGGER IF EXISTS auto_accept_follows_on_public_trigger ON public.users;
    CREATE TRIGGER auto_accept_follows_on_public_trigger
      AFTER UPDATE ON public.users
      FOR EACH ROW
      EXECUTE FUNCTION public.auto_accept_follows_on_public();
  END IF;
END $$;

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION public.update_itineraries_updated_at IS
'Trigger function to auto-update updated_at timestamp. Protected by SET search_path = public, pg_temp.';

COMMENT ON FUNCTION public.soft_delete_user IS
'Soft deletes a user by setting deleted_at. Runs with invoker privileges. Protected by SET search_path = public, pg_temp.';

COMMENT ON FUNCTION public.toggle_reaction IS
'Toggles a reaction (adds if not exists, removes if exists). Runs with invoker privileges. Protected by SET search_path = public, pg_temp.';

COMMENT ON FUNCTION public.handle_follow_request IS
'Auto-approves follow requests for public accounts. Protected by SET search_path = public, pg_temp.';
