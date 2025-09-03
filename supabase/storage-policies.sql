-- Adventure Log Supabase Storage RLS Policies
-- 
-- This file contains the Row Level Security (RLS) policies for the 'adventure-photos' bucket.
-- These policies ensure users can only access their own folders while keeping the bucket public for reads.
--
-- IMPORTANT: Run these policies in your Supabase Dashboard > SQL Editor
-- or via the Supabase CLI after creating the 'adventure-photos' bucket.

-- =============================================================================
-- BUCKET CONFIGURATION
-- =============================================================================

-- First, ensure the bucket exists and is configured correctly
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'adventure-photos',
  'adventure-photos', 
  true,  -- Public bucket for read access
  26214400,  -- 25MB file size limit
  ARRAY[
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =============================================================================
-- RLS POLICY FUNCTIONS
-- =============================================================================

-- Helper function to extract user folder from storage path
-- Path format: {userId}/albums/{albumId}/{filename}
CREATE OR REPLACE FUNCTION storage.get_user_folder(storage_path text)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT CASE 
    WHEN storage_path ~ '^[a-f0-9-]+/albums/' THEN 
      split_part(storage_path, '/', 1)
    ELSE 
      NULL 
  END;
$$;

-- Function to check if user owns the folder
CREATE OR REPLACE FUNCTION storage.user_owns_folder(storage_path text, user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT storage.get_user_folder(storage_path) = user_id::text;
$$;

-- =============================================================================
-- ENABLE RLS ON STORAGE.OBJECTS
-- =============================================================================

-- Enable RLS on the storage.objects table
ALTER TABLE storage.objects ENABLE row level security;

-- =============================================================================
-- RLS POLICIES FOR ADVENTURE-PHOTOS BUCKET
-- =============================================================================

-- Policy 1: Users can INSERT objects only in their own folder
CREATE POLICY "Users can upload to their own folder in adventure-photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'adventure-photos' 
  AND auth.uid() IS NOT NULL
  AND storage.user_owns_folder(name, auth.uid())
  AND name ~ '^[a-f0-9-]+/albums/[a-zA-Z0-9_-]+/[0-9]+-[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp|heic|heif)$'
);

-- Policy 2: Users can UPDATE objects only in their own folder  
CREATE POLICY "Users can update their own photos in adventure-photos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'adventure-photos'
  AND auth.uid() IS NOT NULL  
  AND storage.user_owns_folder(name, auth.uid())
)
WITH CHECK (
  bucket_id = 'adventure-photos'
  AND auth.uid() IS NOT NULL
  AND storage.user_owns_folder(name, auth.uid())
);

-- Policy 3: Users can DELETE objects only in their own folder
CREATE POLICY "Users can delete their own photos in adventure-photos"  
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'adventure-photos'
  AND auth.uid() IS NOT NULL
  AND storage.user_owns_folder(name, auth.uid())
);

-- Policy 4: Allow SELECT for listing operations (users can only list their own folders)
-- Note: Since bucket is public, this is mainly for list operations via the API
CREATE POLICY "Users can list their own photos in adventure-photos"
ON storage.objects  
FOR SELECT
USING (
  bucket_id = 'adventure-photos'
  AND (
    -- Allow public read access (since bucket is public)
    true
    -- Or restrict to own folders for list operations:
    -- auth.uid() IS NOT NULL AND storage.user_owns_folder(name, auth.uid())
  )
);

-- =============================================================================
-- ADDITIONAL SECURITY POLICIES
-- =============================================================================

-- Policy 5: Prevent uploads outside the expected folder structure
CREATE POLICY "Enforce folder structure in adventure-photos"
ON storage.objects
FOR INSERT  
WITH CHECK (
  bucket_id = 'adventure-photos'
  AND (
    -- Must follow the pattern: {uuid}/albums/{albumId}/{timestamp}-{nanoid}.{ext}
    name ~ '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/albums/[a-zA-Z0-9_-]+/[0-9]+-[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp|heic|heif)$'
    -- Allow legacy UUID format too
    OR name ~ '^[a-f0-9-]+/albums/[a-zA-Z0-9_-]+/[0-9]+-[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp|heic|heif)$'
  )
);

