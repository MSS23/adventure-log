-- ============================================================================
-- Migration: Fix activity_feed trigger + RLS policy
-- Description:
--   1. Fix create_album_activity() trigger: 'related_album_id' → 'target_album_id'
--      and remove status check (albums table has no status column).
--   2. Fix activity_feed RLS policy: 'approved' → 'accepted' to match follows table.
-- ============================================================================

-- 1. Fix the trigger function
CREATE OR REPLACE FUNCTION public.create_album_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.activity_feed (
    user_id,
    activity_type,
    target_album_id,
    metadata,
    created_at
  ) VALUES (
    NEW.user_id,
    'album_created',
    NEW.id,
    jsonb_build_object(
      'album_title', NEW.title,
      'location', NEW.location_name,
      'country_code', NEW.country_code
    ),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp;

-- 2. Fix the RLS policy: change 'approved' to 'accepted'
DROP POLICY IF EXISTS "Users can view relevant activities" ON public.activity_feed;

CREATE POLICY "Users can view relevant activities"
  ON public.activity_feed FOR SELECT
  USING (
    -- Activities from users you follow
    user_id IN (
      SELECT following_id FROM public.follows
      WHERE follower_id = (select auth.uid()) AND status = 'accepted'
    )
    OR
    -- Activities targeting you
    target_user_id = (select auth.uid())
    OR
    -- Your own activities
    user_id = (select auth.uid())
  );
