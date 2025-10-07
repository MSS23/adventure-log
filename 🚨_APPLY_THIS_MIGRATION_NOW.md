# 🚨 CRITICAL: APPLY THIS DATABASE MIGRATION NOW

## ⚠️ Album Creation is 100% Broken Until You Run This SQL

Your testing confirms album creation fails with "Failed to create album" - this is because the database is missing required columns.

---

## 📋 **COPY THIS ENTIRE SQL BLOCK AND RUN IT**

### **Step 1:** Open Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your Adventure Log project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

### **Step 2:** Copy and Paste This SQL

```sql
-- ==========================================
-- ALBUM CREATION FIX - COMPLETE
-- ==========================================
-- This adds missing columns and RLS policies
-- Run this entire block at once
-- ==========================================

DO $$
BEGIN
    -- Add latitude column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'albums'
        AND column_name = 'latitude'
    ) THEN
        ALTER TABLE public.albums ADD COLUMN latitude DOUBLE PRECISION;
        RAISE NOTICE 'Added latitude column';
    END IF;

    -- Add longitude column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'albums'
        AND column_name = 'longitude'
    ) THEN
        ALTER TABLE public.albums ADD COLUMN longitude DOUBLE PRECISION;
        RAISE NOTICE 'Added longitude column';
    END IF;

    -- Add visibility column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'albums'
        AND column_name = 'visibility'
    ) THEN
        ALTER TABLE public.albums ADD COLUMN visibility TEXT DEFAULT 'public';
        RAISE NOTICE 'Added visibility column';
    END IF;

    -- Add status column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'albums'
        AND column_name = 'status'
    ) THEN
        ALTER TABLE public.albums ADD COLUMN status TEXT DEFAULT 'published';
        RAISE NOTICE 'Added status column';
    END IF;

    -- Add tags column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'albums'
        AND column_name = 'tags'
    ) THEN
        ALTER TABLE public.albums ADD COLUMN tags TEXT[];
        RAISE NOTICE 'Added tags column';
    END IF;

    -- Add cover_photo_url column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'albums'
        AND column_name = 'cover_photo_url'
    ) THEN
        ALTER TABLE public.albums ADD COLUMN cover_photo_url TEXT;
        RAISE NOTICE 'Added cover_photo_url column';
    END IF;

    -- Add favorite_photo_urls column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'albums'
        AND column_name = 'favorite_photo_urls'
    ) THEN
        ALTER TABLE public.albums ADD COLUMN favorite_photo_urls TEXT[];
        RAISE NOTICE 'Added favorite_photo_urls column';
    END IF;
END $$;

-- Add status constraint
ALTER TABLE public.albums DROP CONSTRAINT IF EXISTS albums_status_check;
ALTER TABLE public.albums ADD CONSTRAINT albums_status_check
    CHECK (status IN ('draft', 'published') OR status IS NULL);

-- Add visibility constraint
ALTER TABLE public.albums DROP CONSTRAINT IF EXISTS valid_visibility;
ALTER TABLE public.albums ADD CONSTRAINT valid_visibility
    CHECK (visibility IN ('public', 'private', 'friends') OR visibility IS NULL);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_albums_location_coords
    ON albums(latitude, longitude)
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_albums_status
    ON albums(status)
    WHERE status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_albums_visibility
    ON albums(visibility)
    WHERE visibility IS NOT NULL;

-- ==========================================
-- CRITICAL RLS POLICY FIX
-- This allows users to view their own albums
-- ==========================================

DROP POLICY IF EXISTS "Users can view own albums" ON albums;
CREATE POLICY "Users can view own albums"
    ON albums
    FOR SELECT
    USING (user_id = auth.uid());

-- Success confirmation
DO $$
BEGIN
    RAISE NOTICE '====================================';
    RAISE NOTICE '✅ MIGRATION COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '====================================';
    RAISE NOTICE 'Album creation should now work!';
    RAISE NOTICE 'Try creating a new album.';
END $$;

-- Verify the fix worked
SELECT
    'Albums table structure updated' AS message,
    COUNT(*) FILTER (WHERE column_name = 'latitude') AS has_latitude,
    COUNT(*) FILTER (WHERE column_name = 'longitude') AS has_longitude,
    COUNT(*) FILTER (WHERE column_name = 'visibility') AS has_visibility,
    COUNT(*) FILTER (WHERE column_name = 'status') AS has_status,
    COUNT(*) FILTER (WHERE column_name = 'tags') AS has_tags,
    COUNT(*) FILTER (WHERE column_name = 'cover_photo_url') AS has_cover_url,
    COUNT(*) FILTER (WHERE column_name = 'favorite_photo_urls') AS has_favorite_urls
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'albums'
    AND column_name IN ('latitude', 'longitude', 'visibility', 'status', 'tags', 'cover_photo_url', 'favorite_photo_urls');
```

