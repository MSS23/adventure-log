-- Final fix for comments table check constraint issue
-- Error: new row for relation "comments" violates check constraint "comment_target"
-- This ensures the constraint allows all valid target types: album, photo, story

-- Step 1: Drop ALL possible variations of the constraint
DO $$
BEGIN
  -- Drop constraint with different possible names
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'comment_target') THEN
    ALTER TABLE public.comments DROP CONSTRAINT comment_target;
    RAISE NOTICE 'Dropped constraint: comment_target';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'comments_target_type_check') THEN
    ALTER TABLE public.comments DROP CONSTRAINT comments_target_type_check;
    RAISE NOTICE 'Dropped constraint: comments_target_type_check';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'comments_check') THEN
    ALTER TABLE public.comments DROP CONSTRAINT comments_check;
    RAISE NOTICE 'Dropped constraint: comments_check';
  END IF;
END $$;

-- Step 2: Add the correct constraint
ALTER TABLE public.comments
  ADD CONSTRAINT comment_target
  CHECK (target_type IN ('album', 'photo', 'story'));

-- Step 3: Verify the structure
DO $$
BEGIN
  -- Ensure target_type column exists and is text
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'comments'
                 AND column_name = 'target_type'
                 AND data_type = 'text') THEN
    RAISE EXCEPTION 'Column target_type does not exist or is wrong type';
  END IF;

  -- Ensure target_id column exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'comments'
                 AND column_name = 'target_id') THEN
    RAISE EXCEPTION 'Column target_id does not exist';
  END IF;

  -- Ensure content column exists (not 'text')
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'comments'
                 AND column_name = 'content') THEN
    -- Check if 'text' column exists and rename it
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'comments'
               AND column_name = 'text') THEN
      ALTER TABLE public.comments RENAME COLUMN text TO content;
      RAISE NOTICE 'Renamed column text to content';
    END IF;
  END IF;

  RAISE NOTICE '✓ Comments table structure verified';
  RAISE NOTICE '✓ Constraint comment_target added successfully';
  RAISE NOTICE '✓ Allowed target types: album, photo, story';
END $$;

-- Step 4: Recreate indexes for performance
CREATE INDEX IF NOT EXISTS idx_comments_target ON public.comments(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created ON public.comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON public.comments(parent_id) WHERE parent_id IS NOT NULL;

-- Step 5: Show final verification
SELECT
  'Comments table check constraint fixed!' as status,
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.comments'::regclass
  AND conname = 'comment_target';
