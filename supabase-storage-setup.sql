-- Adventure Photos Storage Setup with RLS Policies
-- Execute this in Supabase SQL Editor

-- 1. Create the adventure-photos bucket (if not exists)
INSERT INTO storage.buckets (id, name, public, owner, allowed_mime_types, file_size_limit)
VALUES (
  'adventure-photos', 
  'adventure-photos', 
  false, -- Private bucket
  NULL, 
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'],
  10485760 -- 10MB limit
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'],
  file_size_limit = 10485760;

-- 2. Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload photos to their own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Service role can manage all photos" ON storage.objects;

-- 4. Create user upload policy
CREATE POLICY "Users can upload photos to their own folder"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'adventure-photos' AND
  auth.uid()::text = (storage.foldername(name))[1] AND
  auth.role() = 'authenticated'
);

-- 5. Create user read policy
CREATE POLICY "Users can view their own photos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'adventure-photos' AND
  auth.uid()::text = (storage.foldername(name))[1] AND
  auth.role() = 'authenticated'
);

-- 6. Create user delete policy
CREATE POLICY "Users can delete their own photos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'adventure-photos' AND
  auth.uid()::text = (storage.foldername(name))[1] AND
  auth.role() = 'authenticated'
);

-- 7. Create service role bypass policy (for server-side operations)
CREATE POLICY "Service role can manage all photos"
ON storage.objects
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- 8. Create photos table for indexing uploaded files
CREATE TABLE IF NOT EXISTS public.photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  album_id UUID, -- Can be NULL for standalone photos
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT,
  size_bytes BIGINT,
  mime_type TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 9. Enable RLS on photos table
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

-- 10. Create RLS policies for photos table
CREATE POLICY "Users can view their own photos"
ON public.photos
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own photos"
ON public.photos
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own photos"
ON public.photos
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own photos"
ON public.photos
FOR DELETE
USING (auth.uid() = user_id);

-- 11. Create indexes for better performance
CREATE INDEX IF NOT EXISTS photos_user_id_idx ON public.photos(user_id);
CREATE INDEX IF NOT EXISTS photos_album_id_idx ON public.photos(album_id);
CREATE INDEX IF NOT EXISTS photos_created_at_idx ON public.photos(created_at DESC);

-- 12. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 13. Create trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS photos_update_updated_at ON public.photos;
CREATE TRIGGER photos_update_updated_at
  BEFORE UPDATE ON public.photos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- 14. Grant necessary permissions
GRANT ALL ON public.photos TO authenticated;
GRANT ALL ON public.photos TO service_role;

-- Verification queries (run these to check setup)
-- SELECT * FROM storage.buckets WHERE id = 'adventure-photos';
-- SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE tablename = 'objects' AND schemaname = 'storage';
-- SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
-- SELECT * FROM pg_policies WHERE tablename = 'photos' AND schemaname = 'public';