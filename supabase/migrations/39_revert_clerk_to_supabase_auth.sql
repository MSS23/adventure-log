-- ============================================================================
-- REVERT CLERK → SUPABASE AUTH
-- ============================================================================
-- This migration UNDOES migrations 31–38, which moved the database off
-- Supabase-native auth (auth.uid() + UUID user ids referencing auth.users)
-- and onto Clerk (public.clerk_user_id() JWT helper + TEXT user ids minted by
-- Clerk). This file returns the schema to the Supabase-native convention:
--
--   * public.users.id and every user-reference column → back to UUID.
--   * Foreign keys point at auth.users / public.users(id) again.
--   * RLS policies use auth.uid() directly instead of public.clerk_user_id().
--   * The auth.users signup trigger (create_profile_on_signup) is recreated.
--   * Storage RLS uses auth.uid()::text path-prefix checks again.
--   * Server functions that 31–38 changed from UUID→TEXT params are reverted
--     to UUID params.
--   * public.clerk_user_id() and the public.users_public view are dropped.
--
-- Reverses, specifically:
--   31_clerk_id_bridge.sql           — clerk_user_id(), uuid→text conversions,
--                                       owner_all / users_* policies, dropped
--                                       signup trigger.
--   32_clerk_storage_policies.sql    — storage.objects clerk policies.
--   33_public_read_policies.sql      — public-read policies + trip_pins.visited_by
--                                       uuid→text.
--   34_re_add_user_fks.sql           — FKs to public.users(id) (TEXT).
--   35_clerk_function_rewrites.sql   — function rewrites, globe_reactions
--                                       policies, users_public_read tighten,
--                                       column REVOKEs.
--   36_clerk_followups.sql           — friends-read policies, RLS-coverage
--                                       policies, users_public view, follows
--                                       CHECK, trip_pins role-gate policies,
--                                       trigger rewrites.
--   37_clerk_function_completeness.sql — m27/m28 function rewrites, m35 body
--                                       patches, privacy_level CHECK, reactions
--                                       index.
--   38_clerk_baseline_completeness.sql — record_album_view / get_discover_feed
--                                       / get_most_followed_users rewrites,
--                                       users_public view rebuild, buckets,
--                                       columns.
--
-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ MANDATORY WARNING — READ BEFORE RUNNING                                   ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║ 1. TEST THIS ON A SUPABASE BRANCH / STAGING DB FIRST. Do NOT run it       ║
-- ║    against production until you have verified it end-to-end on a copy.    ║
-- ║                                                                          ║
-- ║ 2. ORDER OF OPERATIONS relative to app deploy:                            ║
-- ║      a. Deploy the app code that uses Supabase Auth (auth.uid()-based     ║
-- ║         clients, no Clerk SDK in the request path) FIRST, OR deploy it    ║
-- ║         in the same window.                                               ║
-- ║      b. Run THIS migration.                                               ║
-- ║      c. Only AFTER this migration succeeds and the app is verified,       ║
-- ║         remove the Clerk env vars / Clerk webhook. Removing Clerk env     ║
-- ║         vars BEFORE this runs will break auth in the interim.             ║
-- ║                                                                          ║
-- ║ 3. DATA: existing rows hold Clerk TEXT ids like 'user_2abc...' which are  ║
-- ║    NOT castable to uuid. The ALTER ... ::uuid casts below WILL FAIL on    ║
-- ║    any real Clerk-era row. See the DESTRUCTIVE CLEAN-CUT block directly   ║
-- ║    below.                                                                 ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

BEGIN;

-- ----------------------------------------------------------------------------
-- 0. DATA STRATEGY — DESTRUCTIVE CLEAN-CUT (disabled by default)
-- ----------------------------------------------------------------------------
-- Every user-id column in this database currently holds Clerk subject strings
-- ('user_2abc...'). Those strings are NOT valid UUIDs. The
--   ALTER COLUMN ... SET DATA TYPE uuid USING <col>::uuid
-- statements in section 4 below will RAISE "invalid input syntax for type
-- uuid" on the FIRST such row and abort the whole transaction.
--
-- THE INTENDED PATH for a small / brand-new userbase is a clean cut: wipe all
-- user-owned data so the uuid casts run against empty tables. Uncomment the
-- single line below to do that. CASCADE removes every row that references
-- public.users via the FKs that migration 34 created.
--
--   *** THIS DELETES ALL USER DATA. For a tiny/new app this is the expected
--       cost of reverting Clerk. For production data with real users you must
--       NOT uncomment this — instead write a separate remap migration that
--       (a) creates auth.users rows for each Clerk user, (b) maps each Clerk
--       TEXT id to the new auth.users UUID, (c) rewrites every user-id column
--       to the mapped UUID, and only THEN runs the type change. That remap is
--       out of scope for this file. ***
--
-- DESTRUCTIVE CLEAN-CUT (uncomment for a small/new userbase — wipes all user-owned data):
-- TRUNCATE public.users CASCADE;

-- ----------------------------------------------------------------------------
-- 1. Drop the Clerk JWT helper (CASCADE) and the users_public view.
-- ----------------------------------------------------------------------------
-- clerk_user_id() is referenced by every Clerk-era policy. Dropping it CASCADE
-- removes those policies too; we explicitly DROP each one below as well so the
-- intent is auditable and the migration is robust if CASCADE behaviour drifts.
DROP FUNCTION IF EXISTS public.clerk_user_id() CASCADE;

-- users_public view (m36 step 5 / m38 step 4) — exposed a safe column subset
-- of public.users for other-user reads. Supabase-native code reads public.users
-- directly under RLS, so this view is no longer needed.
DROP VIEW IF EXISTS public.users_public;

-- ----------------------------------------------------------------------------
-- 2. Drop every RLS policy created by 31 / 33 / 34 / 35 / 36 that referenced
--    clerk_user_id(). Enumerated precisely from the migration files.
-- ----------------------------------------------------------------------------

