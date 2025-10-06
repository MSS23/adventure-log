-- Production optimizations: indexes, RLS policies, and performance improvements

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Albums indexes
CREATE INDEX IF NOT EXISTS idx_albums_user_id ON albums(user_id) WHERE status != 'draft';
CREATE INDEX IF NOT EXISTS idx_albums_created_at ON albums(created_at DESC) WHERE status != 'draft';
CREATE INDEX IF NOT EXISTS idx_albums_location ON albums(location_name) WHERE status != 'draft';
CREATE INDEX IF NOT EXISTS idx_albums_country ON albums(country_code) WHERE status != 'draft';
CREATE INDEX IF NOT EXISTS idx_albums_user_created ON albums(user_id, created_at DESC) WHERE status != 'draft';

-- Photos indexes
CREATE INDEX IF NOT EXISTS idx_photos_album_id ON photos(album_id);
CREATE INDEX IF NOT EXISTS idx_photos_user_id ON photos(user_id);
CREATE INDEX IF NOT EXISTS idx_photos_created_at ON photos(created_at DESC);

-- Follows indexes
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id, status);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id, status);
CREATE INDEX IF NOT EXISTS idx_follows_status ON follows(status);

-- Likes indexes
CREATE INDEX IF NOT EXISTS idx_likes_album ON likes(album_id);
CREATE INDEX IF NOT EXISTS idx_likes_user ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_created ON likes(created_at DESC);

-- Comments indexes
CREATE INDEX IF NOT EXISTS idx_comments_album ON comments(album_id);
CREATE INDEX IF NOT EXISTS idx_comments_photo ON comments(photo_id) WHERE photo_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id) WHERE parent_id IS NOT NULL;

-- Stories indexes
CREATE INDEX IF NOT EXISTS idx_stories_user_active ON stories(user_id, expires_at) WHERE expires_at > NOW();
CREATE INDEX IF NOT EXISTS idx_stories_expires ON stories(expires_at);

-- Users/Profiles indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- =============================================================================
-- ROW LEVEL SECURITY ENHANCEMENTS
-- =============================================================================

-- Ensure RLS is enabled on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view public profiles" ON users;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;

DROP POLICY IF EXISTS "Anyone can view public albums" ON albums;
DROP POLICY IF EXISTS "Users can view their own albums" ON albums;
DROP POLICY IF EXISTS "Users can insert their own albums" ON albums;
DROP POLICY IF EXISTS "Users can update their own albums" ON albums;
DROP POLICY IF EXISTS "Users can delete their own albums" ON albums;

-- Users/Profiles policies
CREATE POLICY "Users can view public profiles"
  ON users FOR SELECT
  USING (
    privacy_level = 'public'
    OR id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM follows
      WHERE follower_id = auth.uid()
      AND following_id = users.id
      AND status = 'accepted'
    )
  );

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Albums policies with visibility checks
CREATE POLICY "View public albums"
  ON albums FOR SELECT
  USING (
    status != 'draft'
    AND (
      visibility = 'public'
      OR user_id = auth.uid()
      OR (
        visibility = 'friends'
        AND EXISTS (
          SELECT 1 FROM follows
          WHERE follower_id = auth.uid()
          AND following_id = albums.user_id
          AND status = 'accepted'
        )
      )
    )
  );

CREATE POLICY "Users can insert own albums"
  ON albums FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own albums"
  ON albums FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own albums"
  ON albums FOR DELETE
  USING (user_id = auth.uid());

-- Photos policies
CREATE POLICY "View photos from visible albums"
  ON photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM albums
      WHERE albums.id = photos.album_id
      AND albums.status != 'draft'
      AND (
        albums.visibility = 'public'
        OR albums.user_id = auth.uid()
        OR (
          albums.visibility = 'friends'
          AND EXISTS (
            SELECT 1 FROM follows
            WHERE follower_id = auth.uid()
            AND following_id = albums.user_id
            AND status = 'accepted'
          )
        )
      )
    )
  );

CREATE POLICY "Users can insert own photos"
  ON photos FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own photos"
  ON photos FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own photos"
  ON photos FOR DELETE
  USING (user_id = auth.uid());

-- Follows policies
CREATE POLICY "Users can view their follows"
  ON follows FOR SELECT
  USING (follower_id = auth.uid() OR following_id = auth.uid());

CREATE POLICY "Users can create follow requests"
  ON follows FOR INSERT
  WITH CHECK (follower_id = auth.uid());

CREATE POLICY "Users can update follow status"
  ON follows FOR UPDATE
  USING (following_id = auth.uid() OR follower_id = auth.uid())
  WITH CHECK (following_id = auth.uid() OR follower_id = auth.uid());

CREATE POLICY "Users can delete their follows"
  ON follows FOR DELETE
  USING (follower_id = auth.uid() OR following_id = auth.uid());

-- =============================================================================
-- PERFORMANCE OPTIMIZATIONS
-- =============================================================================

-- Update statistics for query planner
ANALYZE users;
ANALYZE albums;
ANALYZE photos;
ANALYZE follows;
ANALYZE likes;
ANALYZE comments;
ANALYZE stories;

-- Add automatic vacuum settings
ALTER TABLE users SET (autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE albums SET (autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE photos SET (autovacuum_vacuum_scale_factor = 0.1);

-- =============================================================================
-- SECURITY ENHANCEMENTS
-- =============================================================================

-- Prevent SQL injection in RPC functions
ALTER FUNCTION get_user_dashboard_stats(UUID) SECURITY DEFINER SET search_path = public;
ALTER FUNCTION get_user_travel_years(UUID) SECURITY DEFINER SET search_path = public;

-- Add constraints for data integrity
ALTER TABLE albums ADD CONSTRAINT valid_visibility
  CHECK (visibility IN ('public', 'private', 'friends'));

ALTER TABLE users ADD CONSTRAINT valid_privacy
  CHECK (privacy_level IN ('public', 'private', 'friends'));

ALTER TABLE follows ADD CONSTRAINT valid_follow_status
  CHECK (status IN ('pending', 'accepted', 'rejected'));

-- Ensure no self-follows
ALTER TABLE follows ADD CONSTRAINT no_self_follow
  CHECK (follower_id != following_id);

-- =============================================================================
-- CLEANUP OLD DATA
-- =============================================================================

-- Function to cleanup expired stories
CREATE OR REPLACE FUNCTION cleanup_expired_stories()
RETURNS void AS $$
BEGIN
  DELETE FROM stories WHERE expires_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION cleanup_expired_stories() TO authenticated;
