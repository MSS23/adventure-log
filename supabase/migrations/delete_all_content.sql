-- ============================================================================
-- DANGER: DELETE ALL USER CONTENT (Albums, Photos, Stories, and Related Data)
-- ============================================================================
--
-- This script will permanently delete ALL user-generated content including:
-- - All albums and their photos
-- - All stories
-- - All comments, likes, reactions
-- - All playlists and collaborations
-- - Upload queue entries
--
-- IMPORTANT: This does NOT delete:
-- - User accounts (users table)
-- - User settings (privacy, levels, stats)
-- - Reference data (countries, cities, islands)
-- - System configuration
--
-- ⚠️  WARNING: This action is IRREVERSIBLE. Back up your data first!
-- ============================================================================

-- Start transaction for safety
BEGIN;

-- ============================================================================
-- Step 1: Delete all dependent data (foreign key constraints)
-- ============================================================================

-- Delete globe reactions (depends on albums and users)
DELETE FROM public.globe_reactions;
RAISE NOTICE 'Deleted % globe reactions', (SELECT count(*) FROM public.globe_reactions);

-- Delete all comments (depends on albums and photos)
DELETE FROM public.comments;
RAISE NOTICE 'Deleted % comments', (SELECT count(*) FROM public.comments);

-- Delete all likes (depends on albums, photos, stories)
DELETE FROM public.likes;
RAISE NOTICE 'Deleted % likes', (SELECT count(*) FROM public.likes);

-- Delete all favorites (depends on albums, photos)
DELETE FROM public.favorites;
RAISE NOTICE 'Deleted % favorites', (SELECT count(*) FROM public.favorites);

-- Delete playlist items (depends on albums and playlists)
DELETE FROM public.playlist_items;
RAISE NOTICE 'Deleted % playlist items', (SELECT count(*) FROM public.playlist_items);

-- Delete playlist collaborators
DELETE FROM public.playlist_collaborators;
RAISE NOTICE 'Deleted % playlist collaborators', (SELECT count(*) FROM public.playlist_collaborators);

-- Delete playlist subscriptions
DELETE FROM public.playlist_subscriptions;
RAISE NOTICE 'Deleted % playlist subscriptions', (SELECT count(*) FROM public.playlist_subscriptions);

-- Delete all playlists
DELETE FROM public.playlists;
RAISE NOTICE 'Deleted % playlists', (SELECT count(*) FROM public.playlists);

-- Delete upload queue entries
DELETE FROM public.upload_queue;
RAISE NOTICE 'Deleted % upload queue entries', (SELECT count(*) FROM public.upload_queue);

-- ============================================================================
-- Step 2: Delete all stories (24-hour ephemeral content)
-- ============================================================================

DELETE FROM public.stories;
RAISE NOTICE 'Deleted % stories', (SELECT count(*) FROM public.stories);

-- ============================================================================
-- Step 3: Delete all photos (must be deleted before albums due to FK)
-- ============================================================================

-- Count photos before deletion
DO $$
DECLARE
    photo_count INTEGER;
BEGIN
    SELECT count(*) INTO photo_count FROM public.photos;
    RAISE NOTICE 'Deleting % photos...', photo_count;
END $$;

DELETE FROM public.photos;
RAISE NOTICE 'Deleted all photos';

-- ============================================================================
-- Step 4: Delete all albums
-- ============================================================================

-- Count albums before deletion
DO $$
DECLARE
    album_count INTEGER;
BEGIN
    SELECT count(*) INTO album_count FROM public.albums;
    RAISE NOTICE 'Deleting % albums...', album_count;
END $$;

DELETE FROM public.albums;
RAISE NOTICE 'Deleted all albums';

-- ============================================================================
-- Step 5: Reset user statistics (optional - keeps users but resets their stats)
-- ============================================================================

-- Reset user travel stats
UPDATE public.user_travel_stats
SET
    total_countries = 0,
    total_cities = 0,
    total_albums = 0,
    total_photos = 0,
    first_trip_date = NULL,
    last_trip_date = NULL,
    updated_at = now();
RAISE NOTICE 'Reset user travel stats';

-- Reset user levels
UPDATE public.user_levels
SET
    current_level = 1,
    current_title = 'Explorer',
    total_experience = 0,
    albums_created = 0,
    countries_visited = 0,
    photos_uploaded = 0,
    social_interactions = 0,
    updated_at = now();
RAISE NOTICE 'Reset user levels';

-- ============================================================================
-- Step 6: Vacuum to reclaim space (optional)
-- ============================================================================

VACUUM ANALYZE public.albums;
VACUUM ANALYZE public.photos;
VACUUM ANALYZE public.comments;
VACUUM ANALYZE public.likes;
VACUUM ANALYZE public.stories;
VACUUM ANALYZE public.playlists;

-- ============================================================================
-- Final summary
-- ============================================================================

DO $$
DECLARE
    remaining_albums INTEGER;
    remaining_photos INTEGER;
    remaining_stories INTEGER;
    remaining_comments INTEGER;
    remaining_likes INTEGER;
    user_count INTEGER;
BEGIN
    SELECT count(*) INTO remaining_albums FROM public.albums;
    SELECT count(*) INTO remaining_photos FROM public.photos;
    SELECT count(*) INTO remaining_stories FROM public.stories;
    SELECT count(*) INTO remaining_comments FROM public.comments;
    SELECT count(*) INTO remaining_likes FROM public.likes;
    SELECT count(*) INTO user_count FROM public.users WHERE deleted_at IS NULL;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'DELETION COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Remaining albums: %', remaining_albums;
    RAISE NOTICE 'Remaining photos: %', remaining_photos;
    RAISE NOTICE 'Remaining stories: %', remaining_stories;
    RAISE NOTICE 'Remaining comments: %', remaining_comments;
    RAISE NOTICE 'Remaining likes: %', remaining_likes;
    RAISE NOTICE 'Active users preserved: %', user_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE 'User accounts, settings, and reference data preserved';
END $$;

-- ============================================================================
-- COMMIT or ROLLBACK
-- ============================================================================
--
-- To execute this deletion:
--   COMMIT;
--
-- To undo and keep all data (if transaction is still open):
--   ROLLBACK;
-- ============================================================================

-- Uncomment the line below to actually execute the deletion:
-- COMMIT;

-- By default, this will rollback (safe mode)
ROLLBACK;

-- ============================================================================
-- NOTE: Storage Cleanup
-- ============================================================================
-- This script only deletes database records. To also delete uploaded files
-- from Supabase Storage, you need to manually empty the 'photos' bucket:
--
-- 1. Go to Supabase Dashboard > Storage > photos bucket
-- 2. Select all folders and delete them
-- OR run this query in the SQL editor:
--
-- DELETE FROM storage.objects WHERE bucket_id = 'photos';
--
-- ============================================================================
