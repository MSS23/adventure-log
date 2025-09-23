# 🧪 Storage Buckets Test & Management Guide

Complete guide to test, verify, and manage your Supabase storage buckets for Adventure Log.

---

## 🔍 **STEP 1: Verify Current Bucket Status**

Go to [Supabase Dashboard](https://supabase.com/dashboard) → Project: `jjrqstbzzvqrgaqwdvxw` → **SQL Editor**

### Check Bucket Configuration
```sql
-- Verify buckets exist and are properly configured
SELECT
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets
WHERE name IN ('photos', 'avatars')
ORDER BY name;
```

**Expected Result:**
```
name    | public | file_size_limit | allowed_mime_types | created_at
--------|--------|-----------------|-------------------|------------------
avatars | true   | null            | null              | 2025-09-23 ...
photos  | true   | null            | null              | 2025-09-23 ...
```

### Check Storage Policies (Optional - may not exist)
```sql
-- Check if storage.policies table exists first
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'storage'
  AND table_name = 'policies'
) as policies_table_exists;

-- If policies table exists, check current policies
-- (Only run this if the above query returns true)
SELECT
  bucket_id,
  name,
  type,
  definition,
  check_definition
FROM storage.policies
WHERE bucket_id IN ('photos', 'avatars')
ORDER BY bucket_id, type;
```

**Note**: If `storage.policies` doesn't exist, see `STORAGE_SYSTEM_DIAGNOSIS.md` for fixes.

---

## 🧪 **STEP 2: Test Upload Functionality**

### Test 1: Basic Upload Test (SQL)
```sql
-- Test if you can create a test object (simulates upload)
INSERT INTO storage.objects (
  bucket_id,
  name,
  owner,
  metadata
) VALUES (
  'photos',
  'test-upload.txt',
  auth.uid(),
  '{"size": 100, "mimetype": "text/plain"}'::jsonb
);

-- Check if test object was created
SELECT name, bucket_id, created_at
FROM storage.objects
WHERE bucket_id = 'photos' AND name = 'test-upload.txt';
```

### Test 2: Application Upload Test
1. **Go to your deployed app**: `https://your-app.vercel.app`
2. **Login** with your account
3. **Create a new album**:
   - Navigate to `/albums/new`
   - Fill in title and location
   - Save album
4. **Try photo upload**:
   - Open the album you just created
   - Click "Upload Photos"
   - Select any image file
   - Watch browser console for errors

**Success indicators:**
- ✅ No "bucket does not exist" errors
- ✅ Upload progress shows
- ✅ Photo appears in album gallery
- ✅ No 400/500 errors in console

**Failure indicators:**
- ❌ "Storage bucket 'photos' does not exist"
- ❌ 400 Bad Request errors
- ❌ Upload fails silently

---

## 🔧 **STEP 3: Fix Common Issues**

### If uploads fail with policy errors:

**Option A: SQL Method (if storage.policies table exists)**
```sql
-- Add upload policies for authenticated users
INSERT INTO storage.policies (id, bucket_id, name, type, definition) VALUES
('photos-upload', 'photos', 'Allow authenticated uploads', 'INSERT', 'auth.uid() IS NOT NULL'),
('avatars-upload', 'avatars', 'Allow authenticated uploads', 'INSERT', 'auth.uid() IS NOT NULL'),
('photos-read', 'photos', 'Allow public read', 'SELECT', 'true'),
('avatars-read', 'avatars', 'Allow public read', 'SELECT', 'true');
```

**Option B: Dashboard Method (if storage.policies doesn't exist)**
1. Go to **Supabase Dashboard** → **Storage**
2. Click on `photos` bucket → **Policies** tab
3. Click **"New Policy"**
4. **Upload Policy**:
   - Policy name: `authenticated-upload`
   - Allowed operation: `INSERT`
   - Target roles: `authenticated`
   - USING expression: `true`
5. **Read Policy**:
   - Policy name: `public-read`
   - Allowed operation: `SELECT`
   - Target roles: `anon, authenticated`
   - USING expression: `true`
6. Repeat for `avatars` bucket

### If uploads fail with size/type errors:
```sql
-- Update bucket limits (50MB for photos, 5MB for avatars)
UPDATE storage.buckets
SET
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
WHERE name = 'photos';

UPDATE storage.buckets
SET
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE name = 'avatars';
```

---

## 🗑️ **STEP 4: Clean Up Test Data**

### Delete Test Objects
```sql
-- Remove the test upload we created
DELETE FROM storage.objects
WHERE bucket_id = 'photos' AND name = 'test-upload.txt';

-- See all objects in buckets (to verify what needs cleanup)
SELECT
  bucket_id,
  name,
  created_at,
  metadata->>'size' as file_size
FROM storage.objects
WHERE bucket_id IN ('photos', 'avatars')
ORDER BY bucket_id, created_at DESC;
```

### Delete Specific Upload (if needed)
```sql
-- Delete a specific file (replace 'filename.jpg' with actual filename)
DELETE FROM storage.objects
WHERE bucket_id = 'photos' AND name = 'path/to/filename.jpg';
```

### Clear All Objects from Buckets (NUCLEAR OPTION)
```sql
-- ⚠️ WARNING: This deletes ALL photos and avatars!
-- Only run if you want to completely reset storage
DELETE FROM storage.objects WHERE bucket_id = 'photos';
DELETE FROM storage.objects WHERE bucket_id = 'avatars';
```

**Alternative Dashboard Method:**
1. Go to **Supabase Dashboard** → **Storage**
2. Click on bucket name (`photos` or `avatars`)
3. Select files you want to delete
4. Click **Delete** button

---

## 🔄 **STEP 5: Reset Buckets Completely (if needed)**

### Delete and Recreate Buckets
```sql
-- ⚠️ NUCLEAR OPTION: Complete bucket reset
-- This will delete ALL files and recreate clean buckets

-- Delete all objects first
DELETE FROM storage.objects WHERE bucket_id IN ('photos', 'avatars');

-- Delete policies (only if storage.policies table exists)
DELETE FROM storage.policies WHERE bucket_id IN ('photos', 'avatars');

-- Delete buckets
DELETE FROM storage.buckets WHERE name IN ('photos', 'avatars');

-- Recreate photos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'photos',
  'photos',
  true,
  52428800,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Recreate avatars bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);
```

---

## 📊 **STEP 6: Monitor Storage Usage**

### Check Storage Statistics
```sql
-- See storage usage by bucket
SELECT
  bucket_id,
  COUNT(*) as file_count,
  SUM((metadata->>'size')::bigint) as total_bytes,
  ROUND(SUM((metadata->>'size')::bigint) / 1024.0 / 1024.0, 2) as total_mb
FROM storage.objects
WHERE bucket_id IN ('photos', 'avatars')
GROUP BY bucket_id
ORDER BY bucket_id;
```

### List Recent Uploads
```sql
-- See last 10 uploads
SELECT
  bucket_id,
  name,
  created_at,
  ROUND((metadata->>'size')::bigint / 1024.0, 2) as size_kb,
  metadata->>'mimetype' as mime_type
FROM storage.objects
WHERE bucket_id IN ('photos', 'avatars')
ORDER BY created_at DESC
LIMIT 10;
```

---

## ✅ **Success Checklist**

After running tests, you should have:

- [ ] **Buckets exist**: `photos` and `avatars` show up in queries
- [ ] **Buckets are public**: `public = true` in bucket config
- [ ] **Upload works**: Can upload photos via app without errors
- [ ] **Files accessible**: Uploaded photos display in albums
- [ ] **Console clean**: No storage-related errors in browser console
- [ ] **Policies working**: Authenticated users can upload, public can read

---

## 🚨 **Troubleshooting Quick Reference**

| Error | Solution |
|-------|----------|
| "bucket does not exist" | Verify bucket names exactly match `photos` and `avatars` |
| "access denied" | Add upload policies for authenticated users |
| "file too large" | Increase `file_size_limit` in bucket config |
| "invalid file type" | Update `allowed_mime_types` array |
| Upload succeeds but image doesn't show | Check if bucket is public and has read policies |

---

## 🎯 **Expected End State**

After successful setup and testing:
- ✅ Users can upload photos to albums without errors
- ✅ Photos display correctly in galleries
- ✅ Profile avatar uploads work
- ✅ No storage-related console errors
- ✅ Globe shows pins for albums with photos

Your Adventure Log photo functionality should be 100% operational! 📸🚀