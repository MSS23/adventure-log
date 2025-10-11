-- ============================================================================
-- COMPLETE DATABASE SCHEMA FIX
-- ============================================================================
-- This script migrates ALL foreign keys from 'profiles' table to 'users' table
-- and removes the duplicate 'profiles' table
-- ============================================================================

-- STEP 1: Verify both tables exist and have the same data
DO $$
DECLARE
  profiles_count INTEGER;
  users_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO profiles_count FROM public.profiles;
  SELECT COUNT(*) INTO users_count FROM public.users;

  RAISE NOTICE 'Profiles table: % rows', profiles_count;
  RAISE NOTICE 'Users table: % rows', users_count;
END $$;

-- STEP 2: Sync any missing users from profiles to users
INSERT INTO public.users (
  id, email, username, display_name, name, bio, avatar_url, website, location, privacy_level, created_at, updated_at
)
SELECT
  p.id,
  p.email,
  p.username,
  p.display_name,
  p.name,
  p.bio,
  p.avatar_url,
  p.website,
  p.location,
  p.privacy_level,
  p.created_at,
  p.updated_at
FROM public.profiles p
LEFT JOIN public.users u ON p.id = u.id
WHERE u.id IS NULL
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  username = EXCLUDED.username,
  display_name = EXCLUDED.display_name,
  name = EXCLUDED.name,
  bio = EXCLUDED.bio,
  avatar_url = EXCLUDED.avatar_url,
  website = EXCLUDED.website,
  location = EXCLUDED.location,
  privacy_level = EXCLUDED.privacy_level,
  updated_at = NOW();

-- STEP 3: Drop all foreign keys that reference profiles
DO $$
BEGIN
  -- comments
  ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_user_id_fkey;
  RAISE NOTICE 'Dropped: comments_user_id_fkey';

  -- favorites
  ALTER TABLE public.favorites DROP CONSTRAINT IF EXISTS favorites_user_id_fkey;
  RAISE NOTICE 'Dropped: favorites_user_id_fkey';

  -- followers
  ALTER TABLE public.followers DROP CONSTRAINT IF EXISTS followers_follower_id_fkey;
  ALTER TABLE public.followers DROP CONSTRAINT IF EXISTS followers_following_id_fkey;
  RAISE NOTICE 'Dropped: followers foreign keys';

  -- globe_reaction_settings
  ALTER TABLE public.globe_reaction_settings DROP CONSTRAINT IF EXISTS globe_reaction_settings_user_id_fkey;
  RAISE NOTICE 'Dropped: globe_reaction_settings_user_id_fkey';

  -- globe_reactions
  ALTER TABLE public.globe_reactions DROP CONSTRAINT IF EXISTS globe_reactions_user_id_fkey;
  ALTER TABLE public.globe_reactions DROP CONSTRAINT IF EXISTS globe_reactions_target_user_id_fkey;
  RAISE NOTICE 'Dropped: globe_reactions foreign keys';

  -- likes
  ALTER TABLE public.likes DROP CONSTRAINT IF EXISTS likes_user_id_fkey;
  RAISE NOTICE 'Dropped: likes_user_id_fkey';

  -- offline_map_packs
  ALTER TABLE public.offline_map_packs DROP CONSTRAINT IF EXISTS offline_map_packs_user_id_fkey;
  RAISE NOTICE 'Dropped: offline_map_packs_user_id_fkey';

  -- photos
  ALTER TABLE public.photos DROP CONSTRAINT IF EXISTS photos_user_id_fkey;
  RAISE NOTICE 'Dropped: photos_user_id_fkey';

  -- playlist_collaborators
  ALTER TABLE public.playlist_collaborators DROP CONSTRAINT IF EXISTS playlist_collaborators_user_id_fkey;
  RAISE NOTICE 'Dropped: playlist_collaborators_user_id_fkey';

  -- playlist_items
  ALTER TABLE public.playlist_items DROP CONSTRAINT IF EXISTS playlist_items_added_by_user_id_fkey;
  RAISE NOTICE 'Dropped: playlist_items_added_by_user_id_fkey';

  -- playlist_subscriptions
  ALTER TABLE public.playlist_subscriptions DROP CONSTRAINT IF EXISTS playlist_subscriptions_user_id_fkey;
  RAISE NOTICE 'Dropped: playlist_subscriptions_user_id_fkey';

  -- playlists
  ALTER TABLE public.playlists DROP CONSTRAINT IF EXISTS playlists_user_id_fkey;
  RAISE NOTICE 'Dropped: playlists_user_id_fkey';

  -- upload_queue
  ALTER TABLE public.upload_queue DROP CONSTRAINT IF EXISTS upload_queue_user_id_fkey;
  RAISE NOTICE 'Dropped: upload_queue_user_id_fkey';

  -- user_travel_stats
  ALTER TABLE public.user_travel_stats DROP CONSTRAINT IF EXISTS user_travel_stats_user_id_fkey;
  RAISE NOTICE 'Dropped: user_travel_stats_user_id_fkey';
