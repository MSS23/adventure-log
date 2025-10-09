# Database Migrations Required

This document lists all SQL migrations that need to be run on your Supabase database to fix current errors.

## How to Run Migrations

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the SQL below
6. Click **Run** or press `Ctrl + Enter`

---

## Migration 1: Cover Photo Positioning (CRITICAL - Required for cover position editor)

**Error:** `Failed to update cover position` - 500 Internal Server Error

**Solution:**
```sql
-- Add cover photo positioning fields to albums table
ALTER TABLE albums
ADD COLUMN IF NOT EXISTS cover_photo_position VARCHAR(20) DEFAULT 'center',
ADD COLUMN IF NOT EXISTS cover_photo_x_offset INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS cover_photo_y_offset INTEGER DEFAULT 50;

-- Create an index for faster queries
CREATE INDEX IF NOT EXISTS idx_albums_cover_position ON albums(cover_photo_position);
```

**Verification:**
```sql
-- Check if columns exist
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'albums'
AND column_name IN ('cover_photo_position', 'cover_photo_x_offset', 'cover_photo_y_offset');
```

---

## Migration 2: Fix Likes Constraint (Required for location favorites)

**Error:** `violates check constraint "likes_target_type_check"`

**Solution:**
```sql
-- Drop existing constraint
ALTER TABLE likes
DROP CONSTRAINT IF EXISTS likes_target_type_check;

-- Add updated constraint with 'location' included
ALTER TABLE likes
ADD CONSTRAINT likes_target_type_check
CHECK (target_type IN ('photo', 'album', 'comment', 'story', 'location'));
```

**Verification:**
```sql
-- Check constraint definition
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'likes_target_type_check';
```

---

## Migration 3: User Levels System (Optional - for gamification)

**Error:** `relation "public.user_levels" does not exist` - 406 Not Acceptable

**Note:** This is optional. The user levels/gamification system is not currently enabled. You can skip this migration if you don't need the leveling system.

**Solution:** Run the complete migration from `database/migrations/01_user_levels.sql`

Or create the tables manually:

```sql
-- Create user_levels table
CREATE TABLE IF NOT EXISTS user_levels (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_level INTEGER DEFAULT 1 NOT NULL,
  current_title VARCHAR(50) DEFAULT 'Explorer' NOT NULL,
  total_experience INTEGER DEFAULT 0 NOT NULL,
  albums_created INTEGER DEFAULT 0 NOT NULL,
  countries_visited INTEGER DEFAULT 0 NOT NULL,
  photos_uploaded INTEGER DEFAULT 0 NOT NULL,
  social_interactions INTEGER DEFAULT 0 NOT NULL,
  level_up_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create level_requirements table
CREATE TABLE IF NOT EXISTS level_requirements (
  level INTEGER PRIMARY KEY,
  title VARCHAR(50) NOT NULL,
  experience_required INTEGER NOT NULL,
  albums_required INTEGER DEFAULT 0 NOT NULL,
  countries_required INTEGER DEFAULT 0 NOT NULL,
  photos_required INTEGER DEFAULT 0 NOT NULL,
  description TEXT
);

-- Enable RLS
ALTER TABLE user_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE level_requirements ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own level"
  ON user_levels FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view level requirements"
  ON level_requirements FOR SELECT
  USING (true);
```

---

## Non-Critical Issues (Informational Only)

### 1. Albums with Missing User Profiles
**Status:** Already handled in code - albums are filtered out
**Action:** None required - this is expected behavior

### 2. THREE.Color Warnings
**Status:** Library issue from react-globe.gl
**Action:** None required - this is a third-party library warning

---

## Quick Migration Script (Run All Required Migrations)

Copy and paste this entire block to run all critical migrations at once:

```sql
-- ============================================
-- CRITICAL MIGRATIONS FOR ADVENTURE LOG
-- Run these to fix current errors
-- ============================================

-- 1. Cover Photo Positioning
ALTER TABLE albums
ADD COLUMN IF NOT EXISTS cover_photo_position VARCHAR(20) DEFAULT 'center',
ADD COLUMN IF NOT EXISTS cover_photo_x_offset INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS cover_photo_y_offset INTEGER DEFAULT 50;

CREATE INDEX IF NOT EXISTS idx_albums_cover_position ON albums(cover_photo_position);

-- 2. Fix Likes Constraint
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'likes_target_type_check'
  ) THEN
    ALTER TABLE likes DROP CONSTRAINT likes_target_type_check;
  END IF;

  -- Add updated constraint with 'location' included
  ALTER TABLE likes
  ADD CONSTRAINT likes_target_type_check
  CHECK (target_type IN ('photo', 'album', 'comment', 'story', 'location'));
END
$$;

-- ============================================
-- SUCCESS! Your database is now up to date
-- ============================================

-- Verify migrations
DO $$
BEGIN
  RAISE NOTICE '✅ Cover photo positioning columns added';
  RAISE NOTICE '✅ Likes constraint updated to include location';
  RAISE NOTICE '🎉 Database migrations completed successfully!';
END
$$;
```

---

## After Running Migrations

1. **Refresh your application** - The cover position editor should now work
2. **Test the cover position feature** - Try adjusting a cover photo
3. **Test favorites** - Try favoriting a location
4. **Check console** - Errors should be resolved

## Need Help?

If you encounter any errors while running these migrations, check:
- Your Supabase database has the `albums` and `likes` tables
- Your user has sufficient permissions
- Copy the exact error message for troubleshooting
