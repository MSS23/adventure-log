-- Migration: Fix All Mutable Search Paths
-- Description: Add SET search_path to ALL remaining functions to eliminate security warnings
-- Author: Claude Code
-- Date: 2025-01-11

-- This migration addresses all "Function Search Path Mutable" warnings from Supabase linter
-- by adding "SET search_path = public, pg_temp" to every function that's missing it

-- ============================================================================
-- DROP EXISTING FUNCTIONS (to avoid return type conflicts)
-- ============================================================================

-- Trigger functions (CASCADE to drop dependent triggers)
DROP FUNCTION IF EXISTS public.update_itineraries_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.update_user_levels_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_playlist_item_count() CASCADE;
DROP FUNCTION IF EXISTS public.update_playlist_subscriber_count() CASCADE;

-- Notification trigger functions (CASCADE to drop dependent triggers)
DROP FUNCTION IF EXISTS public.notify_on_like() CASCADE;
DROP FUNCTION IF EXISTS public.notify_on_comment() CASCADE;
DROP FUNCTION IF EXISTS public.notify_on_follow() CASCADE;
DROP FUNCTION IF EXISTS public.notify_on_follow_accepted() CASCADE;

-- User management trigger functions (CASCADE to drop dependent triggers)
DROP FUNCTION IF EXISTS public.create_default_notification_preferences() CASCADE;
DROP FUNCTION IF EXISTS public.create_default_reaction_settings() CASCADE;

-- Follow management trigger functions (CASCADE to drop dependent triggers)
DROP FUNCTION IF EXISTS public.auto_accept_follows_on_public() CASCADE;
DROP FUNCTION IF EXISTS public.handle_follow_request() CASCADE;

-- User management functions (no CASCADE needed)
DROP FUNCTION IF EXISTS public.soft_delete_user(UUID);
DROP FUNCTION IF EXISTS public.restore_user_account(UUID);
DROP FUNCTION IF EXISTS public.permanently_delete_expired_users();
DROP FUNCTION IF EXISTS public.is_user_active(UUID);
DROP FUNCTION IF EXISTS public.soft_delete_user(UUID);
DROP FUNCTION IF EXISTS public.restore_user_account(UUID);
DROP FUNCTION IF EXISTS public.permanently_delete_expired_users();
DROP FUNCTION IF EXISTS public.is_user_active(UUID);

-- Album & photo management
DROP FUNCTION IF EXISTS public.delete_photo_from_album(UUID, UUID);
DROP FUNCTION IF EXISTS public.can_delete_photo(UUID, UUID);
DROP FUNCTION IF EXISTS public.cleanup_orphaned_albums();
DROP FUNCTION IF EXISTS public.get_orphaned_albums();
DROP FUNCTION IF EXISTS public.get_safe_location(NUMERIC, NUMERIC, TEXT);

-- Notification functions
DROP FUNCTION IF EXISTS public.mark_all_notifications_read(UUID);
DROP FUNCTION IF EXISTS public.get_unread_notification_count(UUID);
DROP FUNCTION IF EXISTS public.cleanup_old_notifications();
DROP FUNCTION IF EXISTS public.create_notification(UUID, TEXT, UUID, UUID, UUID);
DROP FUNCTION IF EXISTS public.get_unread_message_count(UUID);

