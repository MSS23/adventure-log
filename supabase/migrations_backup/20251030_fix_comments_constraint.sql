-- Fix comments table check constraint
-- The constraint name "comment_target" is causing issues
-- This migration ensures the constraint allows 'album', 'photo', and 'story' target types

-- Drop existing constraint if it exists (with the old name)
ALTER TABLE IF EXISTS public.comments
  DROP CONSTRAINT IF EXISTS comment_target;

-- Drop constraint with other possible names
ALTER TABLE IF EXISTS public.comments
  DROP CONSTRAINT IF EXISTS comments_target_type_check;

-- Add the correct constraint with proper target types
ALTER TABLE public.comments
  ADD CONSTRAINT comment_target
  CHECK (target_type IN ('album', 'photo', 'story'));

-- Ensure the table has the correct structure
-- Verify columns exist
DO $$
BEGIN
  -- Check if content column exists (not text)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'comments'
                 AND column_name = 'content') THEN
    -- If content doesn't exist but text does, rename it
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'comments'
               AND column_name = 'text') THEN
      ALTER TABLE public.comments RENAME COLUMN text TO content;
    ELSE
      -- Add content column if neither exists
      ALTER TABLE public.comments ADD COLUMN content TEXT NOT NULL;
    END IF;
  END IF;
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_comments_target ON public.comments(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created ON public.comments(created_at DESC);
