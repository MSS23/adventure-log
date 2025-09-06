-- Adventure Log - Complete Supabase Storage Setup (Fixed)
-- 
-- This SQL script sets up the adventure-photos bucket with corrected RLS policies
-- that work with NextAuth authentication and your existing path structure.
--
-- Path Structure: albums/{albumId}/{userId}/{timestamp}-{filename}
-- 
-- IMPORTANT: Run this in your Supabase Dashboard > SQL Editor

-- =============================================================================
-- 1. BUCKET CONFIGURATION
-- =============================================================================

-- Create or update the adventure-photos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'adventure-photos',
  'adventure-photos', 
  true,  -- Public bucket for read access via URLs
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
-- 2. HELPER FUNCTIONS FOR PATH VALIDATION
-- =============================================================================

-- Extract user ID from path: albums/{albumId}/{userId}/filename
CREATE OR REPLACE FUNCTION storage.extract_user_from_path(storage_path text)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT CASE 
    WHEN storage_path ~ '^albums/[^/]+/[^/]+/' THEN 
      split_part(storage_path, '/', 3)
    ELSE 
      NULL 
  END;
$$;

-- Extract album ID from path: albums/{albumId}/{userId}/filename  
CREATE OR REPLACE FUNCTION storage.extract_album_from_path(storage_path text)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT CASE 
    WHEN storage_path ~ '^albums/[^/]+/[^/]+/' THEN 
      split_part(storage_path, '/', 2)
    ELSE 
      NULL 
  END;
$$;

-- Validate path format matches: albums/{albumId}/{userId}/{timestamp}-{filename}.{ext}
CREATE OR REPLACE FUNCTION storage.is_valid_photo_path(storage_path text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT storage_path ~ '^albums/[a-zA-Z0-9_-]+/[a-zA-Z0-9_-]+/[0-9]+-[a-zA-Z0-9_.-]+\.(jpg|jpeg|png|webp|heic|heif)$';
$$;

-- =============================================================================
-- 3. ENABLE RLS ON STORAGE.OBJECTS
-- =============================================================================

-- Enable RLS on the storage.objects table
ALTER TABLE storage.objects ENABLE row level security;

-- =============================================================================
-- 4. CLEAN UP EXISTING POLICIES (if any)
-- =============================================================================

-- Remove any existing policies for adventure-photos to start fresh
DROP POLICY IF EXISTS "Users can upload to their own folder in adventure-photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own photos in adventure-photos" ON storage.objects;  
DROP POLICY IF EXISTS "Users can delete their own photos in adventure-photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can list their own photos in adventure-photos" ON storage.objects;
DROP POLICY IF EXISTS "Enforce folder structure in adventure-photos" ON storage.objects;
DROP POLICY IF EXISTS "Limit file size in adventure-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to adventure-photos" ON storage.objects;
DROP POLICY IF EXISTS "Service role can manage adventure-photos" ON storage.objects;

-- =============================================================================
-- 5. NEW RLS POLICIES FOR NEXTAUTH INTEGRATION
-- =============================================================================

-- Policy 1: Service role (server-side) can do everything
-- This allows your server upload functions to work
CREATE POLICY "Service role full access to adventure-photos"
ON storage.objects
FOR ALL
USING (bucket_id = 'adventure-photos' AND auth.role() = 'service_role')
WITH CHECK (bucket_id = 'adventure-photos' AND auth.role() = 'service_role');

-- Policy 2: Public read access for all photos (since bucket is public)
-- This allows anyone to view photos via public URLs
CREATE POLICY "Public read access to adventure-photos" 
ON storage.objects
FOR SELECT
USING (bucket_id = 'adventure-photos');

-- Policy 3: Authenticated users can upload (for direct client uploads if needed)
-- This requires proper Supabase auth, but allows fallback for client-side uploads
CREATE POLICY "Authenticated users can upload to adventure-photos"
ON storage.objects  
FOR INSERT
WITH CHECK (
  bucket_id = 'adventure-photos'
  AND auth.role() = 'authenticated'
  AND storage.is_valid_photo_path(name)
);

-- Policy 4: Users can update their own files (when authenticated via Supabase)
CREATE POLICY "Users can update their own photos in adventure-photos"
ON storage.objects
FOR UPDATE  
USING (
  bucket_id = 'adventure-photos'
  AND auth.role() = 'authenticated'
  AND auth.uid()::text = storage.extract_user_from_path(name)
)
WITH CHECK (
  bucket_id = 'adventure-photos'
  AND auth.role() = 'authenticated'  
  AND auth.uid()::text = storage.extract_user_from_path(name)
);

-- Policy 5: Users can delete their own files (when authenticated via Supabase)
CREATE POLICY "Users can delete their own photos in adventure-photos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'adventure-photos'
  AND auth.role() = 'authenticated'
  AND auth.uid()::text = storage.extract_user_from_path(name)
);

