-- ============================================================================
-- PRE-MIGRATION: Add Missing Columns Before Running Complete Schema
-- ============================================================================
-- Run this FIRST if you're applying the complete schema to an existing database
-- This adds any missing columns that the complete schema expects
-- ============================================================================

-- Add photo_hash column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'photos'
    AND column_name = 'photo_hash'
  ) THEN
    ALTER TABLE public.photos ADD COLUMN photo_hash text;
    CREATE INDEX IF NOT EXISTS idx_photos_hash ON public.photos(photo_hash);
    RAISE NOTICE '✓ Added photo_hash column to photos table';
  ELSE
    RAISE NOTICE '✓ photo_hash column already exists';
  END IF;
END $$;

-- Add storage_path alias column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'photos'
    AND column_name = 'storage_path'
  ) THEN
    ALTER TABLE public.photos ADD COLUMN storage_path text;
    RAISE NOTICE '✓ Added storage_path column to photos table';
  ELSE
    RAISE NOTICE '✓ storage_path column already exists';
  END IF;
END $$;

-- Add cover_photo_position column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'albums'
    AND column_name = 'cover_photo_position'
  ) THEN
    ALTER TABLE public.albums ADD COLUMN cover_photo_position jsonb DEFAULT '{"x": 50, "y": 50, "zoom": 1}'::jsonb;
    RAISE NOTICE '✓ Added cover_photo_position column to albums table';
  ELSE
    RAISE NOTICE '✓ cover_photo_position column already exists';
  END IF;
END $$;

-- Add start_date/end_date aliases if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'albums'
    AND column_name = 'start_date'
  ) THEN
    ALTER TABLE public.albums ADD COLUMN start_date date;
    RAISE NOTICE '✓ Added start_date column to albums table';
  ELSE
    RAISE NOTICE '✓ start_date column already exists';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'albums'
    AND column_name = 'end_date'
  ) THEN
    ALTER TABLE public.albums ADD COLUMN end_date date;
    RAISE NOTICE '✓ Added end_date column to albums table';
  ELSE
    RAISE NOTICE '✓ end_date column already exists';
  END IF;
END $$;

-- Add cover_image_url alias if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'albums'
    AND column_name = 'cover_image_url'
  ) THEN
    ALTER TABLE public.albums ADD COLUMN cover_image_url text;
    RAISE NOTICE '✓ Added cover_image_url column to albums table';
  ELSE
    RAISE NOTICE '✓ cover_image_url column already exists';
  END IF;
END $$;

-- Add deleted_at column to users if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'users'
    AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE public.users ADD COLUMN deleted_at timestamp with time zone;
    CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON public.users(deleted_at) WHERE deleted_at IS NOT NULL;
    RAISE NOTICE '✓ Added deleted_at column to users table';
  ELSE
    RAISE NOTICE '✓ deleted_at column already exists';
  END IF;
END $$;

-- Add content alias to comments if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'comments'
    AND column_name = 'content'
  ) THEN
    ALTER TABLE public.comments ADD COLUMN content text;
    RAISE NOTICE '✓ Added content column to comments table';
  ELSE
    RAISE NOTICE '✓ content column already exists';
  END IF;
END $$;

-- Add image_url alias to stories if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'stories'
    AND column_name = 'image_url'
  ) THEN
    ALTER TABLE public.stories ADD COLUMN image_url text;
    RAISE NOTICE '✓ Added image_url column to stories table';
  ELSE
    RAISE NOTICE '✓ image_url column already exists';
  END IF;
END $$;

-- Completion message
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ Pre-migration completed successfully!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'You can now safely run the complete schema.';
  RAISE NOTICE '';
  RAISE NOTICE 'Next step:';
  RAISE NOTICE '  Run COMPLETE_SCHEMA_WITH_ALL_FEATURES.sql';
  RAISE NOTICE '========================================';
END $$;
