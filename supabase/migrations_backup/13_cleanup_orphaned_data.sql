-- Migration: Cleanup Orphaned Data
-- Identifies and optionally removes albums and photos without valid user profiles

-- ============================================
-- PART 1: IDENTIFY ORPHANED DATA
-- ============================================

-- Find albums without corresponding user profiles
DO $$
DECLARE
  orphaned_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphaned_count
  FROM albums a
  LEFT JOIN users u ON a.user_id = u.id
  WHERE u.id IS NULL;

  IF orphaned_count > 0 THEN
    RAISE NOTICE '⚠️  Found % orphaned albums (albums without user profiles)', orphaned_count;
    RAISE NOTICE '📋 To see details, run: SELECT id, title, user_id, created_at FROM albums WHERE user_id NOT IN (SELECT id FROM users);';
  ELSE
    RAISE NOTICE '✅ No orphaned albums found';
  END IF;
END
$$;

-- Find photos without corresponding albums
DO $$
DECLARE
  orphaned_photo_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphaned_photo_count
  FROM photos p
  LEFT JOIN albums a ON p.album_id = a.id
  WHERE a.id IS NULL;

  IF orphaned_photo_count > 0 THEN
    RAISE NOTICE '⚠️  Found % orphaned photos (photos without albums)', orphaned_photo_count;
  ELSE
    RAISE NOTICE '✅ No orphaned photos found';
  END IF;
END
$$;

-- ============================================
-- PART 2: OPTIONAL CLEANUP (COMMENTED OUT)
-- Uncomment these sections if you want to delete orphaned data
-- ============================================

-- OPTION A: Soft delete orphaned albums (recommended - allows recovery)
-- UPDATE albums
-- SET deleted_at = NOW()
-- WHERE user_id NOT IN (SELECT id FROM users)
-- AND deleted_at IS NULL;

-- OPTION B: Hard delete orphaned albums (permanent - use with caution)
-- DELETE FROM albums
-- WHERE user_id NOT IN (SELECT id FROM users);

-- OPTION C: Delete orphaned photos
-- DELETE FROM photos
-- WHERE album_id NOT IN (SELECT id FROM albums);

-- ============================================
-- PART 3: CREATE FUNCTION TO PREVENT FUTURE ORPHANS
-- ============================================

-- Create a function to check if user exists before album creation
CREATE OR REPLACE FUNCTION check_user_exists_for_album()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = NEW.user_id) THEN
    RAISE EXCEPTION 'Cannot create album: user profile does not exist for user_id %', NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce user existence check
DROP TRIGGER IF EXISTS ensure_user_exists_for_album ON albums;
CREATE TRIGGER ensure_user_exists_for_album
  BEFORE INSERT OR UPDATE ON albums
  FOR EACH ROW
  EXECUTE FUNCTION check_user_exists_for_album();

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Orphaned data check complete';
  RAISE NOTICE '🛡️  Created trigger to prevent future orphaned albums';
  RAISE NOTICE '📝 To manually clean up orphaned data, uncomment the DELETE statements in this migration';
END
$$;
