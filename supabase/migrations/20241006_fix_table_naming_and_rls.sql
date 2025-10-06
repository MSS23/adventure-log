-- Fix table naming to match application code expectations
-- The app queries 'follows' but the table is 'followers'
-- Also fix RLS policies for cities table

-- Step 1: Rename followers table to follows (only if followers exists and follows doesn't)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'followers')
     AND NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'follows') THEN
    ALTER TABLE public.followers RENAME TO follows;
  END IF;
END $$;

-- Step 2: Update foreign key constraint names to match app expectations
DO $$
BEGIN
  -- Drop old constraint names if they exist
  ALTER TABLE public.follows DROP CONSTRAINT IF EXISTS followers_follower_id_fkey CASCADE;
  ALTER TABLE public.follows DROP CONSTRAINT IF EXISTS followers_following_id_fkey CASCADE;

  -- Add new constraint names only if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'follows_follower_id_fkey'
  ) THEN
    ALTER TABLE public.follows
      ADD CONSTRAINT follows_follower_id_fkey
      FOREIGN KEY (follower_id)
      REFERENCES auth.users(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'follows_following_id_fkey'
  ) THEN
    ALTER TABLE public.follows
      ADD CONSTRAINT follows_following_id_fkey
      FOREIGN KEY (following_id)
      REFERENCES auth.users(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- Step 3: Update functions to use 'follows' table
CREATE OR REPLACE FUNCTION public.handle_follow_request(
    follower_id_param UUID,
    following_id_param UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_user_privacy TEXT;
    result_status TEXT;
BEGIN
    -- Get the privacy level of the user being followed
    SELECT privacy_level INTO target_user_privacy
    FROM public.users
    WHERE id = following_id_param;

    -- Determine initial status based on privacy
    IF target_user_privacy = 'private' THEN
        result_status := 'pending';
    ELSE
        result_status := 'accepted';
    END IF;

    -- Insert or update the follow relationship
    INSERT INTO public.follows (follower_id, following_id, status)
    VALUES (follower_id_param, following_id_param, result_status)
    ON CONFLICT (follower_id, following_id)
    DO UPDATE SET
        status = result_status,
        updated_at = now();

    RETURN result_status;
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_follow_request(
    follower_id_param UUID,
    following_id_param UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.follows
    SET status = 'accepted', updated_at = now()
    WHERE follower_id = follower_id_param
        AND following_id = following_id_param
        AND status = 'pending';
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_follow_request(
    follower_id_param UUID,
    following_id_param UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.follows
    SET status = 'rejected', updated_at = now()
    WHERE follower_id = follower_id_param
        AND following_id = following_id_param
        AND status = 'pending';
END;
$$;

-- Step 4: Add RLS policy for cities table to allow public read access
ALTER TABLE IF EXISTS public.cities ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anyone can view cities" ON public.cities;

-- Create public read policy
CREATE POLICY "Anyone can view cities"
    ON public.cities FOR SELECT
    USING (true);

-- Step 5: Ensure users/profiles table has proper reference
-- The follows table references should work with both auth.users and profiles table
-- Create a view if needed for backward compatibility
CREATE OR REPLACE VIEW public.profiles_view AS
SELECT
  u.id,
  u.email,
  p.username,
  p.display_name,
  p.bio,
  p.avatar_url,
  p.website,
  p.location,
  p.privacy_level,
  p.created_at,
  p.updated_at
FROM auth.users u
LEFT JOIN public.users p ON u.id = p.id;

-- Grant SELECT permission on the view
GRANT SELECT ON public.profiles_view TO authenticated, anon;

COMMENT ON TABLE public.follows IS 'User follow relationships (renamed from followers to match app code)';
COMMENT ON POLICY "Anyone can view cities" ON public.cities IS 'Allow public read access to cities table for location dropdown';
