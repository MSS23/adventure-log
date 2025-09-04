# 🛠️ Photo Upload Authentication Fix Instructions

## 📋 Overview

This guide fixes the "error authorized user" issue when uploading photos with Google OAuth authentication. The root cause is a **path structure mismatch** between your RLS policies and application code.

**Status**: ✅ **Code fixes applied** - Follow steps below to complete the fix

---

## 🚀 Step-by-Step Fix Instructions

### Step 1: Apply Updated RLS Policies to Supabase

The main fix is updating your Supabase RLS policies to match your application's path structure.

1. **Login to Supabase Dashboard**: https://supabase.com/dashboard
2. **Navigate to SQL Editor**: Left sidebar → SQL Editor
3. **Run the Policy Reset Script**:

```sql
-- First, remove existing policies to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can upload to own directory" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can list own objects" ON storage.objects;
```

4. **Apply the Updated Policies**:

```sql
-- Enable RLS on storage.objects table (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Public read access for adventure-photos bucket
CREATE POLICY "Public read access for adventure-photos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'adventure-photos');

-- Updated INSERT policy for path: albums/{albumId}/{userId}/...
CREATE POLICY "Authenticated users can upload to own directory"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'adventure-photos'
  AND (storage.foldername(name))[1] = 'albums'
  AND (storage.foldername(name))[3] = auth.uid()::text
);

-- Updated UPDATE policy
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

-- Updated DELETE policy
CREATE POLICY "Users can delete own photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'adventure-photos'
  AND (storage.foldername(name))[1] = 'albums'
  AND (storage.foldername(name))[3] = auth.uid()::text
);

-- Updated SELECT policy for listing objects
CREATE POLICY "Users can list own objects"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'adventure-photos'
  AND (storage.foldername(name))[1] = 'albums'
  AND (storage.foldername(name))[3] = auth.uid()::text
);
```

5. **Verify Policies**: Go to Authentication → Policies → Check that all policies are listed and enabled

### Step 2: Restart Your Development Server

The middleware changes require a server restart:

```bash
# Stop your current dev server (Ctrl+C)
# Then restart
npm run dev
```

### Step 3: Test the Fixes

#### 3a. Run Diagnostic Tests

Visit these debug endpoints in your browser (while signed in):

```
http://localhost:3000/api/debug/upload-test
http://localhost:3000/api/debug/rls-test
```

**Expected Results**:

- All tests should show `"passed": true`
- Success rate should be 100%
- No RLS policy violations

#### 3b. Test Real Photo Upload

1. **Sign in** with your Google account
2. **Create or open an album**
3. **Try uploading a photo**
4. **Check browser console** for any errors
5. **Verify photo appears** in the album

---

## 🔍 If Upload Still Fails

### Check 1: Browser Developer Tools

- Open Developer Tools (F12)
- Go to Network tab
- Try uploading a photo
- Look for failed requests to `/api/storage/signed-upload`
- Check the error response details

### Check 2: Server Logs

Look for detailed error messages in your terminal where you're running `npm run dev`.

### Check 3: Supabase Storage Logs

1. Go to Supabase Dashboard → Logs
2. Select "Storage" logs
3. Look for policy violation errors

---

## 📊 What Was Fixed

### Before (Broken)

```
RLS Policy Expected:  {userId}/albums/{albumId}/file.jpg
App Generated Path:   albums/{albumId}/{userId}/file.jpg
Result:               ❌ Path mismatch → RLS rejection
```

### After (Fixed)

```
RLS Policy Expected:  albums/{albumId}/{userId}/file.jpg
App Generated Path:   albums/{albumId}/{userId}/file.jpg
Result:               ✅ Path match → Upload success
```

### Additional Improvements Made

- ✅ **Middleware Protection**: Added `/api/storage` route protection
- ✅ **Enhanced Error Handling**: Better error messages for debugging
- ✅ **Debug Endpoints**: Tools to diagnose upload issues
- ✅ **Comprehensive Logging**: Detailed logs for troubleshooting

---

## 🆘 Troubleshooting

### Issue: "Service role policies not found"

**Solution**: You may need service role policies too:

```sql
-- Add service role policies if needed
CREATE POLICY "Service role can upload files" ON storage.objects
FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can read files" ON storage.objects
FOR SELECT USING (auth.role() = 'service_role');
```

### Issue: "Bucket not found"

**Solution**: Verify bucket exists and is public:

1. Supabase Dashboard → Storage
2. Check `adventure-photos` bucket exists
3. Ensure bucket is marked as "Public"

### Issue: "Authentication required"

**Solution**: Check NextAuth configuration:

1. Verify Google OAuth credentials are correct
2. Check `NEXTAUTH_URL` matches your domain
3. Ensure `NEXTAUTH_SECRET` is set

---

## ✅ Success Indicators

After applying these fixes, you should see:

- ✅ **Photo uploads work** without "error authorized user"
- ✅ **Clear error messages** if something goes wrong
- ✅ **Debug endpoints** show 100% success rate
- ✅ **Browser console** shows successful upload requests
- ✅ **Photos appear immediately** in albums

---

## 📞 Additional Support

If you still encounter issues after following these steps:

1. **Check the enhanced error messages** in the upload response
2. **Run the debug endpoints** to get specific diagnostic information
3. **Review the browser network tab** for detailed request/response data
4. **Look at the server logs** for authentication and database issues

The improved error handling will now give you specific guidance on what's wrong and how to fix it.

---

**🎉 That's it! Your photo upload authentication should now work perfectly with Google OAuth.**

_Last Updated: $(date)_
_Fix Applied: RLS Policy Path Structure Alignment_
