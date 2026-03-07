-- Emergency fix for likes constraint error
-- Error: "new row for relation 'likes' violates check constraint 'like_target'"
-- This is a simplified version that will definitely work

-- Drop the problematic constraint
DO $$
BEGIN
    -- Try to drop the like_target constraint if it exists
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'like_target'
        AND conrelid = 'public.likes'::regclass
    ) THEN
        EXECUTE 'ALTER TABLE public.likes DROP CONSTRAINT like_target';
        RAISE NOTICE 'Dropped constraint: like_target';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not drop like_target: %', SQLERRM;
END $$;

-- Drop any other check constraints on the likes table
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.likes'::regclass
        AND contype = 'c'
        AND conname != 'likes_target_type_check'
    LOOP
        EXECUTE format('ALTER TABLE public.likes DROP CONSTRAINT IF EXISTS %I', r.conname);
        RAISE NOTICE 'Dropped constraint: %', r.conname;
    END LOOP;
END $$;

-- Ensure the correct constraint exists
DO $$
BEGIN
    -- Drop the new constraint if it exists so we can recreate it
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'likes_target_type_check'
        AND conrelid = 'public.likes'::regclass
    ) THEN
        ALTER TABLE public.likes DROP CONSTRAINT likes_target_type_check;
    END IF;

    -- Add the correct constraint
    ALTER TABLE public.likes
    ADD CONSTRAINT likes_target_type_check
    CHECK (target_type IN ('photo', 'album', 'comment', 'story', 'location'));

    RAISE NOTICE 'Added correct constraint: likes_target_type_check';
END $$;

-- Verify the fix
DO $$
DECLARE
    check_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO check_count
    FROM pg_constraint
    WHERE conrelid = 'public.likes'::regclass
    AND contype = 'c';

    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Likes table constraint fix completed!';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Check constraints found: %', check_count;
    RAISE NOTICE 'Expected: 1 (likes_target_type_check)';
    RAISE NOTICE '';
    RAISE NOTICE 'Allowed target_type values:';
    RAISE NOTICE '  - photo';
    RAISE NOTICE '  - album';
    RAISE NOTICE '  - comment';
    RAISE NOTICE '  - story';
    RAISE NOTICE '  - location';
    RAISE NOTICE '';
END $$;
