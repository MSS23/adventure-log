# 🔧 Database Fixes - Apply These Migrations

This document contains all the SQL migrations you need to run to fix the issues in your Adventure Log application.

## 📋 Issues Fixed

1. ✅ **User Levels Error** - `albums_created` column missing
2. ✅ **Profile Update Issues** - Username and avatar not saving
3. ✅ **Album Location Issues** - "Unknown Location" appearing

## 🚀 How to Apply Migrations

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. For each file below, copy the contents and paste into a new query
4. Click **Run** to execute

### Option 2: Supabase CLI

```bash
# Run each migration file
supabase db push database/migrations/add_user_levels_table.sql
supabase db push database/migrations/fix_profiles_and_albums.sql
```

## 📁 Migration Files (Run in Order)

### 1. User Levels Table Migration

**File:** `database/migrations/add_user_levels_table.sql`

**What it fixes:**
- ❌ Error: `Could not find the 'albums_created' column of 'user_levels'`
- Creates complete gamification/leveling system

**What it creates:**
- ✅ `user_levels` table with all tracking columns
- ✅ `level_requirements` table with 10 pre-defined levels
- ✅ Functions for level progression
- ✅ RLS policies for security

**Experience System:**
- Album created: +10 XP
- Country visited: +20 XP
- Photo uploaded: +2 XP
- Social interaction: +5 XP

**Levels:**
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

### 2. Profile & Album Location Fix

**File:** `database/migrations/fix_profiles_and_albums.sql`

**What it fixes:**
- ❌ Profile updates not saving (username, display name, avatar)
- ❌ "Unknown Location" showing on albums
- ❌ Missing website and location fields in profiles

**What it creates:**
- ✅ Adds `name` column to profiles for backward compatibility
- ✅ Adds `location_display` column to albums
- ✅ Adds `website` and `location` columns to profiles
- ✅ Creates sync trigger for profile name fields
- ✅ Creates auto-populate trigger for album locations
- ✅ Helper function `get_album_location()`
- ✅ Improved RLS policies
- ✅ Enhanced new user creation

---

## 🔍 Verification

After running the migrations, verify everything works:

### Check User Levels
```sql
SELECT * FROM user_levels LIMIT 5;
SELECT * FROM level_requirements;
```

### Check Profiles
```sql
SELECT id, username, display_name, name, website, location
FROM profiles
LIMIT 5;
```

### Check Albums
```sql
SELECT id, title, location_name, location_display, country_code
FROM albums
LIMIT 5;
```

### Test Functions
```sql
-- Test level info for your user
SELECT * FROM get_user_level_info('your-user-id-here');

-- Test album location
SELECT get_album_location('album-id-here');
```

## 📊 Tables Created/Modified

### New Tables
- `user_levels` - User progression tracking
- `level_requirements` - Level definitions

### Modified Tables
- `profiles` - Added: name, website, location
- `albums` - Added: location_display

### New Functions
- `get_user_level_info(user_id)` - Get level progress
- `update_user_level(user_id)` - Update user level
- `increment_user_stat(user_id, stat_type, amount)` - Track stats
- `get_album_location(album_id)` - Get formatted location
- `sync_profile_name()` - Sync name fields (trigger)
- `set_album_location_display()` - Auto-populate location (trigger)
- `handle_new_user()` - Enhanced user creation (trigger)

### New Views
- `user_travel_locations` - Formatted travel data

## 🎯 Expected Results

After applying migrations:

1. **User Levels**
   - ✅ No more "albums_created column not found" errors
   - ✅ Level progression works
   - ✅ XP tracking active

2. **Profile Updates**
   - ✅ Username saves correctly
   - ✅ Display name saves correctly
   - ✅ Avatar upload works
   - ✅ Website and location save

3. **Album Locations**
   - ✅ Location displays correctly (no "Unknown Location")
   - ✅ Auto-populated from city/country data
   - ✅ Properly formatted for display

## 🆘 Troubleshooting

### If migrations fail:

1. **Check Permissions**
   ```sql
   -- Run as postgres/admin user
   GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
   GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
   ```

2. **Check Existing Data**
   ```sql
   -- If tables already exist, drop them first
   DROP TABLE IF EXISTS user_levels CASCADE;
   DROP TABLE IF EXISTS level_requirements CASCADE;
   ```

3. **Check Triggers**
   ```sql
   -- List all triggers
   SELECT * FROM pg_trigger WHERE tgname LIKE '%profile%' OR tgname LIKE '%album%';
   ```

### Common Errors:

**Error: "relation already exists"**
- Solution: Table already created, you can skip or drop and recreate

**Error: "permission denied"**
- Solution: Run as superuser or grant proper permissions

**Error: "column already exists"**
- Solution: Column was added by previous migration, safe to ignore

## 📝 Migration Order Summary

```
1. add_user_levels_table.sql      ← Run first
2. fix_profiles_and_albums.sql    ← Run second
```

Both migrations are idempotent (safe to run multiple times) with `IF NOT EXISTS` checks.

## ✅ Quick Run Commands

Copy and paste these into Supabase SQL Editor:

```sql
-- Migration 1: User Levels
-- (Copy contents of database/migrations/add_user_levels_table.sql)

-- Migration 2: Profiles & Albums
-- (Copy contents of database/migrations/fix_profiles_and_albums.sql)
```

## 🎉 Success!

Once both migrations complete:
- Dashboard will show user levels
- Profile edits will save correctly
- Album locations will display properly
- All TypeScript errors resolved

---

**Generated with Claude Code** 🤖
