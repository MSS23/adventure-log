# Adventure Log - Complete Supabase Setup Guide

## 🚀 Quick Start - External Configuration Required

Your Adventure Log application needs proper Supabase configuration to work correctly. Follow these steps **in order** to set up your production environment.

## 📋 Prerequisites

1. **Supabase Account**: Create account at [supabase.com](https://supabase.com)
2. **Deployed Database**: Your 4 SQL files have been executed
3. **Environment Variables**: Access to your hosting platform's env var settings

## 🗄️ Step 1: Create Storage Buckets

### In Supabase Dashboard → Storage → Create Bucket:

#### Photos Bucket
```sql
-- Method 1: UI (Recommended)
-- Go to Storage → Create Bucket
-- Name: photos
-- Public: ✅ Enabled
-- File size limit: 50 MB
-- Allowed MIME types: image/jpeg, image/png, image/webp, image/gif

-- Method 2: SQL Editor
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('photos', 'photos', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
```

#### Avatars Bucket
```sql
-- Method 1: UI (Recommended)
-- Go to Storage → Create Bucket
-- Name: avatars
-- Public: ✅ Enabled
-- File size limit: 5 MB
-- Allowed MIME types: image/jpeg, image/png, image/webp

-- Method 2: SQL Editor
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']);
```

## 🔐 Step 2: Configure Storage Security Policies

### In Supabase SQL Editor, run these policies:

```sql
-- ===================================================================
-- PHOTOS BUCKET POLICIES
-- ===================================================================

-- Allow authenticated users to upload photos
CREATE POLICY "Authenticated users can upload photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'photos'
    AND auth.role() = 'authenticated'
  );

-- Allow users to update their own photos
CREATE POLICY "Users can update their own photos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow anyone to view photos (public bucket)
CREATE POLICY "Photos are publicly viewable" ON storage.objects
  FOR SELECT USING (bucket_id = 'photos');

-- Allow users to delete their own photos
CREATE POLICY "Users can delete their own photos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ===================================================================
-- AVATARS BUCKET POLICIES
-- ===================================================================

-- Allow authenticated users to upload avatars
CREATE POLICY "Users can upload avatars" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
  );

-- Allow users to update their own avatars
CREATE POLICY "Users can update their own avatars" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow anyone to view avatars (public bucket)
CREATE POLICY "Avatars are publicly viewable" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- Allow users to delete their own avatars
CREATE POLICY "Users can delete their own avatars" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

## 🔑 Step 3: Get Your Supabase Keys

### From Supabase Dashboard → Settings → API:

1. **Project URL**: `https://xxxxx.supabase.co`
2. **Anon Key**: `eyJ...` (public key, safe for frontend)
3. **Service Role Key**: `eyJ...` (secret key, server-side only)

## 🌍 Step 4: Configure Environment Variables

### For Vercel/Netlify/Other Hosting:

```bash
# Required - Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Required - App Configuration
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Optional - Enhanced Features
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your-mapbox-token
```

### For Local Development (.env.local):

```bash
# Copy from .env.example and fill in your values
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 🗃️ Step 5: Execute Database Schema (If Not Done)

### Run these files in Supabase SQL Editor **in exact order**:

1. **01-core-schema.sql** - Base tables, RLS policies, triggers
2. **02-reference-data.sql** - Essential country data (4 countries)
3. **03-enhanced-features.sql** - Views, indexes, optimizations
4. **04-functions-and-views.sql** - Business logic functions

```sql
-- Verify setup completed successfully
SELECT
  (SELECT COUNT(*) FROM storage.buckets WHERE id IN ('photos', 'avatars')) as buckets_created,
  (SELECT COUNT(*) FROM albums LIMIT 1) as albums_table_exists,
  (SELECT COUNT(*) FROM profiles LIMIT 1) as profiles_table_exists,
  (SELECT COUNT(*) FROM countries) as countries_loaded;

-- Expected result: buckets_created: 2, others should not error
```

## ✅ Step 6: Test Your Setup

### Option 1: Health Check API
Visit: `https://your-domain.com/api/health`

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "supabase": {
    "healthy": true,
    "database": { "healthy": true },
    "storage": { "healthy": true }
  }
}
```

### Option 2: Manual Test
1. **Create Account**: Sign up on your app
2. **Complete Profile**: Add username and display name
3. **Upload Avatar**: Test avatar upload
4. **Create Album**: Create your first album
5. **Upload Photos**: Add photos to the album

## 🚨 Common Issues & Solutions

### ❌ "Bucket does not exist" Error
**Solution**: Create the buckets using Step 1 above

### ❌ "Permission denied" Error
**Solution**: Run the storage policies from Step 2 above

### ❌ "Missing environment variables" Error
**Solution**: Add all required env vars from Step 4 above

### ❌ "Profile creation failed" Error
**Solution**: Run the database schema files from Step 5 above

### ❌ "Network error" or "Upload failed"
**Solution**: Check that:
- Supabase URL and keys are correct
- Storage buckets exist and have proper policies
- CORS is configured (should be automatic)

## 🔍 Troubleshooting Commands

### Check Buckets Exist:
```sql
SELECT id, name, public FROM storage.buckets;
```

### Check Storage Policies:
```sql
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'storage';
```

### Check Database Tables:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

### Test File Upload Permissions:
Try uploading a small image through your app's UI.

## 📞 Need Help?

If you're still experiencing issues after following this guide:

1. **Check Health Endpoint**: Visit `/api/health` for detailed diagnostics
2. **Verify Environment Variables**: Ensure all keys are correct and deployed
3. **Check Browser Console**: Look for specific error messages
4. **Supabase Logs**: Check Supabase Dashboard → Logs for server-side errors

## 🎉 Success Indicators

✅ Health check returns "healthy" status
✅ User can sign up and complete profile
✅ Avatar uploads work
✅ Album creation works
✅ Photo uploads work
✅ Globe displays user's travels

**Your Adventure Log is now ready for production! 🚀**