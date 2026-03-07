-- =============================================================================
-- Migration: 12_production_indexes.sql
-- Description: Add missing indexes for production-scale query patterns
-- Date: 2025-02-04
-- Note: Using CONCURRENTLY where possible to avoid table locks
--       Some indexes may already exist - IF NOT EXISTS handles this gracefully
-- =============================================================================

-- =============================================================================
-- ALBUMS TABLE INDEXES
-- =============================================================================

-- Primary query pattern: user's albums filtered by visibility, ordered by date
CREATE INDEX IF NOT EXISTS idx_albums_user_visibility_created
  ON public.albums(user_id, visibility, created_at DESC);

-- User's albums by status (draft vs published)
CREATE INDEX IF NOT EXISTS idx_albums_user_status
  ON public.albums(user_id, status)
  WHERE status IS NOT NULL;

-- Public albums feed (most common query)
CREATE INDEX IF NOT EXISTS idx_albums_visibility_created
  ON public.albums(visibility, created_at DESC)
  WHERE visibility = 'public';

-- Globe visualization: albums with coordinates
CREATE INDEX IF NOT EXISTS idx_albums_location_coords
  ON public.albums(latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Country-based filtering
CREATE INDEX IF NOT EXISTS idx_albums_country_code
  ON public.albums(country_code)
  WHERE country_code IS NOT NULL;

-- Travel timeline: albums by date
CREATE INDEX IF NOT EXISTS idx_albums_date_start
  ON public.albums(date_start DESC)
  WHERE date_start IS NOT NULL;

-- =============================================================================
-- PHOTOS TABLE INDEXES
-- =============================================================================

-- Photos within an album, ordered for display
CREATE INDEX IF NOT EXISTS idx_photos_album_order
  ON public.photos(album_id, order_index);

-- Photos by album, ordered by creation (for cover photo selection)
CREATE INDEX IF NOT EXISTS idx_photos_album_created
  ON public.photos(album_id, created_at DESC);

-- User's photos across all albums
CREATE INDEX IF NOT EXISTS idx_photos_user_created
  ON public.photos(user_id, created_at DESC);

-- Photo deduplication by hash
CREATE INDEX IF NOT EXISTS idx_photos_file_hash
  ON public.photos(file_hash)
  WHERE file_hash IS NOT NULL;

-- =============================================================================
-- LIKES TABLE INDEXES (Polymorphic)
-- =============================================================================

-- Primary lookup: likes on a specific target
CREATE INDEX IF NOT EXISTS idx_likes_target
  ON public.likes(target_type, target_id);

-- User's likes by type
CREATE INDEX IF NOT EXISTS idx_likes_user_target_type
  ON public.likes(user_id, target_type);

-- Count likes per target efficiently
CREATE INDEX IF NOT EXISTS idx_likes_target_created
  ON public.likes(target_type, target_id, created_at DESC);

-- =============================================================================
-- COMMENTS TABLE INDEXES (Polymorphic)
-- =============================================================================

-- Comments on a specific target
CREATE INDEX IF NOT EXISTS idx_comments_target
  ON public.comments(target_type, target_id);

-- Comments ordered by date (for display)
CREATE INDEX IF NOT EXISTS idx_comments_target_created
  ON public.comments(target_type, target_id, created_at DESC);

-- User's comments
CREATE INDEX IF NOT EXISTS idx_comments_user_created
  ON public.comments(user_id, created_at DESC);

-- =============================================================================
-- STORIES TABLE INDEXES
-- =============================================================================

-- User's stories, ordered by expiration
CREATE INDEX IF NOT EXISTS idx_stories_user_expires
  ON public.stories(user_id, expires_at DESC);

-- Active stories - for feed queries (index on expires_at for range queries)
CREATE INDEX IF NOT EXISTS idx_stories_active
  ON public.stories(expires_at DESC);

-- Stories by creation date
CREATE INDEX IF NOT EXISTS idx_stories_created
  ON public.stories(created_at DESC);

-- =============================================================================
-- NOTIFICATIONS TABLE INDEXES
-- =============================================================================

-- User's unread notifications (most common query)
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications(user_id, created_at DESC)
  WHERE is_read = FALSE;

-- User's all notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications(user_id, created_at DESC);

-- Notifications by type (for filtering)
CREATE INDEX IF NOT EXISTS idx_notifications_type
  ON public.notifications(type, created_at DESC);

-- =============================================================================
-- ACTIVITY FEED TABLE INDEXES
-- =============================================================================

-- User's unread activity
CREATE INDEX IF NOT EXISTS idx_activity_feed_user_unread
  ON public.activity_feed(user_id, created_at DESC)
  WHERE is_read = FALSE;

-- Activity by type
CREATE INDEX IF NOT EXISTS idx_activity_feed_type
  ON public.activity_feed(activity_type, created_at DESC);

-- Target user's activity (for their feed)
CREATE INDEX IF NOT EXISTS idx_activity_feed_target_user
  ON public.activity_feed(target_user_id, created_at DESC)
  WHERE target_user_id IS NOT NULL;

-- =============================================================================
-- USERS TABLE INDEXES
-- =============================================================================

-- Active users (not soft-deleted)
CREATE INDEX IF NOT EXISTS idx_users_active
  ON public.users(id)
  WHERE deleted_at IS NULL;

-- Username lookup (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_users_username_lower
  ON public.users(LOWER(username))
  WHERE deleted_at IS NULL;

-- Users by privacy level
CREATE INDEX IF NOT EXISTS idx_users_privacy_level
  ON public.users(privacy_level)
  WHERE deleted_at IS NULL;

-- =============================================================================
-- HASHTAGS TABLE INDEXES
-- =============================================================================

-- Trending hashtags
CREATE INDEX IF NOT EXISTS idx_hashtags_trending
  ON public.hashtags(trending_rank, usage_count DESC)
  WHERE trending_rank IS NOT NULL;

-- Tag lookup (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_hashtags_tag_lower
  ON public.hashtags(LOWER(tag));

-- =============================================================================
-- ALBUM_HASHTAGS TABLE INDEXES
-- =============================================================================

-- Albums with a specific hashtag
CREATE INDEX IF NOT EXISTS idx_album_hashtags_hashtag
  ON public.album_hashtags(hashtag_id, created_at DESC);

-- Hashtags for an album
CREATE INDEX IF NOT EXISTS idx_album_hashtags_album
  ON public.album_hashtags(album_id);

-- =============================================================================
-- SEARCH_HISTORY TABLE INDEXES
-- =============================================================================

-- User's recent searches
CREATE INDEX IF NOT EXISTS idx_search_history_user_recent
  ON public.search_history(user_id, searched_at DESC);

-- =============================================================================
-- ITINERARIES TABLE INDEXES
-- =============================================================================

-- User's itineraries
CREATE INDEX IF NOT EXISTS idx_itineraries_user
  ON public.itineraries(user_id, created_at DESC);

-- Favorite itineraries
CREATE INDEX IF NOT EXISTS idx_itineraries_favorites
  ON public.itineraries(user_id, is_favorite)
  WHERE is_favorite = TRUE;

-- =============================================================================
-- TRIP_PLANNER_CACHE TABLE INDEXES
-- =============================================================================

-- Cache lookup by key
CREATE INDEX IF NOT EXISTS idx_trip_cache_key
  ON public.trip_planner_cache(cache_key);

-- Cache cleanup by access time
CREATE INDEX IF NOT EXISTS idx_trip_cache_accessed
  ON public.trip_planner_cache(accessed_at);

-- =============================================================================
-- GLOBE_REACTIONS TABLE INDEXES
-- =============================================================================

-- Reactions on a user's globe
CREATE INDEX IF NOT EXISTS idx_globe_reactions_target_user
  ON public.globe_reactions(target_user_id, created_at DESC);

-- Unread reactions
CREATE INDEX IF NOT EXISTS idx_globe_reactions_unread
  ON public.globe_reactions(target_user_id, is_read, created_at DESC)
  WHERE is_read = FALSE;

-- =============================================================================
-- ANALYZE TABLES
-- =============================================================================
-- Update statistics for query planner after adding indexes

ANALYZE public.albums;
ANALYZE public.photos;
ANALYZE public.likes;
ANALYZE public.comments;
ANALYZE public.follows;
ANALYZE public.stories;
ANALYZE public.notifications;
ANALYZE public.activity_feed;
ANALYZE public.users;
ANALYZE public.hashtags;
ANALYZE public.album_hashtags;
ANALYZE public.search_history;
ANALYZE public.itineraries;
ANALYZE public.trip_planner_cache;
ANALYZE public.globe_reactions;

-- =============================================================================
-- VERIFICATION
-- =============================================================================
-- Run this to see all indexes created:
-- SELECT schemaname, tablename, indexname, indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
-- ORDER BY tablename, indexname;

-- =============================================================================
-- ROLLBACK INSTRUCTIONS
-- =============================================================================
-- To remove all indexes created by this migration:
--
-- DROP INDEX CONCURRENTLY IF EXISTS idx_albums_user_visibility_created;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_albums_user_status;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_albums_visibility_created;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_albums_location_coords;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_albums_country_code;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_albums_date_start;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_photos_album_order;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_photos_album_created;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_photos_user_created;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_photos_file_hash;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_likes_target;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_likes_user_target_type;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_likes_target_created;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_comments_target;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_comments_target_created;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_comments_user_created;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_stories_user_expires;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_stories_active;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_stories_created;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_notifications_user_unread;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_notifications_user_created;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_notifications_type;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_activity_feed_user_unread;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_activity_feed_type;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_activity_feed_target_user;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_users_active;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_users_username_lower;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_users_privacy_level;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_hashtags_trending;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_hashtags_tag_lower;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_album_hashtags_hashtag;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_album_hashtags_album;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_search_history_user_recent;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_itineraries_user;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_itineraries_favorites;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_trip_cache_key;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_trip_cache_accessed;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_globe_reactions_target_user;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_globe_reactions_unread;