END $$;

-- STEP 4: Add all foreign keys pointing to users table
DO $$
BEGIN
  -- comments
  ALTER TABLE public.comments
    ADD CONSTRAINT comments_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  RAISE NOTICE 'Added: comments_user_id_fkey → users';

  -- favorites
  ALTER TABLE public.favorites
    ADD CONSTRAINT favorites_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  RAISE NOTICE 'Added: favorites_user_id_fkey → users';

  -- followers
  ALTER TABLE public.followers
    ADD CONSTRAINT followers_follower_id_fkey
    FOREIGN KEY (follower_id) REFERENCES public.users(id) ON DELETE CASCADE;
  ALTER TABLE public.followers
    ADD CONSTRAINT followers_following_id_fkey
    FOREIGN KEY (following_id) REFERENCES public.users(id) ON DELETE CASCADE;
  RAISE NOTICE 'Added: followers foreign keys → users';

  -- globe_reaction_settings
  ALTER TABLE public.globe_reaction_settings
    ADD CONSTRAINT globe_reaction_settings_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  RAISE NOTICE 'Added: globe_reaction_settings_user_id_fkey → users';

  -- globe_reactions
  ALTER TABLE public.globe_reactions
    ADD CONSTRAINT globe_reactions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  ALTER TABLE public.globe_reactions
    ADD CONSTRAINT globe_reactions_target_user_id_fkey
    FOREIGN KEY (target_user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  RAISE NOTICE 'Added: globe_reactions foreign keys → users';

  -- likes
  ALTER TABLE public.likes
    ADD CONSTRAINT likes_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  RAISE NOTICE 'Added: likes_user_id_fkey → users';

  -- offline_map_packs
  ALTER TABLE public.offline_map_packs
    ADD CONSTRAINT offline_map_packs_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  RAISE NOTICE 'Added: offline_map_packs_user_id_fkey → users';

  -- photos
  ALTER TABLE public.photos
    ADD CONSTRAINT photos_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  RAISE NOTICE 'Added: photos_user_id_fkey → users';

  -- playlist_collaborators
  ALTER TABLE public.playlist_collaborators
    ADD CONSTRAINT playlist_collaborators_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  RAISE NOTICE 'Added: playlist_collaborators_user_id_fkey → users';

  -- playlist_items
  ALTER TABLE public.playlist_items
    ADD CONSTRAINT playlist_items_added_by_user_id_fkey
    FOREIGN KEY (added_by_user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  RAISE NOTICE 'Added: playlist_items_added_by_user_id_fkey → users';

  -- playlist_subscriptions
  ALTER TABLE public.playlist_subscriptions
    ADD CONSTRAINT playlist_subscriptions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  RAISE NOTICE 'Added: playlist_subscriptions_user_id_fkey → users';

  -- playlists
  ALTER TABLE public.playlists
    ADD CONSTRAINT playlists_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  RAISE NOTICE 'Added: playlists_user_id_fkey → users';

  -- upload_queue
  ALTER TABLE public.upload_queue
    ADD CONSTRAINT upload_queue_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  RAISE NOTICE 'Added: upload_queue_user_id_fkey → users';

  -- user_travel_stats
  ALTER TABLE public.user_travel_stats
    ADD CONSTRAINT user_travel_stats_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  RAISE NOTICE 'Added: user_travel_stats_user_id_fkey → users';
END $$;

-- STEP 5: Drop the profiles table (it's now redundant)
DROP TABLE IF EXISTS public.profiles CASCADE;

-- STEP 6: Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Final verification
DO $$
DECLARE
  fk_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO fk_count
  FROM information_schema.table_constraints
  WHERE constraint_type = 'FOREIGN KEY'
    AND constraint_schema = 'public'
    AND constraint_name LIKE '%_user_id_fkey'
    AND table_name IN ('comments', 'favorites', 'likes', 'photos', 'playlists');

  RAISE NOTICE '';
  RAISE NOTICE '=== MIGRATION COMPLETE ===';
  RAISE NOTICE '✓ All user foreign keys migrated to users table';
  RAISE NOTICE '✓ Profiles table dropped';
  RAISE NOTICE '✓ Found % user_id foreign keys', fk_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Hard refresh your app to see the changes!';
END $$;
