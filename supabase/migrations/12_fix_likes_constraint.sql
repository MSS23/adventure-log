-- Migration: Fix Likes Constraint to Include Location
-- The favorites system uses 'location' as a target type but the constraint doesn't allow it

-- Drop existing constraint
ALTER TABLE likes
DROP CONSTRAINT IF EXISTS likes_target_type_check;

-- Add updated constraint with 'location' included
ALTER TABLE likes
ADD CONSTRAINT likes_target_type_check
CHECK (target_type IN ('photo', 'album', 'comment', 'story', 'location'));

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Likes constraint updated to include location target type';
  RAISE NOTICE '📝 Allowed target types: photo, album, comment, story, location';
END
$$;