-- Policy 6: Enforce proper folder structure and file types
CREATE POLICY "Enforce adventure-photos structure"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'adventure-photos'
  AND storage.is_valid_photo_path(name)
  AND (metadata->>'size')::bigint <= 26214400  -- 25MB limit
);

-- =============================================================================
-- 6. PERFORMANCE INDEXES  
-- =============================================================================

-- Index for faster user-based queries
CREATE INDEX IF NOT EXISTS idx_storage_objects_adventure_photos_user 
ON storage.objects (bucket_id, (storage.extract_user_from_path(name))) 
WHERE bucket_id = 'adventure-photos';

-- Index for album-based queries
CREATE INDEX IF NOT EXISTS idx_storage_objects_adventure_photos_album
ON storage.objects (bucket_id, (storage.extract_album_from_path(name)))
WHERE bucket_id = 'adventure-photos';

-- Index for path pattern queries
CREATE INDEX IF NOT EXISTS idx_storage_objects_adventure_photos_name
ON storage.objects (bucket_id, name)
WHERE bucket_id = 'adventure-photos';

-- =============================================================================  
-- 7. TESTING FUNCTIONS
-- =============================================================================

-- Test function to validate a path format
CREATE OR REPLACE FUNCTION storage.test_photo_path(test_path text)
RETURNS jsonb
LANGUAGE sql
AS $$
  SELECT jsonb_build_object(
    'path', test_path,
    'is_valid', storage.is_valid_photo_path(test_path),
    'album_id', storage.extract_album_from_path(test_path),
    'user_id', storage.extract_user_from_path(test_path)
  );
$$;

-- =============================================================================
-- 8. VALIDATION & TESTING
-- =============================================================================

-- Test the helper functions work correctly
DO $$
DECLARE
  test_result jsonb;
BEGIN
  -- Test valid path
  test_result := storage.test_photo_path('albums/album123/user456/1234567890-photo.jpg');
  RAISE NOTICE 'Test 1 - Valid path: %', test_result;
  
  -- Test invalid path  
  test_result := storage.test_photo_path('invalid/path/photo.jpg');
  RAISE NOTICE 'Test 2 - Invalid path: %', test_result;
  
  -- Test another valid path
  test_result := storage.test_photo_path('albums/my-album/clh123abc/1640995200000-vacation-pic.png');
  RAISE NOTICE 'Test 3 - Another valid path: %', test_result;
END $$;

-- =============================================================================
-- 9. SUMMARY & NEXT STEPS
-- =============================================================================

/*
SETUP COMPLETE! 🎉

What was configured:
✅ adventure-photos bucket (public, 25MB limit, image types only)
✅ RLS policies that work with NextAuth + service role
✅ Path structure: albums/{albumId}/{userId}/{timestamp}-{filename}.{ext}
✅ Helper functions for path validation and extraction
✅ Performance indexes for faster queries
✅ Testing utilities

Path Examples:
✅ albums/album123/user456/1234567890-photo.jpg
✅ albums/paris-2024/clh123abc/1640995200000-eiffel-tower.png
❌ invalid/path/photo.jpg (wrong structure)
❌ albums/album123/user456/document.pdf (wrong file type)

Authentication Flow:
1. NextAuth handles user sessions on your app
2. Server-side uploads use service role (bypasses RLS)
3. Client-side uploads need Supabase auth (optional)
4. Public reads work for anyone (bucket is public)

Next Steps:
1. Update your server upload functions to use service role
2. Test uploads with proper path structure
3. Add error handling for 403 responses
4. Create client components that use server endpoints
*/

-- Show bucket configuration
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id = 'adventure-photos';

-- Show policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'objects' AND policyname LIKE '%adventure-photos%';

COMMIT;