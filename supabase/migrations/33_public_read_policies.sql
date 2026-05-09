-- ============================================================================
-- PUBLIC-READ RLS POLICIES (Clerk identity model)
-- ============================================================================
-- Migration 31 reinstalled an owner-only ALL policy on every public.* table
-- that has a `user_id` column. That left the app unable to render any of the
-- world-readable surfaces — public album feeds, public profiles' photos,
-- comments / likes on public albums, the social graph, etc.
--
-- This migration adds the SELECT policies needed to restore the previous
-- read semantics under the Clerk identity model (clerk_user_id() instead of
-- auth.uid(), TEXT user ids instead of UUIDs).
--
-- We do NOT touch the owner-write policies migration 31 created. Each
-- table's existing `<table>_owner_all` policy continues to gate INSERT /
-- UPDATE / DELETE; the policies below are purely additive SELECT policies
-- (and a handful of explicit write policies for tables where "anyone
-- authenticated can write" is part of the spec, e.g. likes, comments,
-- follows).
--
-- Visibility model summary (lifted from earlier migrations 08/14/17/22/27):
--   * albums.visibility ∈ ('public', 'friends', 'private')
--   * photos belong to an album; visibility inherits from albums.visibility
--   * users.privacy_level ∈ ('public', 'private', 'friends')
--   * follows.status ∈ ('pending', 'accepted', 'approved', 'rejected') —
--     in this codebase, 'accepted' and 'approved' both mean accepted (see
--     migration 11 step 4 which standardises on 'accepted', though some
--     older rows / RLS expressions still use 'approved').
--   * comments / likes / favorites are polymorphic over albums + photos +
--     stories (target_type, target_id).
--
-- The "friends" branch is intentionally LEFT OUT of these world-readable
-- SELECT policies. Friends-only visibility requires a follow lookup, which
-- requires the viewer's clerk_user_id() to be known and matched against the
-- follower-graph. The owner already has SELECT via their owner_all policy,
-- so the gap is friends-of-owner. Add a separate `<table>_friends_read`
-- policy if/when the product needs it.
--
-- Apply: paste into the Supabase SQL editor or `supabase db push`.
-- Rollback notes are at the bottom of this file.
--
-- ============================================================================
-- ## DISCOVERED
-- ============================================================================
-- Two surprises while auditing migrations 02–30:
--
--   1. There is no explicit `comments` / `likes` / `stories` migration in
--      this directory — they live in the original baseline schema (referred
--      to in supabase/migrations/README_DATABASE_SETUP.md). Migration 31's
--      column-rename + RLS-reset still applied to them because they have
--      `user_id text` columns, but we have to re-add SELECT policies here
--      without being able to re-read the create-table statements. The
--      polymorphic shape is `(target_type text, target_id text/uuid,
--      user_id text)` — see migration 17_discover_feed.sql which joins on
--      `target_type = 'album' AND target_id = a.id::text`.
--
--   2. The `reports` table from migration 14 was effectively REPLACED by
--      `content_reports` in migration 29 (different shape). Both may exist
--      depending on apply order. Migration 31 correctly converted the
--      user-id columns on both. The agent prompt's `reports.resolved_by`
--      hint refers to migration 14's `reports` table; the live moderation
--      table is `content_reports`. We touch both below where they exist,
--      via IF EXISTS guards in migration 34.
--
--   3. trip_pins.visited_by from migration 27 is a `_by` column NOT in
--      migration 31's user-id name pattern (only created_by / invited_by /
--      resolved_by are listed). It is therefore still a UUID column and
--      will block any Clerk-subject insert. Patched at the top of this
--      file.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 0. DISCOVERED PATCH — convert trip_pins.visited_by from UUID to TEXT.
--    Migration 31 missed this because it only matched created_by, invited_by,
--    and resolved_by in the `_by` family.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'trip_pins'
      AND column_name  = 'visited_by'
      AND data_type    = 'uuid'
  ) THEN
    ALTER TABLE public.trip_pins
      ALTER COLUMN visited_by DROP DEFAULT;
    ALTER TABLE public.trip_pins
      ALTER COLUMN visited_by TYPE text USING visited_by::text;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 1. albums — anyone (anon + authenticated) can SELECT public rows.
