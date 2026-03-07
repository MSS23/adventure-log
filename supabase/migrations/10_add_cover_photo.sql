-- Migration: Add cover photo URL to users table
-- This allows users to have a custom banner/cover photo on their profile

-- Add cover_photo_url column
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS cover_photo_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.users.cover_photo_url IS 'URL to user profile cover/banner photo stored in covers bucket';
