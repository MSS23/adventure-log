# 🚨 EMERGENCY STORAGE FIX - "Storage bucket 'photos' does not exist"

**Critical Issue**: Photo uploads failing with "Storage bucket 'photos' does not exist" error.

---

## 🔍 **STEP 1: Immediate Verification (DO THIS FIRST)**

### Check Supabase Dashboard
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to project: `jjrqstbzzvqrgaqwdvxw`
3. Click **Storage** in left sidebar
4. **Look for buckets**: Do you see `photos` and `avatars` listed?

### Result A: Buckets DON'T exist
➡️ **Go to STEP 2A: Create Buckets**

### Result B: Buckets DO exist
➡️ **Go to STEP 2B: Fix Permissions**

---

## 🔧 **STEP 2A: Create Buckets (If they don't exist)**

### Via Supabase Dashboard (EASIEST)
1. In Storage section, click **"New bucket"**
2. **Bucket name**: `photos`
3. **Public bucket**: ✅ **MUST BE CHECKED**
4. **File size limit**: `52428800` (50MB)
5. **Allowed MIME types**: `image/jpeg,image/png,image/webp,image/gif`
6. Click **"Create bucket"**

7. Repeat for `avatars` bucket:
   - **Bucket name**: `avatars`
   - **Public bucket**: ✅ **CHECKED**
   - **File size limit**: `5242880` (5MB)
   - **MIME types**: `image/jpeg,image/png,image/webp`

### Via SQL (Alternative)
```sql
-- Create photos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'photos',
  'photos',
  true,
  52428800,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- Create avatars bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];
```

---

## 🔧 **STEP 2B: Fix Permissions (If buckets exist but uploads fail)**

### Check Bucket Status
```sql
-- Verify buckets exist and are public
SELECT
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets
WHERE name IN ('photos', 'avatars');
```

**Expected result**: Both buckets should show `public = true`

### Fix Public Access
```sql
-- Force buckets to be public
UPDATE storage.buckets
SET public = true
WHERE name IN ('photos', 'avatars');

-- Verify the fix
SELECT name, public FROM storage.buckets
WHERE name IN ('photos', 'avatars');
```

---

## 🧪 **STEP 3: Test Bucket Access**

### Test 1: Direct API Test
In Supabase SQL Editor:
```sql
-- Test if storage system recognizes buckets
SELECT
  bucket_id,
  COUNT(*) as object_count
FROM storage.objects
WHERE bucket_id IN ('photos', 'avatars')
GROUP BY bucket_id;
```

### Test 2: App Connection Test
Visit your app and open browser console, then run:
```javascript
// Test in browser console on your app page
// This tests if your app can see the buckets
fetch('https://jjrqstbzzvqrgaqwdvxw.supabase.co/storage/v1/bucket/photos', {
  headers: {
    'Authorization': 'Bearer ' + window.localStorage.getItem('sb-jjrqstbzzvqrgaqwdvxw-auth-token')?.split('"access_token":"')[1]?.split('"')[0],
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqcnFzdGJ6enZxcmdhcXdkdnh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0ODc4MDcsImV4cCI6MjA3NDA2MzgwN30.aSHFHAA5Tv2EUDu7nxwOWXSFFUxbOUCR65Vi52QkjX4'
  }
})
.then(r => r.json())
.then(console.log);
```

**Success**: Should return bucket info, not 404/400
**Failure**: Returns error → bucket doesn't exist

---

## 🔄 **STEP 4: Emergency Reset (Nuclear Option)**

If nothing works, completely reset storage:

```sql
-- ⚠️ WARNING: This deletes ALL storage data!
-- Only run if you want to start completely fresh

-- Delete all objects
DELETE FROM storage.objects WHERE bucket_id IN ('photos', 'avatars');

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

## ✅ **STEP 5: Verify Fix**

### Test Upload Again
1. **Go to your app**: `https://your-app.vercel.app`
2. **Create/open an album**
3. **Try uploading the same 596KB photo**
4. **Check browser console** for errors

### Success Indicators:
- ✅ No "bucket does not exist" error
- ✅ Upload progress shows
- ✅ Photo appears in album
- ✅ Console shows successful upload log

### Still Failing?
Check network tab in DevTools:
- Look for failed requests to `/storage/v1/`
- Check exact error response from Supabase
- Verify your app is using correct Supabase URL/key

---

## 🎯 **Expected Timeline**

- **Dashboard creation**: 2 minutes
- **SQL creation**: 1 minute
- **Testing**: 3 minutes
- **Total**: ~5 minutes to fix

---

## 🆘 **If STILL Broken After All Steps**

1. **Check Supabase project settings**:
   - Storage might not be enabled on your plan
   - Contact Supabase support

2. **Verify environment variables**:
   - `NEXT_PUBLIC_SUPABASE_URL` correct?
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` correct?

3. **Check browser network tab**:
   - What exact request is failing?
   - What's the response code/message?

**Post the exact error details for further debugging.**

---

**🚀 After this fix, your 596KB photo uploads should work perfectly!**