-- --- migration 31 step 9 (owner_all on every user_id table + users.* ) -----
-- m31 attached "<table>_owner_all" to every public table that had a TEXT
-- user_id column (created via DO loop). Enumerate the known set explicitly.
DROP POLICY IF EXISTS "albums_owner_all"                    ON public.albums;
DROP POLICY IF EXISTS "photos_owner_all"                    ON public.photos;
DROP POLICY IF EXISTS "comments_owner_all"                  ON public.comments;
DROP POLICY IF EXISTS "likes_owner_all"                     ON public.likes;
DROP POLICY IF EXISTS "favorites_owner_all"                 ON public.favorites;
DROP POLICY IF EXISTS "wishlist_items_owner_all"            ON public.wishlist_items;
DROP POLICY IF EXISTS "stories_owner_all"                   ON public.stories;
DROP POLICY IF EXISTS "notifications_owner_all"             ON public.notifications;
DROP POLICY IF EXISTS "reactions_owner_all"                 ON public.reactions;
DROP POLICY IF EXISTS "ai_usage_owner_all"                  ON public.ai_usage;
DROP POLICY IF EXISTS "trip_planner_cache_owner_all"        ON public.trip_planner_cache;
DROP POLICY IF EXISTS "itineraries_owner_all"               ON public.itineraries;
DROP POLICY IF EXISTS "mentions_owner_all"                  ON public.mentions;
DROP POLICY IF EXISTS "search_history_owner_all"            ON public.search_history;
DROP POLICY IF EXISTS "activity_feed_owner_all"             ON public.activity_feed;
DROP POLICY IF EXISTS "two_factor_auth_owner_all"           ON public.two_factor_auth;
DROP POLICY IF EXISTS "check_ins_owner_all"                 ON public.check_ins;
DROP POLICY IF EXISTS "journal_entries_owner_all"           ON public.journal_entries;
DROP POLICY IF EXISTS "travel_profiles_owner_all"           ON public.travel_profiles;
DROP POLICY IF EXISTS "user_preferences_owner_all"          ON public.user_preferences;
DROP POLICY IF EXISTS "conversation_participants_owner_all" ON public.conversation_participants;
DROP POLICY IF EXISTS "message_read_receipts_owner_all"     ON public.message_read_receipts;
DROP POLICY IF EXISTS "album_collaborators_owner_all"       ON public.album_collaborators;
DROP POLICY IF EXISTS "user_achievements_owner_all"         ON public.user_achievements;
DROP POLICY IF EXISTS "user_challenges_owner_all"           ON public.user_challenges;
DROP POLICY IF EXISTS "push_subscriptions_owner_all"        ON public.push_subscriptions;
DROP POLICY IF EXISTS "trip_members_owner_all"              ON public.trip_members;
DROP POLICY IF EXISTS "trip_pins_owner_all"                 ON public.trip_pins;
DROP POLICY IF EXISTS "globe_reactions_owner_all"           ON public.globe_reactions;
DROP POLICY IF EXISTS "storage_cleanup_queue_owner_all"     ON public.storage_cleanup_queue;
DROP POLICY IF EXISTS "upload_queue_owner_all"              ON public.upload_queue;
DROP POLICY IF EXISTS "playlists_owner_all"                 ON public.playlists;

-- m31 public.users policies
DROP POLICY IF EXISTS users_self_write                      ON public.users;
DROP POLICY IF EXISTS users_public_read                     ON public.users; -- created m31, tightened m35

-- --- migration 33 (public-read + assorted) ----------------------------------
DROP POLICY IF EXISTS "albums_public_read"                  ON public.albums;
DROP POLICY IF EXISTS "albums_collaborator_read"            ON public.albums;
DROP POLICY IF EXISTS "photos_public_album_read"            ON public.photos;
DROP POLICY IF EXISTS "follows_public_read"                 ON public.follows;
DROP POLICY IF EXISTS "comments_public_target_read"         ON public.comments;
DROP POLICY IF EXISTS "comments_authenticated_insert_on_public" ON public.comments;
DROP POLICY IF EXISTS "likes_public_target_read"            ON public.likes;
DROP POLICY IF EXISTS "likes_authenticated_insert_on_public" ON public.likes;
DROP POLICY IF EXISTS "reactions_public_target_read"        ON public.reactions;
DROP POLICY IF EXISTS "user_achievements_public_read"       ON public.user_achievements;
DROP POLICY IF EXISTS "challenges_public_read"              ON public.challenges;
DROP POLICY IF EXISTS "hashtags_public_read"                ON public.hashtags;
DROP POLICY IF EXISTS "album_hashtags_public_read"          ON public.album_hashtags;
DROP POLICY IF EXISTS "trips_owner_all"                     ON public.trips;
DROP POLICY IF EXISTS "trips_member_read"                   ON public.trips;
DROP POLICY IF EXISTS "trips_public_read"                   ON public.trips;
DROP POLICY IF EXISTS "trip_members_member_read"            ON public.trip_members;
DROP POLICY IF EXISTS "trip_members_public_trip_read"       ON public.trip_members;
DROP POLICY IF EXISTS "trip_pins_member_read"               ON public.trip_pins;
DROP POLICY IF EXISTS "trip_pins_public_trip_read"          ON public.trip_pins;
DROP POLICY IF EXISTS "album_views_owner_read"              ON public.album_views;
DROP POLICY IF EXISTS "album_views_self_insert"             ON public.album_views;
-- m33 step 13 recreated album_collaborators_owner_all (album-owner variant)
DROP POLICY IF EXISTS "album_collaborators_owner_all"       ON public.album_collaborators;

-- --- migration 35 (globe_reactions + (re)created users_public_read) ----------
DROP POLICY IF EXISTS "globe_reactions_recipient_read"      ON public.globe_reactions;
DROP POLICY IF EXISTS "globe_reactions_recipient_update"    ON public.globe_reactions;
DROP POLICY IF EXISTS "globe_reactions_public_read"         ON public.globe_reactions;

-- --- migration 36 (friends-read + RLS-coverage write paths) ------------------
DROP POLICY IF EXISTS "albums_friends_read"                 ON public.albums;
DROP POLICY IF EXISTS "photos_friends_album_read"           ON public.photos;
DROP POLICY IF EXISTS "comments_friends_target_read"        ON public.comments;
DROP POLICY IF EXISTS "likes_friends_target_read"           ON public.likes;
DROP POLICY IF EXISTS "trip_pins_insert_editors"            ON public.trip_pins;
DROP POLICY IF EXISTS "trip_pins_update_editors"            ON public.trip_pins;
DROP POLICY IF EXISTS "trip_pins_delete_editors"            ON public.trip_pins;
DROP POLICY IF EXISTS "follows_self_insert"                 ON public.follows;
DROP POLICY IF EXISTS "follows_either_side_update"          ON public.follows;
DROP POLICY IF EXISTS "follows_self_delete"                 ON public.follows;
DROP POLICY IF EXISTS "user_blocks_either_side_read"        ON public.user_blocks;
DROP POLICY IF EXISTS "user_blocks_blocker_insert"          ON public.user_blocks;
DROP POLICY IF EXISTS "user_blocks_blocker_delete"          ON public.user_blocks;
DROP POLICY IF EXISTS "companion_requests_either_side_read"   ON public.companion_requests;
DROP POLICY IF EXISTS "companion_requests_sender_insert"      ON public.companion_requests;
DROP POLICY IF EXISTS "companion_requests_either_side_update" ON public.companion_requests;
DROP POLICY IF EXISTS "companion_requests_sender_delete"      ON public.companion_requests;
DROP POLICY IF EXISTS "reports_reporter_read"               ON public.reports;
DROP POLICY IF EXISTS "reports_reporter_insert"             ON public.reports;
DROP POLICY IF EXISTS "conversations_participant_read"      ON public.conversations;
DROP POLICY IF EXISTS "conversations_creator_insert"        ON public.conversations;
DROP POLICY IF EXISTS "conversations_participant_update"    ON public.conversations;
DROP POLICY IF EXISTS "conversations_creator_delete"        ON public.conversations;
DROP POLICY IF EXISTS "messages_participant_read"           ON public.messages;
DROP POLICY IF EXISTS "messages_sender_insert"              ON public.messages;
DROP POLICY IF EXISTS "messages_sender_update"              ON public.messages;
DROP POLICY IF EXISTS "messages_sender_delete"              ON public.messages;
DROP POLICY IF EXISTS "playlist_subscribers_self_all"       ON public.playlist_subscribers;
DROP POLICY IF EXISTS "playlist_collaborators_self_all"     ON public.playlist_collaborators;
DROP POLICY IF EXISTS "playlist_collaborators_peer_read"    ON public.playlist_collaborators;

