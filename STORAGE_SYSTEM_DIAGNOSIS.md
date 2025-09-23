# 🔍 Storage System Diagnosis & Fix

Your Supabase instance is missing the `storage.policies` table. Let's diagnose and fix this.

## 🧪 **STEP 1: Check What Storage Tables Exist**

Run this in Supabase SQL Editor:

```sql
-- Check all storage-related tables
SELECT
  schemaname,
  tablename,
  tableowner
FROM pg_tables
WHERE schemaname = 'storage'
ORDER BY tablename;
```

**Expected tables in storage schema:**
- `buckets` ✅ (should exist)
- `objects` ✅ (should exist)
- `policies` ❌ (missing - causing your error)

## 🔧 **STEP 2: Check Storage Schema Status**

```sql
-- Check if storage schema exists
SELECT schema_name
FROM information_schema.schemata
WHERE schema_name = 'storage';

-- Check what we can see in storage
SELECT
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'storage';
```

## 🚀 **STEP 3: Initialize Storage System (if needed)**

If storage tables are missing, run this to initialize:

```sql
-- Create storage schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS storage;

-- Create storage.buckets table (if missing)
CREATE TABLE IF NOT EXISTS storage.buckets (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  owner UUID REFERENCES auth.users,
  public BOOLEAN DEFAULT false,
  avif_autodetection BOOLEAN DEFAULT false,
  file_size_limit BIGINT,
  allowed_mime_types TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create storage.objects table (if missing)
CREATE TABLE IF NOT EXISTS storage.objects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bucket_id TEXT REFERENCES storage.buckets,
  name TEXT,
  owner UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB,
  path_tokens TEXT[] GENERATED ALWAYS AS (string_to_array(name, '/')) STORED,
  version TEXT,
  UNIQUE(bucket_id, name)
);

-- Create storage.policies table (the missing one!)
CREATE TABLE IF NOT EXISTS storage.policies (
  id TEXT PRIMARY KEY,
  bucket_id TEXT REFERENCES storage.buckets,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')),
  definition TEXT NOT NULL,
  check_definition TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on storage tables
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.policies ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA storage TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA storage TO postgres, anon, authenticated, service_role;
```

## ✅ **STEP 4: Verify Storage System Works**

After initialization, test this:

```sql
-- Check storage tables now exist
SELECT tablename FROM pg_tables WHERE schemaname = 'storage';

-- Check your buckets
SELECT name, public, created_at FROM storage.buckets;

-- Test policies table (should work now)
SELECT COUNT(*) FROM storage.policies;
```

## 🔄 **STEP 5: Alternative - Use Supabase Dashboard**

If SQL initialization doesn't work, use the Dashboard instead:

1. **Go to**: Supabase Dashboard → Storage
2. **Look for**: "Policies" tab on each bucket
3. **Use GUI**: To create upload/read policies instead of SQL

### Via Dashboard - Storage Policies:
1. Click on `photos` bucket
2. Go to "Policies" tab
3. Click "Add Policy"
4. **Policy 1**: Allow authenticated uploads
   - Policy name: `authenticated-upload`
   - Type: `INSERT`
   - Target roles: `authenticated`
   - Expression: `true`

5. **Policy 2**: Allow public reads
   - Policy name: `public-read`
   - Type: `SELECT`
   - Target roles: `anon, authenticated`
   - Expression: `true`

6. Repeat for `avatars` bucket

## 🎯 **Expected Results**

After fixing storage system:
- ✅ `storage.policies` table exists
- ✅ Can query storage policies without errors
- ✅ Upload policies work for authenticated users
- ✅ Photo uploads succeed in your app
- ✅ No more storage-related console errors

## 🚨 **If Storage Still Doesn't Work**

Your Supabase project might need storage enabled:

1. **Dashboard** → **Settings** → **API**
2. Look for **Storage** settings
3. Ensure storage is **enabled** for your project
4. Check **Storage URL** is configured

Or contact Supabase support - some older projects need manual storage activation.

---

**Next**: After fixing storage system, your photo uploads should work perfectly! 🚀