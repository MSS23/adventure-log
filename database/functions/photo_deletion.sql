-- =====================================================
-- Photo and Album Deletion Functions
-- =====================================================
-- These functions handle photo deletion with automatic
-- album cleanup when the last photo is removed
-- =====================================================

-- Function: Check if a photo can be deleted
-- Returns true if user owns the photo and it's not the last photo in the album
CREATE OR REPLACE FUNCTION can_delete_photo(
  p_user_id UUID,
  p_photo_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_album_id UUID;
  v_photo_count INTEGER;
  v_photo_owner_id UUID;
BEGIN
  -- Get photo's album_id and owner
  SELECT album_id, user_id INTO v_album_id, v_photo_owner_id
  FROM photos
  WHERE id = p_photo_id;

  -- Check if photo exists and user owns it
  IF v_photo_owner_id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF v_photo_owner_id != p_user_id THEN
    RETURN FALSE;
  END IF;

  -- Count photos in the album
  SELECT COUNT(*) INTO v_photo_count
  FROM photos
  WHERE album_id = v_album_id;

  -- Can delete if there's more than 1 photo
  RETURN v_photo_count > 1;
END;
$$;

-- Function: Delete a photo from an album
-- If it's the last photo, delete the entire album instead
CREATE OR REPLACE FUNCTION delete_photo_from_album(
  p_user_id UUID,
  p_photo_id UUID
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  remaining_photos INTEGER,
  album_deleted BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_album_id UUID;
  v_photo_count INTEGER;
  v_photo_owner_id UUID;
  v_storage_path TEXT;
BEGIN
  -- Get photo details
  SELECT album_id, user_id, storage_path
  INTO v_album_id, v_photo_owner_id, v_storage_path
  FROM photos
  WHERE id = p_photo_id;

  -- Check if photo exists
  IF v_photo_owner_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Photo not found'::TEXT, 0, FALSE;
    RETURN;
  END IF;

  -- Check ownership
  IF v_photo_owner_id != p_user_id THEN
    RETURN QUERY SELECT FALSE, 'Not authorized to delete this photo'::TEXT, 0, FALSE;
    RETURN;
  END IF;

  -- Count photos in album
  SELECT COUNT(*) INTO v_photo_count
  FROM photos
  WHERE album_id = v_album_id;

  -- If this is the last photo, delete the entire album
  IF v_photo_count = 1 THEN
    -- Delete the album (cascade will delete the photo)
    DELETE FROM albums WHERE id = v_album_id;

    RETURN QUERY SELECT
      TRUE,
      'Last photo deleted - album removed'::TEXT,
      0,
      TRUE;
    RETURN;
  END IF;

  -- Otherwise, just delete the photo
  DELETE FROM photos WHERE id = p_photo_id;

  -- Update album cover photo if needed
  UPDATE albums
  SET cover_photo_id = (
    SELECT id FROM photos
    WHERE album_id = v_album_id
    ORDER BY created_at DESC
    LIMIT 1
  )
  WHERE id = v_album_id
  AND cover_photo_id = p_photo_id;

  RETURN QUERY SELECT
    TRUE,
    'Photo deleted successfully'::TEXT,
    (v_photo_count - 1),
    FALSE;
END;
$$;

-- Function: Cleanup orphaned albums (albums with no photos)
CREATE OR REPLACE FUNCTION cleanup_orphaned_albums()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Delete albums that have no photos
  WITH deleted AS (
    DELETE FROM albums
    WHERE id NOT IN (
      SELECT DISTINCT album_id
      FROM photos
    )
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted_count FROM deleted;

  RETURN v_deleted_count;
END;
$$;

-- Function: Get list of orphaned albums (for debugging)
CREATE OR REPLACE FUNCTION get_orphaned_albums()
RETURNS TABLE(
  album_id UUID,
  album_title TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id as album_id,
    a.title as album_title,
    a.created_at
  FROM albums a
  WHERE a.id NOT IN (
    SELECT DISTINCT album_id
    FROM photos
  )
  ORDER BY a.created_at DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION can_delete_photo(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_photo_from_album(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_orphaned_albums() TO authenticated;
GRANT EXECUTE ON FUNCTION get_orphaned_albums() TO authenticated;

-- Comments for documentation
COMMENT ON FUNCTION can_delete_photo IS 'Check if a user can delete a specific photo (must own it and not be the last photo)';
COMMENT ON FUNCTION delete_photo_from_album IS 'Delete a photo, or delete entire album if it''s the last photo';
COMMENT ON FUNCTION cleanup_orphaned_albums IS 'Remove all albums that have no photos';
COMMENT ON FUNCTION get_orphaned_albums IS 'Get list of albums with no photos for debugging';
