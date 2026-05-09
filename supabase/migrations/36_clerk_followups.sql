-- ============================================================================
-- CLERK MIGRATION FOLLOW-UPS (closes gaps left by m31-m35)
-- ============================================================================
-- Migrations 31-35 cut Supabase auth out and rebuilt the schema around Clerk
-- (TEXT user ids + clerk_user_id() JWT helper + per-table RLS). Each one of
-- those migrations explicitly deferred a handful of items to keep the change
-- set reviewable. This migration closes them out:
--
--   * Friends-only SELECT branches on albums / photos / comments / likes
--     (deferred at m33 line 31-36).
--   * Rewrites get_unread_message_count() to walk conversation_participants
--     because the recipient_id column it referenced never existed in the
--     m14 messages schema (deferred at m35 FOLLOW-UPS #1).
--   * Picks 'accepted' as the canonical follows.status, normalises any
--     remaining 'approved' rows / function bodies, and adds a CHECK
--     constraint so future drift is caught at write time (deferred at m35
--     FOLLOW-UPS #2).
--   * Recreates the m26 trip-pin role gate that m31's blanket owner_all
--     policy and m33's owner/member policies don't replicate (deferred at
--     m35 FOLLOW-UPS #5).
--   * Adds a public.users_public view exposing only the safe column subset
--     so the next code-side pass can switch other-user reads off
--     public.users entirely (deferred at m35 FOLLOW-UPS #3).
--   * Discovery / coverage queries that flag any leftover RLS-enabled-but-
--     unpolicied tables, then patches the ones that the previous code
--     review listed.
--
-- Apply: paste into the Supabase SQL editor or `supabase db push`.
-- Rollback notes are at the bottom of this file.
--
-- ============================================================================
-- ## CODE-SIDE FOLLOW-UPS (NOT addressed in this SQL — for the next code pass)
-- ============================================================================
-- 1. src/lib/hooks/useMentions.ts:48 still selects `email` from public.users
--    in its mention search query. m35's column REVOKE means PostgREST returns
--    NULL for that column under anon / authenticated, which silently masks
--    a long-standing PII leak — but the .select() string still requests it.
--    Drop `email` from the select list.
--
-- 2. Migrate every other-user read on public.users to read from the new
--    public.users_public view created in step 5 below. Known callers:
--      * src/components/discover/CreatorsToFollowSection.tsx
--      * src/components/search/SearchBar.tsx
--      * src/components/leaderboard/Leaderboard.tsx (path may vary)
--      * src/components/explore/ExploreSearchResults.tsx
--      * src/lib/hooks/useMentions.ts (after #1)
--    Self-scoped reads (AuthProvider on user.id, dashboard) keep using
--    public.users directly.
--
-- ============================================================================
-- ## DISCOVERED
-- ============================================================================
-- 1. messages has NO recipient_id column (m14:33-46) — only sender_id and
--    conversation_id. The right rewrite of get_unread_message_count is to
--    count messages from conversations where the caller is a participant,
--    where messages.created_at > the participant's last_read_at, and where
--    sender_id != caller. message_read_receipts (m14:49-55) is a
--    per-message join, but conversation_participants.last_read_at gives
--    the same answer with a single join — preferred for the unread-count
--    use case.
--
-- 2. follows.status canonical value is 'accepted'. m11 step 4 normalises
--    'approved' → 'accepted' on apply; m11's CHECK constraint allows BOTH
--    so 'approved' can re-enter via newer triggers (m09's
--    notify_on_follow_accepted, auto_accept_follows_on_public,
--    handle_follow_request all still write 'approved'). We pick 'accepted'
--    as the single canonical state, rewrite the three triggers, normalise
--    any rows that re-drifted to 'approved', and tighten the CHECK
--    constraint to ('pending', 'accepted', 'rejected').
--
-- 3. trip_pins from m26 had three role-gated INSERT/UPDATE/DELETE policies
--    that required can_edit_trip(trip_id, user_id) — i.e. role IN
--    ('owner','editor'). m31 dropped them all; m31 step 9's owner_all
--    policy (keyed off user_id) and m33's trip_pins_member_read
--    (SELECT-only) DON'T re-impose the role gate. Result today: any trip
--    member who happens to be the row's user_id can write — even role =
--    'viewer' members on rows they previously created. We restore the
--    m26 role gate using the new TEXT-arg can_edit_trip() from m35.
--
-- 4. storage_cleanup_queue.original_user_id — m31 converted it to TEXT
--    (column ends in `_user_id`); m34 deliberately left the FK off because
--    the row needs to outlive the user it references. Verified post-m34:
--    column type IS text, no FK to public.users(id), policy gating is
--    via owner_all on user_id (the deletion-actor, not the historical
--    owner). Decision DOCUMENTED here, no further change needed.
--
-- 5. RLS coverage: the prompt's list of suspect tables is `follows`,
--    `user_blocks`, `companion_requests`, `reports`, `conversations`,
--    `messages`, `playlist_subscribers`, `playlist_collaborators`. Most
--    are already covered:
--      * follows               — m31 owner_all (user_id) DOES NOT match;
--                                m33 step 3 added follows_public_read +
--                                we also need write paths.
--      * user_blocks           — m31 owner_all DOES NOT match (no user_id
--                                column; uses blocker_id / blocked_id).
--      * companion_requests    — same shape (sender_id / receiver_id).
--      * conversations         — m31 owner_all DOES NOT match (uses
--                                created_by). Needs creator + participant
--                                policies.
--      * messages              — m31 owner_all DOES NOT match (uses
--                                sender_id). Needs participant-keyed
--                                policies.
--      * reports (m14)         — has reporter_id; m31's pattern listed
--                                'reporter_id' so the column was converted
--                                to TEXT, BUT m31 step 9's owner_all only
--                                attaches when the column is `user_id`.
--                                Still policyless.
--      * playlist_subscribers / playlist_collaborators — these tables are
--                                referenced by app code but have NO
--                                CREATE TABLE statement in this migration
--                                directory. They live in the baseline
--                                schema (referred to in
--                                README_DATABASE_SETUP.md). Discovery
--                                query at the top will surface whichever
--                                of them exists in the live DB; we add
--                                policies via IF EXISTS guards.
--
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 0. DISCOVERY — RLS-enabled tables in public.* with ZERO policies.
--    Anything surfaced here is silently inaccessible to authenticated and
--    anon roles (only service-role / table-owner can read). The patches
--    further down address the known suspects; if NOTICE output shows
--    something we don't handle, STOP and patch it before continuing.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
  v_count integer := 0;
BEGIN
  FOR r IN
    SELECT t.schemaname, t.tablename
    FROM pg_tables t
    WHERE t.schemaname = 'public'
      AND t.rowsecurity = TRUE
      AND NOT EXISTS (
        SELECT 1 FROM pg_policies p
        WHERE p.schemaname = t.schemaname
          AND p.tablename  = t.tablename
      )
    ORDER BY t.tablename
  LOOP
    v_count := v_count + 1;
    RAISE NOTICE 'RLS enabled, NO policies: %.%', r.schemaname, r.tablename;
  END LOOP;
  IF v_count = 0 THEN
    RAISE NOTICE 'Discovery: every RLS-enabled public.* table has at least one policy.';
  ELSE
    RAISE NOTICE 'Discovery: % RLS-enabled public.* tables had no policies before this migration ran.', v_count;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 1. FRIENDS-ONLY SELECT POLICIES
-- ----------------------------------------------------------------------------
-- m33 deliberately omitted the friends branch because it requires a
-- follow-graph lookup. These policies make rows with visibility = 'friends'
-- readable by accepted followers of the row's owner. Owners themselves
-- already have SELECT via the migration-31 owner_all policy.
--
-- The "accepted follower" predicate uses the canonical 'accepted' status
-- (see step 3 below).

-- albums.visibility = 'friends' → accepted followers of albums.user_id
DROP POLICY IF EXISTS "albums_friends_read" ON public.albums;
CREATE POLICY "albums_friends_read"
  ON public.albums
  FOR SELECT
  TO authenticated
  USING (
    visibility = 'friends'
    AND EXISTS (
      SELECT 1
      FROM public.follows f
      WHERE f.following_id = albums.user_id
        AND f.follower_id  = public.clerk_user_id()
        AND f.status       = 'accepted'
    )
  );

-- photos: inherit friends visibility from the parent album.
DROP POLICY IF EXISTS "photos_friends_album_read" ON public.photos;
CREATE POLICY "photos_friends_album_read"
  ON public.photos
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.albums a
      JOIN public.follows f
        ON f.following_id = a.user_id
       AND f.follower_id  = public.clerk_user_id()
       AND f.status       = 'accepted'
      WHERE a.id = photos.album_id
        AND a.visibility = 'friends'
    )
  );

-- comments on a friends-only album / photo (mirrors comments_public_target_read
-- shape from m33 but gated on the follow graph instead of `visibility = public`).
DROP POLICY IF EXISTS "comments_friends_target_read" ON public.comments;
CREATE POLICY "comments_friends_target_read"
  ON public.comments
  FOR SELECT
  TO authenticated
  USING (
    (
      target_type = 'album'
      AND EXISTS (
        SELECT 1
        FROM public.albums a
        JOIN public.follows f
          ON f.following_id = a.user_id
         AND f.follower_id  = public.clerk_user_id()
         AND f.status       = 'accepted'
        WHERE a.id::text  = comments.target_id::text
          AND a.visibility = 'friends'
      )
    )
    OR (
      target_type = 'photo'
      AND EXISTS (
        SELECT 1
        FROM public.photos p
        JOIN public.albums a ON a.id = p.album_id
        JOIN public.follows f
          ON f.following_id = a.user_id
         AND f.follower_id  = public.clerk_user_id()
         AND f.status       = 'accepted'
        WHERE p.id::text  = comments.target_id::text
          AND a.visibility = 'friends'
      )
    )
  );

-- likes on friends-only albums / photos.
DROP POLICY IF EXISTS "likes_friends_target_read" ON public.likes;
CREATE POLICY "likes_friends_target_read"
  ON public.likes
  FOR SELECT
  TO authenticated
  USING (
    (
      target_type = 'album'
      AND EXISTS (
        SELECT 1
        FROM public.albums a
        JOIN public.follows f
          ON f.following_id = a.user_id
         AND f.follower_id  = public.clerk_user_id()
         AND f.status       = 'accepted'
        WHERE a.id::text  = likes.target_id::text
          AND a.visibility = 'friends'
      )
    )
    OR (
      target_type = 'photo'
      AND EXISTS (
        SELECT 1
        FROM public.photos p
        JOIN public.albums a ON a.id = p.album_id
        JOIN public.follows f
          ON f.following_id = a.user_id
         AND f.follower_id  = public.clerk_user_id()
         AND f.status       = 'accepted'
        WHERE p.id::text  = likes.target_id::text
          AND a.visibility = 'friends'
      )
    )
  );

-- ----------------------------------------------------------------------------
-- 2. REWRITE get_unread_message_count(text) TO USE conversation_participants
-- ----------------------------------------------------------------------------
-- The body in m06/m09/m35 reads messages.recipient_id, which has never
-- existed in the m14 messages schema (m14 only defines sender_id +
-- conversation_id). Rewriting the function is preferable to adding a
-- redundant column: messages already pair with conversation_participants
-- via conversation_id, and conversation_participants.last_read_at gives a
-- direct unread-count answer.
--
-- Counts messages in any conversation the caller participates in, sent by
-- somebody other than the caller, after the caller's last_read_at. Excludes
-- soft-deleted messages.
DROP FUNCTION IF EXISTS public.get_unread_message_count(TEXT);
CREATE OR REPLACE FUNCTION public.get_unread_message_count(p_user_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM public.messages m
  JOIN public.conversation_participants cp
    ON cp.conversation_id = m.conversation_id
   AND cp.user_id         = p_user_id
  WHERE m.sender_id   <> p_user_id
    AND m.created_at  > COALESCE(cp.last_read_at, '-infinity'::timestamptz)
    AND COALESCE(m.is_deleted, FALSE) = FALSE;
  RETURN COALESCE(v_count, 0);
END;
$$;
COMMENT ON FUNCTION public.get_unread_message_count(TEXT) IS
  'Unread-message count for a Clerk subject. Walks conversation_participants.'
  ' Replaces the m06/m09/m35 body that referenced a non-existent recipient_id column.';
GRANT EXECUTE ON FUNCTION public.get_unread_message_count(TEXT) TO authenticated;

-- ----------------------------------------------------------------------------
-- 3. NORMALISE follows.status — pick 'accepted' as canonical
-- ----------------------------------------------------------------------------
-- Rationale: m11 step 4 already normalised the data once ('approved' →
-- 'accepted'). The drift since is from m09's three trigger functions, which
-- write 'approved' on follow auto-acceptance. We:
--   (a) re-run the data normalisation in case any rows drifted back,
--   (b) rewrite the three offending trigger function bodies, and
--   (c) tighten the CHECK constraint so future writes can't reintroduce
--       'approved'.
--
-- Canonical states going forward: ('pending', 'accepted', 'rejected').

-- (a) Normalise rows.
UPDATE public.follows
   SET status     = 'accepted',
       updated_at = NOW()
 WHERE status = 'approved';

-- (b) Rewrite the three trigger bodies that still write 'approved'.
--     m35 declared these "DELIBERATELY UNCHANGED" because the Clerk swap
--     didn't break them mechanically. Status-string drift is a separate
--     concern m36 owns.
CREATE OR REPLACE FUNCTION public.notify_on_follow_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status <> 'accepted') THEN
    INSERT INTO public.notifications (
      user_id,
      type,
      related_user_id,
      created_at
    ) VALUES (
      NEW.follower_id,
      'follow_accepted',
      NEW.following_id,
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$;
COMMENT ON FUNCTION public.notify_on_follow_accepted() IS
  'm36 rewrite: status comparison normalised to ''accepted'' (was ''approved'' in m09).';

CREATE OR REPLACE FUNCTION public.auto_accept_follows_on_public()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.privacy_level = 'public'
     AND (OLD.privacy_level IS NULL OR OLD.privacy_level <> 'public') THEN
    UPDATE public.follows
       SET status     = 'accepted',
           updated_at = NOW()
     WHERE following_id = NEW.id
       AND status       = 'pending';
  END IF;
  RETURN NEW;
END;
$$;
COMMENT ON FUNCTION public.auto_accept_follows_on_public() IS
  'm36 rewrite: writes ''accepted'' instead of ''approved''.';

CREATE OR REPLACE FUNCTION public.handle_follow_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF (SELECT privacy_level FROM public.users WHERE id = NEW.following_id) = 'public' THEN
    NEW.status := 'accepted';
  END IF;
  RETURN NEW;
END;
$$;
COMMENT ON FUNCTION public.handle_follow_request() IS
  'm36 rewrite: auto-accepts public-account follows as ''accepted'' (was ''approved'').';

-- (c) Tighten the CHECK constraint. m11's constraint
--     `follows_status_check` allows ('pending', 'accepted', 'approved',
--     'rejected'). Drop it and recreate without 'approved' so future drift
--     is a write-time error.
ALTER TABLE public.follows
  DROP CONSTRAINT IF EXISTS follows_status_check;

-- Defensive: also drop any prior version of our new constraint, so the
-- migration is safe to re-run.
ALTER TABLE public.follows
  DROP CONSTRAINT IF EXISTS follows_status_canonical_check;

ALTER TABLE public.follows
  ADD CONSTRAINT follows_status_canonical_check
  CHECK (status IN ('pending', 'accepted', 'rejected'));

-- ----------------------------------------------------------------------------
-- 4. RESTORE m26 trip-pin ROLE GATE
-- ----------------------------------------------------------------------------
-- m31 step 9 attached owner_all to trip_pins keyed off user_id, which lets
-- ANY trip member who happens to own the pin row write to it — including
-- role = 'viewer' members. m26's original behaviour was: only role IN
-- ('owner','editor') members could insert / update / delete pins (the
-- viewer role got SELECT-only). m33 didn't restore the gate.
--
-- Drop m31's blanket owner_all and replace it with role-aware
-- INSERT / UPDATE / DELETE policies using the new TEXT-arg can_edit_trip()
-- from m35. Read access stays as m33 set it (member_read +
-- public_trip_read).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'trip_pins'
  ) THEN
    -- Remove the over-permissive blanket policy installed by m31 step 9.
    EXECUTE 'DROP POLICY IF EXISTS "trip_pins_owner_all" ON public.trip_pins';

    -- Defensive cleanup — drop any prior versions of the policies we are
    -- about to create, so the migration is safe to re-run.
    EXECUTE 'DROP POLICY IF EXISTS "trip_pins_insert_editors" ON public.trip_pins';
    EXECUTE 'DROP POLICY IF EXISTS "trip_pins_update_editors" ON public.trip_pins';
    EXECUTE 'DROP POLICY IF EXISTS "trip_pins_delete_editors" ON public.trip_pins';

    -- INSERT: caller must be the row's user_id AND have an editor/owner role
    -- on the trip. Same shape as m26's trip_pins_insert_editors.
    EXECUTE $POLICY$
      CREATE POLICY "trip_pins_insert_editors"
        ON public.trip_pins
        FOR INSERT
        TO authenticated
        WITH CHECK (
          user_id = public.clerk_user_id()
          AND public.can_edit_trip(trip_id, public.clerk_user_id())
        )
    $POLICY$;

    -- UPDATE: pin author with editor/owner role, OR the trip owner (matches
    -- m26's trip_pins_update_own which let the trip owner update any pin).
    EXECUTE $POLICY$
      CREATE POLICY "trip_pins_update_editors"
        ON public.trip_pins
        FOR UPDATE
        TO authenticated
        USING (
          (
            user_id = public.clerk_user_id()
            AND public.can_edit_trip(trip_id, public.clerk_user_id())
          )
          OR EXISTS (
            SELECT 1 FROM public.trips t
            WHERE t.id = trip_pins.trip_id
              AND t.owner_id = public.clerk_user_id()
          )
        )
        WITH CHECK (
          (
            user_id = public.clerk_user_id()
            AND public.can_edit_trip(trip_id, public.clerk_user_id())
          )
          OR EXISTS (
            SELECT 1 FROM public.trips t
            WHERE t.id = trip_pins.trip_id
              AND t.owner_id = public.clerk_user_id()
          )
        )
    $POLICY$;

    -- DELETE: same gate as UPDATE (matches m26's trip_pins_delete_own).
    EXECUTE $POLICY$
      CREATE POLICY "trip_pins_delete_editors"
        ON public.trip_pins
        FOR DELETE
        TO authenticated
        USING (
          (
            user_id = public.clerk_user_id()
            AND public.can_edit_trip(trip_id, public.clerk_user_id())
          )
          OR EXISTS (
            SELECT 1 FROM public.trips t
            WHERE t.id = trip_pins.trip_id
              AND t.owner_id = public.clerk_user_id()
          )
        )
    $POLICY$;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 5. public.users_public VIEW — safe column subset for other-user reads
-- ----------------------------------------------------------------------------
-- m35 narrowed users_public_read with a soft-delete predicate and column-
-- level REVOKEs on email / email_notifications. The next step is a
-- view that exposes ONLY columns safe for any-authenticated-or-anon to
-- read, so app code can stop reaching for `users` directly when the caller
-- isn't the row's owner.
--
-- Columns chosen: id, username, display_name, avatar_url, bio, is_verified,
-- created_at. The view is SECURITY INVOKER (default) so the underlying RLS
-- on public.users still runs — m35's users_public_read predicate
-- (deleted_at IS NULL OR id = clerk_user_id()) gates which rows surface.
DROP VIEW IF EXISTS public.users_public;
CREATE VIEW public.users_public
WITH (security_invoker = true)
AS
SELECT
  u.id,
  u.username,
  u.display_name,
  u.avatar_url,
  u.bio,
  u.is_verified,
  u.created_at
FROM public.users u;

COMMENT ON VIEW public.users_public IS
  'Safe-column subset of public.users for other-user reads. RLS on the '
  'underlying table still applies (security_invoker = true). App callers '
  'that read other users'' rows should switch from public.users to this view.';

GRANT SELECT ON public.users_public TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 6. RLS COVERAGE — patch the previously-flagged policy-less tables
-- ----------------------------------------------------------------------------
-- Each table below was flagged in the prompt's audit list. m33 already
-- handled some of them (follows_public_read added in m33 step 3). The
-- patches below add the remaining write paths and cover tables m31's
-- owner_all rule didn't match because their owner column isn't user_id.

-- 6a. follows — m33 added follows_public_read (SELECT). Owners can write
-- their own row; updates / deletes are scoped to either side of the edge.
-- Replicates the m11 policy intent under the Clerk identity model.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'follows'
  ) THEN
    EXECUTE 'ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS "follows_self_insert" ON public.follows';
    EXECUTE $POLICY$
      CREATE POLICY "follows_self_insert"
        ON public.follows
        FOR INSERT
        TO authenticated
        WITH CHECK (follower_id = public.clerk_user_id())
    $POLICY$;

    EXECUTE 'DROP POLICY IF EXISTS "follows_either_side_update" ON public.follows';
    EXECUTE $POLICY$
      CREATE POLICY "follows_either_side_update"
        ON public.follows
        FOR UPDATE
        TO authenticated
        USING (
          follower_id  = public.clerk_user_id()
          OR following_id = public.clerk_user_id()
        )
        WITH CHECK (
          follower_id  = public.clerk_user_id()
          OR following_id = public.clerk_user_id()
        )
    $POLICY$;

    EXECUTE 'DROP POLICY IF EXISTS "follows_self_delete" ON public.follows';
    EXECUTE $POLICY$
      CREATE POLICY "follows_self_delete"
        ON public.follows
        FOR DELETE
        TO authenticated
        USING (follower_id = public.clerk_user_id())
    $POLICY$;
  END IF;
END $$;

-- 6b. user_blocks — owner is blocker_id (not user_id). Both sides can SEE
-- the block (the blocked user needs to know they were blocked); only the
-- blocker can INSERT or DELETE.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_blocks'
  ) THEN
    EXECUTE 'ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS "user_blocks_either_side_read" ON public.user_blocks';
    EXECUTE $POLICY$
      CREATE POLICY "user_blocks_either_side_read"
        ON public.user_blocks
        FOR SELECT
        TO authenticated
        USING (
          blocker_id = public.clerk_user_id()
          OR blocked_id = public.clerk_user_id()
        )
    $POLICY$;

    EXECUTE 'DROP POLICY IF EXISTS "user_blocks_blocker_insert" ON public.user_blocks';
    EXECUTE $POLICY$
      CREATE POLICY "user_blocks_blocker_insert"
        ON public.user_blocks
        FOR INSERT
        TO authenticated
        WITH CHECK (blocker_id = public.clerk_user_id())
    $POLICY$;

    EXECUTE 'DROP POLICY IF EXISTS "user_blocks_blocker_delete" ON public.user_blocks';
    EXECUTE $POLICY$
      CREATE POLICY "user_blocks_blocker_delete"
        ON public.user_blocks
        FOR DELETE
        TO authenticated
        USING (blocker_id = public.clerk_user_id())
    $POLICY$;
  END IF;
END $$;

-- 6c. companion_requests — graph table (sender_id / receiver_id). Both
-- sides can SELECT their thread; only the sender INSERTs; both can UPDATE
-- (receiver to accept/decline, sender to cancel); sender DELETEs.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'companion_requests'
  ) THEN
    EXECUTE 'ALTER TABLE public.companion_requests ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS "companion_requests_either_side_read" ON public.companion_requests';
    EXECUTE $POLICY$
      CREATE POLICY "companion_requests_either_side_read"
        ON public.companion_requests
        FOR SELECT
        TO authenticated
        USING (
          sender_id   = public.clerk_user_id()
          OR receiver_id = public.clerk_user_id()
        )
    $POLICY$;

    EXECUTE 'DROP POLICY IF EXISTS "companion_requests_sender_insert" ON public.companion_requests';
    EXECUTE $POLICY$
      CREATE POLICY "companion_requests_sender_insert"
        ON public.companion_requests
        FOR INSERT
        TO authenticated
        WITH CHECK (sender_id = public.clerk_user_id())
    $POLICY$;

    EXECUTE 'DROP POLICY IF EXISTS "companion_requests_either_side_update" ON public.companion_requests';
    EXECUTE $POLICY$
      CREATE POLICY "companion_requests_either_side_update"
        ON public.companion_requests
        FOR UPDATE
        TO authenticated
        USING (
          sender_id   = public.clerk_user_id()
          OR receiver_id = public.clerk_user_id()
        )
        WITH CHECK (
          sender_id   = public.clerk_user_id()
          OR receiver_id = public.clerk_user_id()
        )
    $POLICY$;

    EXECUTE 'DROP POLICY IF EXISTS "companion_requests_sender_delete" ON public.companion_requests';
    EXECUTE $POLICY$
      CREATE POLICY "companion_requests_sender_delete"
        ON public.companion_requests
        FOR DELETE
        TO authenticated
        USING (sender_id = public.clerk_user_id())
    $POLICY$;
  END IF;
END $$;

-- 6d. reports (legacy m14 moderation table). Owner column is reporter_id.
-- Reporters read + insert their own; resolution / admin paths go through
-- service-role (no policy needed).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'reports'
  ) THEN
    EXECUTE 'ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS "reports_reporter_read" ON public.reports';
    EXECUTE $POLICY$
      CREATE POLICY "reports_reporter_read"
        ON public.reports
        FOR SELECT
        TO authenticated
        USING (reporter_id = public.clerk_user_id())
    $POLICY$;

    EXECUTE 'DROP POLICY IF EXISTS "reports_reporter_insert" ON public.reports';
    EXECUTE $POLICY$
      CREATE POLICY "reports_reporter_insert"
        ON public.reports
        FOR INSERT
        TO authenticated
        WITH CHECK (reporter_id = public.clerk_user_id())
    $POLICY$;
  END IF;
END $$;

-- 6e. conversations — owner column is created_by. Participants read; any
-- participant can update conversation metadata (name, last_message_at);
-- the creator can delete.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'conversations'
  ) THEN
    EXECUTE 'ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS "conversations_participant_read" ON public.conversations';
    EXECUTE $POLICY$
      CREATE POLICY "conversations_participant_read"
        ON public.conversations
        FOR SELECT
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.conversation_participants cp
            WHERE cp.conversation_id = conversations.id
              AND cp.user_id         = public.clerk_user_id()
          )
        )
    $POLICY$;

    EXECUTE 'DROP POLICY IF EXISTS "conversations_creator_insert" ON public.conversations';
    EXECUTE $POLICY$
      CREATE POLICY "conversations_creator_insert"
        ON public.conversations
        FOR INSERT
        TO authenticated
        WITH CHECK (created_by = public.clerk_user_id())
    $POLICY$;

    EXECUTE 'DROP POLICY IF EXISTS "conversations_participant_update" ON public.conversations';
    EXECUTE $POLICY$
      CREATE POLICY "conversations_participant_update"
        ON public.conversations
        FOR UPDATE
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.conversation_participants cp
            WHERE cp.conversation_id = conversations.id
              AND cp.user_id         = public.clerk_user_id()
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.conversation_participants cp
            WHERE cp.conversation_id = conversations.id
              AND cp.user_id         = public.clerk_user_id()
          )
        )
    $POLICY$;

    EXECUTE 'DROP POLICY IF EXISTS "conversations_creator_delete" ON public.conversations';
    EXECUTE $POLICY$
      CREATE POLICY "conversations_creator_delete"
        ON public.conversations
        FOR DELETE
        TO authenticated
        USING (created_by = public.clerk_user_id())
    $POLICY$;
  END IF;
