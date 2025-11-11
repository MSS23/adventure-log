-- Migration: Fix RLS Performance Issues
-- Description: Replace direct auth.uid() and auth.jwt() calls with subquery-wrapped versions
--              This prevents unnecessary re-evaluation for each row, improving query performance
-- Issue: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

-- ============================================================================
-- REACTIONS TABLE
-- Note: Reactions table uses polymorphic relationships (target_type, target_id)
-- The original policies need to be checked in your actual database schema
-- Skipping reactions table for now - please verify the correct schema first
-- ============================================================================

-- ============================================================================
-- FOLLOWS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their follow relationships" ON follows;
CREATE POLICY "Users can view their follow relationships" ON follows
  FOR SELECT USING (
    (select auth.uid()) = follower_id OR (select auth.uid()) = following_id
  );

DROP POLICY IF EXISTS "Users can follow others" ON follows;
CREATE POLICY "Users can follow others" ON follows
  FOR INSERT WITH CHECK ((select auth.uid()) = follower_id);

DROP POLICY IF EXISTS "Users can update relevant follows" ON follows;
CREATE POLICY "Users can update relevant follows" ON follows
  FOR UPDATE USING (
    (select auth.uid()) = follower_id OR (select auth.uid()) = following_id
  );

DROP POLICY IF EXISTS "Users can delete relevant follows" ON follows;
CREATE POLICY "Users can delete relevant follows" ON follows
  FOR DELETE USING (
    (select auth.uid()) = follower_id OR (select auth.uid()) = following_id
  );

DROP POLICY IF EXISTS "Users can unfollow" ON follows;
CREATE POLICY "Users can unfollow" ON follows
  FOR DELETE USING ((select auth.uid()) = follower_id);

-- ============================================================================
-- ALBUMS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Public albums are viewable by everyone" ON albums;
CREATE POLICY "Public albums are viewable by everyone" ON albums
  FOR SELECT USING (
    visibility = 'public'
    OR (select auth.uid()) = user_id
    OR (
      visibility = 'friends'
      AND EXISTS (
        SELECT 1 FROM follows
        WHERE follows.following_id = albums.user_id
        AND follows.follower_id = (select auth.uid())
        AND follows.status = 'approved'
      )
    )
  );

DROP POLICY IF EXISTS "Users can CRUD own albums" ON albums;
CREATE POLICY "Users can CRUD own albums" ON albums
  FOR ALL USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own albums" ON albums;
CREATE POLICY "Users can view own albums" ON albums
  FOR SELECT USING ((select auth.uid()) = user_id);

-- ============================================================================
-- STORIES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view active stories from followed users" ON stories;
CREATE POLICY "Users can view active stories from followed users" ON stories
  FOR SELECT USING (
    expires_at > now()
    AND (
      user_id = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM follows
        WHERE follows.following_id = stories.user_id
        AND follows.follower_id = (select auth.uid())
        AND follows.status = 'approved'
      )
    )
  );

DROP POLICY IF EXISTS "Users can create their own stories" ON stories;
CREATE POLICY "Users can create their own stories" ON stories
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own stories" ON stories;
CREATE POLICY "Users can delete their own stories" ON stories
  FOR DELETE USING ((select auth.uid()) = user_id);

-- ============================================================================
-- FOLLOWERS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own follow relationships" ON followers;
CREATE POLICY "Users can view own follow relationships" ON followers
  FOR SELECT USING (
    (select auth.uid()) = follower_id OR (select auth.uid()) = following_id
  );

DROP POLICY IF EXISTS "Users can create follow relationships" ON followers;
CREATE POLICY "Users can create follow relationships" ON followers
  FOR INSERT WITH CHECK ((select auth.uid()) = follower_id);

DROP POLICY IF EXISTS "Users can delete own follows" ON followers;
CREATE POLICY "Users can delete own follows" ON followers
  FOR DELETE USING ((select auth.uid()) = follower_id);

-- ============================================================================
-- LIKES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can manage own likes" ON likes;
CREATE POLICY "Users can manage own likes" ON likes
  FOR ALL USING ((select auth.uid()) = user_id);

-- ============================================================================
-- WISHLIST TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own wishlist" ON wishlist;
CREATE POLICY "Users can view their own wishlist" ON wishlist
  FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can create wishlist items" ON wishlist;
CREATE POLICY "Users can create wishlist items" ON wishlist
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their wishlist" ON wishlist;
CREATE POLICY "Users can update their wishlist" ON wishlist
  FOR UPDATE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete wishlist items" ON wishlist;
CREATE POLICY "Users can delete wishlist items" ON wishlist
  FOR DELETE USING ((select auth.uid()) = user_id);

-- ============================================================================
-- USERS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can insert their own profile during signup" ON users;
CREATE POLICY "Users can insert their own profile during signup" ON users
  FOR INSERT WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Deleted users cannot access data" ON users;
CREATE POLICY "Deleted users cannot access data" ON users
  FOR SELECT USING (
    deleted_at IS NULL OR (select auth.uid()) = id
  );

DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON users;
CREATE POLICY "Enable insert for authenticated users only" ON users
  FOR INSERT WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can view their own profile" ON users;
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON users;
CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING ((select auth.uid()) = id);