-- Catch-all backstop: drop ANY remaining public.* policy whose expression
-- still references clerk_user_id() (e.g. on a table not enumerated above).
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        COALESCE(qual, '')       ILIKE '%clerk_user_id%'
        OR COALESCE(with_check, '') ILIKE '%clerk_user_id%'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
      r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 3. Drop the foreign keys migration 34 added to public.users(id).
--    They must go before we can change public.users.id's type back to uuid.
--    (m34 named them "<table>_<col>_fkey".) Drop every FK in public.* that
--    references public.users so the type change in section 4 is unblocked.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT con.conname AS constraint_name,
           nsp.nspname AS table_schema,
           cls.relname AS table_name
    FROM pg_constraint con
    JOIN pg_class      cls  ON cls.oid  = con.conrelid
    JOIN pg_namespace  nsp  ON nsp.oid  = cls.relnamespace
    JOIN pg_class      ref  ON ref.oid  = con.confrelid
    JOIN pg_namespace  rnsp ON rnsp.oid = ref.relnamespace
    WHERE con.contype = 'f'
      AND nsp.nspname  = 'public'
      AND rnsp.nspname = 'public'
      AND ref.relname  = 'users'
  LOOP
    EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT %I',
      r.table_schema, r.table_name, r.constraint_name);
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 4. Convert every user-reference column back to UUID, and public.users.id.
-- ----------------------------------------------------------------------------
-- These mirror, in reverse, the TEXT conversions in m31 step 5/6, m33 step 0,
-- and m35 step 4 (target_user_id columns). Each ALTER is wrapped in an
-- IF EXISTS guard so the migration is safe across schema variants.
--
-- NOTE: every "USING <col>::uuid" WILL FAIL if the column holds a Clerk
-- string. See section 0 (DESTRUCTIVE CLEAN-CUT). On an empty/clean table the
-- casts are no-ops type-wise.
DO $$
DECLARE
  r RECORD;
  -- Exact (table, column) pairs that m31/m33/m34/m35 converted uuid→text.
  cols CONSTANT text[][] := ARRAY[
    -- m31 step 5 (user_id + name-pattern columns) + m34's enumerated set
    ['albums','user_id'],
    ['photos','user_id'],
    ['comments','user_id'],
    ['likes','user_id'],
    ['favorites','user_id'],
    ['wishlist_items','user_id'],
    ['wishlist_items','shared_by_user_id'],
    ['stories','user_id'],
    ['notifications','user_id'],
    ['notifications','related_user_id'],
    ['reactions','user_id'],
    ['ai_usage','user_id'],
    ['trip_planner_cache','user_id'],
    ['itineraries','user_id'],
    ['mentions','user_id'],
    ['mentions','mentioned_user_id'],
    ['search_history','user_id'],
    ['activity_feed','user_id'],
    ['activity_feed','target_user_id'],   -- m35 step 4 (matched %_user_id in m31)
    ['two_factor_auth','user_id'],
    ['check_ins','user_id'],
    ['journal_entries','user_id'],
    ['travel_profiles','user_id'],
    ['user_preferences','user_id'],
    ['conversation_participants','user_id'],
    ['message_read_receipts','user_id'],
    ['album_collaborators','user_id'],
    ['album_collaborators','invited_by'],
    ['album_hashtags','added_by_user_id'],
    ['user_achievements','user_id'],
    ['user_challenges','user_id'],
    ['push_subscriptions','user_id'],
    ['trip_members','user_id'],
    ['trip_pins','user_id'],
    ['trip_pins','visited_by'],            -- m33 step 0
    ['trips','owner_id'],
    ['conversations','created_by'],
    ['follows','follower_id'],
    ['follows','following_id'],
    ['user_blocks','blocker_id'],
    ['user_blocks','blocked_id'],
    ['companion_requests','sender_id'],
    ['companion_requests','receiver_id'],
    ['messages','sender_id'],
    ['album_views','viewer_id'],
    ['error_events','user_id'],
    ['content_reports','reporter_id'],
    ['reports','reporter_id'],
    ['reports','reported_user_id'],
    ['reports','resolved_by'],
    ['storage_cleanup_queue','original_user_id'],
    ['globe_reactions','user_id'],         -- m35 step 4
    ['globe_reactions','target_user_id'],  -- m35 step 4
    ['playlists','user_id'],
    ['playlist_subscribers','user_id'],
    ['playlist_collaborators','user_id'],
    ['upload_queue','user_id']
  ];
  i int;
BEGIN
  FOR i IN 1 .. array_length(cols, 1) LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name   = cols[i][1]
        AND column_name  = cols[i][2]
        AND data_type    = 'text'
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I DROP DEFAULT',
        cols[i][1], cols[i][2]);
      EXECUTE format(
        'ALTER TABLE public.%I ALTER COLUMN %I SET DATA TYPE uuid USING %I::uuid',
        cols[i][1], cols[i][2], cols[i][2]);
    END IF;
  END LOOP;
END $$;

-- public.users.id back to UUID with a gen_random_uuid() default (matches the
-- Supabase-native baseline where id = auth.users(id)).
ALTER TABLE public.users
  ALTER COLUMN id SET DATA TYPE uuid USING id::uuid;
ALTER TABLE public.users
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- ----------------------------------------------------------------------------
-- 5. Re-add foreign keys (Supabase-native).
--    public.users.id references auth.users(id); every user-id column
--    references public.users(id). ON DELETE rules mirror migration 34's matrix
--    (CASCADE for owned/graph data, SET NULL for soft references/audit trails).
-- ----------------------------------------------------------------------------

-- public.users.id → auth.users(id) (the Supabase-native linkage m31 removed).
ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_id_fkey;
ALTER TABLE public.users
  ADD CONSTRAINT users_id_fkey
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Helper to re-add a FK only if the table+column exist.
CREATE OR REPLACE FUNCTION pg_temp.readd_user_fk(
  _table text, _column text, _on_delete text
) RETURNS void
LANGUAGE plpgsql AS $func$
DECLARE
  _constraint text := _table || '_' || _column || '_fkey';
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = _table AND column_name = _column
  ) THEN
    RETURN;
  END IF;
  EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I',
    _table, _constraint);
  EXECUTE format(
    'ALTER TABLE public.%I ADD CONSTRAINT %I '
    'FOREIGN KEY (%I) REFERENCES public.users(id) ON DELETE %s',
    _table, _constraint, _column, _on_delete);
END;
$func$;

