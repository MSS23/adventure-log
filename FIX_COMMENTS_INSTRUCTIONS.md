# Fix Comments Database Constraint Error

## Problem
Comments are failing to post with error: `violates check constraint "comment_target"`

## Solution
Run the migration file to fix the database constraint.

## Instructions

### Option 1: Via Supabase Dashboard (Easiest)

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the contents of this file:
   `supabase/migrations/20251030_fix_comments_constraint.sql`
5. Click **Run** to execute the migration

### Option 2: Via Supabase CLI

If you have the Supabase CLI installed:

```bash
# Make sure you're logged in
supabase login

# Link to your project (if not already linked)
supabase link --project-ref YOUR_PROJECT_REF

# Apply the migration
supabase db push

# Or apply just this migration
supabase migration up
```

### Option 3: Direct SQL Query

Run this SQL directly in your Supabase SQL Editor:

```sql
-- Drop existing constraint
ALTER TABLE IF EXISTS public.comments
  DROP CONSTRAINT IF EXISTS comment_target;

ALTER TABLE IF EXISTS public.comments
  DROP CONSTRAINT IF EXISTS comments_target_type_check;

-- Add the correct constraint
ALTER TABLE public.comments
  ADD CONSTRAINT comment_target
  CHECK (target_type IN ('album', 'photo', 'story'));
```

## After Running the Migration

1. Refresh your app (http://localhost:3000 or your Vercel URL)
2. Try posting a comment again
3. Comments should now work correctly!

## What This Fixes

- Ensures the `comment_target` constraint accepts 'album', 'photo', and 'story' as valid target types
- Renames any legacy `text` column to `content` if needed
- Adds performance indexes for faster comment queries