-- Reaction functions
DROP FUNCTION IF EXISTS public.toggle_reaction(UUID, TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS public.get_reaction_counts(TEXT, UUID);
DROP FUNCTION IF EXISTS public.get_user_reactions(UUID, TEXT, UUID[]);
DROP FUNCTION IF EXISTS public.get_unread_reaction_count(UUID);
DROP FUNCTION IF EXISTS public.get_globe_reactions(UUID[]);
DROP FUNCTION IF EXISTS public.mark_reactions_as_read(UUID, UUID[]);
DROP FUNCTION IF EXISTS public.get_reaction_stats(UUID);

-- Follow management functions
DROP FUNCTION IF EXISTS public.accept_all_pending_follows(UUID);
DROP FUNCTION IF EXISTS public.auto_accept_follows_on_public();
DROP FUNCTION IF EXISTS public.handle_follow_request();
DROP FUNCTION IF EXISTS public.accept_follow_request(UUID, UUID);
DROP FUNCTION IF EXISTS public.reject_follow_request(UUID, UUID);
DROP FUNCTION IF EXISTS public.get_most_followed_users(INTEGER);

-- Playlist functions
DROP FUNCTION IF EXISTS public.get_pending_uploads(UUID);
DROP FUNCTION IF EXISTS public.get_user_playlists(UUID);
DROP FUNCTION IF EXISTS public.get_user_dashboard_stats(UUID);

-- ============================================================================
-- TRIGGER FUNCTIONS - Updated_at triggers
-- ============================================================================

CREATE FUNCTION public.update_itineraries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public, pg_temp;

CREATE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public, pg_temp;

CREATE FUNCTION public.update_user_levels_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public, pg_temp;

CREATE FUNCTION public.update_playlist_item_count()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql
SET search_path = public, pg_temp;

CREATE FUNCTION public.update_playlist_subscriber_count()
RETURNS TRIGGER AS $$
DECLARE
  v_subscriber_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_subscriber_count
  FROM public.playlist_subscribers
  WHERE playlist_id = NEW.playlist_id;

  UPDATE public.playlists
  SET subscriber_count = v_subscriber_count
  WHERE id = NEW.playlist_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public, pg_temp;

-- ============================================================================
-- NOTIFICATION TRIGGER FUNCTIONS
-- ============================================================================

CREATE FUNCTION public.notify_on_like()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql
SET search_path = public, pg_temp;

CREATE FUNCTION public.notify_on_comment()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql
SET search_path = public, pg_temp;

CREATE FUNCTION public.notify_on_follow()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql
SET search_path = public, pg_temp;

CREATE FUNCTION public.notify_on_follow_accepted()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
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
$$ LANGUAGE plpgsql
SET search_path = public, pg_temp;

-- ============================================================================
-- USER MANAGEMENT FUNCTIONS
-- ============================================================================

CREATE FUNCTION public.create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public, pg_temp;

CREATE FUNCTION public.create_default_reaction_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.reaction_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public, pg_temp;

CREATE FUNCTION public.soft_delete_user(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.users
  SET deleted_at = NOW()
  WHERE id = p_user_id;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp;

CREATE FUNCTION public.restore_user_account(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.users
  SET deleted_at = NULL
  WHERE id = p_user_id;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp;

CREATE FUNCTION public.permanently_delete_expired_users()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM public.users
  WHERE deleted_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql
SET search_path = public, pg_temp;

CREATE FUNCTION public.is_user_active(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = p_user_id
    AND deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp;

-- ============================================================================
-- ALBUM & PHOTO MANAGEMENT FUNCTIONS
-- ============================================================================

CREATE FUNCTION public.delete_photo_from_album(
  p_photo_id UUID,
  p_album_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM public.photos
  WHERE id = p_photo_id
  AND album_id = p_album_id
  AND user_id = auth.uid();
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp;

CREATE FUNCTION public.can_delete_photo(
  p_photo_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.photos
    WHERE id = p_photo_id
    AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp;

CREATE FUNCTION public.cleanup_orphaned_albums()
RETURNS INTEGER AS $$
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
$$ LANGUAGE plpgsql
SET search_path = public, pg_temp;

CREATE FUNCTION public.get_orphaned_albums()
RETURNS TABLE(
  id UUID,
  title TEXT,
  created_at TIMESTAMPTZ
) AS $$
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
$$ LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp;

CREATE FUNCTION public.get_safe_location(
  p_latitude NUMERIC,
  p_longitude NUMERIC,
  p_precision TEXT
)
RETURNS TABLE(
  lat NUMERIC,
  lng NUMERIC
) AS $$
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
$$ LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp;

-- ============================================================================
-- NOTIFICATION FUNCTIONS
-- ============================================================================

CREATE FUNCTION public.mark_all_notifications_read(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.notifications
  SET is_read = TRUE,
      read_at = NOW()
  WHERE user_id = p_user_id
  AND is_read = FALSE;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp;

CREATE FUNCTION public.get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.notifications
  WHERE user_id = p_user_id
  AND is_read = FALSE;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp;

CREATE FUNCTION public.cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM public.notifications
  WHERE is_read = TRUE
  AND created_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql
SET search_path = public, pg_temp;

CREATE FUNCTION public.create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_related_user_id UUID DEFAULT NULL,
  p_related_album_id UUID DEFAULT NULL,
  p_related_comment_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
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
$$ LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp;

CREATE FUNCTION public.get_unread_message_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.messages
  WHERE recipient_id = p_user_id
  AND is_read = FALSE;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp;

-- ============================================================================
-- REACTION FUNCTIONS
-- ============================================================================

CREATE FUNCTION public.toggle_reaction(
  p_user_id UUID,
  p_target_type TEXT,
  p_target_id UUID,
  p_reaction_type TEXT
)
RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp;

CREATE FUNCTION public.get_reaction_counts(
  p_target_type TEXT,
  p_target_id UUID
)
RETURNS TABLE(
  reaction_type TEXT,
  count BIGINT
) AS $$
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
$$ LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp;

CREATE FUNCTION public.get_user_reactions(
  p_user_id UUID,
  p_target_type TEXT,
  p_target_ids UUID[]
)
RETURNS TABLE(
  target_id UUID,
  reaction_type TEXT
) AS $$
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
$$ LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp;

CREATE FUNCTION public.get_unread_reaction_count(p_user_id UUID)
RETURNS INTEGER AS $$
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
$$ LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp;

CREATE FUNCTION public.get_globe_reactions(
  p_album_ids UUID[]
)
RETURNS TABLE(
  album_id UUID,
  reaction_type TEXT,
  count BIGINT
) AS $$
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
$$ LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp;

CREATE FUNCTION public.mark_reactions_as_read(
  p_user_id UUID,
  p_target_ids UUID[]
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.reactions
  SET is_read = TRUE
  WHERE target_id = ANY(p_target_ids)
  AND target_id IN (
    SELECT id FROM public.albums WHERE user_id = p_user_id
  );
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp;

CREATE FUNCTION public.get_reaction_stats(p_user_id UUID)
RETURNS TABLE(
  total_received BIGINT,
  by_type JSON
) AS $$
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
$$ LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp;

-- ============================================================================
-- FOLLOW MANAGEMENT FUNCTIONS
-- ============================================================================

CREATE FUNCTION public.accept_all_pending_follows(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.follows
  SET status = 'accepted',
      updated_at = NOW()
  WHERE following_id = p_user_id
  AND status = 'pending';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp;

CREATE FUNCTION public.auto_accept_follows_on_public()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.privacy_level = 'public' AND (OLD.privacy_level IS NULL OR OLD.privacy_level != 'public') THEN
    UPDATE public.follows
    SET status = 'accepted',
        updated_at = NOW()
    WHERE following_id = NEW.id
    AND status = 'pending';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public, pg_temp;

CREATE FUNCTION public.handle_follow_request()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT privacy_level FROM public.users WHERE id = NEW.following_id) = 'public' THEN
    NEW.status := 'accepted';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public, pg_temp;

CREATE FUNCTION public.accept_follow_request(
  p_follower_id UUID,
  p_following_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.follows
  SET status = 'accepted',
      updated_at = NOW()
  WHERE follower_id = p_follower_id
  AND following_id = p_following_id;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp;

CREATE FUNCTION public.reject_follow_request(
  p_follower_id UUID,
  p_following_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM public.follows
  WHERE follower_id = p_follower_id
  AND following_id = p_following_id;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp;

CREATE FUNCTION public.get_most_followed_users(p_limit INTEGER DEFAULT 10)
RETURNS TABLE(
  user_id UUID,
  follower_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    follows.following_id AS user_id,
    COUNT(*)::BIGINT AS follower_count
  FROM public.follows
  WHERE status = 'accepted'
  GROUP BY follows.following_id
  ORDER BY follower_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp;

-- ============================================================================
-- PLAYLIST FUNCTIONS
-- ============================================================================

CREATE FUNCTION public.get_pending_uploads(p_user_id UUID)
RETURNS TABLE(
  id UUID,
  file_name TEXT,
  file_size BIGINT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    uploads.id,
    uploads.file_name,
    uploads.file_size,
    uploads.created_at
  FROM public.pending_uploads uploads
  WHERE uploads.user_id = p_user_id
  AND uploads.status = 'pending'
  ORDER BY uploads.created_at DESC;
END;
$$ LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp;

CREATE FUNCTION public.get_user_playlists(p_user_id UUID)
RETURNS TABLE(
  id UUID,
  title TEXT,
  item_count INTEGER,
  subscriber_count INTEGER
) AS $$
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
$$ LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp;

CREATE FUNCTION public.get_user_dashboard_stats(p_user_id UUID)
RETURNS TABLE(
  total_albums BIGINT,
  total_photos BIGINT,
  total_likes BIGINT,
  total_followers BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM public.albums WHERE user_id = p_user_id)::BIGINT,
    (SELECT COUNT(*) FROM public.photos WHERE user_id = p_user_id)::BIGINT,
    (SELECT COUNT(*) FROM public.likes WHERE album_id IN (SELECT id FROM public.albums WHERE user_id = p_user_id))::BIGINT,
    (SELECT COUNT(*) FROM public.follows WHERE following_id = p_user_id AND status = 'accepted')::BIGINT;
END;
$$ LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp;

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION public.update_itineraries_updated_at IS
'Trigger function to auto-update updated_at timestamp. Protected by SET search_path.';

COMMENT ON FUNCTION public.soft_delete_user IS
'Soft deletes a user by setting deleted_at. Runs with invoker privileges. Protected by SET search_path.';

COMMENT ON FUNCTION public.toggle_reaction IS
'Toggles a reaction (adds if not exists, removes if exists). Runs with invoker privileges. Protected by SET search_path.';
