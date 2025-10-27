# Run Database Migrations - IMPORTANT

You need to run these two migrations in Supabase to fix the follow system and enable notifications:

## 1. Fix Follow System (CRITICAL)

**File:** `supabase/migrations/20251027_fix_follow_functions.sql`

**What it fixes:**
- Follow requests will persist correctly
- "Pending" status will save properly
- Requests appear in user's follow requests list

**Run in Supabase:**
1. Go to: https://supabase.com/dashboard/project/jtdkbjvqujgpwcqjydma/sql/new
2. Copy all SQL from `supabase/migrations/20251027_fix_follow_functions.sql`
3. Click "Run"

---

## 2. Fix Notification Triggers (CRITICAL)

**File:** `supabase/migrations/20251027_fix_notification_triggers.sql`

**What it enables:**
- Notifications when someone follows you
- Notifications when someone likes your album
- Notifications when someone comments
- Real-time notification updates

**Run in Supabase:**
1. Go to: https://supabase.com/dashboard/project/jtdkbjvqujgpwcqjydma/sql/new
2. Copy all SQL from `supabase/migrations/20251027_fix_notification_triggers.sql`
3. Click "Run"

---

## After Running Both Migrations:

✅ Follow system works perfectly
✅ Notifications appear when:
  - Someone follows you
  - Someone requests to follow you
  - Someone likes your album
  - Someone comments on your album
  - Follow request is accepted

✅ Notification bell will show count
✅ Real-time updates

---

## Quick Test:

1. Run both migrations
2. Like an album from another user
3. Check notification bell - should see notification!
4. Follow someone - they get notified!