-- CASCADE — owned data
SELECT pg_temp.readd_user_fk('albums',                  'user_id',           'CASCADE');
SELECT pg_temp.readd_user_fk('photos',                  'user_id',           'CASCADE');
SELECT pg_temp.readd_user_fk('comments',                'user_id',           'CASCADE');
SELECT pg_temp.readd_user_fk('likes',                   'user_id',           'CASCADE');
SELECT pg_temp.readd_user_fk('favorites',               'user_id',           'CASCADE');
SELECT pg_temp.readd_user_fk('wishlist_items',          'user_id',           'CASCADE');
SELECT pg_temp.readd_user_fk('stories',                 'user_id',           'CASCADE');
SELECT pg_temp.readd_user_fk('notifications',           'user_id',           'CASCADE');
SELECT pg_temp.readd_user_fk('reactions',               'user_id',           'CASCADE');
SELECT pg_temp.readd_user_fk('ai_usage',                'user_id',           'CASCADE');
SELECT pg_temp.readd_user_fk('trip_planner_cache',      'user_id',           'CASCADE');
SELECT pg_temp.readd_user_fk('itineraries',             'user_id',           'CASCADE');
SELECT pg_temp.readd_user_fk('mentions',                'user_id',           'CASCADE');
SELECT pg_temp.readd_user_fk('search_history',          'user_id',           'CASCADE');
SELECT pg_temp.readd_user_fk('activity_feed',           'user_id',           'CASCADE');
SELECT pg_temp.readd_user_fk('two_factor_auth',         'user_id',           'CASCADE');
SELECT pg_temp.readd_user_fk('check_ins',               'user_id',           'CASCADE');
SELECT pg_temp.readd_user_fk('journal_entries',         'user_id',           'CASCADE');
SELECT pg_temp.readd_user_fk('travel_profiles',         'user_id',           'CASCADE');
SELECT pg_temp.readd_user_fk('user_preferences',        'user_id',           'CASCADE');
SELECT pg_temp.readd_user_fk('conversation_participants','user_id',          'CASCADE');
SELECT pg_temp.readd_user_fk('message_read_receipts',   'user_id',           'CASCADE');
SELECT pg_temp.readd_user_fk('album_collaborators',     'user_id',           'CASCADE');
SELECT pg_temp.readd_user_fk('user_achievements',       'user_id',           'CASCADE');
SELECT pg_temp.readd_user_fk('user_challenges',         'user_id',           'CASCADE');
SELECT pg_temp.readd_user_fk('push_subscriptions',      'user_id',           'CASCADE');
SELECT pg_temp.readd_user_fk('trip_members',            'user_id',           'CASCADE');
SELECT pg_temp.readd_user_fk('trip_pins',              'user_id',           'CASCADE');

-- CASCADE — owners on differently-named columns
SELECT pg_temp.readd_user_fk('trips',                   'owner_id',          'CASCADE');
SELECT pg_temp.readd_user_fk('conversations',           'created_by',        'CASCADE');

-- CASCADE — graph tables (both sides)
SELECT pg_temp.readd_user_fk('follows',                 'follower_id',       'CASCADE');
SELECT pg_temp.readd_user_fk('follows',                 'following_id',      'CASCADE');
SELECT pg_temp.readd_user_fk('user_blocks',             'blocker_id',        'CASCADE');
SELECT pg_temp.readd_user_fk('user_blocks',             'blocked_id',        'CASCADE');
SELECT pg_temp.readd_user_fk('companion_requests',      'sender_id',         'CASCADE');
SELECT pg_temp.readd_user_fk('companion_requests',      'receiver_id',       'CASCADE');
SELECT pg_temp.readd_user_fk('messages',                'sender_id',         'CASCADE');

-- CASCADE — join-with-context
SELECT pg_temp.readd_user_fk('mentions',                'mentioned_user_id', 'CASCADE');
SELECT pg_temp.readd_user_fk('album_hashtags',          'added_by_user_id',  'CASCADE');
SELECT pg_temp.readd_user_fk('album_collaborators',     'invited_by',        'CASCADE');

-- SET NULL — soft references / audit trails
SELECT pg_temp.readd_user_fk('album_views',             'viewer_id',         'SET NULL');
SELECT pg_temp.readd_user_fk('wishlist_items',          'shared_by_user_id', 'SET NULL');
SELECT pg_temp.readd_user_fk('error_events',            'user_id',           'SET NULL');
SELECT pg_temp.readd_user_fk('content_reports',         'reporter_id',       'SET NULL');
SELECT pg_temp.readd_user_fk('trip_pins',              'visited_by',        'SET NULL');
SELECT pg_temp.readd_user_fk('reports',                 'reporter_id',       'SET NULL');
SELECT pg_temp.readd_user_fk('reports',                 'reported_user_id',  'SET NULL');
SELECT pg_temp.readd_user_fk('reports',                 'resolved_by',       'SET NULL');

DROP FUNCTION IF EXISTS pg_temp.readd_user_fk(text, text, text);

-- ----------------------------------------------------------------------------
-- 6. Recreate the auth.users signup trigger: create_profile_on_signup.
--    Inserts (id, email) into public.users on signup, with a generated
--    username; ON CONFLICT DO UPDATE keeps email fresh. SECURITY DEFINER so it
--    bypasses RLS, search_path locked.
-- ----------------------------------------------------------------------------
DROP TRIGGER  IF EXISTS create_profile_on_signup ON auth.users;
DROP TRIGGER  IF EXISTS on_auth_user_created     ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.users (id, email, username, display_name, privacy_level, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    'user_' || substr(replace(NEW.id::text, '-', ''), 1, 8),
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    'public',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
    SET email      = EXCLUDED.email,
        updated_at = NOW();
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Don't block signup if profile creation fails; log and continue.
    RAISE WARNING 'handle_new_user failed for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Supabase-native: creates a public.users profile when an auth.users row is '
  'inserted. Reverses the Clerk-webhook provisioning model.';

CREATE TRIGGER create_profile_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 7. Recreate owner RLS policies on public.users + every user-owned table,
--    using auth.uid() directly. RLS is (re)enabled per table.
-- ----------------------------------------------------------------------------

-- public.users — owner keyed off id; public profiles readable by all.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile"        ON public.users;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile"      ON public.users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.users;

CREATE POLICY "Enable insert for authenticated users only"
  ON public.users FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view their own profile"
  ON public.users FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Public profiles are viewable by everyone"
  ON public.users FOR SELECT TO anon, authenticated
  USING (privacy_level = 'public');

CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Owner ALL policy for every table that has a uuid user_id column (mirrors the
-- m31-era owner_all set, but keyed off auth.uid()).
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT t.tablename
    FROM pg_tables t
    JOIN information_schema.columns c
      ON c.table_schema = t.schemaname
     AND c.table_name   = t.tablename
    WHERE t.schemaname = 'public'
      AND c.column_name = 'user_id'
      AND c.data_type   = 'uuid'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
      r.tablename || '_owner_all', r.tablename);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated '
      'USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())',
      r.tablename || '_owner_all', r.tablename
    );
  END LOOP;
END $$;

-- trips uses owner_id, not user_id — give it its own owner policy.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='trips') THEN
    EXECUTE 'ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "trips_owner_all" ON public.trips';
    EXECUTE 'CREATE POLICY "trips_owner_all" ON public.trips FOR ALL TO authenticated '
            'USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid())';
  END IF;
END $$;

