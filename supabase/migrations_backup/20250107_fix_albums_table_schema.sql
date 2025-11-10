-- Fix albums table schema to match application expectations
-- This migration ensures all required columns exist with proper types and constraints
--
-- HOW TO APPLY THIS MIGRATION:
-- 1. Open Supabase Dashboard (https://supabase.com/dashboard/project/YOUR_PROJECT_ID)
-- 2. Go to SQL Editor
-- 3. Copy and paste this entire file
-- 4. Click "Run" to execute the migration

-- Add missing columns if they don't exist
DO $$
BEGIN
    -- Add latitude column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public'
                   AND table_name = 'albums'
                   AND column_name = 'latitude') THEN
        ALTER TABLE public.albums ADD COLUMN latitude DOUBLE PRECISION;
    END IF;

    -- Add longitude column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public'
                   AND table_name = 'albums'
                   AND column_name = 'longitude') THEN
        ALTER TABLE public.albums ADD COLUMN longitude DOUBLE PRECISION;
    END IF;

    -- Add visibility column if missing (alias for privacy)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public'
                   AND table_name = 'albums'
                   AND column_name = 'visibility') THEN
        ALTER TABLE public.albums ADD COLUMN visibility TEXT DEFAULT 'public';
    END IF;

    -- Add status column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public'
                   AND table_name = 'albums'
                   AND column_name = 'status') THEN
        ALTER TABLE public.albums ADD COLUMN status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published'));
    END IF;

    -- Add tags column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public'
                   AND table_name = 'albums'
                   AND column_name = 'tags') THEN
        ALTER TABLE public.albums ADD COLUMN tags TEXT[];
    END IF;

    -- Add cover_photo_url column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public'
                   AND table_name = 'albums'
                   AND column_name = 'cover_photo_url') THEN
        ALTER TABLE public.albums ADD COLUMN cover_photo_url TEXT;
    END IF;

    -- Add favorite_photo_urls column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public'
                   AND table_name = 'albums'
                   AND column_name = 'favorite_photo_urls') THEN
        ALTER TABLE public.albums ADD COLUMN favorite_photo_urls TEXT[];
    END IF;
END $$;

-- Update visibility constraint to match expected values
ALTER TABLE public.albums DROP CONSTRAINT IF EXISTS valid_visibility;
ALTER TABLE public.albums ADD CONSTRAINT valid_visibility
  CHECK (visibility IN ('public', 'private', 'friends') OR visibility IS NULL);

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_albums_location_coords ON albums(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_albums_status ON albums(status);
CREATE INDEX IF NOT EXISTS idx_albums_visibility ON albums(visibility);

COMMENT ON COLUMN albums.latitude IS 'Latitude coordinate for album location';
COMMENT ON COLUMN albums.longitude IS 'Longitude coordinate for album location';
COMMENT ON COLUMN albums.visibility IS 'Who can view this album: public, private, or friends only';
COMMENT ON COLUMN albums.status IS 'Album status: draft (no photos) or published';
COMMENT ON COLUMN albums.tags IS 'Array of tags for categorizing albums';
