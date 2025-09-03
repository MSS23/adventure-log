-- Adventure Log Storage RLS Policies (2024 Best Practices)
-- ================================================================
-- CRITICAL: Run this in your Supabase SQL Editor to enable uploads
-- Based on SupabaseImageGallery and 2024 security best practices
-- ================================================================

BEGIN;

-- =============================================================================
-- 1. BUCKET CONFIGURATION
-- =============================================================================

-- Ensure bucket exists with correct settings
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'adventure-photos',
  'adventure-photos', 
  true,  -- Public bucket for direct URL access (better performance)
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
-- 2. ENABLE RLS AND CLEAN UP
-- =============================================================================

-- Enable RLS on storage.objects table (MANDATORY for 2024)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Clean up any existing conflicting policies
DROP POLICY IF EXISTS "Users can upload to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own photos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view photos" ON storage.objects;
DROP POLICY IF EXISTS "Service role full access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated uploads only" ON storage.objects;

-- Drop helper functions if they exist
DROP FUNCTION IF EXISTS storage.get_user_id_from_path(text);

-- =============================================================================
-- 3. HELPER FUNCTIONS
-- =============================================================================

-- Helper function to extract user ID from path
-- Path format: {userId}/albums/{albumId}/{filename}
CREATE OR REPLACE FUNCTION storage.get_user_id_from_path(storage_path text)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT CASE 
    WHEN storage_path ~ '^[a-f0-9-]+/' THEN 
      split_part(storage_path, '/', 1)
    ELSE 
      NULL 
  END;
$$;

-- =============================================================================
-- 4. CORE RLS POLICIES (Following SupabaseImageGallery pattern)
-- =============================================================================

-- Policy 1: Allow authenticated users to upload files to their own folder
CREATE POLICY "Authenticated uploads only"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'adventure-photos' 
  AND storage.get_user_id_from_path(name) = auth.uid()::text
);

-- Policy 2: Allow users to update their own files
CREATE POLICY "Users can update own photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'adventure-photos'
  AND storage.get_user_id_from_path(name) = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'adventure-photos'
  AND storage.get_user_id_from_path(name) = auth.uid()::text
);

-- Policy 3: Allow users to delete their own files
CREATE POLICY "Users can delete own photos"  
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'adventure-photos'
  AND storage.get_user_id_from_path(name) = auth.uid()::text
);

-- Policy 4: Allow public read access (since bucket is public)
-- This enables direct URL access for better performance
CREATE POLICY "Public can view photos"
ON storage.objects  
FOR SELECT
USING (bucket_id = 'adventure-photos');

-- Policy 5: Service role has full access (for server operations)
CREATE POLICY "Service role full access"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'adventure-photos')
WITH CHECK (bucket_id = 'adventure-photos');

-- =============================================================================
-- 5. PERFORMANCE INDEXES
-- =============================================================================

-- Index for faster user-based queries
CREATE INDEX IF NOT EXISTS idx_storage_objects_user_lookup 
ON storage.objects (bucket_id, (storage.get_user_id_from_path(name)))
WHERE bucket_id = 'adventure-photos';

-- Index for name-based queries
CREATE INDEX IF NOT EXISTS idx_storage_objects_name
ON storage.objects (bucket_id, name)
WHERE bucket_id = 'adventure-photos';

COMMIT;

-- =============================================================================
-- 6. VERIFICATION QUERIES (Run these to test your setup)
-- =============================================================================

-- Test 1: Check bucket configuration
-- SELECT * FROM storage.buckets WHERE id = 'adventure-photos';

-- Test 2: Check RLS is enabled
-- SELECT schemaname, tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE tablename = 'objects' AND schemaname = 'storage';

-- Test 3: List all policies
-- SELECT policyname, cmd, roles 
-- FROM pg_policies 
-- WHERE schemaname = 'storage' AND tablename = 'objects';