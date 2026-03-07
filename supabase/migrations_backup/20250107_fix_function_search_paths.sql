-- Fix function search_path security warnings
-- Setting explicit search_path prevents search_path injection attacks

-- Drop all functions that we're going to recreate to handle any signature/parameter changes
DROP FUNCTION IF EXISTS public.can_delete_photo(UUID);
DROP FUNCTION IF EXISTS public.accept_follow_request(UUID);
DROP FUNCTION IF EXISTS public.reject_follow_request(UUID);
DROP FUNCTION IF EXISTS public.delete_photo_from_album(UUID, UUID);
DROP FUNCTION IF EXISTS public.cleanup_orphaned_albums();
DROP FUNCTION IF EXISTS public.get_orphaned_albums();
DROP FUNCTION IF EXISTS public.soft_delete_user(UUID);
DROP FUNCTION IF EXISTS public.restore_user_account(UUID);
DROP FUNCTION IF EXISTS public.permanently_delete_expired_users();
DROP FUNCTION IF EXISTS public.is_user_active(UUID);
DROP FUNCTION IF EXISTS public.get_user_dashboard_stats(UUID);

-- Fix can_delete_photo function
CREATE OR REPLACE FUNCTION public.can_delete_photo(photo_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  photo_owner UUID;
BEGIN
  SELECT user_id INTO photo_owner FROM photos WHERE id = photo_id;
  RETURN photo_owner = auth.uid();
END;
$$;

-- Fix handle_follow_request function
CREATE OR REPLACE FUNCTION public.handle_follow_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- If target user is public, auto-approve
  IF (SELECT privacy_level FROM users WHERE id = NEW.following_id) = 'public' THEN
    NEW.status := 'accepted';
  ELSE
    NEW.status := 'pending';
  END IF;
  RETURN NEW;
END;
$$;

-- Fix accept_follow_request function
CREATE OR REPLACE FUNCTION public.accept_follow_request(request_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE follows
  SET status = 'accepted'
  WHERE id = request_id
    AND following_id = auth.uid()
    AND status = 'pending';
END;
$$;

-- Fix reject_follow_request function
CREATE OR REPLACE FUNCTION public.reject_follow_request(request_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM follows
  WHERE id = request_id
    AND following_id = auth.uid()
    AND status = 'pending';
END;
$$;

-- Fix update_updated_at_column function (trigger function)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix delete_photo_from_album function
CREATE FUNCTION public.delete_photo_from_album(
  p_photo_id UUID,
  p_album_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_photo_count INT;
  v_cover_photo_id UUID;
BEGIN
  -- Get user_id from album
  SELECT user_id INTO v_user_id
  FROM albums
  WHERE id = p_album_id;

  -- Check if user owns the album
  IF v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Get cover photo before deletion
  SELECT cover_photo_id INTO v_cover_photo_id
  FROM albums
  WHERE id = p_album_id;

  -- Delete the photo
  DELETE FROM photos
  WHERE id = p_photo_id AND album_id = p_album_id;

  -- Get remaining photo count
  SELECT COUNT(*) INTO v_photo_count
  FROM photos
  WHERE album_id = p_album_id;

  -- If this was the cover photo or no photos left, update cover
  IF v_cover_photo_id = p_photo_id OR v_photo_count = 0 THEN
    UPDATE albums
    SET cover_photo_id = (
      SELECT id FROM photos
      WHERE album_id = p_album_id
      ORDER BY created_at ASC
      LIMIT 1
    )
    WHERE id = p_album_id;
  END IF;
END;
$$;

-- Fix cleanup_orphaned_albums function
CREATE FUNCTION public.cleanup_orphaned_albums()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  deleted_count INT;
BEGIN
  WITH deleted AS (
    DELETE FROM albums
    WHERE is_draft = true
      AND created_at < NOW() - INTERVAL '24 hours'
      AND NOT EXISTS (
        SELECT 1 FROM photos WHERE photos.album_id = albums.id
      )
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$;

-- Fix get_orphaned_albums function
CREATE FUNCTION public.get_orphaned_albums()
RETURNS TABLE (
  album_id UUID,
  album_title TEXT,
  created_at TIMESTAMPTZ,
  hours_old NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.title,
    a.created_at,
    EXTRACT(EPOCH FROM (NOW() - a.created_at)) / 3600 AS hours_old
  FROM albums a
  WHERE a.is_draft = true
    AND a.created_at < NOW() - INTERVAL '24 hours'
    AND NOT EXISTS (
      SELECT 1 FROM photos p WHERE p.album_id = a.id
    )
  ORDER BY a.created_at ASC;
END;
$$;

-- Fix update_user_levels_updated_at function
CREATE OR REPLACE FUNCTION public.update_user_levels_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix soft_delete_user function
CREATE OR REPLACE FUNCTION public.soft_delete_user(user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Only allow users to delete their own account
  IF user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE users
  SET deleted_at = NOW()
  WHERE id = user_id AND deleted_at IS NULL;
END;
$$;

-- Fix restore_user_account function
CREATE OR REPLACE FUNCTION public.restore_user_account(user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Only allow users to restore their own account
  IF user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Only restore if deleted within 30 days
  UPDATE users
  SET deleted_at = NULL
  WHERE id = user_id
    AND deleted_at IS NOT NULL
    AND deleted_at > NOW() - INTERVAL '30 days';
END;
$$;

-- Fix permanently_delete_expired_users function
CREATE OR REPLACE FUNCTION public.permanently_delete_expired_users()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  deleted_count INT;
BEGIN
  WITH deleted AS (
    DELETE FROM users
    WHERE deleted_at IS NOT NULL
      AND deleted_at < NOW() - INTERVAL '30 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$;

-- Fix is_user_active function
CREATE OR REPLACE FUNCTION public.is_user_active(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  is_deleted BOOLEAN;
BEGIN
  SELECT (deleted_at IS NULL) INTO is_deleted
  FROM users
  WHERE id = user_id;

  RETURN COALESCE(is_deleted, FALSE);
END;
$$;

-- Fix get_user_dashboard_stats function
CREATE OR REPLACE FUNCTION public.get_user_dashboard_stats(target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'totalAlbums', (
      SELECT COUNT(*)
      FROM albums
      WHERE user_id = target_user_id
        AND is_draft = false
    ),
    'totalPhotos', (
      SELECT COUNT(*)
      FROM photos p
      INNER JOIN albums a ON p.album_id = a.id
      WHERE a.user_id = target_user_id
        AND a.is_draft = false
    ),
    'totalCountries', (
      SELECT COUNT(DISTINCT country)
      FROM albums
      WHERE user_id = target_user_id
        AND is_draft = false
        AND country IS NOT NULL
    ),
    'totalCities', (
      SELECT COUNT(DISTINCT city)
      FROM albums
      WHERE user_id = target_user_id
        AND is_draft = false
        AND city IS NOT NULL
    ),
    'followers', (
      SELECT COUNT(*)
      FROM follows
      WHERE following_id = target_user_id
        AND status = 'accepted'
    ),
    'following', (
      SELECT COUNT(*)
      FROM follows
      WHERE follower_id = target_user_id
        AND status = 'accepted'
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.can_delete_photo(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_follow_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_follow_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_photo_from_album(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.soft_delete_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_user_account(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_active(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_dashboard_stats(UUID) TO authenticated;

-- Cleanup and get functions can be called by service role
GRANT EXECUTE ON FUNCTION public.cleanup_orphaned_albums() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_orphaned_albums() TO service_role;
GRANT EXECUTE ON FUNCTION public.permanently_delete_expired_users() TO service_role;