-- Public-read for albums/photos so world-readable surfaces work under Supabase
-- auth (these were created by m33 keyed off clerk_user_id / visibility; restore
-- the visibility-based versions).
DROP POLICY IF EXISTS "albums_public_read"       ON public.albums;
CREATE POLICY "albums_public_read"
  ON public.albums FOR SELECT TO anon, authenticated
  USING (visibility = 'public');

DROP POLICY IF EXISTS "photos_public_album_read" ON public.photos;
CREATE POLICY "photos_public_album_read"
  ON public.photos FOR SELECT TO anon, authenticated
  USING (
    EXISTS (SELECT 1 FROM public.albums a
            WHERE a.id = photos.album_id AND a.visibility = 'public')
  );

-- ----------------------------------------------------------------------------
-- 8. Restore storage RLS to auth.uid()-based path-prefix checks (reverses m32).
--    Convention: first folder segment of the object name = the owner uuid.
-- ----------------------------------------------------------------------------
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop m32's clerk policies.
DROP POLICY IF EXISTS "photos_public_read"   ON storage.objects;
DROP POLICY IF EXISTS "photos_owner_insert"  ON storage.objects;
DROP POLICY IF EXISTS "photos_owner_update"  ON storage.objects;
DROP POLICY IF EXISTS "photos_owner_delete"  ON storage.objects;
DROP POLICY IF EXISTS "avatars_public_read"  ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_delete" ON storage.objects;
DROP POLICY IF EXISTS "covers_public_read"   ON storage.objects;
DROP POLICY IF EXISTS "covers_owner_insert"  ON storage.objects;
DROP POLICY IF EXISTS "covers_owner_update"  ON storage.objects;
DROP POLICY IF EXISTS "covers_owner_delete"  ON storage.objects;

-- photos bucket
CREATE POLICY "photos_public_read"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'photos');
CREATE POLICY "photos_owner_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'photos'
    AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "photos_owner_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'photos'
    AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'photos'
    AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "photos_owner_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'photos'
    AND (storage.foldername(name))[1] = auth.uid()::text);

-- avatars bucket
CREATE POLICY "avatars_public_read"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'avatars');
CREATE POLICY "avatars_owner_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars_owner_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars_owner_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text);

-- covers bucket
CREATE POLICY "covers_public_read"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'covers');
CREATE POLICY "covers_owner_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'covers'
    AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "covers_owner_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'covers'
    AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'covers'
    AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "covers_owner_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'covers'
    AND (storage.foldername(name))[1] = auth.uid()::text);

-- ----------------------------------------------------------------------------
-- 9. Revert server functions 35/37/38 changed from UUID→TEXT params back to
--    UUID. We DROP the TEXT-signature variants and CREATE the UUID variants.
--    auth.uid() (UUID) is the Supabase-native source of the caller's id.
-- ----------------------------------------------------------------------------

-- --- m38: record_album_view, get_discover_feed, get_most_followed_users -----
DROP FUNCTION IF EXISTS public.record_album_view(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.record_album_view(
  p_album_id UUID,
  p_viewer_id UUID
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.album_views (album_id, viewer_id, viewed_at)
  VALUES (p_album_id, p_viewer_id, NOW())
  ON CONFLICT (album_id, viewer_id, (viewed_at::date)) DO NOTHING;
  IF FOUND THEN
    UPDATE public.albums
    SET view_count = COALESCE(view_count, 0) + 1
    WHERE id = p_album_id;
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.record_album_view(UUID, UUID) TO authenticated;

DROP FUNCTION IF EXISTS public.get_discover_feed(TEXT, INTEGER, INTEGER);
CREATE OR REPLACE FUNCTION public.get_discover_feed(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  title TEXT,
  description TEXT,
  cover_photo_url TEXT,
  location_name TEXT,
  country_code TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  date_start TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  view_count INTEGER,
  like_count BIGINT,
  comment_count BIGINT,
  photo_count BIGINT,
  score DOUBLE PRECISION,
  owner_username TEXT,
  owner_display_name TEXT,
  owner_avatar_url TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.user_id,
    a.title,
    a.description,
    a.cover_photo_url,
    a.location_name,
    a.country_code,
    a.latitude,
    a.longitude,
    a.date_start,
    a.created_at,
    COALESCE(a.view_count, 0) AS view_count,
    COALESCE(l.like_count, 0) AS like_count,
    COALESCE(c.comment_count, 0) AS comment_count,
    COALESCE(ph.photo_count, 0) AS photo_count,
    (
      0.4 * GREATEST(0, 1.0 - EXTRACT(EPOCH FROM (NOW() - a.created_at)) / (30 * 86400))
      + 0.3 * LEAST(1.0, LN(GREATEST(1, COALESCE(l.like_count, 0)) + 1) / 5)
      + 0.2 * LEAST(1.0, LN(GREATEST(1, COALESCE(c.comment_count, 0)) + 1) / 4)
      + 0.1 * LEAST(1.0, LN(GREATEST(1, COALESCE(a.view_count, 0)) + 1) / 7)
    ) AS score,
    u.username AS owner_username,
    u.display_name AS owner_display_name,
    u.avatar_url AS owner_avatar_url
  FROM public.albums a
  INNER JOIN public.users u ON u.id = a.user_id
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::BIGINT AS like_count
    FROM public.likes WHERE target_type = 'album' AND target_id = a.id::text
  ) l ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::BIGINT AS comment_count
    FROM public.comments WHERE target_type = 'album' AND target_id = a.id::text
  ) c ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::BIGINT AS photo_count
    FROM public.photos WHERE album_id = a.id
  ) ph ON true
  WHERE
    (a.visibility = 'public' OR a.privacy = 'public')
    AND a.user_id <> p_user_id
    AND NOT EXISTS (
      SELECT 1 FROM public.follows f
      WHERE f.follower_id = p_user_id
        AND f.following_id = a.user_id
        AND f.status = 'accepted'
    )
    AND COALESCE(ph.photo_count, 0) > 0
    AND (a.status IS NULL OR a.status = 'published')
  ORDER BY score DESC, a.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_discover_feed(UUID, INTEGER, INTEGER) TO authenticated;

DROP FUNCTION IF EXISTS public.get_most_followed_users(INTEGER);
CREATE OR REPLACE FUNCTION public.get_most_followed_users(
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id              UUID,
  username        TEXT,
  display_name    TEXT,
  avatar_url      TEXT,
  follower_count  BIGINT
)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.username,
    u.display_name,
    u.avatar_url,
    COUNT(f.*)::BIGINT AS follower_count
  FROM public.follows f
  INNER JOIN public.users u ON u.id = f.following_id
  WHERE f.status = 'accepted'
    AND (u.deleted_at IS NULL)
  GROUP BY u.id, u.username, u.display_name, u.avatar_url
  ORDER BY follower_count DESC
  LIMIT p_limit;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_most_followed_users(INTEGER) TO authenticated, anon;

-- --- m37: m27/m28 helpers back to UUID --------------------------------------
DROP FUNCTION IF EXISTS public.record_user_activity(TEXT);
CREATE OR REPLACE FUNCTION public.record_user_activity(_user_id UUID)
RETURNS TABLE (current_streak_days INTEGER, longest_streak_days INTEGER, last_activity_date DATE)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  prev_date DATE; prev_streak INTEGER; prev_best INTEGER;
  today DATE := CURRENT_DATE; new_streak INTEGER;
