-- Add file_hash column to photos table for duplicate detection
ALTER TABLE public.photos
ADD COLUMN IF NOT EXISTS file_hash TEXT;

-- Create index for fast duplicate lookups
CREATE INDEX IF NOT EXISTS idx_photos_file_hash ON public.photos(file_hash) WHERE file_hash IS NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.photos.file_hash IS 'SHA-256 hash of photo file content for duplicate detection';
