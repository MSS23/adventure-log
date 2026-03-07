-- Migration: Add Batch Photo Count RPC Function
-- Created: 2025-01-12
-- Description: Eliminate N+1 queries by fetching photo counts for multiple albums in one query
-- PERFORMANCE FIX: Reduces database round trips from O(n) to O(1)

-- Function to get photo counts for multiple albums at once
CREATE OR REPLACE FUNCTION get_album_photo_counts(album_ids uuid[])
RETURNS TABLE(album_id uuid, photo_count bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT
    photos.album_id,
    COUNT(*)::bigint as photo_count
  FROM photos
  WHERE photos.album_id = ANY(album_ids)
  GROUP BY photos.album_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON FUNCTION get_album_photo_counts(uuid[]) IS
  'Batch function to get photo counts for multiple albums. Eliminates N+1 query problem.';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_album_photo_counts(uuid[]) TO authenticated;

-- Create index on album_id if it doesn't exist for performance
CREATE INDEX IF NOT EXISTS idx_photos_album_id_count ON photos(album_id);
