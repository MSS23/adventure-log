# 📋 Database Migration Order

## ⚠️ Important: Run in This Exact Order

Your database schema has evolved. Here's the correct order to apply all migrations:

---

## 🎯 Migration Sequence

### ✅ Step 1: User Levels Table
**File:** `migrations/add_user_levels_table.sql`

**What it does:**
- Creates `user_levels` table with XP tracking
- Creates `level_requirements` table with 10 levels
- Adds progression functions
- Sets up RLS policies

**Run first because:** Other features depend on user levels

---

### ✅ Step 2: Profile & Album Fixes
**File:** `migrations/fix_profiles_and_albums.sql`

**What it does:**
- Adds `name` column to profiles
- Adds `location_display` to albums
- Creates sync triggers
- Improves RLS policies

**Run second because:** Fixes core user/album issues

---

### ✅ Step 3: Schema Synchronization
**File:** `migrations/sync_with_actual_schema.sql`

**What it does:**
- Aligns with actual production schema
- Adds missing columns:
  - `albums.status` (draft/published)
  - `photos.file_size`, `width`, `height`, `processing_status`
  - `comments.content` (instead of text)
  - `likes` non-polymorphic structure
  - `user_levels.current_xp`
- Creates `wishlist` table
- Updates `stories` table
- Handles `users` vs `profiles` duplication
- Handles `followers` vs `follows` duplication
- Creates all indexes

**Run third because:** Final sync with production

---

## 🚀 How to Run

### Option 1: Supabase Dashboard

1. Go to **Supabase Dashboard → SQL Editor**

2. **Run Migration 1:**
   ```
   Copy: database/migrations/add_user_levels_table.sql
   Paste → Run ✅
   ```

3. **Run Migration 2:**
   ```
   Copy: database/migrations/fix_profiles_and_albums.sql
   Paste → Run ✅
   ```

4. **Run Migration 3:**
   ```
   Copy: database/migrations/sync_with_actual_schema.sql
   Paste → Run ✅
   ```

### Option 2: Supabase CLI

```bash
supabase db push database/migrations/add_user_levels_table.sql
supabase db push database/migrations/fix_profiles_and_albums.sql
supabase db push database/migrations/sync_with_actual_schema.sql
```

---

## ✨ What You'll Have After All Migrations

### Tables Created/Updated:

#### Core Tables
- ✅ `profiles` - User profiles with name, display_name, website, location
- ✅ `albums` - With status, location_display, visibility controls
- ✅ `photos` - With dimensions, file_size, processing_status
- ✅ `comments` - Using album_id/photo_id (non-polymorphic)
- ✅ `likes` - Using album_id/photo_id (non-polymorphic)

#### Location Tables
- ✅ `countries` - Reference data
- ✅ `cities` - Major destinations
- ✅ `islands` - Island locations

#### Social Tables
- ✅ `followers` - Follow relationships with approval
- ✅ `favorites` - Bookmarks for photos/albums/locations
- ✅ `stories` - 24-hour temporary sharing

#### Gamification Tables
- ✅ `user_levels` - XP and progression
- ✅ `level_requirements` - Level definitions (1-10)
- ✅ `user_travel_stats` - Aggregate statistics
- ✅ `wishlist` - Travel bucket list

### Functions Created:
- ✅ `get_user_level_info(user_id)` - Get level progress
- ✅ `update_user_level(user_id)` - Calculate level
- ✅ `increment_user_stat(user_id, stat, amount)` - Track stats
- ✅ `sync_profile_name()` - Keep name fields in sync
- ✅ `set_album_location_display()` - Auto-populate location
- ✅ `get_album_location(album_id)` - Get formatted location
- ✅ `handle_new_user()` - User creation with username generation
- ✅ `update_updated_at_column()` - Auto-update timestamps

### Policies Created:
- ✅ User level access policies
- ✅ Profile privacy policies
- ✅ Album visibility policies
- ✅ Content access based on follow relationships
- ✅ Public read for reference data

### Indexes Created:
- ✅ All foreign keys indexed
- ✅ Lookup fields indexed (username, country_code, etc.)
- ✅ Timestamp fields for sorting
- ✅ Status fields for filtering

---

## 🔍 Verification Queries

Run these after all migrations to verify success:

### Check Tables Exist
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

### Check User Levels
```sql
SELECT * FROM level_requirements ORDER BY level;
SELECT COUNT(*) FROM user_levels;
```

### Check Profile Columns
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;
```

### Check Album Columns
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'albums'
ORDER BY ordinal_position;
```

### Check Functions
```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_type = 'FUNCTION'
ORDER BY routine_name;
```

### Check Policies
```sql
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

---

## ⚠️ Known Issues & Solutions

### Issue: "Function already exists"
**Solution:** ✅ Fixed with DROP FUNCTION statements in migrations

### Issue: "Policy already exists"
**Solution:** ✅ Fixed with DROP POLICY statements in migrations

### Issue: "Column already exists"
**Solution:** ✅ All migrations use IF NOT EXISTS

### Issue: "Table users vs profiles confusion"
**Solution:** ✅ Migration syncs data between both tables

### Issue: "Followers vs follows duplication"
**Solution:** ✅ Migration consolidates to followers table

---

## 🎉 Success Indicators

After running all migrations:

1. ✅ No errors in Supabase logs
2. ✅ All 15+ tables exist
3. ✅ User levels display in app
4. ✅ Profile updates save correctly
5. ✅ Album locations show properly
6. ✅ Comments and likes work
7. ✅ Follow system functional
8. ✅ Stories appear (if implemented in UI)
9. ✅ Wishlist accessible
10. ✅ Travel stats calculate

---

## 📚 Documentation Files

- 📄 **SCHEMA_OVERVIEW.md** - Complete schema documentation
- 📄 **README_FIXES.md** - Detailed fix documentation
- 📄 **QUICK_FIX.md** - Quick troubleshooting guide
- 📄 **MIGRATION_ORDER.md** - This file

---

## 🆘 Need Help?

If migrations fail:

1. Check error message carefully
2. Verify you're running as database owner
3. Check if table/function/policy already exists
4. Review the migration file for that specific section
5. Run verification queries to see current state

All migrations are idempotent - safe to re-run!

---

**Ready to migrate?** Follow the steps above in order. ✨