END $$;

-- 6f. messages — owner column is sender_id (m31's owner_all keyed off
-- user_id missed it). Participants in the conversation can SELECT; only
-- the sender can INSERT / UPDATE (their own draft / edit) / DELETE
-- (soft-delete via update is_deleted, but a hard DELETE policy is harmless).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'messages'
  ) THEN
    EXECUTE 'ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS "messages_participant_read" ON public.messages';
    EXECUTE $POLICY$
      CREATE POLICY "messages_participant_read"
        ON public.messages
        FOR SELECT
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.conversation_participants cp
            WHERE cp.conversation_id = messages.conversation_id
              AND cp.user_id         = public.clerk_user_id()
          )
        )
    $POLICY$;

    EXECUTE 'DROP POLICY IF EXISTS "messages_sender_insert" ON public.messages';
    EXECUTE $POLICY$
      CREATE POLICY "messages_sender_insert"
        ON public.messages
        FOR INSERT
        TO authenticated
        WITH CHECK (
          sender_id = public.clerk_user_id()
          AND EXISTS (
            SELECT 1 FROM public.conversation_participants cp
            WHERE cp.conversation_id = messages.conversation_id
              AND cp.user_id         = public.clerk_user_id()
          )
        )
    $POLICY$;

    EXECUTE 'DROP POLICY IF EXISTS "messages_sender_update" ON public.messages';
    EXECUTE $POLICY$
      CREATE POLICY "messages_sender_update"
        ON public.messages
        FOR UPDATE
        TO authenticated
        USING (sender_id = public.clerk_user_id())
        WITH CHECK (sender_id = public.clerk_user_id())
    $POLICY$;

    EXECUTE 'DROP POLICY IF EXISTS "messages_sender_delete" ON public.messages';
    EXECUTE $POLICY$
      CREATE POLICY "messages_sender_delete"
        ON public.messages
        FOR DELETE
        TO authenticated
        USING (sender_id = public.clerk_user_id())
    $POLICY$;
  END IF;
