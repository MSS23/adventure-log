-- ============================================
-- CRITICAL MIGRATIONS FOR ADVENTURE LOG
-- Copy this ENTIRE file and paste into Supabase SQL Editor
-- ============================================

-- 1. Cover Photo Positioning
ALTER TABLE albums
ADD COLUMN IF NOT EXISTS cover_photo_position VARCHAR(20) DEFAULT 'center',
ADD COLUMN IF NOT EXISTS cover_photo_x_offset INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS cover_photo_y_offset INTEGER DEFAULT 50;

CREATE INDEX IF NOT EXISTS idx_albums_cover_position ON albums(cover_photo_position);

-- 2. Fix Likes Constraint
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'likes_target_type_check'
  ) THEN
    ALTER TABLE likes DROP CONSTRAINT likes_target_type_check;
  END IF;

  ALTER TABLE likes
  ADD CONSTRAINT likes_target_type_check
  CHECK (target_type IN ('photo', 'album', 'comment', 'story', 'location'));
END
$migration$;