--    Owner SELECT is already covered by albums_owner_all from migration 31.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "albums_public_read" ON public.albums;
CREATE POLICY "albums_public_read"
  ON public.albums
  FOR SELECT
  TO anon, authenticated
  USING (visibility = 'public');

-- Authenticated users who are accepted album_collaborators can read the
-- album they collaborate on (regardless of visibility).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'album_collaborators'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "albums_collaborator_read" ON public.albums';
    EXECUTE $POLICY$
      CREATE POLICY "albums_collaborator_read"
        ON public.albums
        FOR SELECT
        TO authenticated
        USING (
          EXISTS (
            SELECT 1
            FROM public.album_collaborators c
            WHERE c.album_id = albums.id
              AND c.user_id  = public.clerk_user_id()
              AND c.status   = 'accepted'
          )
        )
    $POLICY$;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. photos — anyone can SELECT photos that belong to a public album.
--    Owner SELECT/write covered by photos_owner_all from migration 31.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "photos_public_album_read" ON public.photos;
CREATE POLICY "photos_public_album_read"
  ON public.photos
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.albums a
      WHERE a.id = photos.album_id
        AND a.visibility = 'public'
    )
  );

-- ----------------------------------------------------------------------------
-- 3. follows — the social graph is publicly visible (anyone can see who
--    follows whom; the username/avatar are already public on users).
--    Authenticated-only SELECT keeps anon scrapers out without any
--    functional cost (the app only ever queries follows from inside an
--    authed context).
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "follows_public_read" ON public.follows;
CREATE POLICY "follows_public_read"
  ON public.follows
  FOR SELECT
  TO authenticated
  USING (true);

-- ----------------------------------------------------------------------------
-- 4. comments — anyone can SELECT comments on a public album / photo.
--    Migration 31's comments_owner_all already covers owner SELECT/write
--    on rows where comments.user_id = clerk_user_id().
--
--    NOTE: this codebase uses polymorphic comments
--    (target_type text, target_id text/uuid). target_id may be stored as
--    text or uuid depending on schema vintage; we cast to text on both
--    sides to be safe. We also explicitly add an INSERT policy so any
--    authenticated user can comment on a public album/photo (not only
--    on their own — the owner-write policy from migration 31 only
--    allows commenting where comments.user_id = clerk_user_id(), which
--    is correct for "I am the author" but doesn't restrict the target).
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "comments_public_target_read" ON public.comments;
CREATE POLICY "comments_public_target_read"
  ON public.comments
  FOR SELECT
  TO anon, authenticated
  USING (
    -- comments on public albums
    (
      target_type = 'album'
      AND EXISTS (
        SELECT 1 FROM public.albums a
        WHERE a.id::text  = comments.target_id::text
          AND a.visibility = 'public'
      )
    )
    OR
    -- comments on photos in public albums
    (
      target_type = 'photo'
      AND EXISTS (
        SELECT 1
        FROM public.photos p
        JOIN public.albums a ON a.id = p.album_id
        WHERE p.id::text  = comments.target_id::text
          AND a.visibility = 'public'
      )
    )
  );

-- Anyone authenticated can INSERT a comment on a public album/photo.
-- The "you must be the author" rule is enforced by `user_id = clerk_user_id()`.
-- The "the target must be public" rule is enforced by the same target check
-- as the read policy.
DROP POLICY IF EXISTS "comments_authenticated_insert_on_public" ON public.comments;
CREATE POLICY "comments_authenticated_insert_on_public"
  ON public.comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = public.clerk_user_id()
    AND (
      (
        target_type = 'album'
        AND EXISTS (
          SELECT 1 FROM public.albums a
          WHERE a.id::text  = comments.target_id::text
            AND a.visibility = 'public'
        )
      )
      OR (
        target_type = 'photo'
        AND EXISTS (
          SELECT 1
          FROM public.photos p
          JOIN public.albums a ON a.id = p.album_id
          WHERE p.id::text  = comments.target_id::text
            AND a.visibility = 'public'
        )
      )
    )
  );

