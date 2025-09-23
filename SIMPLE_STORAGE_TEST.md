# 🚀 Simple Storage Test (No Policies Table Required)

Quick test for your storage buckets without needing `storage.policies` table.

## ✅ **STEP 1: Basic Bucket Check**

Run this in Supabase SQL Editor:

```sql
-- Check if your buckets exist and are public
SELECT
  name,
  public,
  file_size_limit,
  created_at
FROM storage.buckets
WHERE name IN ('photos', 'avatars')
ORDER BY name;
```

**Expected Result:**
```
name    | public | file_size_limit | created_at
--------|--------|-----------------|------------------
avatars | true   | null            | 2025-09-23 ...
photos  | true   | null            | 2025-09-23 ...
```

✅ **Both buckets should show `public = true`**

## 🧪 **STEP 2: Test App Upload (Easiest Method)**

1. **Go to your app**: `https://your-app.vercel.app`
2. **Login** with your account
3. **Create an album**:
   - Navigate to `/albums/new`
   - Fill in title: "Test Album"
   - Add location: "Test Location"
   - Click Save
4. **Upload a photo**:
   - Open your new album
   - Click "Upload Photos"
   - Select any image file
   - Watch for errors in browser console

### ✅ **Success Indicators:**
- Photo upload progress bar appears
- No error messages in console
- Photo appears in album gallery
- Can view photo in full size

### ❌ **Failure Indicators:**
- Console shows: "Storage bucket 'photos' does not exist"
- Upload fails silently
- 400/500 errors in network tab

## 🔧 **STEP 3: Fix Public Bucket Issues (if needed)**

If uploads fail but buckets exist, make them properly public:

```sql
-- Ensure buckets are public
UPDATE storage.buckets
SET public = true
WHERE name IN ('photos', 'avatars');

-- Verify the change
SELECT name, public FROM storage.buckets
WHERE name IN ('photos', 'avatars');
```

## 🗑️ **STEP 4: Clean Up Test Data**

After testing, remove test uploads:

```sql
-- See what test files you created
SELECT
  bucket_id,
  name,
  created_at,
  metadata->>'size' as file_size_bytes
FROM storage.objects
WHERE bucket_id IN ('photos', 'avatars')
ORDER BY created_at DESC
LIMIT 10;

-- Delete specific test files (replace with actual filename)
DELETE FROM storage.objects
WHERE bucket_id = 'photos'
AND name LIKE '%test%';
```

## 📊 **STEP 5: Monitor Storage Usage**

```sql
-- Check total usage
SELECT
  bucket_id,
  COUNT(*) as total_files,
  SUM((metadata->>'size')::bigint) as total_bytes,
  ROUND(SUM((metadata->>'size')::bigint) / 1024.0 / 1024.0, 2) as total_mb
FROM storage.objects
WHERE bucket_id IN ('photos', 'avatars')
GROUP BY bucket_id;
```

## 🎯 **Expected Final State**

After successful testing:
- ✅ Both buckets exist and are public
- ✅ Can upload photos through app interface
- ✅ Photos display correctly in albums
- ✅ No storage errors in console
- ✅ Can delete test files to clean up

## 🚨 **If Upload Still Fails**

1. **Check Supabase Dashboard**:
   - Go to Storage section
   - Verify buckets are there and marked "Public"
   - Try uploading a file directly via Dashboard

2. **Check Network Tab**:
   - Open browser DevTools → Network tab
   - Try upload again
   - Look for failed requests to `storage/v1/`

3. **Check App Console**:
   - Look for specific error messages
   - Common errors:
     - "bucket does not exist" → Create buckets
     - "access denied" → Make buckets public
     - "file too large" → Check file size limits

## ✨ **No Policies Table Needed!**

Since your buckets are public, you don't need complex policies. Public buckets allow:
- ✅ Anyone can read files
- ✅ Authenticated users can upload files
- ✅ Simple and works for most cases

This simplified approach should get your photo uploads working! 📸