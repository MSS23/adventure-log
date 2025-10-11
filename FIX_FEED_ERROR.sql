-- ============================================================================
-- FIX: Feed Error - Missing Foreign Key Constraint
-- ============================================================================
--
-- ERROR: "Could not find a relationship between 'albums' and 'users'"
--
-- CAUSE: The albums_user_id_fkey foreign key constraint is missing from the
--        database, preventing PostgREST from understanding the relationship
--        between albums and users tables.
--
-- HOW TO APPLY THIS FIX:
--
--   1. Go to: https://supabase.com/dashboard/project/jtdkbjvqujgpwcqjydma/sql/new
--   2. Copy this entire file
--   3. Paste into the SQL Editor
--   4. Click "RUN" button
--   5. Refresh your app - the feed should now load!
--
-- ============================================================================

-- Check if constraint already exists (should show 0 rows)
SELECT constraint_name
FROM information_schema.table_constraints
WHERE table_name = 'albums'
  AND constraint_name = 'albums_user_id_fkey'
  AND table_schema = 'public';

-- Add the missing foreign key constraint
ALTER TABLE public.albums
  ADD CONSTRAINT albums_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.users(id)
  ON DELETE CASCADE;

-- Verify the constraint was created (should show 1 row)
SELECT constraint_name, table_name
FROM information_schema.table_constraints
WHERE table_name = 'albums'
  AND constraint_name = 'albums_user_id_fkey'
  AND table_schema = 'public';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ SUCCESS: albums_user_id_fkey constraint has been created!';
  RAISE NOTICE 'The feed should now load correctly. Refresh your application.';
END $$;
