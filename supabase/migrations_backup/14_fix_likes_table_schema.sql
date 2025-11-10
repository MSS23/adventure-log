-- Fix likes table schema
-- The error "violates check constraint like_target" suggests the table has old columns
-- This migration ensures we're using the polymorphic target_type/target_id pattern

-- Drop the old like_target constraint if it exists
ALTER TABLE public.likes
DROP CONSTRAINT IF EXISTS like_target;

-- Drop old columns if they exist
ALTER TABLE public.likes
DROP COLUMN IF EXISTS album_id;

ALTER TABLE public.likes
DROP COLUMN IF EXISTS photo_id;

ALTER TABLE public.likes
DROP COLUMN IF EXISTS story_id;

-- Ensure target_id and target_type columns exist
DO $$
BEGIN
    -- Add target_id if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'likes'
        AND column_name = 'target_id'
    ) THEN
        ALTER TABLE public.likes
        ADD COLUMN target_id UUID NOT NULL;
    END IF;

    -- Add target_type if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'likes'
        AND column_name = 'target_type'
    ) THEN
        ALTER TABLE public.likes
        ADD COLUMN target_type TEXT NOT NULL DEFAULT 'album';
    END IF;
END $$;

-- Drop old constraint if exists
ALTER TABLE public.likes
DROP CONSTRAINT IF EXISTS likes_target_type_check;

-- Add proper constraint for target_type
ALTER TABLE public.likes
ADD CONSTRAINT likes_target_type_check
CHECK (target_type IN ('photo', 'album', 'comment', 'story', 'location'));

-- Ensure proper unique constraint exists
ALTER TABLE public.likes
DROP CONSTRAINT IF EXISTS likes_user_id_target_type_target_id_key;

ALTER TABLE public.likes
ADD CONSTRAINT likes_user_id_target_type_target_id_key
UNIQUE (user_id, target_type, target_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_likes_target ON public.likes(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_target ON public.likes(user_id, target_type, target_id);

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Likes table schema fixed';
  RAISE NOTICE '📝 Using polymorphic pattern: target_type + target_id';
  RAISE NOTICE '📝 Allowed target types: photo, album, comment, story, location';
END
$$;
