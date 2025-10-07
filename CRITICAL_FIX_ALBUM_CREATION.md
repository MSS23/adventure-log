# 🚨 CRITICAL FIX: Album Creation Failure

## The Problem

Albums fail to create with "Failed to create album" error - **100% failure rate**.

## Root Causes Found

### 1. Missing Database Columns ❌
The albums table is missing required columns that the application tries to insert.

### 2. Missing RLS Policy (MOST LIKELY CAUSE) ❌
**Users cannot view their own draft albums!**

The RLS policy `"Users can view their own albums"` was accidentally deleted and never recreated. This means:
- Album INSERT succeeds ✅
- But the `.select().single()` query after insert fails ❌
- User sees "Failed to create album" even though album was created!

## The Fix (Run Both Migrations)

### Step 1: Add Missing Columns

Run this in Supabase Dashboard → SQL Editor:

```sql
-- Copy contents of: supabase/migrations/20250107_fix_albums_table_schema.sql
```

### Step 2: Fix RLS Policies (CRITICAL!)

Run this in Supabase Dashboard → SQL Editor:

```sql
-- Copy contents of: supabase/migrations/20250107_fix_albums_rls_policies.sql
```

Or run this directly:

```sql
-- Fix albums RLS policies to allow users to view their own albums (including drafts)
DROP POLICY IF EXISTS "Users can view own albums" ON albums;
CREATE POLICY "Users can view own albums"
  ON albums FOR SELECT
  USING (user_id = auth.uid());

COMMENT ON POLICY "Users can view own albums" ON albums IS 'Allow users to view all their own albums including drafts';
```

## How to Apply

### Option 1: Supabase Dashboard (Recommended - 2 minutes)

1. Open [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **SQL Editor** → **New Query**
4. **First**, paste `20250107_fix_albums_table_schema.sql` → Click **Run**
5. **Then**, paste `20250107_fix_albums_rls_policies.sql` → Click **Run**

### Option 2: All-in-One SQL

Copy this entire block and run in SQL Editor:

```sql
-- ==========================================
-- ALBUM CREATION FIX - ALL IN ONE
-- ==========================================

-- Part 1: Add missing columns
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'albums' AND column_name = 'latitude') THEN
        ALTER TABLE public.albums ADD COLUMN latitude DOUBLE PRECISION;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'albums' AND column_name = 'longitude') THEN
        ALTER TABLE public.albums ADD COLUMN longitude DOUBLE PRECISION;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'albums' AND column_name = 'visibility') THEN
        ALTER TABLE public.albums ADD COLUMN visibility TEXT DEFAULT 'public';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'albums' AND column_name = 'status') THEN
        ALTER TABLE public.albums ADD COLUMN status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'albums' AND column_name = 'tags') THEN
        ALTER TABLE public.albums ADD COLUMN tags TEXT[];
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'albums' AND column_name = 'cover_photo_url') THEN
        ALTER TABLE public.albums ADD COLUMN cover_photo_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'albums' AND column_name = 'favorite_photo_urls') THEN
        ALTER TABLE public.albums ADD COLUMN favorite_photo_urls TEXT[];
    END IF;
END $$;

-- Update visibility constraint
ALTER TABLE public.albums DROP CONSTRAINT IF EXISTS valid_visibility;
ALTER TABLE public.albums ADD CONSTRAINT valid_visibility
  CHECK (visibility IN ('public', 'private', 'friends') OR visibility IS NULL);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_albums_location_coords ON albums(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_albums_status ON albums(status);
CREATE INDEX IF NOT EXISTS idx_albums_visibility ON albums(visibility);

-- Part 2: Fix RLS policies (THE CRITICAL FIX!)
DROP POLICY IF EXISTS "Users can view own albums" ON albums;
CREATE POLICY "Users can view own albums"
  ON albums FOR SELECT
  USING (user_id = auth.uid());

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Album creation fix applied successfully!';
    RAISE NOTICE 'You can now create albums without errors.';
END $$;
```

## Verification

After running the migration:

1. **Test Album Creation:**
   ```
   Login → New Album → Fill Details → Create
   ```

2. **Expected Result:**
   - ✅ Album creates successfully
   - ✅ Redirects to album detail page
   - ✅ No "Failed to create album" error

3. **Check Browser Console:**
   - Should see success logs
   - No permission denied errors

## What This Fixes

### Before Fix:
```
User clicks "Create Album"
→ INSERT succeeds (album created in DB)
→ SELECT fails (user can't view own draft)
→ Error: "Failed to create album"
→ Album exists but user can't see it!
```

### After Fix:
```
User clicks "Create Album"
→ INSERT succeeds (album created)
→ SELECT succeeds (user can view own albums)
→ Success! Redirects to album page
→ User can see and edit their new album
```

## Troubleshooting

### Error: "column 'latitude' does not exist"
**Fix:** Run the schema migration (Part 1)

### Error: "permission denied for table albums"
**Fix:** Run the RLS policy migration (Part 2)

### Albums still failing after migration?
1. Clear browser cache
2. Check browser console (F12) for exact error
3. Verify migrations ran: Check Supabase Dashboard → Database → Tables → albums
4. Verify policies: Dashboard → Authentication → Policies → albums table

## Support

If issues persist:
1. Copy exact error message from browser console
2. Check Supabase logs: Dashboard → Logs → Postgres
3. Verify user is authenticated: Check Network tab for auth headers