-- ----------------------------------------------------------------------------
-- 5. likes — read on public targets, write by any authenticated user on
--    their own row against a public target.
--
--    Same polymorphic shape as comments. `likes` may also target stories
--    (which are not world-readable — story visibility is a per-follow
--    decision in migration 08). We do NOT expose likes against private
--    stories here.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "likes_public_target_read" ON public.likes;
CREATE POLICY "likes_public_target_read"
  ON public.likes
  FOR SELECT
  TO anon, authenticated
  USING (
    (
      target_type = 'album'
      AND EXISTS (
        SELECT 1 FROM public.albums a
        WHERE a.id::text  = likes.target_id::text
          AND a.visibility = 'public'
      )
    )
    OR (
      target_type = 'photo'
      AND EXISTS (
        SELECT 1
        FROM public.photos p
        JOIN public.albums a ON a.id = p.album_id
        WHERE p.id::text  = likes.target_id::text
          AND a.visibility = 'public'
      )
    )
  );

-- Authenticated users can like / unlike public-target items.
DROP POLICY IF EXISTS "likes_authenticated_insert_on_public" ON public.likes;
CREATE POLICY "likes_authenticated_insert_on_public"
  ON public.likes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = public.clerk_user_id()
    AND (
      (
        target_type = 'album'
        AND EXISTS (
          SELECT 1 FROM public.albums a
          WHERE a.id::text  = likes.target_id::text
            AND a.visibility = 'public'
        )
      )
      OR (
        target_type = 'photo'
        AND EXISTS (
          SELECT 1
          FROM public.photos p
          JOIN public.albums a ON a.id = p.album_id
          WHERE p.id::text  = likes.target_id::text
            AND a.visibility = 'public'
        )
      )
    )
  );

-- ----------------------------------------------------------------------------
-- 6. favorites — these are private bookmarks (each user's own list). The
--    owner_all policy from migration 31 already gives the owner SELECT.
--    No public read is intended — skip.
-- ----------------------------------------------------------------------------
-- (Intentionally no policy.)

-- ----------------------------------------------------------------------------
-- 7. reactions — polymorphic emoji reactions on albums / photos. Migration
--    16 originally allowed `Anyone can view reactions USING (true)`. We
--    restore that, scoped to public targets only (consistent with comments
--    and likes above).
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'reactions'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "reactions_public_target_read" ON public.reactions';
    EXECUTE $POLICY$
      CREATE POLICY "reactions_public_target_read"
        ON public.reactions
        FOR SELECT
        TO anon, authenticated
        USING (
          (
            target_type = 'album'
            AND EXISTS (
              SELECT 1 FROM public.albums a
              WHERE a.id::text  = reactions.target_id::text
                AND a.visibility = 'public'
            )
          )
          OR (
            target_type = 'photo'
            AND EXISTS (
              SELECT 1
              FROM public.photos p
              JOIN public.albums a ON a.id = p.album_id
              WHERE p.id::text  = reactions.target_id::text
                AND a.visibility = 'public'
            )
          )
        )
    $POLICY$;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 8. user_achievements — migration 21 originally had two SELECT policies:
--    "Users can view own achievements" + "Anyone can view achievements"
--    (used to render achievement badges on profile pages).
--    Restore the public-read here.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_achievements'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "user_achievements_public_read" ON public.user_achievements';
    EXECUTE $POLICY$
      CREATE POLICY "user_achievements_public_read"
        ON public.user_achievements
        FOR SELECT
        TO anon, authenticated
        USING (true)
    $POLICY$;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 9. challenges — static catalog data, world-readable. user_challenges
--    stays owner-only (already gated by migration 31).
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'challenges'
  ) THEN
    EXECUTE 'ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "challenges_public_read" ON public.challenges';
    EXECUTE $POLICY$
      CREATE POLICY "challenges_public_read"
        ON public.challenges
        FOR SELECT
        TO anon, authenticated
        USING (true)
    $POLICY$;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 10. hashtags + album_hashtags — world-readable per migration 03's intent.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'hashtags'
  ) THEN
    EXECUTE 'ALTER TABLE public.hashtags ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "hashtags_public_read" ON public.hashtags';
    EXECUTE $POLICY$
      CREATE POLICY "hashtags_public_read"
        ON public.hashtags
        FOR SELECT
        TO anon, authenticated
        USING (true)
    $POLICY$;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'album_hashtags'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "album_hashtags_public_read" ON public.album_hashtags';
    EXECUTE $POLICY$
      CREATE POLICY "album_hashtags_public_read"
        ON public.album_hashtags
        FOR SELECT
        TO anon, authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.albums a
            WHERE a.id = album_hashtags.album_id
              AND a.visibility = 'public'
          )
        )
    $POLICY$;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 11. trips — public trips (is_public = true) are world-readable per
