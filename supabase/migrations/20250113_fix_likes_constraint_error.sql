-- Fix likes table constraint violation error
-- Error: "new row for relation 'likes' violates check constraint 'like_target'"
-- Root cause: Old check constraint exists that references deleted columns (album_id, photo_id, story_id)

-- =============================================================================
-- STEP 1: Drop ALL existing check constraints on likes table
-- =============================================================================

-- Drop any constraint named 'like_target' (the error-causing constraint)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = 'public'
        AND table_name = 'likes'
        AND constraint_name = 'like_target'
    ) THEN
        ALTER TABLE public.likes DROP CONSTRAINT like_target;
        RAISE NOTICE '✓ Dropped old constraint: like_target';
    END IF;
END $$;

-- Drop old constraint if it exists (from earlier migrations)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = 'public'
        AND table_name = 'likes'
        AND constraint_name = 'likes_target_type_check'
    ) THEN
        ALTER TABLE public.likes DROP CONSTRAINT likes_target_type_check;
        RAISE NOTICE '✓ Dropped old constraint: likes_target_type_check';
    END IF;
END $$;

-- Drop any auto-generated check constraints (PostgreSQL creates these with pattern)
DO $$
DECLARE
    constraint_rec RECORD;
BEGIN
    FOR constraint_rec IN
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
        AND table_name = 'likes'
        AND constraint_type = 'CHECK'
        AND constraint_name LIKE 'likes_%_check%'
    LOOP
        EXECUTE format('ALTER TABLE public.likes DROP CONSTRAINT IF EXISTS %I', constraint_rec.constraint_name);
        RAISE NOTICE '✓ Dropped constraint: %', constraint_rec.constraint_name;
    END LOOP;
END $$;

-- =============================================================================
-- STEP 2: Ensure old columns are removed (if they somehow still exist)
-- =============================================================================

ALTER TABLE public.likes DROP COLUMN IF EXISTS album_id CASCADE;
ALTER TABLE public.likes DROP COLUMN IF EXISTS photo_id CASCADE;
ALTER TABLE public.likes DROP COLUMN IF EXISTS story_id CASCADE;

DO $$
BEGIN
    RAISE NOTICE '✓ Ensured old ID columns are removed';
END $$;

-- =============================================================================
-- STEP 3: Ensure correct columns exist
-- =============================================================================

-- Ensure target_id exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'likes'
        AND column_name = 'target_id'
    ) THEN
        ALTER TABLE public.likes ADD COLUMN target_id UUID NOT NULL;
        RAISE NOTICE '✓ Added target_id column';
    END IF;
END $$;

-- Ensure target_type exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'likes'
        AND column_name = 'target_type'
    ) THEN
        ALTER TABLE public.likes ADD COLUMN target_type TEXT NOT NULL DEFAULT 'album';
        RAISE NOTICE '✓ Added target_type column';
    END IF;
END $$;

-- =============================================================================
-- STEP 4: Add correct constraint with proper naming
-- =============================================================================

-- Add the correct constraint for target_type
-- This allows: photo, album, comment, story, location
ALTER TABLE public.likes
ADD CONSTRAINT likes_target_type_check
CHECK (target_type IN ('photo', 'album', 'comment', 'story', 'location'));

DO $$
BEGIN
    RAISE NOTICE '✓ Added correct constraint: likes_target_type_check';
END $$;

-- =============================================================================
-- STEP 5: Ensure proper indexes and unique constraint
-- =============================================================================

-- Drop and recreate unique constraint to ensure consistency
ALTER TABLE public.likes DROP CONSTRAINT IF EXISTS likes_user_id_target_type_target_id_key;

ALTER TABLE public.likes
ADD CONSTRAINT likes_user_id_target_type_target_id_key
UNIQUE (user_id, target_type, target_id);

-- Ensure indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_likes_target ON public.likes(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_target ON public.likes(user_id, target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON public.likes(user_id);

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
DECLARE
    constraint_count INTEGER;
    column_count INTEGER;
BEGIN
    -- Count check constraints (should be exactly 1)
    SELECT COUNT(*) INTO constraint_count
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
    AND table_name = 'likes'
    AND constraint_type = 'CHECK';

    -- Verify columns exist
    SELECT COUNT(*) INTO column_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'likes'
    AND column_name IN ('target_id', 'target_type', 'user_id');

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Likes table constraint fix completed!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Status:';
    RAISE NOTICE '   - Check constraints: % (should be 1)', constraint_count;
    RAISE NOTICE '   - Required columns: % of 3', column_count;
    RAISE NOTICE '';
    RAISE NOTICE '📝 Allowed target types:';
    RAISE NOTICE '   - photo';
    RAISE NOTICE '   - album';
    RAISE NOTICE '   - comment';
    RAISE NOTICE '   - story';
    RAISE NOTICE '   - location';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Insert format:';
    RAISE NOTICE '   INSERT INTO likes (user_id, target_type, target_id)';
    RAISE NOTICE '   VALUES (uuid, ''album'', uuid)';
    RAISE NOTICE '';

    IF constraint_count <> 1 THEN
        RAISE WARNING 'Expected 1 check constraint but found %. Please review.', constraint_count;
    END IF;

    IF column_count <> 3 THEN
        RAISE WARNING 'Expected 3 required columns but found %. Please review.', column_count;
    END IF;
END $$;
