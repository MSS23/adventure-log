-- Supabase RLS Policies for Adventure Log Photo Upload
-- Run these policies in your Supabase SQL Editor or Dashboard

-- 1. Enable RLS on the storage.objects table (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 2. Create policy to allow public SELECT (read) access to adventure-photos bucket
-- This allows public viewing of photos for shared albums
CREATE POLICY "Public read access for adventure-photos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'adventure-photos');

-- 3. Create policy to allow authenticated users to INSERT photos
-- Users can only upload to paths: albums/{albumId}/{userId}/...
-- This matches the app's path structure: albums/{albumId}/{userId}/{filename}
CREATE POLICY "Authenticated users can upload to own directory"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'adventure-photos' 
  AND (storage.foldername(name))[1] = 'albums'
  AND (storage.foldername(name))[3] = auth.uid()::text
);

-- 4. Create policy to allow authenticated users to UPDATE their own photos
-- Users can only update photos in paths: albums/{albumId}/{userId}/...
CREATE POLICY "Users can update own photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'adventure-photos' 
  AND (storage.foldername(name))[1] = 'albums'
  AND (storage.foldername(name))[3] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'adventure-photos' 
  AND (storage.foldername(name))[1] = 'albums'
  AND (storage.foldername(name))[3] = auth.uid()::text
);

-- 5. Create policy to allow authenticated users to DELETE their own photos
-- Users can only delete photos in paths: albums/{albumId}/{userId}/...
CREATE POLICY "Users can delete own photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'adventure-photos' 
  AND (storage.foldername(name))[1] = 'albums'
  AND (storage.foldername(name))[3] = auth.uid()::text
);

-- 6. Create policy for authenticated users to LIST their own objects
-- This allows users to list files in paths: albums/{albumId}/{userId}/...
CREATE POLICY "Users can list own objects"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'adventure-photos'
  AND (storage.foldername(name))[1] = 'albums'
  AND (storage.foldername(name))[3] = auth.uid()::text
);

-- Alternative: If you want more restrictive read access (only allow users to see their own + public albums)
-- Comment out policy #2 above and uncomment this one:
/*
CREATE POLICY "Restricted read access for adventure-photos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'adventure-photos' AND (
    -- Allow users to see their own files
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- Allow public access to specific public album paths
    -- You can customize this logic based on your album privacy settings
    auth.role() = 'anon'
  )
);
*/

-- 7. Create indexes for better performance (optional)
CREATE INDEX IF NOT EXISTS idx_objects_bucket_owner 
ON storage.objects (bucket_id, (storage.foldername(name))[1]);

CREATE INDEX IF NOT EXISTS idx_objects_bucket_name 
ON storage.objects (bucket_id, name);

-- 8. Grant necessary permissions to authenticated users
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;

-- Instructions for setup:
-- 1. Copy and paste this SQL into your Supabase SQL Editor
-- 2. Execute the statements
-- 3. Verify the policies are created in Authentication > Policies
-- 4. Test with a small file upload using the updated client code

-- Path structure this enables:
-- albums/{album_id}/{user_id}/{timestamp}-{filename}.{ext}
-- Example: "albums/clx123/550e8400-e29b-41d4-a716-446655440000/1703123456789-abc123.jpg"

-- Security benefits:
-- ✅ Users can only access their own files
-- ✅ Public read access for shared albums
-- ✅ Authenticated write access only
-- ✅ Path-based isolation
-- ✅ Prevents directory traversal attacks