END $$;

-- 6g. playlist_subscribers / playlist_collaborators — these tables live in
-- the baseline schema (no CREATE TABLE in this directory). Discovery via
-- IF EXISTS; assume each has a `user_id` column for the participant. If
-- the column shape is different in the live DB this is a no-op (policy
-- creation will fail loudly and the migration will roll back, prompting
-- a follow-up patch with the actual shape).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'playlist_subscribers'
  ) THEN
    EXECUTE 'ALTER TABLE public.playlist_subscribers ENABLE ROW LEVEL SECURITY';

    -- Subscriber rows: each user manages their own subscription. Other
    -- users can read counts via aggregate queries through service-role;
    -- per-row PII (who subscribes to what) stays private.
    EXECUTE 'DROP POLICY IF EXISTS "playlist_subscribers_self_all" ON public.playlist_subscribers';
    EXECUTE $POLICY$
      CREATE POLICY "playlist_subscribers_self_all"
        ON public.playlist_subscribers
        FOR ALL
        TO authenticated
        USING (user_id = public.clerk_user_id())
        WITH CHECK (user_id = public.clerk_user_id())
    $POLICY$;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'playlist_collaborators'
  ) THEN
    EXECUTE 'ALTER TABLE public.playlist_collaborators ENABLE ROW LEVEL SECURITY';

    -- Collaborator rows: collaborator manages their own; other rows in the
    -- same playlist are readable to any collaborator on that playlist
    -- (mirrors album_collaborators read semantics from m33).
    EXECUTE 'DROP POLICY IF EXISTS "playlist_collaborators_self_all" ON public.playlist_collaborators';
    EXECUTE $POLICY$
      CREATE POLICY "playlist_collaborators_self_all"
        ON public.playlist_collaborators
        FOR ALL
        TO authenticated
        USING (user_id = public.clerk_user_id())
        WITH CHECK (user_id = public.clerk_user_id())
    $POLICY$;

    -- Also let collaborators read the full collaborator list of any
    -- playlist they're on.
    EXECUTE 'DROP POLICY IF EXISTS "playlist_collaborators_peer_read" ON public.playlist_collaborators';
    EXECUTE $POLICY$
      CREATE POLICY "playlist_collaborators_peer_read"
        ON public.playlist_collaborators
        FOR SELECT
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.playlist_collaborators pc2
            WHERE pc2.playlist_id = playlist_collaborators.playlist_id
              AND pc2.user_id     = public.clerk_user_id()
          )
        )
    $POLICY$;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 7. POST-PATCH DISCOVERY — re-run the policy-coverage check and report