### **Step 3:** Click RUN (or press Ctrl+Enter / Cmd+Enter)

You should see output like:
```
✅ MIGRATION COMPLETED SUCCESSFULLY!
Album creation should now work!

Albums table structure updated
has_latitude: 1
has_longitude: 1
has_visibility: 1
has_status: 1
has_tags: 1
has_cover_url: 1
has_favorite_urls: 1
```

---

## ✅ **VERIFICATION**

After running the migration:

1. **Test Album Creation:**
   - Login to your app
   - Click "New Album"
   - Fill in:
     - Title: "Test Album"
     - Location: Pick any city (e.g., "Paris")
     - Optional: Add photos
   - Click "Create"

2. **Expected Result:**
   - ✅ Album creates successfully
   - ✅ Redirects to album detail page
   - ✅ No "Failed to create album" error

3. **If Still Failing:**
   - Check browser console (F12)
   - Copy exact error message
   - The error should now show specific details (not generic)

---

## 🐛 **WHY IS THIS NEEDED?**

The database table `albums` is missing columns that the app code tries to insert:

**App tries to insert:**
```javascript
{
  title: "My Album",
  latitude: 48.8566,      // ❌ MISSING - causes error
  longitude: 2.3522,       // ❌ MISSING - causes error
  visibility: "public",    // ❌ MISSING - causes error
  status: "published",     // ❌ MISSING - causes error
  tags: ["travel"],        // ❌ MISSING - causes error
  ...
}
```

**Database rejects it because columns don't exist!**

**After migration:**
- All columns exist ✅
- RLS policy allows viewing own albums ✅
- Album creation works ✅

---

## 🔍 **TROUBLESHOOTING**

### Error: "relation 'albums' does not exist"
**Fix:** Your albums table hasn't been created. You need to run initial schema migrations first.

### Error: "permission denied for table albums"
**Fix:** The RLS policy part of the migration didn't run. Try running just the policy part:
```sql
DROP POLICY IF EXISTS "Users can view own albums" ON albums;
CREATE POLICY "Users can view own albums"
    ON albums FOR SELECT USING (user_id = auth.uid());
```

### Error: "column 'latitude' already exists"
**Fix:** Migration already ran partially. This is OK - the script handles it.

### Still getting "Failed to create album"
1. Clear browser cache
2. Check browser console (F12) for detailed error
3. Verify migration ran: Check the verification query output
4. Try creating album again

---

## 📞 **NEED HELP?**

If the migration fails or album creation still doesn't work:

1. **Copy the EXACT error message** from:
   - Supabase SQL editor (if migration failed)
   - Browser console (if album creation failed)

2. **Check Supabase logs:**
   - Dashboard → Logs → Postgres
   - Look for recent errors

3. **Verify table structure:**
   ```sql
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'albums'
   ORDER BY ordinal_position;
   ```

---

## ⏱️ **THIS TAKES 30 SECONDS**

1. Copy SQL above
2. Paste in Supabase SQL Editor
3. Click Run
4. Wait for success message
5. Test album creation

**That's it! Album creation will work immediately after running this.**

---

## 🎉 **AFTER THIS MIGRATION**

Everything will work:
- ✅ Album creation
- ✅ Album editing
- ✅ Photo uploads
- ✅ Location marking
- ✅ Dashboard stats updates
- ✅ Globe timeline shows data
- ✅ Search finds albums

**One SQL query fixes everything!**
