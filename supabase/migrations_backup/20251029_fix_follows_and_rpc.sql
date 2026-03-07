-- =====================================================
-- Fix Follows Table RLS Policies and Add Missing RPC
-- =====================================================

-- Fix follows table RLS policies to allow reading follow status
-- The current policies are causing 406 errors

-- Drop ALL existing policies on follows table
DROP POLICY IF EXISTS "Users can view their own follows" ON public.follows;
DROP POLICY IF EXISTS "Users can view follows they are part of" ON public.follows;
DROP POLICY IF EXISTS "Users can view public follows" ON public.follows;
DROP POLICY IF EXISTS "Users can view follows where they are follower" ON public.follows;
DROP POLICY IF EXISTS "Users can view follows where they are being followed" ON public.follows;
DROP POLICY IF EXISTS "Users can view accepted follows for public users" ON public.follows;
DROP POLICY IF EXISTS "Users can insert their own follows" ON public.follows;
DROP POLICY IF EXISTS "Users can update follows where they are following" ON public.follows;
DROP POLICY IF EXISTS "Users can delete their own follows" ON public.follows;

-- Create comprehensive RLS policies for follows table
CREATE POLICY "Users can view follows where they are follower"
ON public.follows FOR SELECT
TO authenticated
USING (follower_id = auth.uid());

CREATE POLICY "Users can view follows where they are being followed"
ON public.follows FOR SELECT
TO authenticated
USING (following_id = auth.uid());

CREATE POLICY "Users can view accepted follows for public users"
ON public.follows FOR SELECT
TO authenticated
USING (
  status = 'accepted'
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = follows.following_id
    AND users.privacy_level = 'public'
  )
);

CREATE POLICY "Users can insert their own follows"
ON public.follows FOR INSERT
TO authenticated
WITH CHECK (follower_id = auth.uid());

CREATE POLICY "Users can update follows where they are following"
ON public.follows FOR UPDATE
TO authenticated
USING (following_id = auth.uid());

CREATE POLICY "Users can delete their own follows"
ON public.follows FOR DELETE
TO authenticated
USING (follower_id = auth.uid());

-- =====================================================
-- Add get_most_followed_users RPC function
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_most_followed_users(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  privacy_level TEXT,
  follower_count BIGINT,
  album_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.username,
    u.display_name,
    u.avatar_url,
    u.bio,
    u.privacy_level,
    COUNT(DISTINCT f.follower_id) as follower_count,
    COUNT(DISTINCT a.id) as album_count
  FROM public.users u
  LEFT JOIN public.follows f ON u.id = f.following_id AND f.status = 'accepted'
  LEFT JOIN public.albums a ON u.id = a.user_id
  WHERE u.privacy_level = 'public'
    AND u.id != COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
  GROUP BY u.id, u.username, u.display_name, u.avatar_url, u.bio, u.privacy_level
  HAVING COUNT(DISTINCT a.id) > 0
  ORDER BY follower_count DESC, album_count DESC
  LIMIT limit_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_most_followed_users(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_most_followed_users(INTEGER) TO anon;

-- =====================================================
-- Success Message
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Follows RLS policies updated!';
  RAISE NOTICE 'get_most_followed_users function created!';
  RAISE NOTICE '========================================';
END $$;
