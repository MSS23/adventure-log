-- Migration: Cover Photo Positioning
-- Allows users to adjust how their cover photo is displayed on the feed

-- Add cover photo positioning fields to albums table
ALTER TABLE albums
ADD COLUMN IF NOT EXISTS cover_photo_position VARCHAR(20) DEFAULT 'center',
ADD COLUMN IF NOT EXISTS cover_photo_x_offset INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS cover_photo_y_offset INTEGER DEFAULT 50;

-- Position options: 'center', 'top', 'bottom', 'left', 'right', 'custom'
-- x_offset and y_offset: percentage values (0-100) for custom positioning

COMMENT ON COLUMN albums.cover_photo_position IS 'Predefined position: center, top, bottom, left, right, custom';
COMMENT ON COLUMN albums.cover_photo_x_offset IS 'Horizontal position as percentage (0-100) for custom positioning';
COMMENT ON COLUMN albums.cover_photo_y_offset IS 'Vertical position as percentage (0-100) for custom positioning';

-- Create an index for faster queries
CREATE INDEX IF NOT EXISTS idx_albums_cover_position ON albums(cover_photo_position);

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Cover photo positioning migration completed!';
  RAISE NOTICE '📸 Users can now adjust cover photo display position';
  RAISE NOTICE '🎯 Supports predefined positions and custom percentage-based positioning';
END
$$;