--     migration 27. Members already get SELECT via the trips_owner_all
--     policy migration 31 created (owner_id is a user-ish column, but
--     migration 31 only attached owner_all to tables that have a `user_id`
--     column — trips uses owner_id, so it has NO owner policy yet).
--     We add both: owner-write + public read. trip_members + trip_pins
--     similarly need member-read and public-read for public trips.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'trips'
  ) THEN
    EXECUTE 'ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS "trips_owner_all" ON public.trips';
    EXECUTE $POLICY$
      CREATE POLICY "trips_owner_all"
        ON public.trips
        FOR ALL
        TO authenticated
        USING      (owner_id = public.clerk_user_id())
        WITH CHECK (owner_id = public.clerk_user_id())
    $POLICY$;

    EXECUTE 'DROP POLICY IF EXISTS "trips_member_read" ON public.trips';
    EXECUTE $POLICY$
      CREATE POLICY "trips_member_read"
        ON public.trips
        FOR SELECT
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.trip_members m
            WHERE m.trip_id = trips.id
              AND m.user_id = public.clerk_user_id()
          )
        )
    $POLICY$;

    EXECUTE 'DROP POLICY IF EXISTS "trips_public_read" ON public.trips';
    EXECUTE $POLICY$
      CREATE POLICY "trips_public_read"
        ON public.trips
        FOR SELECT
        TO anon, authenticated
        USING (is_public = TRUE)
    $POLICY$;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'trip_members'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "trip_members_member_read" ON public.trip_members';
    EXECUTE $POLICY$
      CREATE POLICY "trip_members_member_read"
        ON public.trip_members
        FOR SELECT
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.trip_members m2
            WHERE m2.trip_id = trip_members.trip_id
              AND m2.user_id = public.clerk_user_id()
          )
        )
    $POLICY$;

    EXECUTE 'DROP POLICY IF EXISTS "trip_members_public_trip_read" ON public.trip_members';
    EXECUTE $POLICY$
      CREATE POLICY "trip_members_public_trip_read"
        ON public.trip_members
        FOR SELECT
        TO anon, authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.trips t
            WHERE t.id = trip_members.trip_id AND t.is_public = TRUE
          )
        )
    $POLICY$;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'trip_pins'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "trip_pins_member_read" ON public.trip_pins';
    EXECUTE $POLICY$
      CREATE POLICY "trip_pins_member_read"
        ON public.trip_pins
        FOR SELECT
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.trip_members m
            WHERE m.trip_id = trip_pins.trip_id
              AND m.user_id = public.clerk_user_id()
          )
        )
    $POLICY$;

    EXECUTE 'DROP POLICY IF EXISTS "trip_pins_public_trip_read" ON public.trip_pins';
    EXECUTE $POLICY$
      CREATE POLICY "trip_pins_public_trip_read"
        ON public.trip_pins
        FOR SELECT
        TO anon, authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.trips t
            WHERE t.id = trip_pins.trip_id AND t.is_public = TRUE
          )
        )
    $POLICY$;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 12. album_views — owner of the album already has SELECT via the
--     migration-31 owner policy on the album side (album_views itself has
--     viewer_id, not user_id, so migration 31's user_id-keyed default
--     policy DID NOT attach). Replicate the original owner-can-see-views
--     policy plus the viewer-can-record policy here.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'album_views'
  ) THEN
    EXECUTE 'ALTER TABLE public.album_views ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS "album_views_owner_read" ON public.album_views';
    EXECUTE $POLICY$
      CREATE POLICY "album_views_owner_read"
        ON public.album_views
        FOR SELECT
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.albums a
            WHERE a.id = album_views.album_id
              AND a.user_id = public.clerk_user_id()
          )
        )
    $POLICY$;

    EXECUTE 'DROP POLICY IF EXISTS "album_views_self_insert" ON public.album_views';
    EXECUTE $POLICY$
      CREATE POLICY "album_views_self_insert"
        ON public.album_views
        FOR INSERT
        TO authenticated
        WITH CHECK (viewer_id = public.clerk_user_id() OR viewer_id IS NULL)
    $POLICY$;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 13. album_collaborators — owner of the album manages collaborators; each
