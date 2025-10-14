# Database Migrations

This directory contains SQL migration files for the Adventure Log application.

## Running Migrations

### Option 1: Using Supabase CLI (Recommended)

If you have Supabase CLI installed:

```bash
# Make sure you're logged in
supabase login

# Link your project
supabase link --project-ref <your-project-ref>

# Run migrations
supabase db push
```

### Option 2: Manual SQL Execution

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar
4. Copy the contents of the migration file you want to run
5. Paste into the SQL Editor
6. Click **Run** to execute

### Option 3: Using psql (Direct Database Connection)

```bash
# Get your database connection string from Supabase Dashboard
# Settings > Database > Connection String (URI)

psql "your-connection-string" -f supabase/migrations/20241005_create_social_tables.sql
```

## Migration Files

### 20241005_create_social_tables.sql

Creates the following tables and features:

- **followers** - User following/follower relationships
  - Supports pending/accepted/rejected status
  - Auto-accepts follows for public accounts
  - Requires approval for private accounts

- **likes** - Polymorphic likes for photos, albums, comments, and stories
  - Prevents duplicate likes

- **comments** - Comments on photos, albums, and stories
  - Supports nested replies (parent_id)

**Includes:**
- Row Level Security (RLS) policies for data privacy
- Indexes for query performance
- Helper functions for follow request handling
  - `handle_follow_request()` - Creates follow request with auto-accept for public users
  - `accept_follow_request()` - Accepts a pending follow request
  - `reject_follow_request()` - Rejects a pending follow request

## After Running Migrations

After running the social tables migration, your application will be able to:

1. ✅ Follow/unfollow users
2. ✅ Accept/reject follow requests (for private accounts)
3. ✅ Like albums, photos, and comments
4. ✅ Comment on albums and photos
5. ✅ View follower/following counts

The 400 errors in the console for `followers` and `likes` endpoints will be resolved.

## Troubleshooting

If you see errors about existing tables:
- The `IF NOT EXISTS` clauses will prevent errors if tables already exist
- You can safely re-run the migration

If you see permission errors:
- Make sure you're using the service role key for migrations
- Or run through the Supabase Dashboard SQL Editor (which has full permissions)
