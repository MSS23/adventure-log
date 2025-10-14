# Database Migration Guide

## Current Issue

Your database is missing the `users` table, which means you haven't run all the required migrations yet. This guide will help you set up your database correctly.

## Step 1: Check Your Database State

Run this SQL in your Supabase SQL Editor to see what tables exist:

```sql
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

## Step 2: Run Required Migrations in Order

You need to run these migrations in **this exact order**:

### 1. Create users/profiles table
```
supabase/migrations/20250107_fix_users_profiles_schema.sql
```
This creates the `users` table (or renames `profiles` to `users` if it exists).

### 2. Add missing columns to users
```
supabase/migrations/20250107_add_users_table_columns.sql
```

### 3. Fix foreign key constraints
```
supabase/migrations/20250107_fix_foreign_key_constraints.sql
```

### 4. Fix albums table schema
```
supabase/migrations/20250107_fix_albums_table_schema.sql
```

### 5. Add user levels system (NEW - SAFE VERSION)
```
supabase/migrations/20250113_create_user_levels_system_safe.sql
```
**Use this instead of the original 20250113_create_user_levels_system.sql**

### 6. Fix likes constraint
```
supabase/migrations/20250113_fix_likes_constraint_error.sql
```

## Step 3: How to Run Migrations

### Option A: Supabase Dashboard (Recommended)

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor" in the left sidebar
4. For each migration file above:
   - Open the file in your code editor
   - Copy the entire contents
   - Paste into the SQL Editor
   - Click "Run"
   - Wait for "Success" message
   - Move to next file

### Option B: Supabase CLI

If you have Supabase CLI installed:

```bash
# Make sure you're in the project directory
cd "C:\Users\msidh\Documents\Adventure Log Application"

# Link to your project (if not already linked)
supabase link --project-ref YOUR_PROJECT_REF

# Push migrations
supabase db push
```

## Step 4: Verify Migrations Worked

After running all migrations, verify with this SQL:

```sql
-- Check that tables exist
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('users', 'user_levels', 'level_requirements', 'likes')
ORDER BY tablename;

-- Should return:
-- level_requirements
-- likes
-- user_levels
-- users

-- Check user_levels has data
SELECT COUNT(*) FROM user_levels;

-- Check level requirements
SELECT level, title FROM level_requirements ORDER BY level;
-- Should return 10 levels from Explorer to Legend
```

## Step 5: Test in Your Application

After migrations complete:

1. **Hard refresh your browser**: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
2. Navigate to `/profile` page
3. You should see:
   - Your level badge (Level 1 - Explorer for new users)
   - Stats without errors
   - No 406 errors in console
4. Try liking an album - should work without constraint errors

## Troubleshooting

### Error: "relation 'profiles' does not exist"
- Your database is completely empty
- You need to create the initial schema first
- Contact me and I'll provide a complete initial schema file

### Error: "relation 'users' already exists"
- Good! Skip migration #1 and move to #2
- The migration will add missing columns to existing table

### Error: "constraint already exists"
- This is OK - the migrations use `IF NOT EXISTS` checks
- The migration will skip creating duplicates

### Error: "column 'location_country' does not exist in albums table"
- Run migration: `20250107_fix_albums_table_schema.sql`
- This adds the missing column

## Notes

- **Safe to re-run**: All migrations are idempotent (safe to run multiple times)
- **Backup first**: If your database has important data, back it up first
- **Order matters**: Run migrations in the exact order listed above
- **Check errors**: Read error messages carefully - they tell you what's missing

## Quick Commands Reference

```sql
-- List all tables
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- List all columns in a table
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'users' ORDER BY ordinal_position;

-- Check foreign keys
SELECT conname, conrelid::regclass, confrelid::regclass
FROM pg_constraint WHERE contype = 'f' AND conrelid::regclass::text LIKE '%user_levels%';
```