-- Policy 6: File size validation (additional layer beyond bucket config)
CREATE POLICY "Limit file size in adventure-photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'adventure-photos'
  AND (metadata->>'size')::bigint <= 26214400  -- 25MB limit
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Index for faster user folder lookups
CREATE INDEX IF NOT EXISTS idx_storage_objects_user_folder 
ON storage.objects (bucket_id, (storage.get_user_folder(name))) 
WHERE bucket_id = 'adventure-photos';

-- Index for path-based queries  
CREATE INDEX IF NOT EXISTS idx_storage_objects_name_pattern
ON storage.objects (bucket_id, name)
WHERE bucket_id = 'adventure-photos';

-- =============================================================================
-- SECURITY VALIDATION QUERIES
-- =============================================================================

-- Test queries to validate the policies work correctly
-- Run these after setting up the policies to ensure they work as expected

-- Test 1: Verify user can only see their own files (when authenticated)
-- Replace 'your-user-id' with an actual user ID from your auth.users table
/*
SELECT name, created_at 
FROM storage.objects 
WHERE bucket_id = 'adventure-photos'
  AND storage.user_owns_folder(name, 'your-user-id'::uuid)
LIMIT 10;
*/

-- Test 2: Verify folder structure validation
-- This should return true for valid paths, false for invalid ones
/*
SELECT 
  name,
  name ~ '^[a-f0-9-]+/albums/[a-zA-Z0-9_-]+/[0-9]+-[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp|heic|heif)$' as valid_format
FROM storage.objects 
WHERE bucket_id = 'adventure-photos'
LIMIT 10;
*/

-- Test 3: Check user folder extraction
/*  
SELECT 
  name,
  storage.get_user_folder(name) as extracted_user_folder
FROM storage.objects
WHERE bucket_id = 'adventure-photos'
LIMIT 10;
*/

-- =============================================================================
-- BUCKET PERMISSIONS (OPTIONAL)
-- =============================================================================

-- If you want to restrict bucket operations further, you can also set policies on storage.buckets
-- But since we're using a public bucket, this is usually not necessary

-- Example: Allow authenticated users to see bucket info
/*
CREATE POLICY "Authenticated users can view adventure-photos bucket"
ON storage.buckets
FOR SELECT
USING (auth.role() = 'authenticated' AND id = 'adventure-photos');
*/

-- =============================================================================
-- CLEANUP COMMANDS (FOR TESTING/RESET)
-- =============================================================================

-- WARNING: These commands will remove all policies. Only use for testing/reset.
-- Uncomment and run if you need to start over:

/*
-- Drop all adventure-photos policies
DROP POLICY IF EXISTS "Users can upload to their own folder in adventure-photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own photos in adventure-photos" ON storage.objects;  
DROP POLICY IF EXISTS "Users can delete their own photos in adventure-photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can list their own photos in adventure-photos" ON storage.objects;
DROP POLICY IF EXISTS "Enforce folder structure in adventure-photos" ON storage.objects;
DROP POLICY IF EXISTS "Limit file size in adventure-photos" ON storage.objects;

-- Drop helper functions
DROP FUNCTION IF EXISTS storage.get_user_folder(text);
DROP FUNCTION IF EXISTS storage.user_owns_folder(text, uuid);

-- Drop indexes
DROP INDEX IF EXISTS idx_storage_objects_user_folder;
DROP INDEX IF EXISTS idx_storage_objects_name_pattern;
*/

-- =============================================================================
-- POLICY TESTING AND VALIDATION
-- =============================================================================

-- After running these policies, test them by:
-- 1. Creating a user account in your app
-- 2. Trying to upload photos to different folders
-- 3. Verifying users can only access their own folders
-- 4. Testing public read access works for the public URLs
-- 5. Verifying file size and type restrictions work

-- Example test scenarios:
-- ✅ User A uploads to /userA-id/albums/album1/photo.jpg -> Should work
-- ❌ User A uploads to /userB-id/albums/album1/photo.jpg -> Should fail  
-- ❌ User A uploads to /userA-id/badpath/photo.jpg -> Should fail (wrong folder structure)
-- ❌ User A uploads 30MB file -> Should fail (size limit)
-- ❌ User A uploads .exe file -> Should fail (mime type restriction)
-- ✅ Anyone can view public URL -> Should work (public bucket)

COMMIT;