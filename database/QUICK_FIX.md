# ⚡ Quick Fix Guide

## 🚨 Common Errors You Might See

```
ERROR: 42P13: cannot change return type of existing function
HINT: Use DROP FUNCTION get_user_level_info(uuid) first.
```

```
ERROR: 42710: policy "Users can view their own level" already exists
```

## ✅ All Fixed!

The migration files have been updated with:
- ✅ DROP FUNCTION statements (fixes function conflicts)
- ✅ DROP POLICY statements (fixes policy conflicts)

Just **re-run the migrations** - they're now 100% idempotent!

---

## 📋 Step-by-Step Fix

### 1. Open Supabase SQL Editor
Go to: **Supabase Dashboard → SQL Editor**

### 2. Run Migration 1: User Levels

**Copy and paste this entire file:**
📁 `database/migrations/add_user_levels_table.sql`

Click **Run** ✅

### 3. Run Migration 2: Profile & Albums

**Copy and paste this entire file:**
📁 `database/migrations/fix_profiles_and_albums.sql`

Click **Run** ✅

---

## 🎯 What's Been Fixed

✅ **Function conflicts resolved** - All functions now have DROP statements
✅ **User levels table** - Complete with all columns
✅ **Profile updates** - Username, avatar, display name save correctly
✅ **Album locations** - No more "Unknown Location"

---

## ✨ The migrations are now **idempotent**

This means:
- ✅ Safe to run multiple times
- ✅ Won't error if already exists
- ✅ Will update existing functions
- ✅ Won't duplicate data

---

## 🔍 Verify It Worked

Run these queries in SQL Editor after migration:

```sql
-- Check user levels table exists
SELECT COUNT(*) FROM user_levels;

-- Check level requirements loaded
SELECT * FROM level_requirements ORDER BY level;

-- Check profile columns
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'profiles';

-- Check album columns
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'albums';
```

Expected results:
- ✅ user_levels table has data
- ✅ 10 level requirements exist (1-10)
- ✅ profiles has: name, display_name, username, website, location
- ✅ albums has: location_name, location_display

---

## 🎉 Success Indicators

After running migrations, you should see:

1. **Console**: No more "albums_created" errors
2. **Profile Edit**: Saves work (username, avatar, bio)
3. **Albums**: Show correct locations (not "Unknown Location")
4. **Dashboard**: User level displays correctly

---

## 📞 Still Having Issues?

Check the full documentation:
📁 `database/README_FIXES.md`

Or drop the functions manually first:
```sql
-- Only if needed
DROP FUNCTION IF EXISTS get_user_level_info(UUID);
DROP FUNCTION IF EXISTS update_user_level(UUID);
DROP FUNCTION IF EXISTS increment_user_stat(UUID, TEXT, INTEGER);
DROP FUNCTION IF EXISTS sync_profile_name();
DROP FUNCTION IF EXISTS set_album_location_display();
DROP FUNCTION IF EXISTS get_album_location(UUID);
DROP FUNCTION IF EXISTS handle_new_user();
```

Then re-run the migrations.

---

**That's it! Your database is ready to go.** 🚀
