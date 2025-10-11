-- ============================================================================
-- FIX: Reload Supabase Schema Cache
-- ============================================================================
--
-- The foreign key constraint EXISTS but Supabase's PostgREST schema cache
-- is stale and doesn't know about it.
--
-- HOW TO FIX:
--
--   Option 1 (Easiest): Run this SQL query
--   1. Go to: https://supabase.com/dashboard/project/jtdkbjvqujgpwcqjydma/sql/new
--   2. Copy and run this:
--
-- ============================================================================

NOTIFY pgrst, 'reload schema';

-- ============================================================================
--
--   Option 2: Restart the PostgREST service
--   1. Go to: https://supabase.com/dashboard/project/jtdkbjvqujgpwcqjydma/settings/infrastructure
--   2. Find PostgREST service
--   3. Click "Restart"
--
--   Option 3: Just wait 2-3 minutes
--   Supabase automatically reloads the schema cache periodically
--
-- ============================================================================

-- Verify the constraint exists (should return 1 row)
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name = 'albums'
  AND kcu.column_name = 'user_id';
