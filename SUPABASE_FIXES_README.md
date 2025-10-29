# Supabase Database Fixes

You're seeing errors in the console because the Supabase database needs some RLS policy updates and a missing function. Here's how to fix them:

## Errors You're Seeing:

1. **406 errors** on follows table - RLS policies blocking access
2. **404 error** on `get_most_followed_users` - Function doesn't exist
3. **400 error** on albums - Fixed in code (removed invalid `status` filter)

## How to Fix:

### Option 1: Run SQL in Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project (jtdkbjvqujgpwcqjydma)
3. Click on "SQL Editor" in the left sidebar
4. Click "New Query"
5. Copy the entire contents of: `supabase/migrations/20251029_fix_follows_and_rpc.sql`
6. Paste into the SQL editor
7. Click "Run" or press Ctrl+Enter
8. You should see success messages

### Option 2: Use the Migration Script

```bash
# Set your Supabase service role key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key node run-follows-fix.mjs
```

(You can find your service role key in Supabase Dashboard → Settings → API)

## What Gets Fixed:

### 1. Follows Table RLS Policies
- Allows users to view follows where they are the follower
- Allows users to view follows where they are being followed
- Allows viewing accepted follows for public users
- Fixes the 406 "Not Acceptable" errors

### 2. get_most_followed_users Function
- Creates RPC function to get suggested users to follow
- Used by the Explore page "Creators to Follow" section
- Fixes the 404 error

### 3. Albums Query (Already Fixed in Code)
- Removed invalid `.neq('status', 'draft')` filter
- Albums table doesn't have a `status` column
- This was causing the 400 error

## After Running the Migration:

Your app should work without errors! The following features will work properly:
- Following/unfollowing users
- Viewing follow status
- Suggested creators on Explore page
- Profile pages loading correctly

## Notes:

- The CORS errors and content script messages are from browser extensions (not your app)
- The manifest icon warnings are harmless (browser can't preload icons)
- The font preload warnings are normal Next.js behavior

## Need Help?

If you encounter any issues running the migration, you can also manually create the policies and function by copying the SQL from the migration file and running it in pieces in the Supabase SQL Editor.
