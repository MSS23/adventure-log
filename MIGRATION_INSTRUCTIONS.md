# Database Migration Instructions

## Critical: Album Creation Fix

**Issue:** Albums fail to create with "Failed to create album" error.

**Root Cause:** Missing database columns (latitude, longitude, visibility, status, tags, etc.)

### How to Apply the Fix:

#### Option 1: Supabase Dashboard (Recommended)

1. Open your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy the contents of `supabase/migrations/20250107_fix_albums_table_schema.sql`
6. Paste into the SQL editor
7. Click **Run** (bottom right)
8. Verify success: You should see "Success. No rows returned"

#### Option 2: Supabase CLI (If Linked)

```bash
cd supabase
npx supabase db push --include-all
```

### Verification

After running the migration, test album creation:

1. Log in to your app
2. Navigate to "New Album"
3. Fill in:
   - Album Title
   - Location (use search or pick popular destination)
   - Start/End dates (optional)
   - Add photos (optional - can create draft without photos)
4. Click "Create"

**Expected Result:** Album creates successfully and redirects to album detail page.

### Other Pending Migrations

The following migrations may also need to be applied:

- `20250107_enable_rls_location_tables.sql` - Enables RLS for cities/countries tables
- `20250107_fix_function_search_paths.sql` - Fixes security issues in database functions

## Troubleshooting

### If album creation still fails:

1. Check browser console (F12) for detailed error messages
2. Verify RLS policies are enabled:
   ```sql
   SELECT tablename, policyname
   FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'albums';
   ```
3. Ensure user is authenticated (check auth.uid() is not null)
4. Check that all required migrations have been applied

### Common Errors:

**Error:** "relation 'albums' does not exist"
- **Fix:** Run initial table creation migrations first

**Error:** "column 'visibility' does not exist"
- **Fix:** Run the 20250107_fix_albums_table_schema.sql migration

**Error:** "permission denied for table albums"
- **Fix:** Check RLS policies with the query above

## Migration History

All migrations in `supabase/migrations/` should be run in chronological order (sorted by filename date):

1. `20241005_create_social_tables.sql`
2. `20241006_fix_table_naming_and_rls.sql`
3. `20241008_fix_social_tables_columns.sql`
4. `20241206_fix_dashboard_stats_function.sql`
5. `20241206_production_optimizations.sql`
6. `20250107_add_users_table_columns.sql`
7. `20250107_fix_users_profiles_schema.sql`
8. `20250107_fix_foreign_key_constraints.sql`
9. **`20250107_fix_albums_table_schema.sql` ← NEW - Run this now**
10. `20250107_enable_rls_location_tables.sql`
11. `20250107_fix_function_search_paths.sql`
12. `add_soft_delete.sql`
13. `fix_signup_trigger.sql`

## Support

If you encounter issues after applying migrations, please:

1. Check the Supabase logs (Dashboard → Logs → Postgres)
2. Verify table structure: `\d albums` in SQL editor
3. Contact support with error messages and migration details
