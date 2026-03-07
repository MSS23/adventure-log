-- Add missing foreign key constraint from albums to users table
-- This fixes the error: "Could not find a relationship between 'albums' and 'users' in the schema cache"

-- First, check if the constraint already exists and drop it if needed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'albums_user_id_fkey'
    AND table_name = 'albums'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.albums DROP CONSTRAINT albums_user_id_fkey;
    RAISE NOTICE 'Dropped existing albums_user_id_fkey constraint';
  END IF;
END $$;

-- Add the foreign key constraint
ALTER TABLE public.albums
  ADD CONSTRAINT albums_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.users(id)
  ON DELETE CASCADE;

COMMENT ON CONSTRAINT albums_user_id_fkey ON public.albums IS
  'Foreign key linking albums to users table - required for PostgREST relationship queries';

-- Verify the constraint was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'albums_user_id_fkey'
    AND table_name = 'albums'
    AND table_schema = 'public'
  ) THEN
    RAISE NOTICE 'SUCCESS: albums_user_id_fkey constraint created';
  ELSE
    RAISE EXCEPTION 'FAILED: albums_user_id_fkey constraint not found';
  END IF;
END $$;
