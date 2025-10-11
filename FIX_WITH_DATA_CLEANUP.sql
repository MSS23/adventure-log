-- ============================================================================
-- COMPLETE FIX: Clean Orphaned Data + Create Foreign Key
-- ============================================================================
-- Issue: Albums exist with user_ids that don't exist in the users table
-- Solution: Either delete orphaned albums OR create missing user records
-- ============================================================================

-- STEP 1: Identify orphaned albums
DO $$
DECLARE
  orphan_count INTEGER;
  rec RECORD;
BEGIN
  SELECT COUNT(*) INTO orphan_count
  FROM public.albums a
  LEFT JOIN public.users u ON a.user_id = u.id
  WHERE u.id IS NULL;

  RAISE NOTICE '=== Orphaned Albums Analysis ===';
  RAISE NOTICE 'Found % albums with non-existent user_ids', orphan_count;

  IF orphan_count > 0 THEN
    RAISE NOTICE 'Listing orphaned user_ids:';

    FOR rec IN
      SELECT DISTINCT a.user_id, COUNT(*) as album_count
      FROM public.albums a
      LEFT JOIN public.users u ON a.user_id = u.id
      WHERE u.id IS NULL
      GROUP BY a.user_id
    LOOP
      RAISE NOTICE '  User ID: % (% albums)', rec.user_id, rec.album_count;
    END LOOP;
  END IF;
END $$;

-- STEP 2: Check if these users exist in auth.users
DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== Checking auth.users table ===';

  FOR rec IN
    SELECT DISTINCT a.user_id,
      CASE
        WHEN au.id IS NOT NULL THEN 'EXISTS in auth.users'
        ELSE 'NOT in auth.users'
      END as auth_status
    FROM public.albums a
    LEFT JOIN public.users u ON a.user_id = u.id
    LEFT JOIN auth.users au ON a.user_id = au.id
    WHERE u.id IS NULL
  LOOP
    RAISE NOTICE '  %: %', rec.user_id, rec.auth_status;
  END LOOP;
END $$;

-- STEP 3: Create missing user records from auth.users (if they exist there)
DO $$
DECLARE
  created_count INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== Creating Missing User Records ===';

  -- Insert users that exist in auth.users but not in public.users
  INSERT INTO public.users (id, email, username, created_at, updated_at)
  SELECT
    au.id,
    au.email,
    COALESCE(
      au.raw_user_meta_data->>'username',
      'user_' || SUBSTRING(au.id::text, 1, 8)
    ) as username,
    au.created_at,
    NOW()
  FROM auth.users au
  WHERE au.id IN (
    SELECT DISTINCT a.user_id
    FROM public.albums a
    LEFT JOIN public.users u ON a.user_id = u.id
    WHERE u.id IS NULL
  )
  ON CONFLICT (id) DO NOTHING;

  GET DIAGNOSTICS created_count = ROW_COUNT;

  IF created_count > 0 THEN
    RAISE NOTICE '✓ Created % missing user records', created_count;
  ELSE
    RAISE NOTICE 'ℹ No user records created from auth.users';
  END IF;
END $$;

-- STEP 4: Delete any remaining orphaned albums (users deleted from auth.users)
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== Cleaning Up Truly Orphaned Albums ===';

  DELETE FROM public.albums a
  WHERE NOT EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = a.user_id
  );

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  IF deleted_count > 0 THEN
    RAISE NOTICE '✓ Deleted % orphaned albums', deleted_count;
  ELSE
    RAISE NOTICE '✓ No orphaned albums to delete';
  END IF;
END $$;

-- STEP 5: Drop existing foreign key if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'albums_user_id_fkey'
    AND table_name = 'albums'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.albums DROP CONSTRAINT albums_user_id_fkey;
    RAISE NOTICE '✓ Dropped existing albums_user_id_fkey constraint';
  END IF;
END $$;

-- STEP 6: Create the foreign key constraint
ALTER TABLE public.albums
  ADD CONSTRAINT albums_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.users(id)
  ON DELETE CASCADE;

-- STEP 7: Verify the constraint
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
    RAISE NOTICE '✓ SUCCESS: albums_user_id_fkey created correctly';
  ELSE
    RAISE EXCEPTION '✗ FAILED: Constraint not created';
  END IF;
END $$;

-- STEP 8: Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Final summary
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== FIX COMPLETE ===';
  RAISE NOTICE '✓ Orphaned data cleaned';
  RAISE NOTICE '✓ Foreign key constraint created';
  RAISE NOTICE '✓ Schema cache reloaded';
  RAISE NOTICE '';
  RAISE NOTICE 'Wait 10-30 seconds, then refresh your application.';
END $$;