-- ============================================================================
-- USER_LEVELS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can insert their own level" ON user_levels;
CREATE POLICY "Users can insert their own level" ON user_levels
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own level" ON user_levels;
CREATE POLICY "Users can update their own level" ON user_levels
  FOR UPDATE USING ((select auth.uid()) = user_id);

-- ============================================================================
-- COMMENTS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can manage own comments" ON comments;
CREATE POLICY "Users can manage own comments" ON comments
  FOR ALL USING ((select auth.uid()) = user_id);

-- ============================================================================
-- AI_USAGE TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own AI usage" ON ai_usage;
CREATE POLICY "Users can view own AI usage" ON ai_usage
  FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Service role can manage AI usage" ON ai_usage;
CREATE POLICY "Service role can manage AI usage" ON ai_usage
  FOR ALL USING ((select auth.jwt())->>'role' = 'service_role');

-- ============================================================================
-- PLAYLIST_SUBSCRIPTIONS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Playlist owners can view subscribers" ON playlist_subscriptions;
CREATE POLICY "Playlist owners can view subscribers" ON playlist_subscriptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM playlists
      WHERE playlists.id = playlist_subscriptions.playlist_id
      AND playlists.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can manage their own subscriptions" ON playlist_subscriptions;
CREATE POLICY "Users can manage their own subscriptions" ON playlist_subscriptions
  FOR ALL USING ((select auth.uid()) = user_id);

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
CREATE POLICY "Users can delete their own notifications" ON notifications
  FOR DELETE USING ((select auth.uid()) = user_id);

-- ============================================================================
-- PHOTOS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view and manage own photos" ON photos;
CREATE POLICY "Users can view and manage own photos" ON photos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM albums
      WHERE albums.id = photos.album_id
      AND albums.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Public photos viewable" ON photos;
CREATE POLICY "Public photos viewable" ON photos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM albums
      WHERE albums.id = photos.album_id
      AND (
        albums.visibility = 'public'
        OR albums.user_id = (select auth.uid())
        OR (
          albums.visibility = 'friends'
          AND EXISTS (
            SELECT 1 FROM follows
            WHERE follows.following_id = albums.user_id
            AND follows.follower_id = (select auth.uid())
            AND follows.status = 'approved'
          )
        )
      )
    )
  );

-- ============================================================================
-- PLAYLIST_COLLABORATORS TABLE
-- Note: Skipping policies that reference non-existent columns (can_invite)
-- These need to be verified against actual database schema
-- ============================================================================

DROP POLICY IF EXISTS "Playlist owners can manage collaborators" ON playlist_collaborators;
CREATE POLICY "Playlist owners can manage collaborators" ON playlist_collaborators
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM playlists
      WHERE playlists.id = playlist_collaborators.playlist_id
      AND playlists.user_id = (select auth.uid())
    )
  );

-- Skipping "Collaborators with invite permission can add others" - references non-existent can_invite column

DROP POLICY IF EXISTS "Users can view collaborators of playlists they're involved in" ON playlist_collaborators;
CREATE POLICY "Users can view collaborators of playlists they're involved in" ON playlist_collaborators
  FOR SELECT USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM playlists
      WHERE playlists.id = playlist_collaborators.playlist_id
      AND playlists.user_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM playlist_collaborators pc
      WHERE pc.playlist_id = playlist_collaborators.playlist_id
      AND pc.user_id = (select auth.uid())
    )
  );

-- ============================================================================
-- UPLOAD_QUEUE TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own upload queue" ON upload_queue;
CREATE POLICY "Users can view their own upload queue" ON upload_queue
  FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can manage their own upload queue" ON upload_queue;
CREATE POLICY "Users can manage their own upload queue" ON upload_queue
  FOR ALL USING ((select auth.uid()) = user_id);

-- ============================================================================
-- OFFLINE_MAP_PACKS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own map packs" ON offline_map_packs;
CREATE POLICY "Users can view their own map packs" ON offline_map_packs
  FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can manage their own map packs" ON offline_map_packs;
CREATE POLICY "Users can manage their own map packs" ON offline_map_packs
  FOR ALL USING ((select auth.uid()) = user_id);

-- ============================================================================
-- ITINERARIES TABLE (if exists)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own itineraries" ON itineraries;
CREATE POLICY "Users can view own itineraries" ON itineraries
  FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can create own itineraries" ON itineraries;
CREATE POLICY "Users can create own itineraries" ON itineraries
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own itineraries" ON itineraries;
CREATE POLICY "Users can update own itineraries" ON itineraries
  FOR UPDATE USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own itineraries" ON itineraries;
CREATE POLICY "Users can delete own itineraries" ON itineraries
  FOR DELETE USING ((select auth.uid()) = user_id);

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

-- Run this query to verify all policies are now optimized:
-- SELECT
--   schemaname,
--   tablename,
--   policyname,
--   pg_get_expr(qual, relid) AS using_expression,
--   pg_get_expr(with_check, relid) AS with_check_expression
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- AND (
--   pg_get_expr(qual, (schemaname || '.' || tablename)::regclass) LIKE '%auth.uid()%'
--   OR pg_get_expr(with_check, (schemaname || '.' || tablename)::regclass) LIKE '%auth.uid()%'
--   OR pg_get_expr(qual, (schemaname || '.' || tablename)::regclass) LIKE '%auth.jwt()%'
--   OR pg_get_expr(with_check, (schemaname || '.' || tablename)::regclass) LIKE '%auth.jwt()%'
-- )
-- ORDER BY tablename, policyname;