BEGIN
  SELECT u.last_activity_date, u.current_streak_days, u.longest_streak_days
  INTO prev_date, prev_streak, prev_best
  FROM public.users u WHERE u.id = _user_id;

  IF prev_date IS NULL THEN new_streak := 1;
  ELSIF prev_date = today THEN new_streak := COALESCE(prev_streak, 1);
  ELSIF prev_date = today - INTERVAL '1 day' THEN new_streak := COALESCE(prev_streak, 0) + 1;
  ELSE new_streak := 1; END IF;

  UPDATE public.users u
  SET current_streak_days = new_streak,
      longest_streak_days = GREATEST(COALESCE(prev_best, 0), new_streak),
      last_activity_date  = today
  WHERE u.id = _user_id
  RETURNING u.current_streak_days, u.longest_streak_days, u.last_activity_date
  INTO current_streak_days, longest_streak_days, last_activity_date;
  RETURN NEXT;
END;
$$;
GRANT EXECUTE ON FUNCTION public.record_user_activity(UUID) TO authenticated;

DROP FUNCTION IF EXISTS public.find_overlap_album(TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION);
CREATE OR REPLACE FUNCTION public.find_overlap_album(
  _user_id UUID, _location_name TEXT, _latitude DOUBLE PRECISION, _longitude DOUBLE PRECISION
)
RETURNS TABLE (album_id UUID, title TEXT, date_start DATE, distance_km DOUBLE PRECISION)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT
    a.id AS album_id, a.title, a.date_start,
    CASE
      WHEN _latitude IS NOT NULL AND _longitude IS NOT NULL AND a.latitude IS NOT NULL
      THEN 6371.0 * 2 * ASIN(SQRT(
        POWER(SIN(RADIANS((_latitude - a.latitude) / 2)), 2) +
        COS(RADIANS(a.latitude)) * COS(RADIANS(_latitude)) *
        POWER(SIN(RADIANS((_longitude - a.longitude) / 2)), 2)))
      ELSE NULL
    END AS distance_km
  FROM public.albums a
  WHERE a.user_id = _user_id
    AND (
      (_location_name IS NOT NULL AND a.location_name IS NOT NULL
        AND (LOWER(a.location_name) LIKE '%' || LOWER(split_part(_location_name, ',', 1)) || '%'
             OR LOWER(split_part(_location_name, ',', 1)) LIKE '%' || LOWER(split_part(a.location_name, ',', 1)) || '%'))
      OR (_latitude IS NOT NULL AND _longitude IS NOT NULL AND a.latitude IS NOT NULL
        AND 6371.0 * 2 * ASIN(SQRT(
          POWER(SIN(RADIANS((_latitude - a.latitude) / 2)), 2) +
          COS(RADIANS(a.latitude)) * COS(RADIANS(_latitude)) *
          POWER(SIN(RADIANS((_longitude - a.longitude) / 2)), 2))) < 25)
    )
  ORDER BY a.date_start ASC NULLS LAST
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.find_overlap_album(UUID, TEXT, DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated;

DROP FUNCTION IF EXISTS public.auto_complete_expired_trips(TEXT);
CREATE OR REPLACE FUNCTION public.auto_complete_expired_trips(_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE updated_count INTEGER;
BEGIN
  UPDATE public.trips SET status = 'completed'
  WHERE owner_id = _user_id AND status IN ('planning', 'live')
    AND end_date IS NOT NULL AND end_date < CURRENT_DATE;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;
GRANT EXECUTE ON FUNCTION public.auto_complete_expired_trips(UUID) TO authenticated;

DROP FUNCTION IF EXISTS public.auto_activate_current_trips(TEXT);
CREATE OR REPLACE FUNCTION public.auto_activate_current_trips(_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE updated_count INTEGER;
BEGIN
  UPDATE public.trips SET status = 'live'
  WHERE owner_id = _user_id AND status = 'planning'
    AND start_date IS NOT NULL AND start_date <= CURRENT_DATE
    AND (end_date IS NULL OR end_date >= CURRENT_DATE);
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;
GRANT EXECUTE ON FUNCTION public.auto_activate_current_trips(UUID) TO authenticated;

DROP FUNCTION IF EXISTS public.get_memory_albums(TEXT);
CREATE OR REPLACE FUNCTION public.get_memory_albums(_user_id UUID)
RETURNS TABLE (
  id UUID, title TEXT, location_name TEXT, country_code TEXT,
  date_start DATE, cover_photo_url TEXT, years_ago INTEGER
)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT a.id, a.title, a.location_name, a.country_code, a.date_start,
         a.cover_photo_url,
         EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.date_start))::INTEGER AS years_ago
  FROM public.albums a
  WHERE a.user_id = _user_id
    AND a.date_start IS NOT NULL
    AND EXTRACT(MONTH FROM a.date_start) = EXTRACT(MONTH FROM CURRENT_DATE)
    AND EXTRACT(DAY FROM a.date_start) = EXTRACT(DAY FROM CURRENT_DATE)
    AND a.date_start < CURRENT_DATE
  ORDER BY a.date_start DESC;
$$;
GRANT EXECUTE ON FUNCTION public.get_memory_albums(UUID) TO authenticated;

DROP FUNCTION IF EXISTS public.get_travel_twins(TEXT, INTEGER);
CREATE OR REPLACE FUNCTION public.get_travel_twins(_user_id UUID, _limit INTEGER DEFAULT 10)
RETURNS TABLE (
  user_id UUID, username TEXT, display_name TEXT, avatar_url TEXT,
  overlap_count INTEGER, their_country_count INTEGER, my_country_count INTEGER
)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  WITH my_countries AS (
    SELECT DISTINCT country_code FROM public.albums
    WHERE user_id = _user_id AND country_code IS NOT NULL
  ),
  their_stats AS (
    SELECT a.user_id,
      COUNT(DISTINCT a.country_code) FILTER (
        WHERE a.country_code IN (SELECT country_code FROM my_countries)) AS overlap,
      COUNT(DISTINCT a.country_code) AS their_total
    FROM public.albums a
    WHERE a.user_id <> _user_id AND a.country_code IS NOT NULL AND a.visibility = 'public'
    GROUP BY a.user_id
  )
  SELECT u.id AS user_id, u.username, u.display_name, u.avatar_url,
         ts.overlap::INTEGER, ts.their_total::INTEGER,
         (SELECT COUNT(*)::INTEGER FROM my_countries)
  FROM their_stats ts
  JOIN public.users u ON u.id = ts.user_id
  WHERE ts.overlap > 0 AND u.privacy_level = 'public'
  ORDER BY ts.overlap DESC, ts.their_total DESC
  LIMIT _limit;
$$;
GRANT EXECUTE ON FUNCTION public.get_travel_twins(UUID, INTEGER) TO authenticated;

DROP FUNCTION IF EXISTS public.get_twin_recommendations(TEXT, TEXT, INTEGER);
CREATE OR REPLACE FUNCTION public.get_twin_recommendations(
  _user_id UUID, _twin_id UUID, _limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  album_id UUID, title TEXT, location_name TEXT, country_code TEXT,
  latitude DOUBLE PRECISION, longitude DOUBLE PRECISION,
  cover_photo_url TEXT, date_start DATE
)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  WITH my_locations AS (
    SELECT DISTINCT LOWER(location_name) AS loc FROM public.albums
    WHERE user_id = _user_id AND location_name IS NOT NULL
  )
  SELECT a.id AS album_id, a.title, a.location_name, a.country_code,
         a.latitude, a.longitude, a.cover_photo_url, a.date_start
  FROM public.albums a
  WHERE a.user_id = _twin_id AND a.visibility = 'public'
    AND a.location_name IS NOT NULL
    AND LOWER(a.location_name) NOT IN (SELECT loc FROM my_locations)
  ORDER BY a.created_at DESC
  LIMIT _limit;
$$;
GRANT EXECUTE ON FUNCTION public.get_twin_recommendations(UUID, UUID, INTEGER) TO authenticated;

-- --- m35: trip helpers, admin/user helpers, notification/reaction/follow ----
DROP FUNCTION IF EXISTS public.is_trip_member(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.is_trip_member(_trip_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (SELECT 1 FROM public.trip_members
    WHERE trip_id = _trip_id AND user_id = _user_id);
$$;
GRANT EXECUTE ON FUNCTION public.is_trip_member(UUID, UUID) TO authenticated;

DROP FUNCTION IF EXISTS public.can_edit_trip(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.can_edit_trip(_trip_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (SELECT 1 FROM public.trip_members
    WHERE trip_id = _trip_id AND user_id = _user_id AND role IN ('owner', 'editor'));
$$;
GRANT EXECUTE ON FUNCTION public.can_edit_trip(UUID, UUID) TO authenticated;

DROP FUNCTION IF EXISTS public.soft_delete_user(TEXT);
CREATE OR REPLACE FUNCTION public.soft_delete_user(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.users SET deleted_at = NOW() WHERE id = p_user_id;
  RETURN FOUND;
END;
$$;
GRANT EXECUTE ON FUNCTION public.soft_delete_user(UUID) TO authenticated;

DROP FUNCTION IF EXISTS public.restore_user_account(TEXT);
CREATE OR REPLACE FUNCTION public.restore_user_account(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.users SET deleted_at = NULL WHERE id = p_user_id;
  RETURN FOUND;
END;
$$;
GRANT EXECUTE ON FUNCTION public.restore_user_account(UUID) TO authenticated;

DROP FUNCTION IF EXISTS public.is_user_active(TEXT);
CREATE OR REPLACE FUNCTION public.is_user_active(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id AND deleted_at IS NULL);
END;
$$;
GRANT EXECUTE ON FUNCTION public.is_user_active(UUID) TO authenticated, anon;

DROP FUNCTION IF EXISTS public.can_delete_photo(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.can_delete_photo(p_photo_id UUID, p_user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.photos WHERE id = p_photo_id AND user_id = p_user_id);
END;
$$;
GRANT EXECUTE ON FUNCTION public.can_delete_photo(UUID, UUID) TO authenticated;

-- delete_photo_from_album: signature unchanged (UUID, UUID); body reverts
-- clerk_user_id() → auth.uid().
DROP FUNCTION IF EXISTS public.delete_photo_from_album(UUID, UUID);
CREATE OR REPLACE FUNCTION public.delete_photo_from_album(p_photo_id UUID, p_album_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM public.photos
  WHERE id = p_photo_id AND album_id = p_album_id AND user_id = auth.uid();
  RETURN FOUND;
END;
$$;
GRANT EXECUTE ON FUNCTION public.delete_photo_from_album(UUID, UUID) TO authenticated;

DROP FUNCTION IF EXISTS public.mark_all_notifications_read(TEXT);
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.notifications SET is_read = TRUE, read_at = NOW()
  WHERE user_id = p_user_id AND is_read = FALSE;
  RETURN FOUND;
END;
$$;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read(UUID) TO authenticated;

DROP FUNCTION IF EXISTS public.get_unread_notification_count(TEXT);
CREATE OR REPLACE FUNCTION public.get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp
AS $$
DECLARE v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.notifications
  WHERE user_id = p_user_id AND is_read = FALSE;
  RETURN v_count;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_unread_notification_count(UUID) TO authenticated;

DROP FUNCTION IF EXISTS public.create_notification(TEXT, TEXT, TEXT, UUID, UUID);
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID, p_type TEXT, p_related_user_id UUID DEFAULT NULL,
  p_related_album_id UUID DEFAULT NULL, p_related_comment_id UUID DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp
AS $$
DECLARE v_notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, type, related_user_id, related_album_id, related_comment_id)
  VALUES (p_user_id, p_type, p_related_user_id, p_related_album_id, p_related_comment_id)
  RETURNING id INTO v_notification_id;
  RETURN v_notification_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_notification(UUID, TEXT, UUID, UUID, UUID) TO authenticated;

-- get_unread_message_count: m36 rewrote the body to walk
-- conversation_participants (the recipient_id column never existed). We keep
-- that correct body but revert the parameter to UUID.
DROP FUNCTION IF EXISTS public.get_unread_message_count(TEXT);
CREATE OR REPLACE FUNCTION public.get_unread_message_count(p_user_id UUID)
RETURNS INTEGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp
AS $$
DECLARE v_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM public.messages m
  JOIN public.conversation_participants cp
    ON cp.conversation_id = m.conversation_id AND cp.user_id = p_user_id
  WHERE m.sender_id <> p_user_id
    AND m.created_at > COALESCE(cp.last_read_at, '-infinity'::timestamptz)
    AND COALESCE(m.is_deleted, FALSE) = FALSE;
  RETURN COALESCE(v_count, 0);
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_unread_message_count(UUID) TO authenticated;

DROP FUNCTION IF EXISTS public.toggle_reaction(TEXT, TEXT, UUID, TEXT);
CREATE OR REPLACE FUNCTION public.toggle_reaction(
  p_user_id UUID, p_target_type TEXT, p_target_id UUID, p_reaction_type TEXT
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp
AS $$
DECLARE v_existing_id UUID;
BEGIN
  SELECT id INTO v_existing_id FROM public.reactions
  WHERE user_id = p_user_id AND target_type = p_target_type
    AND target_id = p_target_id AND reaction_type = p_reaction_type;
  IF v_existing_id IS NOT NULL THEN
    DELETE FROM public.reactions WHERE id = v_existing_id;
    RETURN FALSE;
  ELSE
    INSERT INTO public.reactions (user_id, target_type, target_id, reaction_type)
    VALUES (p_user_id, p_target_type, p_target_id, p_reaction_type);
    RETURN TRUE;
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.toggle_reaction(UUID, TEXT, UUID, TEXT) TO authenticated;

DROP FUNCTION IF EXISTS public.get_user_reactions(TEXT, TEXT, UUID[]);
CREATE OR REPLACE FUNCTION public.get_user_reactions(
  p_user_id UUID, p_target_type TEXT, p_target_ids UUID[]
)
RETURNS TABLE(target_id UUID, reaction_type TEXT)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT reactions.target_id, reactions.reaction_type
  FROM public.reactions
  WHERE user_id = p_user_id AND target_type = p_target_type
    AND reactions.target_id = ANY(p_target_ids);
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_user_reactions(UUID, TEXT, UUID[]) TO authenticated;

-- get_unread_reaction_count: revert param to UUID; keep m37's target_type fix.
DROP FUNCTION IF EXISTS public.get_unread_reaction_count(TEXT);
CREATE OR REPLACE FUNCTION public.get_unread_reaction_count(p_user_id UUID)
RETURNS INTEGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp
AS $$
DECLARE v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.reactions
  WHERE target_type = 'album'
    AND target_id IN (SELECT id FROM public.albums WHERE user_id = p_user_id)
    AND is_read = FALSE;
  RETURN v_count;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_unread_reaction_count(UUID) TO authenticated;

DROP FUNCTION IF EXISTS public.mark_reactions_as_read(TEXT, UUID[]);
CREATE OR REPLACE FUNCTION public.mark_reactions_as_read(p_user_id UUID, p_target_ids UUID[])
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.reactions SET is_read = TRUE
  WHERE target_type = 'album' AND target_id = ANY(p_target_ids)
    AND target_id IN (SELECT id FROM public.albums WHERE user_id = p_user_id);
  RETURN FOUND;
END;
$$;
GRANT EXECUTE ON FUNCTION public.mark_reactions_as_read(UUID, UUID[]) TO authenticated;

DROP FUNCTION IF EXISTS public.get_reaction_stats(TEXT);
CREATE OR REPLACE FUNCTION public.get_reaction_stats(p_user_id UUID)
RETURNS TABLE(total_received BIGINT, by_type JSON)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT COUNT(*)::BIGINT AS total_received,
         JSON_OBJECT_AGG(reactions.reaction_type, COUNT(*)) AS by_type
  FROM public.reactions
  WHERE target_type = 'album'
    AND target_id IN (SELECT id FROM public.albums WHERE user_id = p_user_id)
  GROUP BY target_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_reaction_stats(UUID) TO authenticated;

DROP FUNCTION IF EXISTS public.accept_all_pending_follows(TEXT);
CREATE OR REPLACE FUNCTION public.accept_all_pending_follows(p_user_id UUID)
RETURNS INTEGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp
AS $$
DECLARE v_count INTEGER;
BEGIN
  UPDATE public.follows SET status = 'accepted', updated_at = NOW()
  WHERE following_id = p_user_id AND status = 'pending';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
GRANT EXECUTE ON FUNCTION public.accept_all_pending_follows(UUID) TO authenticated;

DROP FUNCTION IF EXISTS public.accept_follow_request(TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.accept_follow_request(p_follower_id UUID, p_following_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.follows SET status = 'accepted', updated_at = NOW()
  WHERE follower_id = p_follower_id AND following_id = p_following_id;
  RETURN FOUND;
END;
$$;
GRANT EXECUTE ON FUNCTION public.accept_follow_request(UUID, UUID) TO authenticated;

DROP FUNCTION IF EXISTS public.reject_follow_request(TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.reject_follow_request(p_follower_id UUID, p_following_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM public.follows
  WHERE follower_id = p_follower_id AND following_id = p_following_id;
  RETURN FOUND;
END;
$$;
GRANT EXECUTE ON FUNCTION public.reject_follow_request(UUID, UUID) TO authenticated;

DROP FUNCTION IF EXISTS public.get_pending_uploads(TEXT);
CREATE OR REPLACE FUNCTION public.get_pending_uploads(p_user_id UUID)
RETURNS TABLE(id UUID, file_name TEXT, file_size BIGINT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT upload_queue.id, upload_queue.file_name, upload_queue.file_size, upload_queue.created_at
  FROM public.upload_queue
  WHERE upload_queue.user_id = p_user_id AND upload_queue.status = 'pending'
  ORDER BY upload_queue.created_at DESC;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_pending_uploads(UUID) TO authenticated;

DROP FUNCTION IF EXISTS public.get_user_playlists(TEXT);
CREATE OR REPLACE FUNCTION public.get_user_playlists(p_user_id UUID)
RETURNS TABLE(id UUID, title TEXT, item_count INTEGER, subscriber_count INTEGER)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT playlists.id, playlists.title, playlists.item_count, playlists.subscriber_count
  FROM public.playlists WHERE playlists.user_id = p_user_id
  ORDER BY playlists.created_at DESC;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_user_playlists(UUID) TO authenticated;

-- get_user_dashboard_stats: revert param to UUID; keep m37's polymorphic
-- likes join fix.
DROP FUNCTION IF EXISTS public.get_user_dashboard_stats(TEXT);
CREATE OR REPLACE FUNCTION public.get_user_dashboard_stats(p_user_id UUID)
RETURNS TABLE(total_albums BIGINT, total_photos BIGINT, total_likes BIGINT, total_followers BIGINT)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM public.albums WHERE user_id = p_user_id)::BIGINT,
    (SELECT COUNT(*) FROM public.photos WHERE user_id = p_user_id)::BIGINT,
    (
      (SELECT COUNT(*) FROM public.likes
        WHERE target_type = 'album'
          AND target_id IN (SELECT id::text FROM public.albums WHERE user_id = p_user_id))
      +
      (SELECT COUNT(*) FROM public.likes
        WHERE target_type = 'photo'
          AND target_id IN (SELECT id::text FROM public.photos WHERE user_id = p_user_id))
    )::BIGINT,
    (SELECT COUNT(*) FROM public.follows
      WHERE following_id = p_user_id AND status = 'accepted')::BIGINT;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_user_dashboard_stats(UUID) TO authenticated;

COMMIT;

-- ============================================================================
-- POST-APPLY AUDIT (run manually after the migration succeeds)
-- ============================================================================
-- 1. No clerk helper remains:
--    SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--    WHERE n.nspname='public' AND p.proname='clerk_user_id';  -- expect: 0 rows
--
-- 2. No policy references clerk_user_id():
--    SELECT * FROM pg_policies
--    WHERE COALESCE(qual,'') ILIKE '%clerk_user_id%'
--       OR COALESCE(with_check,'') ILIKE '%clerk_user_id%';   -- expect: 0 rows
--
-- 3. public.users.id is uuid and FKs auth.users:
--    SELECT data_type FROM information_schema.columns
--    WHERE table_schema='public' AND table_name='users' AND column_name='id';  -- uuid
--
-- 4. No user-id columns remain TEXT:
--    SELECT table_name, column_name FROM information_schema.columns
--    WHERE table_schema='public' AND data_type='text'
--      AND (column_name='user_id' OR column_name LIKE '%\_user\_id' ESCAPE '\'
--           OR column_name IN ('owner_id','viewer_id','sender_id','receiver_id',
--             'created_by','invited_by','resolved_by','follower_id','following_id',
--             'blocker_id','blocked_id','reporter_id','reported_user_id','visited_by',
--             'target_user_id','related_user_id'));  -- expect: 0 rows
--
-- 5. Signup trigger is present:
--    SELECT tgname FROM pg_trigger WHERE tgrelid='auth.users'::regclass
--      AND tgname='create_profile_on_signup';  -- expect: 1 row
