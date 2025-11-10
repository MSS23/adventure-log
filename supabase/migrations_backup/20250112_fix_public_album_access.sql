-- Fix RLS policies to allow public album access without authentication
-- This enables non-logged-in users to view public albums

-- Drop existing album SELECT policies
DROP POLICY IF EXISTS "View public albums" ON albums;
DROP POLICY IF EXISTS "Users can view own albums" ON albums;

-- Create new policies for public album access
-- Policy 1: Allow anyone (including non-authenticated) to view public published albums
CREATE POLICY "Public albums are viewable by anyone"
  ON albums FOR SELECT
  USING (
    status = 'published'
    AND visibility = 'public'
  );

-- Policy 2: Allow authenticated users to view their own albums (all statuses)
CREATE POLICY "Users can view own albums"
  ON albums FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
  );

-- Policy 3: Allow authenticated users to view friends-only albums they have access to
CREATE POLICY "Users can view friends albums"
  ON albums FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND status = 'published'
    AND visibility = 'friends'
    AND EXISTS (
      SELECT 1 FROM follows
      WHERE follower_id = auth.uid()
      AND following_id = albums.user_id
      AND status = 'accepted'
    )
  );

-- Update photos RLS policies to match
DROP POLICY IF EXISTS "View photos from visible albums" ON photos;

-- Policy 1: Allow anyone to view photos from public published albums
CREATE POLICY "Public album photos viewable by anyone"
  ON photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM albums
      WHERE albums.id = photos.album_id
      AND albums.status = 'published'
      AND albums.visibility = 'public'
    )
  );

-- Policy 2: Allow users to view photos from their own albums
CREATE POLICY "Users can view own album photos"
  ON photos FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
  );

-- Policy 3: Allow users to view photos from friends-only albums they have access to
CREATE POLICY "Users can view friends album photos"
  ON photos FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM albums
      WHERE albums.id = photos.album_id
      AND albums.status = 'published'
      AND albums.visibility = 'friends'
      AND EXISTS (
        SELECT 1 FROM follows
        WHERE follower_id = auth.uid()
        AND following_id = albums.user_id
        AND status = 'accepted'
      )
    )
  );

-- Update users table to allow public profile viewing
DROP POLICY IF EXISTS "Users can view public profiles" ON users;

-- Allow anyone to view public user profiles (for album creators)
CREATE POLICY "Public profiles viewable by anyone"
  ON users FOR SELECT
  USING (
    privacy_level = 'public'
    OR privacy_level IS NULL  -- Legacy profiles default to public
  );

-- Allow authenticated users to view their own profile
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND id = auth.uid()
  );

-- Allow authenticated users to view friends' profiles
CREATE POLICY "Users can view friends profiles"
  ON users FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM follows
      WHERE follower_id = auth.uid()
      AND following_id = users.id
      AND status = 'accepted'
    )
  );

COMMENT ON POLICY "Public albums are viewable by anyone" ON albums IS 'Allow unauthenticated access to public published albums';
COMMENT ON POLICY "Public album photos viewable by anyone" ON photos IS 'Allow unauthenticated access to photos from public albums';
COMMENT ON POLICY "Public profiles viewable by anyone" ON users IS 'Allow unauthenticated access to public user profiles';