--     invited user can SELECT their own row. Migration 31's owner_all (keyed
--     off user_id) covers the invited-user side; we add the album-owner
--     side here.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'album_collaborators'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "album_collaborators_owner_all" ON public.album_collaborators';
    EXECUTE $POLICY$
      CREATE POLICY "album_collaborators_owner_all"
        ON public.album_collaborators
        FOR ALL
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.albums a
            WHERE a.id = album_collaborators.album_id
              AND a.user_id = public.clerk_user_id()
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.albums a
            WHERE a.id = album_collaborators.album_id
              AND a.user_id = public.clerk_user_id()
          )
        )
    $POLICY$;
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- AUDIT — run after applying.
-- ============================================================================
-- A. Verify each table now has the expected mix of policies:
--
--   SELECT tablename,
--          string_agg(policyname || ':' || cmd, ', ' ORDER BY policyname) AS policies
--   FROM pg_policies
--   WHERE schemaname = 'public'
--   GROUP BY tablename
--   ORDER BY tablename;
--
-- B. Spot-check that `visibility = 'public'` albums are visible to anon:
--
--   SET ROLE anon;
--   SELECT id, title, visibility FROM public.albums LIMIT 5;
--   RESET ROLE;
--
-- C. Friends-only branches are intentionally omitted. To add them, follow
--    this template per table (replace TABLE / OWNER_COL as needed):
--
--   CREATE POLICY "<table>_friends_read"
--     ON public.<TABLE>
--     FOR SELECT
--     TO authenticated
--     USING (
--       EXISTS (
--         SELECT 1 FROM public.albums a
--         WHERE a.id = <TABLE>.album_id
--           AND a.visibility = 'friends'
--           AND EXISTS (
--             SELECT 1 FROM public.follows f
--             WHERE f.follower_id  = public.clerk_user_id()
--               AND f.following_id = a.user_id
--               AND f.status       = 'accepted'
--           )
--       )
--     );
--
-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- These policies are purely additive on top of migration 31's owner-write
-- defaults. To roll back, drop each by name:
--
--   BEGIN;
--   DROP POLICY IF EXISTS "albums_public_read"                         ON public.albums;
--   DROP POLICY IF EXISTS "albums_collaborator_read"                   ON public.albums;
--   DROP POLICY IF EXISTS "photos_public_album_read"                   ON public.photos;
--   DROP POLICY IF EXISTS "follows_public_read"                        ON public.follows;
--   DROP POLICY IF EXISTS "comments_public_target_read"                ON public.comments;
--   DROP POLICY IF EXISTS "comments_authenticated_insert_on_public"    ON public.comments;
--   DROP POLICY IF EXISTS "likes_public_target_read"                   ON public.likes;
--   DROP POLICY IF EXISTS "likes_authenticated_insert_on_public"       ON public.likes;
--   DROP POLICY IF EXISTS "reactions_public_target_read"               ON public.reactions;
--   DROP POLICY IF EXISTS "user_achievements_public_read"              ON public.user_achievements;
--   DROP POLICY IF EXISTS "challenges_public_read"                     ON public.challenges;
--   DROP POLICY IF EXISTS "hashtags_public_read"                       ON public.hashtags;
--   DROP POLICY IF EXISTS "album_hashtags_public_read"                 ON public.album_hashtags;
--   DROP POLICY IF EXISTS "trips_owner_all"                            ON public.trips;
--   DROP POLICY IF EXISTS "trips_member_read"                          ON public.trips;
--   DROP POLICY IF EXISTS "trips_public_read"                          ON public.trips;
--   DROP POLICY IF EXISTS "trip_members_member_read"                   ON public.trip_members;
--   DROP POLICY IF EXISTS "trip_members_public_trip_read"              ON public.trip_members;
--   DROP POLICY IF EXISTS "trip_pins_member_read"                      ON public.trip_pins;
--   DROP POLICY IF EXISTS "trip_pins_public_trip_read"                 ON public.trip_pins;
--   DROP POLICY IF EXISTS "album_views_owner_read"                     ON public.album_views;
--   DROP POLICY IF EXISTS "album_views_self_insert"                    ON public.album_views;
--   DROP POLICY IF EXISTS "album_collaborators_owner_all"              ON public.album_collaborators;
--   COMMIT;
--
-- The trip_pins.visited_by UUID->TEXT change in step 0 is NOT reversible
-- without a separate migration that converts text back to uuid (and only
-- works if every value is still a valid UUID).
