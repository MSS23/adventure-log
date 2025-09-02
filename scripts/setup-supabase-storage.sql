-- Adventure Log - Supabase Storage Configuration
-- Run this script in your Supabase SQL Editor to set up photo upload functionality
-- Make sure to run this as the postgres user or service_role

BEGIN;

-- ============================================================================
-- 1. CREATE STORAGE BUCKET
-- ============================================================================

-- Check if bucket already exists, create if not
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM storage.buckets WHERE id = 'adventure-photos'
    ) THEN
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES (
            'adventure-photos',
            'adventure-photos',
            true,
            52428800, -- 50MB limit
            ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp']
        );
        
        RAISE NOTICE 'Created storage bucket: adventure-photos';
    ELSE
        RAISE NOTICE 'Storage bucket adventure-photos already exists';
    END IF;
END
$$;

-- ============================================================================
-- 2. ENABLE ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

RAISE NOTICE 'Row Level Security enabled on storage tables';

-- ============================================================================
-- 3. DROP EXISTING POLICIES (CLEANUP)
-- ============================================================================

-- Clean up any existing policies to avoid conflicts
DROP POLICY IF EXISTS "Service role can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Service role can read files" ON storage.objects;
DROP POLICY IF EXISTS "Service role can update files" ON storage.objects;
DROP POLICY IF EXISTS "Service role can delete files" ON storage.objects;
DROP POLICY IF EXISTS "Public can view adventure photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view adventure photos" ON storage.objects;

-- Bucket policies
DROP POLICY IF EXISTS "Public bucket access" ON storage.buckets;
DROP POLICY IF EXISTS "Service role bucket access" ON storage.buckets;

RAISE NOTICE 'Cleaned up existing storage policies';

-- ============================================================================
-- 4. CREATE SERVICE ROLE POLICIES (CRITICAL FOR UPLOADS)
-- ============================================================================

-- Allow service role to upload files (MOST IMPORTANT)
CREATE POLICY "Service role can upload files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
    auth.role() = 'service_role' OR
    bucket_id = 'adventure-photos'
);

-- Allow service role to read files  
CREATE POLICY "Service role can read files" 
ON storage.objects 
FOR SELECT 
USING (
    auth.role() = 'service_role' OR
    bucket_id = 'adventure-photos'
);

-- Allow service role to update files
CREATE POLICY "Service role can update files" 
ON storage.objects 
FOR UPDATE 
USING (
    auth.role() = 'service_role' AND
    bucket_id = 'adventure-photos'
);

-- Allow service role to delete files
CREATE POLICY "Service role can delete files" 
ON storage.objects 
FOR DELETE 
USING (
    auth.role() = 'service_role' AND
    bucket_id = 'adventure-photos'
);

RAISE NOTICE 'Created service role storage policies';

-- ============================================================================
-- 5. CREATE PUBLIC ACCESS POLICIES (FOR VIEWING PHOTOS)
-- ============================================================================

-- Allow public read access to photos for viewing in the app
CREATE POLICY "Public can view adventure photos" 
ON storage.objects 
FOR SELECT 
USING (
    bucket_id = 'adventure-photos'
);

-- Allow service role full access to bucket management
CREATE POLICY "Service role bucket access" 
ON storage.buckets 
FOR ALL 
USING (auth.role() = 'service_role');

-- Allow public to see bucket metadata (for client-side operations)
CREATE POLICY "Public bucket access" 
ON storage.buckets 
FOR SELECT 
USING (id = 'adventure-photos');

RAISE NOTICE 'Created public access storage policies';

-- ============================================================================
-- 6. VERIFY CONFIGURATION
-- ============================================================================

-- Check bucket configuration
DO $$
DECLARE
    bucket_count INTEGER;
    policy_count INTEGER;
BEGIN
    -- Count buckets
    SELECT COUNT(*) INTO bucket_count FROM storage.buckets WHERE id = 'adventure-photos';
    
    -- Count policies
    SELECT COUNT(*) INTO policy_count FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' 
    AND policyname LIKE '%Service role%';
    
    RAISE NOTICE 'Configuration verification:';
    RAISE NOTICE '- Buckets created: %', bucket_count;
    RAISE NOTICE '- Service role policies: %', policy_count;
    
    IF bucket_count = 1 AND policy_count >= 4 THEN
        RAISE NOTICE '✅ Storage configuration completed successfully!';
    ELSE
        RAISE WARNING '⚠️  Configuration may be incomplete. Check the logs above.';
    END IF;
END
$$;

-- ============================================================================
-- 7. GRANT NECESSARY PERMISSIONS
-- ============================================================================

-- Ensure service role has the necessary permissions
GRANT USAGE ON SCHEMA storage TO service_role;
GRANT ALL ON storage.objects TO service_role;
GRANT ALL ON storage.buckets TO service_role;

-- Ensure anon role can read public files
GRANT USAGE ON SCHEMA storage TO anon;
GRANT SELECT ON storage.objects TO anon;
GRANT SELECT ON storage.buckets TO anon;

-- Ensure authenticated role can read files
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT SELECT ON storage.objects TO authenticated;
GRANT SELECT ON storage.buckets TO authenticated;

RAISE NOTICE 'Granted storage permissions to roles';

COMMIT;

-- ============================================================================
-- POST-SETUP VERIFICATION QUERIES
-- ============================================================================

-- Run these queries after the setup to verify everything is working:

/*
-- 1. Check bucket exists and is configured correctly
SELECT 
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types,
    created_at
FROM storage.buckets 
WHERE id = 'adventure-photos';

-- 2. Check policies are in place
SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND policyname LIKE '%Service role%'
ORDER BY policyname;

-- 3. Test service role permissions (replace with your actual service role key)
-- This should be run from your application or with proper auth context
-- SELECT auth.role(); -- Should return 'service_role' when using service key

-- 4. Check storage usage (optional)
SELECT 
    bucket_id,
    COUNT(*) as file_count,
    SUM(metadata->>'size'::int) as total_size_bytes
FROM storage.objects 
WHERE bucket_id = 'adventure-photos'
GROUP BY bucket_id;
*/

-- ============================================================================
-- TROUBLESHOOTING NOTES
-- ============================================================================

/*
If uploads still fail after running this script:

1. Verify your environment variables:
   - NEXT_PUBLIC_SUPABASE_URL is correct
   - SUPABASE_SERVICE_ROLE_KEY is the SERVICE ROLE key (not anon key)
   - NEXT_PUBLIC_SUPABASE_BUCKET = "adventure-photos"

2. Test the service role key:
   curl -X GET 'https://your-project.supabase.co/rest/v1/auth/users' \
   -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY'
   
3. Check CORS settings in Supabase Dashboard > Settings > Storage
   
4. Enable debug mode by adding this to your .env.local:
   NEXT_PUBLIC_DEBUG="true"

5. Check the browser console and server logs for specific error messages
*/