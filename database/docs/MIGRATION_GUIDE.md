# 🚀 Migration Guide

> Complete guide to set up Adventure Log database

## ⚡ Quick Start (3 Steps)

### 1. Open Supabase SQL Editor
Go to: **Supabase Dashboard → SQL Editor**

### 2. Run Migrations in Order

**Copy and paste each file, then click Run:**

```
✅ Step 1: migrations/01_user_levels.sql
✅ Step 2: migrations/02_profile_album_fixes.sql
✅ Step 3: migrations/03_schema_sync.sql
```

### 3. Verify Success

Run this query:
```sql
SELECT COUNT(*) as levels FROM level_requirements;
-- Should return: 10
```

**Done!** 🎉

---

## 📋 What Each Migration Does

### Migration 1: User Levels System
**File:** `01_user_levels.sql`

**Creates:**
- ✅ `user_levels` table (XP & progression)
- ✅ `level_requirements` table (10 levels defined)
- ✅ Functions:
  - `get_user_level_info()` - Get progress
  - `update_user_level()` - Calculate level
  - `increment_user_stat()` - Track activities

**XP System:**
- Album created: +10 XP
- Country visited: +20 XP
- Photo uploaded: +2 XP
- Social interaction: +5 XP

**10 Levels:**
1. Explorer (0 XP)
2. Wanderer (100 XP)
3. Traveler (300 XP)
4. Adventurer (600 XP)
5. Voyager (1000 XP)
6. Globetrotter (1500 XP)
7. Pathfinder (2200 XP)
8. Pioneer (3000 XP)
9. Legend (4000 XP)
10. Master Explorer (5500 XP)

---

### Migration 2: Profile & Album Fixes
**File:** `02_profile_album_fixes.sql`

**Fixes:**
- ✅ Adds `name` column to profiles
- ✅ Adds `location_display` to albums
- ✅ Adds `website` and `location` to profiles
- ✅ Creates sync trigger for name/display_name
- ✅ Auto-populates album locations
- ✅ Improves RLS policies
- ✅ Creates helper functions:
  - `get_album_location()` - Format location
  - `handle_new_user()` - User creation with auto-username

---

### Migration 3: Schema Sync
**File:** `03_schema_sync.sql`

**Aligns with production:**
- ✅ Adds `albums.status` (draft/published)
- ✅ Adds photo metadata (file_size, dimensions, processing_status)
- ✅ Fixes comments structure (content field)
- ✅ Updates likes/comments (non-polymorphic)
- ✅ Handles users/profiles duplication
- ✅ Handles followers/follows duplication
- ✅ Creates `wishlist` table
- ✅ Updates `stories` table
- ✅ Creates all indexes
- ✅ Sets up RLS on all tables

---

## ✅ Verification

### Check Tables
```sql
-- Should return 14+ tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

### Check Functions
```sql
-- Should return 8+ functions
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;
```

### Check User Levels
```sql
-- Should return 10 rows
SELECT level, title, experience_required
FROM level_requirements
ORDER BY level;
```

### Check Policies
```sql
-- Should return 20+ policies
SELECT COUNT(*) as total_policies
FROM pg_policies
WHERE schemaname = 'public';
```

---

## 🔧 Troubleshooting

### Error: "Function already exists"
**Solution:** ✅ Already fixed with DROP FUNCTION statements

### Error: "Policy already exists"
**Solution:** ✅ Already fixed with DROP POLICY statements

### Error: "Table already exists"
**Solution:** ✅ All migrations use IF NOT EXISTS

### Error: "Permission denied"
**Solution:** Run as database owner/superuser
```sql
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
```

---

## 🎯 Expected Results

### Tables Created
- [x] profiles (with name, website, location)
- [x] albums (with status, location_display)
- [x] photos (with dimensions, file_size, processing_status)
- [x] comments (with content field)
- [x] likes (album_id/photo_id structure)
- [x] followers (with approval workflow)
- [x] favorites (polymorphic bookmarks)
- [x] stories (24h expiry)
- [x] countries (reference data)
- [x] cities (destinations)
- [x] islands (island locations)
- [x] user_levels (XP & progression)
- [x] level_requirements (10 levels)
- [x] user_travel_stats (analytics)
- [x] wishlist (bucket list)

### Functions Created
- [x] get_user_level_info(user_id)
- [x] update_user_level(user_id)
- [x] increment_user_stat(user_id, stat, amount)
- [x] sync_profile_name()
- [x] set_album_location_display()
- [x] get_album_location(album_id)
- [x] handle_new_user()
- [x] update_updated_at_column()

### Policies Created
- [x] User level access
- [x] Profile privacy
- [x] Album visibility
- [x] Content access (with follow checks)
- [x] Public reference data

### Indexes Created
- [x] Foreign keys (user_id, album_id, etc.)
- [x] Lookups (username, country_code)
- [x] Sorting (created_at, order_index)
- [x] Filtering (status, visibility)

---

## 📊 Application Features Enabled

After migrations:

✅ **User System**
- Profile management
- Username auto-generation
- Privacy controls

✅ **Content**
- Album creation with locations
- Photo upload with EXIF
- Draft/published workflow

✅ **Social**
- Follow system with approval
- Like albums/photos
- Comment on content
- Bookmark favorites

✅ **Location**
- Country/city/island tracking
- Globe visualization
- Location auto-population

✅ **Gamification**
- User levels (1-10)
- XP tracking
- Travel statistics
- Achievements

✅ **Stories**
- 24h temporary posts
- View tracking

✅ **Wishlist**
- Bucket list destinations
- Priority management

---

## 🔄 Re-running Migrations

All migrations are **idempotent** (safe to re-run):

✅ `IF NOT EXISTS` checks for tables/columns
✅ `DROP ... IF EXISTS` for functions/policies
✅ `ON CONFLICT DO NOTHING` for data inserts
✅ No duplicate errors

You can safely re-run any migration multiple times.

---

## 📝 Migration Order (Critical!)

**Must run in this order:**

```
1️⃣ 01_user_levels.sql       → User progression system
2️⃣ 02_profile_album_fixes.sql → Core fixes
3️⃣ 03_schema_sync.sql        → Final alignment
```

**Why?** Each migration builds on the previous one.

---

## 🆘 Get Help

**Check logs:**
```sql
-- In Supabase, check the SQL Editor output
-- Look for NOTICE messages showing success
```

**Manual verification:**
```sql
-- Test a function
SELECT * FROM get_user_level_info('your-user-id');

-- Test a policy
SELECT * FROM profiles WHERE id = auth.uid();

-- Check an index
SELECT indexname FROM pg_indexes WHERE tablename = 'albums';
```

---

## 🎉 Success!

When all migrations complete, you'll see:

✅ No errors in SQL output
✅ NOTICE messages: "Migration completed successfully!"
✅ All verification queries return expected results
✅ App functions without database errors

**Your Adventure Log database is ready!** 🌍✈️📸
