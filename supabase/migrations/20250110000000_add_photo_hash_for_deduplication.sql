-- Add file_hash column to photos table for duplicate detection
-- This enables prevention of duplicate image uploads

-- Add file_hash column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'photos'
    AND column_name = 'file_hash'
  ) THEN
    ALTER TABLE public.photos
    ADD COLUMN file_hash TEXT;

    -- Create index for fast duplicate lookups
    CREATE INDEX idx_photos_file_hash ON public.photos(file_hash)
    WHERE file_hash IS NOT NULL;

    -- Create composite index for user-specific duplicate checks
    CREATE INDEX idx_photos_user_hash ON public.photos(user_id, file_hash)
    WHERE file_hash IS NOT NULL;

    RAISE NOTICE 'Added file_hash column and indexes to photos table';
  ELSE
    RAISE NOTICE 'file_hash column already exists';
  END IF;
END $$;

-- Add comment to explain the column
COMMENT ON COLUMN public.photos.file_hash IS 'SHA-256 hash of the image file for duplicate detection. Calculated client-side before upload.';
