-- Fix albums RLS policies to allow users to view their own albums (including drafts)
-- This was accidentally removed in the production_optimizations migration

-- The issue: Users could INSERT albums but couldn't SELECT their own drafts
-- This caused album creation to appear to fail (album created but couldn't be retrieved)

-- Add missing policy for users to view their own albums (including drafts)
DROP POLICY IF EXISTS "Users can view own albums" ON albums;
CREATE POLICY "Users can view own albums"
  ON albums FOR SELECT
  USING (user_id = auth.uid());

-- This policy allows users to see ALL their own albums regardless of:
-- - Draft status (status = 'draft' or 'published')
-- - Visibility (public, private, or friends)

-- Combined with existing "View public albums" policy, this ensures:
-- 1. Users can see their own albums (all statuses)
-- 2. Other users can see public/friends albums (non-draft only)

COMMENT ON POLICY "Users can view own albums" ON albums IS 'Allow users to view all their own albums including drafts';