-- ----------------------------------------------------------------------------
-- This NOTICE block is the "did we miss anything" backstop. If anything
-- still appears in the output after this migration applies, it needs a
-- separate follow-up — the patches above intentionally cover the prompt's
-- list of suspects only.
DO $$
DECLARE
  r RECORD;
  v_count integer := 0;
BEGIN
  FOR r IN
    SELECT t.schemaname, t.tablename
    FROM pg_tables t
    WHERE t.schemaname = 'public'
      AND t.rowsecurity = TRUE
      AND NOT EXISTS (
        SELECT 1 FROM pg_policies p
        WHERE p.schemaname = t.schemaname
          AND p.tablename  = t.tablename
      )
    ORDER BY t.tablename
  LOOP
    v_count := v_count + 1;
    RAISE NOTICE 'STILL policy-less after m36: %.%', r.schemaname, r.tablename;
  END LOOP;
  IF v_count = 0 THEN
    RAISE NOTICE 'Post-patch: every RLS-enabled public.* table has at least one policy.';
  ELSE
    RAISE NOTICE 'Post-patch: % tables remain policy-less — needs a follow-up migration.', v_count;
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- AUDIT — run after applying. Anything returned here is a leftover.
-- ============================================================================
-- A. Confirm no follows row holds the legacy 'approved' status:
--
--   SELECT status, COUNT(*) FROM public.follows GROUP BY status ORDER BY status;
--   -- expect: only 'pending', 'accepted', 'rejected'.
--
-- B. Confirm the new CHECK constraint is in place:
--
--   SELECT conname, pg_get_constraintdef(oid)
--   FROM pg_constraint
--   WHERE conrelid = 'public.follows'::regclass
--     AND contype  = 'c';
--   -- expect: follows_status_canonical_check: CHECK (status IN ('pending','accepted','rejected'))
--
-- C. Confirm get_unread_message_count returns 0 (no error) for a Clerk
--    subject that has no messages:
--
--   SELECT public.get_unread_message_count('user_test_clerk_id');
--
-- D. Confirm trip_pins write requires editor role. As a 'viewer' member:
--
--   SET LOCAL request.jwt.claim.sub TO 'user_<viewer_clerk_id>';
--   INSERT INTO public.trip_pins (trip_id, user_id, name, latitude, longitude)
--     VALUES ('<trip_uuid>', 'user_<viewer_clerk_id>', 'Test', 0, 0);
--   -- expect: new row violates row-level security policy
--
-- E. Confirm the public.users_public view returns expected columns and
--    enforces RLS via security_invoker:
--
--   SET ROLE anon;
--   SELECT column_name FROM information_schema.columns
--    WHERE table_schema = 'public' AND table_name = 'users_public'
--    ORDER BY ordinal_position;
--   -- expect: id, username, display_name, avatar_url, bio, is_verified, created_at
--   SELECT count(*) FROM public.users_public;
--   -- expect: same count as `SELECT count(*) FROM public.users WHERE deleted_at IS NULL`
--   RESET ROLE;
--
-- F. Re-run the policy-coverage check from step 0 / step 7 manually:
--
--   SELECT t.schemaname, t.tablename
--   FROM pg_tables t
--   WHERE t.schemaname = 'public'
--     AND t.rowsecurity = TRUE
--     AND NOT EXISTS (
--       SELECT 1 FROM pg_policies p
--       WHERE p.schemaname = t.schemaname AND p.tablename = t.tablename
--     )
--   ORDER BY t.tablename;
--   -- expect: empty result.
--
-- G. Friends-only spot-check. As a follower with status = 'accepted':
--
--   SET LOCAL request.jwt.claim.sub TO 'user_<follower_clerk_id>';
--   SELECT count(*) FROM public.albums WHERE visibility = 'friends';
--   -- expect: rows for users you follow (status = 'accepted'), zero otherwise.
--
-- ============================================================================
-- ## DELIBERATELY UNCHANGED
-- ============================================================================
-- 1. storage_cleanup_queue.original_user_id — m34 documented this as
--    intentionally unconstrained (audit row that needs to outlive the
--    user). m31 converted it to TEXT; no FK is correct; no policy change
--    needed.
--
-- 2. m35's users_public_read predicate (deleted_at IS NULL OR id =
--    clerk_user_id()) — left in place. The new public.users_public view
--    is layered on top; existing self-scoped reads against public.users
--    keep working.
--
-- 3. m35's column-level REVOKEs on email / email_notifications — left in
--    place. The new view simply doesn't expose those columns.
--
-- 4. notify_on_like / notify_on_comment / notify_on_follow — m35 verified
--    they survive the Clerk swap unchanged. They never wrote 'approved'
--    so they need no follows.status normalisation.
--
-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- This migration adds policies, rewrites a function, normalises
-- follows.status, recreates trigger function bodies, tightens a CHECK
-- constraint, and creates a view. To roll back:
--
--   BEGIN;
--   -- Friends-only policies
--   DROP POLICY IF EXISTS "albums_friends_read"             ON public.albums;
--   DROP POLICY IF EXISTS "photos_friends_album_read"       ON public.photos;
--   DROP POLICY IF EXISTS "comments_friends_target_read"    ON public.comments;
--   DROP POLICY IF EXISTS "likes_friends_target_read"       ON public.likes;
--
--   -- Trip-pin role gate (restore m31's blanket owner_all)
--   DROP POLICY IF EXISTS "trip_pins_insert_editors" ON public.trip_pins;
--   DROP POLICY IF EXISTS "trip_pins_update_editors" ON public.trip_pins;
--   DROP POLICY IF EXISTS "trip_pins_delete_editors" ON public.trip_pins;
--   CREATE POLICY "trip_pins_owner_all"
--     ON public.trip_pins
--     FOR ALL TO authenticated
--     USING      (user_id = public.clerk_user_id())
--     WITH CHECK (user_id = public.clerk_user_id());
--
--   -- View
--   DROP VIEW IF EXISTS public.users_public;
--
--   -- RLS coverage policies
--   DROP POLICY IF EXISTS "follows_self_insert"                 ON public.follows;
--   DROP POLICY IF EXISTS "follows_either_side_update"          ON public.follows;
--   DROP POLICY IF EXISTS "follows_self_delete"                 ON public.follows;
--   DROP POLICY IF EXISTS "user_blocks_either_side_read"        ON public.user_blocks;
--   DROP POLICY IF EXISTS "user_blocks_blocker_insert"          ON public.user_blocks;
--   DROP POLICY IF EXISTS "user_blocks_blocker_delete"          ON public.user_blocks;
--   DROP POLICY IF EXISTS "companion_requests_either_side_read"   ON public.companion_requests;
--   DROP POLICY IF EXISTS "companion_requests_sender_insert"      ON public.companion_requests;
--   DROP POLICY IF EXISTS "companion_requests_either_side_update" ON public.companion_requests;
--   DROP POLICY IF EXISTS "companion_requests_sender_delete"      ON public.companion_requests;
--   DROP POLICY IF EXISTS "reports_reporter_read"               ON public.reports;
--   DROP POLICY IF EXISTS "reports_reporter_insert"             ON public.reports;
--   DROP POLICY IF EXISTS "conversations_participant_read"      ON public.conversations;
--   DROP POLICY IF EXISTS "conversations_creator_insert"        ON public.conversations;
--   DROP POLICY IF EXISTS "conversations_participant_update"    ON public.conversations;
--   DROP POLICY IF EXISTS "conversations_creator_delete"        ON public.conversations;
--   DROP POLICY IF EXISTS "messages_participant_read"           ON public.messages;
--   DROP POLICY IF EXISTS "messages_sender_insert"              ON public.messages;
--   DROP POLICY IF EXISTS "messages_sender_update"              ON public.messages;
--   DROP POLICY IF EXISTS "messages_sender_delete"              ON public.messages;
--   DROP POLICY IF EXISTS "playlist_subscribers_self_all"       ON public.playlist_subscribers;
--   DROP POLICY IF EXISTS "playlist_collaborators_self_all"     ON public.playlist_collaborators;
--   DROP POLICY IF EXISTS "playlist_collaborators_peer_read"    ON public.playlist_collaborators;
--
--   -- Restore m11's permissive CHECK constraint
--   ALTER TABLE public.follows DROP CONSTRAINT IF EXISTS follows_status_canonical_check;
--   ALTER TABLE public.follows ADD CONSTRAINT follows_status_check
--     CHECK (status IN ('pending', 'accepted', 'approved', 'rejected'));
--   COMMIT;
--
-- The trigger-function body rewrites and the get_unread_message_count
-- rewrite are NOT trivially reversible — the previous bodies referenced
-- a non-existent column (recipient_id) or wrote the legacy 'approved'
-- status. Recommend leaving them in place even on rollback; rerun m35 if
-- you absolutely need the prior shape.
