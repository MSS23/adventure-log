# Database Setup Instructions

## Choose Your Setup Method

You have **THREE options** depending on your situation:

---

## ✅ **OPTION 1: SAFE SCHEMA (RECOMMENDED for existing databases)**

**Use this if:** You already have data in your database and want to add the new features safely.

**File:** `SAFE_COMPLETE_SCHEMA.sql`

**What it does:**
- Adds missing columns to existing tables (won't break anything)
- Creates new tables only if they don't exist
- Preserves all your existing data
- Adds all notification, messaging, and collaboration features

**How to apply:**

1. Go to your Supabase project dashboard
2. Click "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy the entire contents of `SAFE_COMPLETE_SCHEMA.sql`
5. Paste it into the SQL Editor
6. Click "Run" (▶️ button)
7. Wait for the success message

---

## 🆕 **OPTION 2: COMPLETE SCHEMA (For fresh databases)**

**Use this if:** You're starting fresh or want to rebuild everything from scratch.

**File:** `COMPLETE_SCHEMA_WITH_ALL_FEATURES.sql`

**What it does:**
- Creates all tables from scratch
- Includes all features (notifications, messaging, gamification, etc.)
- Sets up all RLS policies, triggers, and functions
- Inserts default data (10 user levels, 6 album templates)

**How to apply:**

1. **ONLY if starting fresh:** Delete all existing tables first (if any)
2. Go to your Supabase project dashboard
3. Click "SQL Editor" in the left sidebar
4. Click "New Query"
5. Copy the entire contents of `COMPLETE_SCHEMA_WITH_ALL_FEATURES.sql`
6. Paste it into the SQL Editor
7. Click "Run" (▶️ button)
8. Wait for the completion message

---

## 🔧 **OPTION 3: TWO-STEP PROCESS (For problematic existing databases)**

**Use this if:** The safe schema gives errors about missing columns.

**Files (in order):**
1. `APPLY_BEFORE_COMPLETE_SCHEMA.sql` (adds missing columns first)
2. `COMPLETE_SCHEMA_WITH_ALL_FEATURES.sql` (then applies complete schema)

**How to apply:**

### Step 1: Add Missing Columns
1. Go to SQL Editor in Supabase
2. Copy contents of `APPLY_BEFORE_COMPLETE_SCHEMA.sql`
3. Paste and click "Run"
4. Wait for success message

### Step 2: Apply Complete Schema
1. In the same SQL Editor (or new query)
2. Copy contents of `COMPLETE_SCHEMA_WITH_ALL_FEATURES.sql`
3. Paste and click "Run"
4. Wait for completion message

---

## What Gets Created

### Tables (17 Total)

**Core:**
- `users` - User profiles with privacy settings
- `albums` - Travel albums with location data
- `photos` - Photos with EXIF data and deduplication

**Social:**
- `follows` - User following relationships
- `likes` - Polymorphic likes (albums, photos, stories, comments)
- `comments` - Nested comments with replies
- `stories` - 24-hour ephemeral stories

**Messaging (Instagram-Style):**
- `notifications` - In-app notifications only
- `messages` - Direct messaging with read receipts
- `notification_preferences` - User notification settings

**Collaboration:**
- `album_collaborators` - Multi-user album editing with roles
- `album_templates` - Quick album creation templates

**Gamification:**
- `user_achievements` - Badges and milestones
- `travel_recommendations` - Personalized destination suggestions
- `user_levels` - User progression system
- `level_requirements` - 10 levels from Explorer to Legend

**Sharing:**
- `album_shares` - Public/private album sharing with tokens

### Features

✅ **Row Level Security** - All tables protected with proper policies
✅ **Auto-Notifications** - Triggers for likes, comments, follows
✅ **Helper Functions** - mark_all_read, get_unread_counts, cleanup_old
✅ **Default Data** - 10 user levels + 6 album templates pre-loaded
✅ **Performance Indexes** - Optimized queries for all tables

---

## After Running the Schema

1. **Restart your Next.js application**
   ```bash
   # Stop the current process (Ctrl+C)
   npm run dev
   ```

2. **Hard refresh your browser**
   - Windows/Linux: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`

3. **Test the new features:**
   - ✅ Create an album
   - ✅ Like someone's content
   - ✅ Send a message
   - ✅ Check notifications (bell icon)
   - ✅ View your user level

---

## Troubleshooting

### Error: "column photo_hash does not exist"
**Solution:** Use OPTION 1 (SAFE_COMPLETE_SCHEMA.sql) or OPTION 3 (two-step process)

### Error: "relation already exists"
**Solution:** This is normal - the schema uses `CREATE TABLE IF NOT EXISTS`, so it skips existing tables

### Error: "policy already exists"
**Solution:** Policies are dropped before being created, so this shouldn't happen. If it does, ignore it.

### Nothing seems to work after applying
**Solution:**
1. Make sure you restarted the application
2. Hard refresh the browser (Ctrl+Shift+R)
3. Check browser console for errors (F12 > Console tab)
4. Verify tables exist in Supabase: Database > Tables

### I want to start completely fresh
1. Go to Supabase > Database > Tables
2. Delete all existing tables (be careful!)
3. Apply OPTION 2 (COMPLETE_SCHEMA_WITH_ALL_FEATURES.sql)

---

## Need Help?

1. **Check the browser console** (F12 > Console) for errors
2. **Check Supabase logs** (Logs section in dashboard)
3. **Verify tables exist** (Database > Tables in Supabase)
4. **Make sure you're using the latest code** from the repository

---

## Summary

**Most users should use:** `SAFE_COMPLETE_SCHEMA.sql` (OPTION 1)

This adds all new features safely without risking your existing data. It's designed to be run on a live database with users and content.
