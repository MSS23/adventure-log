-- Fix comments table schema - add target_id and target_type columns if missing

-- First, check if columns exist and add them if they don't
DO $$
BEGIN
    -- Add target_type column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'comments'
        AND column_name = 'target_type'
    ) THEN
        ALTER TABLE public.comments ADD COLUMN target_type TEXT;
        RAISE NOTICE 'Added target_type column';
    ELSE
        RAISE NOTICE 'target_type column already exists';
    END IF;

    -- Add target_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'comments'
        AND column_name = 'target_id'
    ) THEN
        ALTER TABLE public.comments ADD COLUMN target_id UUID;
        RAISE NOTICE 'Added target_id column';
    ELSE
        RAISE NOTICE 'target_id column already exists';
    END IF;

    -- Migrate data from old columns if they exist
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'comments'
        AND column_name = 'entity_type'
    ) THEN
        UPDATE public.comments
        SET target_type = entity_type,
            target_id = entity_id
        WHERE target_type IS NULL;
        RAISE NOTICE 'Migrated data from entity_type/entity_id to target_type/target_id';
    END IF;
END $$;

-- Make target_type and target_id NOT NULL after migration
ALTER TABLE public.comments
ALTER COLUMN target_type SET NOT NULL,
ALTER COLUMN target_id SET NOT NULL;

-- Add constraint for valid target_types
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'comments_target_type_check'
    ) THEN
        ALTER TABLE public.comments
        ADD CONSTRAINT comments_target_type_check
        CHECK (target_type IN ('photo', 'album', 'story'));
        RAISE NOTICE 'Added target_type constraint';
    END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_comments_target ON public.comments(target_type, target_id);

-- Drop old columns if they exist
ALTER TABLE public.comments DROP COLUMN IF EXISTS entity_type;
ALTER TABLE public.comments DROP COLUMN IF EXISTS entity_id;

-- Verify the fix
DO $$
DECLARE
    has_target_type BOOLEAN;
    has_target_id BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'comments' AND column_name = 'target_type'
    ) INTO has_target_type;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'comments' AND column_name = 'target_id'
    ) INTO has_target_id;

    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Comments table schema fix completed!';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'target_type exists: %', has_target_type;
    RAISE NOTICE 'target_id exists: %', has_target_id;
    RAISE NOTICE '';
END $$;
