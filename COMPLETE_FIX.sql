-- ============================================================================
-- COMPLETE FIX FOR FEED ERROR
-- ============================================================================
-- This script will:
-- 1. Check current foreign key state
-- 2. Drop the existing constraint (if wrong)
-- 3. Recreate it correctly pointing to 'users' table
-- 4. Reload PostgREST schema cache
-- ============================================================================

-- STEP 1: Check what foreign key constraints currently exist
DO $$
DECLARE
  fk_record RECORD;
BEGIN
  RAISE NOTICE '=== Current Foreign Key Constraints on albums table ===';

  FOR fk_record IN
    SELECT
      tc.constraint_name,
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
      AND kcu.column_name = 'user_id'
  LOOP
    RAISE NOTICE 'Found: % -> %.% references %.%',
      fk_record.constraint_name,
      'albums',
      fk_record.column_name,
      fk_record.foreign_table_name,
      fk_record.foreign_column_name;
  END LOOP;
END $$;

-- STEP 2: Drop the existing constraint
DO $$
BEGIN
  -- Drop if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'albums_user_id_fkey'
    AND table_name = 'albums'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.albums DROP CONSTRAINT albums_user_id_fkey;
    RAISE NOTICE '✓ Dropped existing albums_user_id_fkey constraint';
  ELSE
    RAISE NOTICE 'ℹ No existing albums_user_id_fkey constraint found';
  END IF;
END $$;

-- STEP 3: Create the correct foreign key constraint
ALTER TABLE public.albums
  ADD CONSTRAINT albums_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.users(id)
  ON DELETE CASCADE;

-- Verify it was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.constraint_column_usage AS ccu
      ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_name = 'albums_user_id_fkey'
      AND tc.table_name = 'albums'
      AND ccu.table_name = 'users'
  ) THEN
    RAISE NOTICE '✓ SUCCESS: albums_user_id_fkey created and points to users table';
  ELSE
    RAISE EXCEPTION '✗ FAILED: Constraint not created correctly';
  END IF;
END $$;

-- STEP 4: Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Final message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== FIX COMPLETE ===';
  RAISE NOTICE '✓ Foreign key constraint recreated';
  RAISE NOTICE '✓ Schema cache reload triggered';
  RAISE NOTICE '';
  RAISE NOTICE 'Wait 10-30 seconds, then refresh your application.';
  RAISE NOTICE 'The feed should now load without errors.';
END $$;
