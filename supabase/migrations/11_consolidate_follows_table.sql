-- =============================================================================
-- Migration: 11_consolidate_follows_table.sql
-- Description: Consolidate follows/followers tables and add production indexes
-- Date: 2025-02-04
-- =============================================================================

-- Step 1: Check current state and log it
DO $$
DECLARE
  followers_exists BOOLEAN;
  follows_exists BOOLEAN;
  followers_count INTEGER := 0;
  follows_count INTEGER := 0;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'followers' AND table_schema = 'public'
  ) INTO followers_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'follows' AND table_schema = 'public'
  ) INTO follows_exists;

  IF followers_exists THEN
    EXECUTE 'SELECT COUNT(*) FROM public.followers' INTO followers_count;
  END IF;

  IF follows_exists THEN
    EXECUTE 'SELECT COUNT(*) FROM public.follows' INTO follows_count;
  END IF;

  RAISE NOTICE 'Table status - followers: % (% rows), follows: % (% rows)',
    followers_exists, followers_count, follows_exists, follows_count;
END $$;

-- Step 2: Ensure follows table exists with proper schema
CREATE TABLE IF NOT EXISTS public.follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL,
  following_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT follows_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT follows_following_id_fkey FOREIGN KEY (following_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT follows_no_self_follow CHECK (follower_id != following_id),
  CONSTRAINT follows_status_check CHECK (status IN ('pending', 'accepted', 'approved', 'rejected')),
  UNIQUE(follower_id, following_id)
);

-- Step 2b: Add updated_at column if it doesn't exist (for existing tables)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'follows' AND column_name = 'updated_at' AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.follows ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE 'Added updated_at column to follows table';
  END IF;
END $$;

-- Step 3: Migrate data from followers to follows (if followers exists)
DO $$
DECLARE
  has_updated_at BOOLEAN;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'followers' AND table_schema = 'public'
  ) THEN
    -- Check if follows table has updated_at column
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'follows' AND column_name = 'updated_at' AND table_schema = 'public'
    ) INTO has_updated_at;

    IF has_updated_at THEN
      -- Migrate with updated_at
      INSERT INTO public.follows (follower_id, following_id, status, created_at, updated_at)
      SELECT
        follower_id,
        following_id,
        COALESCE(status, 'accepted'),
        created_at,
        COALESCE(created_at, NOW())
      FROM public.followers f
      WHERE NOT EXISTS (
        SELECT 1 FROM public.follows
        WHERE follower_id = f.follower_id
        AND following_id = f.following_id
      )
      ON CONFLICT (follower_id, following_id) DO NOTHING;
    ELSE
      -- Migrate without updated_at
      INSERT INTO public.follows (follower_id, following_id, status, created_at)
      SELECT
        follower_id,
        following_id,
        COALESCE(status, 'accepted'),
        created_at
      FROM public.followers f
      WHERE NOT EXISTS (
        SELECT 1 FROM public.follows
        WHERE follower_id = f.follower_id
        AND following_id = f.following_id
      )
      ON CONFLICT (follower_id, following_id) DO NOTHING;
    END IF;

    RAISE NOTICE 'Data migrated from followers to follows table';
  END IF;
END $$;

-- Step 4: Normalize status values (standardize on 'accepted')
UPDATE public.follows
SET status = 'accepted', updated_at = NOW()
WHERE status = 'approved';

-- Step 5: Add indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_follows_follower_id
  ON public.follows(follower_id);

CREATE INDEX IF NOT EXISTS idx_follows_following_id
  ON public.follows(following_id);

CREATE INDEX IF NOT EXISTS idx_follows_follower_status
  ON public.follows(follower_id, status);

CREATE INDEX IF NOT EXISTS idx_follows_following_status
  ON public.follows(following_id, status);

CREATE INDEX IF NOT EXISTS idx_follows_status
  ON public.follows(status);

CREATE INDEX IF NOT EXISTS idx_follows_created_at
  ON public.follows(created_at DESC);

-- Step 6: Enable RLS
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- Step 7: Create optimized RLS policies (using (select auth.uid()) pattern)
DROP POLICY IF EXISTS "Users can view their follow relationships" ON public.follows;
CREATE POLICY "Users can view their follow relationships" ON public.follows
  FOR SELECT USING (
    (select auth.uid()) = follower_id
    OR (select auth.uid()) = following_id
  );

DROP POLICY IF EXISTS "Users can follow others" ON public.follows;
CREATE POLICY "Users can follow others" ON public.follows
  FOR INSERT WITH CHECK (
    (select auth.uid()) = follower_id
  );

DROP POLICY IF EXISTS "Users can update relevant follows" ON public.follows;
CREATE POLICY "Users can update relevant follows" ON public.follows
  FOR UPDATE USING (
    (select auth.uid()) = follower_id
    OR (select auth.uid()) = following_id
  );

DROP POLICY IF EXISTS "Users can unfollow" ON public.follows;
CREATE POLICY "Users can unfollow" ON public.follows
  FOR DELETE USING (
    (select auth.uid()) = follower_id
  );

-- Step 8: Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_follows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_follows_updated_at ON public.follows;
CREATE TRIGGER trigger_follows_updated_at
  BEFORE UPDATE ON public.follows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_follows_updated_at();

-- Step 9: Create a view alias for backwards compatibility (optional, can be removed later)
-- This allows any code still using 'followers' to work during transition
DROP VIEW IF EXISTS public.followers_view;
CREATE VIEW public.followers_view AS
SELECT
  id,
  follower_id,
  following_id,
  status,
  created_at
FROM public.follows;

COMMENT ON VIEW public.followers_view IS 'DEPRECATED: Use follows table directly. This view exists for backwards compatibility only.';

-- Grant access to the view
GRANT SELECT ON public.followers_view TO authenticated;

-- Step 10: Analyze tables for query optimization
ANALYZE public.follows;

-- =============================================================================
-- VERIFICATION QUERIES (run these manually to verify migration)
-- =============================================================================
-- SELECT COUNT(*) as total_follows FROM public.follows;
-- SELECT status, COUNT(*) FROM public.follows GROUP BY status;
-- SELECT * FROM cron.job; -- Check if any cron jobs reference 'followers'

-- =============================================================================
-- ROLLBACK INSTRUCTIONS
-- =============================================================================
-- If migration fails and you need to rollback:
--
-- 1. Drop the view:
--    DROP VIEW IF EXISTS public.followers_view;
--
-- 2. Drop the trigger:
--    DROP TRIGGER IF EXISTS trigger_follows_updated_at ON public.follows;
--    DROP FUNCTION IF EXISTS public.update_follows_updated_at();
--
-- 3. Drop new indexes:
--    DROP INDEX IF EXISTS idx_follows_follower_id;
--    DROP INDEX IF EXISTS idx_follows_following_id;
--    DROP INDEX IF EXISTS idx_follows_follower_status;
--    DROP INDEX IF EXISTS idx_follows_following_status;
--    DROP INDEX IF EXISTS idx_follows_status;
--    DROP INDEX IF EXISTS idx_follows_created_at;
--
-- 4. Drop RLS policies:
--    DROP POLICY IF EXISTS "Users can view their follow relationships" ON public.follows;
--    DROP POLICY IF EXISTS "Users can follow others" ON public.follows;
--    DROP POLICY IF EXISTS "Users can update relevant follows" ON public.follows;
--    DROP POLICY IF EXISTS "Users can unfollow" ON public.follows;
--
-- Note: The follows table data should be preserved. The original followers table
-- (if it existed) has not been dropped and still contains its original data.
