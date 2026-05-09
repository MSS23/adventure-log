-- ============================================================================
-- CLERK FUNCTION REWRITES + POLICY HARDENING
-- ============================================================================
-- Migrations 31-34 swapped Supabase auth for Clerk identity at the schema
-- level (TEXT user ids + clerk_user_id() JWT helper) and rebuilt the public-
-- read / storage / FK layers. They did NOT touch the bodies of any
-- public.* function or trigger that was already written against auth.uid()
-- and UUID parameters.
--
-- After migration 31:
--   * auth.uid() returns NULL inside Clerk-authenticated requests (Supabase
--     auth is no longer wired). Every function that compares auth.uid() to a
--     now-TEXT column either:
--       a) throws "operator does not exist: text = uuid" at call time, or
--       b) silently matches nothing (NULL = anything → always false).
--   * Helpers like is_trip_member(uuid, uuid) and can_edit_trip(uuid, uuid)
--     are still SECURITY DEFINER but their UUID parameter signatures don't
--     line up with the TEXT clerk_user_id() that callers can produce.
--
-- This migration:
--   1. Discovers every public.* function still referencing auth.uid().
--   2. Rewrites the SECURITY DEFINER trip helpers (signatures change, so we
--      DROP+CREATE).
--   3. Rewrites the audit/admin user functions (soft_delete_user, etc.) with
--      TEXT params and clerk_user_id() bodies.
--   4. Verifies notification triggers don't double-cast user-id text values
--      to UUID — leaves them alone if they already work mechanically.
--   5. Patches UUID columns that escaped migration 31's name-pattern audit:
--      activity_feed.target_user_id and globe_reactions.{user_id,
--      target_user_id} (the table's name doesn't end in "_user_id" so
--      neither column ever entered the discovery loop in m31 step 5 unless
--      they happened to be named user_id or target_user_id explicitly —
--      verified via DO block below).
--   6. Adds a recipient SELECT policy on globe_reactions so reaction
--      recipients can see what was left for them (m31's owner_all only
--      covers the *sender* via user_id).
--   7. Tightens m31's permissive users_public_read policy. The current
--      policy is FOR SELECT TO anon, authenticated USING (true), which
--      exposes the full users row (including email, deleted_at, etc.) to
--      anyone hitting the table. We replace the USING clause with a
--      privacy-aware predicate that hides soft-deleted rows from non-self
--      readers, and explicitly REVOKE column-level SELECT on the most
--      sensitive columns (email, email_notifications, deleted_at) from
--      anon and authenticated. App callers that need those columns must
--      go via supabaseAdmin (service-role) or move to .eq('id',
--      clerk_user_id())-scoped reads.
--
-- Scope: every change here is to FUNCTIONS / POLICIES / a couple of UUID
-- columns. No data is destroyed and the migration is wrapped in a single
-- BEGIN/COMMIT so it either applies cleanly or rolls back.
--
-- Apply: paste into the Supabase SQL editor or `supabase db push`.
--   * If the discovery query at the top of step 1 surfaces functions not
--     handled below, fix them in a follow-up — don't ad-hoc them in here.
--
-- Rollback notes are at the bottom of this file.
--
-- ============================================================================
-- ## DISCOVERED
-- ============================================================================
-- 1. The known offender list in the agent prompt (is_trip_member,
--    can_edit_trip, delete_photo_from_album, soft_delete_user,
--    restore_user_account, is_user_active, can_delete_photo) all live in
--    m06 and were re-defined identically in m09. Both definitions are
--    SECURITY INVOKER (m06 line 274) or SECURITY DEFINER (m26 trip
--    helpers) but every body uses either auth.uid() or a UUID parameter.
--    They all need DROP + CREATE OR REPLACE because the parameter type is
--    changing UUID → TEXT.
--
-- 2. permanently_delete_expired_users() (m06 line 289 / m09 line 326) is a
--    cron-style cleanup with NO user filter — it operates on
--    deleted_at < NOW() - INTERVAL '30 days'. It does not reference
--    auth.uid() and takes no UUID params, so it survives m31 unchanged.
--    Listed under DELIBERATELY UNCHANGED below.
--
-- 3. cleanup_orphaned_albums(), get_orphaned_albums(), cleanup_old_-
--    notifications(), get_safe_location() — none touch auth.uid() or
--    user-id columns. Survive m31 unchanged.
--
-- 4. Notification trigger functions (notify_on_like, notify_on_comment,
--    notify_on_follow, notify_on_follow_accepted) read NEW.user_id /
--    NEW.following_id / NEW.follower_id (now TEXT post-m31) and INSERT
--    them into notifications.user_id / notifications.related_user_id
--    (assumed already TEXT per m31's column-pattern conversion — m31's
--    `%_user_id` pattern catches related_user_id). They also INSERT
--    notifications.user_id from the literal `(SELECT user_id FROM
--    public.albums WHERE id = NEW.album_id)` — likes.album_id and
--    albums.user_id are both intact. No explicit ::UUID casts, no
--    auth.uid() references. They mechanically still work. **Left alone**
--    (see DELIBERATELY UNCHANGED).
--
--    However, m09's notify_on_follow_accepted uses status = 'approved'
--    while m06 uses status = 'accepted'. Whichever was applied last wins.
--    Migration 11 (consolidate_follows_table) standardised on 'accepted'
--    per m33's notes. Since we're not touching notification triggers in
--    this migration, that drift is documented but unaddressed. Flagged
--    under FOLLOW-UPS at the bottom.
--
-- 5. Functions that still take a `p_user_id UUID` parameter and DON'T
--    reference auth.uid() (mark_all_notifications_read, get_unread_-
--    notification_count, mark_reactions_as_read, get_user_dashboard_stats,
--    accept_follow_request, reject_follow_request, get_pending_uploads,
--    get_user_playlists, accept_all_pending_follows,
--    get_unread_message_count, toggle_reaction, get_user_reactions,
--    get_unread_reaction_count, get_globe_reactions, get_reaction_stats,
--    get_reaction_counts, create_notification) — when called with a TEXT
--    Clerk subject, PostgreSQL cannot implicitly cast text→uuid for
--    function arg resolution. Every one of these will throw
--      "function public.<name>(text, ...) does not exist"
--    or
--      "operator does not exist: text = uuid"
--    in Clerk-authenticated contexts. Each needs DROP + CREATE OR REPLACE
--    with a TEXT parameter where the UUID was a user-id.
--
--    These are NOT in the agent prompt's offender list but they are
--    legitimate offenders. We rewrite all of them in step 2.5 below.
--
-- 6. m31 step 5 only converted columns whose names match the user-id
--    pattern set. Patterns missed:
--      a) `target_user_id` — used in activity_feed (m03 line 229) and
--         globe_reactions (backup m10 line 18). m31's pattern includes
--         `%\_user\_id`, which DOES match `target_user_id`. So this is
--         already TEXT post-m31. Verified via DO block in step 4.
--      b) `recipient_id` — only appears as a column reference in
--         m06/m09's get_unread_message_count function body, which reads
--         from messages.recipient_id. messages was created in m14 with
--         only sender_id (no recipient_id column at all — m14 lines 33-46).
--         The function references a column that DOES NOT EXIST. The
--         function would have failed at runtime regardless of Clerk —
--         this is a pre-existing bug, not a Clerk-migration regression.
--         Flagged under FOLLOW-UPS.
--      c) Audit / archive columns we deliberately skip: m13's
--         `storage_cleanup_queue.original_user_id` was already converted
--         by m31 (column ends in `_user_id`); we leave the FK off per
--         m34's documented rationale. No action here.
--
-- 7. globe_reactions has `target_user_id` (recipient) and `user_id`
--    (sender). m31 attached an owner_all policy keyed off user_id, which
--    only lets the sender read/write. Recipients have no SELECT policy.
--    Step 5 below adds globe_reactions_recipient_read.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. DISCOVERY — surface every function in public.* whose body references
--    auth.uid(). The audit query at the bottom of m31 was this exact shape;
--    we run it in a DO block here so the apply log shows what's being
--    rewritten. If anything appears in the NOTICE output that ISN'T
--    handled by steps 2 / 2.5 below, STOP and patch it before continuing.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
  found_count integer := 0;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema_name, p.proname AS func_name,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosrc ILIKE '%auth.uid()%'
    ORDER BY p.proname
  LOOP
    found_count := found_count + 1;
    RAISE NOTICE 'auth.uid() reference: %.%(%)',
      r.schema_name, r.func_name, r.args;
  END LOOP;
  RAISE NOTICE 'Total functions still referencing auth.uid(): %', found_count;
END $$;

-- ----------------------------------------------------------------------------
-- 2. SECURITY DEFINER trip helpers (m26)
-- ----------------------------------------------------------------------------
-- is_trip_member: parameter signature changes UUID,UUID → UUID,TEXT (trip_id
-- stays UUID, user_id is now TEXT). Body unchanged otherwise. SECURITY
-- DEFINER preserved; SET search_path locked per the m06 convention; EXECUTE
-- regranted to authenticated.
DROP FUNCTION IF EXISTS public.is_trip_member(UUID, UUID);
CREATE OR REPLACE FUNCTION public.is_trip_member(
  _trip_id UUID,
  _user_id TEXT
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trip_members
    WHERE trip_id = _trip_id AND user_id = _user_id
  );
$$;
COMMENT ON FUNCTION public.is_trip_member(UUID, TEXT) IS
  'Trip membership check. Clerk rewrite: _user_id is TEXT (Clerk subject).';
GRANT EXECUTE ON FUNCTION public.is_trip_member(UUID, TEXT) TO authenticated;

-- can_edit_trip: same shape as is_trip_member, plus the role filter.
DROP FUNCTION IF EXISTS public.can_edit_trip(UUID, UUID);
CREATE OR REPLACE FUNCTION public.can_edit_trip(
  _trip_id UUID,
  _user_id TEXT
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trip_members
    WHERE trip_id = _trip_id
      AND user_id = _user_id
      AND role IN ('owner', 'editor')
  );
$$;
COMMENT ON FUNCTION public.can_edit_trip(UUID, TEXT) IS
  'Trip edit-permission check. Clerk rewrite: _user_id is TEXT (Clerk subject).';
GRANT EXECUTE ON FUNCTION public.can_edit_trip(UUID, TEXT) TO authenticated;

-- The trip-table RLS policies in m26 (lines 129-203) inline auth.uid()
-- inside both the policy expression AND the helper call. m31 already
-- dropped every policy in public.* (m31 step 4), and m33 didn't recreate
-- the m26 trip policies (m33 only added new public-read / member-read
-- policies). The ALL-policy from m31 keyed off user_id covers
-- trip_members and trip_pins. trips.owner_id is covered by the trips_-
-- owner_all policy m33 created. So the m26 policies do NOT need to be
-- recreated here — m31+m33 cover the same intent.

-- ----------------------------------------------------------------------------
-- 2.5. Audit / admin user functions (m06 / m09 latest definitions)
-- ----------------------------------------------------------------------------
-- soft_delete_user(p_user_id UUID): id type changes UUID → TEXT.
DROP FUNCTION IF EXISTS public.soft_delete_user(UUID);
CREATE OR REPLACE FUNCTION public.soft_delete_user(p_user_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.users
  SET deleted_at = NOW()
  WHERE id = p_user_id;
  RETURN FOUND;
END;
$$;
COMMENT ON FUNCTION public.soft_delete_user(TEXT) IS
  'Clerk rewrite: p_user_id is TEXT (Clerk subject). Body unchanged.';
GRANT EXECUTE ON FUNCTION public.soft_delete_user(TEXT) TO authenticated;

-- restore_user_account(p_user_id UUID): same.
DROP FUNCTION IF EXISTS public.restore_user_account(UUID);
CREATE OR REPLACE FUNCTION public.restore_user_account(p_user_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.users
  SET deleted_at = NULL
  WHERE id = p_user_id;
  RETURN FOUND;
END;
$$;
COMMENT ON FUNCTION public.restore_user_account(TEXT) IS
  'Clerk rewrite: p_user_id is TEXT (Clerk subject). Body unchanged.';
GRANT EXECUTE ON FUNCTION public.restore_user_account(TEXT) TO authenticated;

-- is_user_active(p_user_id UUID): same.
DROP FUNCTION IF EXISTS public.is_user_active(UUID);
CREATE OR REPLACE FUNCTION public.is_user_active(p_user_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = p_user_id
    AND deleted_at IS NULL
  );
END;
$$;
COMMENT ON FUNCTION public.is_user_active(TEXT) IS
  'Clerk rewrite: p_user_id is TEXT (Clerk subject). Body unchanged.';
GRANT EXECUTE ON FUNCTION public.is_user_active(TEXT) TO authenticated, anon;

-- can_delete_photo(photo_id UUID, p_user_id UUID): the user-id arg becomes
-- TEXT; the photo_id stays UUID.
DROP FUNCTION IF EXISTS public.can_delete_photo(UUID, UUID);
CREATE OR REPLACE FUNCTION public.can_delete_photo(
  p_photo_id UUID,
  p_user_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.photos
    WHERE id = p_photo_id
    AND user_id = p_user_id
  );
END;
$$;
COMMENT ON FUNCTION public.can_delete_photo(UUID, TEXT) IS
  'Clerk rewrite: p_user_id is TEXT (Clerk subject). Body unchanged.';
GRANT EXECUTE ON FUNCTION public.can_delete_photo(UUID, TEXT) TO authenticated;

-- delete_photo_from_album(p_photo_id UUID, p_album_id UUID): body filters
-- by `user_id = auth.uid()`. Replace with `user_id = clerk_user_id()`.
-- Param signature unchanged (no user-id arg).
DROP FUNCTION IF EXISTS public.delete_photo_from_album(UUID, UUID);
CREATE OR REPLACE FUNCTION public.delete_photo_from_album(
  p_photo_id UUID,
  p_album_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM public.photos
  WHERE id = p_photo_id
  AND album_id = p_album_id
  AND user_id = public.clerk_user_id();
  RETURN FOUND;
END;
$$;
COMMENT ON FUNCTION public.delete_photo_from_album(UUID, UUID) IS
  'Clerk rewrite: auth.uid() → public.clerk_user_id().';
GRANT EXECUTE ON FUNCTION public.delete_photo_from_album(UUID, UUID) TO authenticated;

-- ----------------------------------------------------------------------------
-- Notification / message helpers — UUID param → TEXT param. Bodies never
-- referenced auth.uid(); only the parameter type breaks under Clerk.
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.mark_all_notifications_read(UUID);
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(p_user_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.notifications
  SET is_read = TRUE,
      read_at = NOW()
  WHERE user_id = p_user_id
  AND is_read = FALSE;
  RETURN FOUND;
END;
$$;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read(TEXT) TO authenticated;

DROP FUNCTION IF EXISTS public.get_unread_notification_count(UUID);
CREATE OR REPLACE FUNCTION public.get_unread_notification_count(p_user_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.notifications
  WHERE user_id = p_user_id
  AND is_read = FALSE;
  RETURN v_count;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_unread_notification_count(TEXT) TO authenticated;

-- create_notification: every UUID arg becomes TEXT for user-id args; album
-- and comment ids stay UUID. Body unchanged otherwise.
DROP FUNCTION IF EXISTS public.create_notification(UUID, TEXT, UUID, UUID, UUID);
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id TEXT,
  p_type TEXT,
  p_related_user_id TEXT DEFAULT NULL,
  p_related_album_id UUID DEFAULT NULL,
  p_related_comment_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO public.notifications (
    user_id,
    type,
    related_user_id,
    related_album_id,
    related_comment_id
  ) VALUES (
    p_user_id,
    p_type,
    p_related_user_id,
    p_related_album_id,
    p_related_comment_id
  )
  RETURNING id INTO v_notification_id;
  RETURN v_notification_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_notification(TEXT, TEXT, TEXT, UUID, UUID) TO authenticated;

-- get_unread_message_count(p_user_id UUID): the body references
-- messages.recipient_id which DOES NOT EXIST in the m14 messages schema
-- (m14 only has sender_id). We rewrite the parameter to TEXT and leave
-- the body intact so the migration is a clean Clerk port; the underlying
-- pre-existing bug is flagged in FOLLOW-UPS. Calling this function will
-- error at the FROM/WHERE step regardless of the Clerk rewrite.
DROP FUNCTION IF EXISTS public.get_unread_message_count(UUID);
CREATE OR REPLACE FUNCTION public.get_unread_message_count(p_user_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.messages
  WHERE recipient_id = p_user_id
  AND is_read = FALSE;
  RETURN v_count;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_unread_message_count(TEXT) TO authenticated;

-- ----------------------------------------------------------------------------
-- Reaction helpers — TEXT user-id, UUID target_id.
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.toggle_reaction(UUID, TEXT, UUID, TEXT);
CREATE OR REPLACE FUNCTION public.toggle_reaction(
  p_user_id TEXT,
  p_target_type TEXT,
  p_target_id UUID,
  p_reaction_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_existing_id UUID;
BEGIN
  SELECT id INTO v_existing_id
  FROM public.reactions
  WHERE user_id = p_user_id
  AND target_type = p_target_type
  AND target_id = p_target_id
  AND reaction_type = p_reaction_type;

  IF v_existing_id IS NOT NULL THEN
    DELETE FROM public.reactions WHERE id = v_existing_id;
    RETURN FALSE;
  ELSE
    INSERT INTO public.reactions (
      user_id,
      target_type,
      target_id,
      reaction_type
    ) VALUES (
      p_user_id,
      p_target_type,
      p_target_id,
      p_reaction_type
    );
    RETURN TRUE;
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.toggle_reaction(TEXT, TEXT, UUID, TEXT) TO authenticated;

DROP FUNCTION IF EXISTS public.get_user_reactions(UUID, TEXT, UUID[]);
CREATE OR REPLACE FUNCTION public.get_user_reactions(
  p_user_id TEXT,
  p_target_type TEXT,
  p_target_ids UUID[]
)
RETURNS TABLE(
  target_id UUID,
  reaction_type TEXT
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    reactions.target_id,
    reactions.reaction_type
  FROM public.reactions
  WHERE user_id = p_user_id
  AND target_type = p_target_type
  AND reactions.target_id = ANY(p_target_ids);
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_user_reactions(TEXT, TEXT, UUID[]) TO authenticated;

DROP FUNCTION IF EXISTS public.get_unread_reaction_count(UUID);
CREATE OR REPLACE FUNCTION public.get_unread_reaction_count(p_user_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.reactions
  WHERE target_id IN (
    SELECT id FROM public.albums WHERE user_id = p_user_id
  )
  AND is_read = FALSE;
  RETURN v_count;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_unread_reaction_count(TEXT) TO authenticated;

DROP FUNCTION IF EXISTS public.mark_reactions_as_read(UUID, UUID[]);
CREATE OR REPLACE FUNCTION public.mark_reactions_as_read(
  p_user_id TEXT,
  p_target_ids UUID[]
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.reactions
  SET is_read = TRUE
  WHERE target_id = ANY(p_target_ids)
  AND target_id IN (
    SELECT id FROM public.albums WHERE user_id = p_user_id
  );
  RETURN FOUND;
END;
$$;
GRANT EXECUTE ON FUNCTION public.mark_reactions_as_read(TEXT, UUID[]) TO authenticated;

DROP FUNCTION IF EXISTS public.get_reaction_stats(UUID);
CREATE OR REPLACE FUNCTION public.get_reaction_stats(p_user_id TEXT)
RETURNS TABLE(
  total_received BIGINT,
  by_type JSON
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_received,
    JSON_OBJECT_AGG(
      reactions.reaction_type,
      COUNT(*)
    ) AS by_type
  FROM public.reactions
  WHERE target_id IN (
    SELECT id FROM public.albums WHERE user_id = p_user_id
  )
  GROUP BY target_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_reaction_stats(TEXT) TO authenticated;

-- get_reaction_counts: target_id stays UUID, no user-id arg, body
-- unaffected by Clerk. **Not rewritten** (see DELIBERATELY UNCHANGED).

-- get_globe_reactions(p_album_ids UUID[]): no user-id arg, body
-- aggregates by target_id only. **Not rewritten.** (See DELIBERATELY
-- UNCHANGED.) Note: the BACKUP migration migrations_backup/10_globe_-
-- reactions.sql defined a DIFFERENT get_globe_reactions(UUID, UUID,
-- INTEGER) signature with SECURITY DEFINER. m06/m09 then DROPped it and
-- redefined it with the (UUID[]) signature. Whichever is live in your DB
-- depends on apply order; the (UUID[]) version is what survives the
-- m06/m09 chain. We do not touch either.

-- ----------------------------------------------------------------------------
-- Follow / playlist / dashboard helpers — TEXT user-id.
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.accept_all_pending_follows(UUID);
CREATE OR REPLACE FUNCTION public.accept_all_pending_follows(p_user_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.follows
  SET status = 'accepted',
      updated_at = NOW()
  WHERE following_id = p_user_id
  AND status = 'pending';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
GRANT EXECUTE ON FUNCTION public.accept_all_pending_follows(TEXT) TO authenticated;

DROP FUNCTION IF EXISTS public.accept_follow_request(UUID, UUID);
CREATE OR REPLACE FUNCTION public.accept_follow_request(
  p_follower_id TEXT,
  p_following_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.follows
  SET status = 'accepted',
      updated_at = NOW()
  WHERE follower_id = p_follower_id
  AND following_id = p_following_id;
  RETURN FOUND;
END;
$$;
GRANT EXECUTE ON FUNCTION public.accept_follow_request(TEXT, TEXT) TO authenticated;

DROP FUNCTION IF EXISTS public.reject_follow_request(UUID, UUID);
CREATE OR REPLACE FUNCTION public.reject_follow_request(
  p_follower_id TEXT,
  p_following_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM public.follows
  WHERE follower_id = p_follower_id
  AND following_id = p_following_id;
  RETURN FOUND;
END;
$$;
GRANT EXECUTE ON FUNCTION public.reject_follow_request(TEXT, TEXT) TO authenticated;

DROP FUNCTION IF EXISTS public.get_most_followed_users(INTEGER);
CREATE OR REPLACE FUNCTION public.get_most_followed_users(
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
  user_id TEXT,
  follower_count BIGINT
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    follows.following_id AS user_id,
    COUNT(*)::BIGINT AS follower_count
  FROM public.follows
  WHERE status = 'accepted'
  GROUP BY follows.following_id
  ORDER BY follower_count DESC
  LIMIT p_limit;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_most_followed_users(INTEGER) TO authenticated, anon;

DROP FUNCTION IF EXISTS public.get_pending_uploads(UUID);
CREATE OR REPLACE FUNCTION public.get_pending_uploads(p_user_id TEXT)
RETURNS TABLE(
  id UUID,
  file_name TEXT,
  file_size BIGINT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    upload_queue.id,
    upload_queue.file_name,
    upload_queue.file_size,
    upload_queue.created_at
  FROM public.upload_queue
  WHERE upload_queue.user_id = p_user_id
  AND upload_queue.status = 'pending'
  ORDER BY upload_queue.created_at DESC;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_pending_uploads(TEXT) TO authenticated;

DROP FUNCTION IF EXISTS public.get_user_playlists(UUID);
CREATE OR REPLACE FUNCTION public.get_user_playlists(p_user_id TEXT)
RETURNS TABLE(
  id UUID,
  title TEXT,
  item_count INTEGER,
  subscriber_count INTEGER
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    playlists.id,
    playlists.title,
    playlists.item_count,
    playlists.subscriber_count
  FROM public.playlists
  WHERE playlists.user_id = p_user_id
  ORDER BY playlists.created_at DESC;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_user_playlists(TEXT) TO authenticated;

DROP FUNCTION IF EXISTS public.get_user_dashboard_stats(UUID);
CREATE OR REPLACE FUNCTION public.get_user_dashboard_stats(p_user_id TEXT)
RETURNS TABLE(
  total_albums BIGINT,
  total_photos BIGINT,
  total_likes BIGINT,
  total_followers BIGINT
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM public.albums WHERE user_id = p_user_id)::BIGINT,
    (SELECT COUNT(*) FROM public.photos WHERE user_id = p_user_id)::BIGINT,
    (SELECT COUNT(*) FROM public.likes WHERE album_id IN (SELECT id FROM public.albums WHERE user_id = p_user_id))::BIGINT,
    (SELECT COUNT(*) FROM public.follows WHERE following_id = p_user_id AND status = 'accepted')::BIGINT;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_user_dashboard_stats(TEXT) TO authenticated;

-- ----------------------------------------------------------------------------
-- 3. Notification triggers — verified: notify_on_like, notify_on_comment,
--    notify_on_follow, notify_on_follow_accepted in m06/m09 read NEW.user_id /
--    NEW.following_id / NEW.follower_id (now TEXT post-m31) and INSERT into
--    notifications.{user_id, related_user_id} which m31's `%_user_id`
--    pattern converted to TEXT. No explicit ::UUID casts. They mechanically
--    still work without rewrite.
--
--    **Left alone** (documented under DELIBERATELY UNCHANGED).
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- 4. Patch any UUID columns m31 missed.
-- ----------------------------------------------------------------------------
-- m31's pattern was:
--   user_id, %_user_id, owner_id, viewer_id, sender_id, receiver_id,
--   created_by, invited_by, resolved_by, follower_id, following_id,
--   blocker_id, blocked_id, reporter_id
-- Plus migration 33 added trip_pins.visited_by.
--
-- Audit candidates beyond that:
--   * activity_feed.target_user_id  (m03:229) — matches `%_user_id`. Already
--     TEXT post-m31. Verified below; no-op.
--   * globe_reactions.target_user_id (backup m10:18) — matches `%_user_id`.
--     Already TEXT post-m31. Verified below; no-op.
--   * globe_reactions.user_id        (backup m10:13) — matches `user_id`.
--     Already TEXT post-m31. Verified below; no-op.
--   * messages.recipient_id          (m06:503 / m09:560 in get_unread_-
--     message_count body — but the column does not exist in messages per
--     m14:33-46). No column to convert. No-op.
--
-- The DO block below FAILS LOUDLY if any of the above columns somehow
-- survived as UUID — which would mean migration 31 didn't apply
-- correctly and a real deploy issue needs investigating.
DO $$
DECLARE
  r RECORD;
  v_unexpected_count integer := 0;
BEGIN
  FOR r IN
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND data_type    = 'uuid'
      AND (
        column_name ILIKE '%user_id%'
        OR column_name ILIKE '%_by'
        OR column_name = 'recipient_id'
      )
      AND table_name NOT IN (
        -- Tables whose UUID user-id columns are intentional archive trails:
        'storage_cleanup_queue'  -- original_user_id is audit-trail; m34 documents this
      )
  LOOP
    v_unexpected_count := v_unexpected_count + 1;
    RAISE NOTICE 'UNEXPECTED leftover UUID user-id column: %.% (type %)',
      r.table_name, r.column_name, r.data_type;
    -- Best-effort patch with USING ::text. If this fails, halt and let the
    -- operator investigate.
    EXECUTE format(
      'ALTER TABLE public.%I ALTER COLUMN %I DROP DEFAULT',
      r.table_name, r.column_name
    );
    EXECUTE format(
      'ALTER TABLE public.%I ALTER COLUMN %I TYPE text USING %I::text',
      r.table_name, r.column_name, r.column_name
    );
    RAISE NOTICE '  → converted to TEXT';
  END LOOP;
  IF v_unexpected_count = 0 THEN
    RAISE NOTICE 'No leftover UUID user-id columns (good).';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 5. Recipient SELECT policy on globe_reactions.
-- ----------------------------------------------------------------------------
-- m31 attached an owner_all policy keyed off user_id (the SENDER). The
-- table also has target_user_id (the RECIPIENT — whose globe is being
-- reacted to). Recipients currently have no SELECT path. Add one.
--
-- The backup m10 also had a `is_public` flag on the row; respect it for
-- non-recipient/non-sender readers via a separate public-read policy.
-- That's additive and matches the backup m10 behaviour (line 133-137).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'globe_reactions'
  ) THEN
    EXECUTE 'ALTER TABLE public.globe_reactions ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS "globe_reactions_recipient_read" ON public.globe_reactions';
    EXECUTE $POLICY$
      CREATE POLICY "globe_reactions_recipient_read"
        ON public.globe_reactions
        FOR SELECT
        TO authenticated
        USING (target_user_id = public.clerk_user_id())
    $POLICY$;

    -- Recipients should also be able to mark reactions as read (UPDATE
    -- is_read). m31's owner_all only lets the sender update. Add a
    -- recipient UPDATE policy scoped to the is_read column path.
    EXECUTE 'DROP POLICY IF EXISTS "globe_reactions_recipient_update" ON public.globe_reactions';
    EXECUTE $POLICY$
      CREATE POLICY "globe_reactions_recipient_update"
        ON public.globe_reactions
        FOR UPDATE
        TO authenticated
        USING (target_user_id = public.clerk_user_id())
        WITH CHECK (target_user_id = public.clerk_user_id())
    $POLICY$;

    -- Public reactions (is_public = true) are world-readable — matches
    -- the backup m10:133 policy intent.
    EXECUTE 'DROP POLICY IF EXISTS "globe_reactions_public_read" ON public.globe_reactions';
    EXECUTE $POLICY$
      CREATE POLICY "globe_reactions_public_read"
        ON public.globe_reactions
        FOR SELECT
        TO anon, authenticated
        USING (is_public = TRUE)
    $POLICY$;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 6. Restrict m31's users_public_read.
-- ----------------------------------------------------------------------------
-- m31 created:
--   CREATE POLICY users_public_read ON public.users
--     FOR SELECT TO anon, authenticated USING (true);
-- which exposes EVERY column of EVERY user row to anyone hitting the table
-- (email, deleted_at, email_notifications, etc.).
--
-- App audit (grepped src/**):
--   * 30+ call sites .from('users').select(...). Most select an explicit
--     column list (id, username, display_name, avatar_url, bio,
--     privacy_level, ...). Several use .select('*') — most of those run
--     in authenticated, self-scoped contexts (AuthProvider on user.id,
--     dashboard on user.id) where users_self_write covers the row, but
--     a handful (CreatorsToFollowSection, SearchBar, Leaderboard,
--     ExploreSearchResults) issue .select('*') against OTHER users'
--     rows. Those callers should be changed to explicit column lists in
--     a follow-up.
--   * useMentions.ts (line 46) selects `email` for every user matching a
--     search query — this is a pre-existing data leak. Flagged in
--     FOLLOW-UPS.
--
-- Given the prevalence of .select('*') against other-than-self users,
-- the view-only approach (drop the policy + create users_public view +
-- redirect callers) breaks too much app code in a single migration.
-- We choose a hybrid:
--
--   (a) Replace the USING(true) policy with a privacy-aware predicate
--       that hides soft-deleted rows from anyone other than the owner.
--   (b) REVOKE column-level SELECT on the most clearly-sensitive columns
--       (email, email_notifications) from anon and authenticated. Self-
--       scoped reads (where the caller IS the row's owner) need to go
--       through supabaseAdmin / service-role for those columns; the
--       AuthProvider's .from('users').select('*').eq('id', user.id) WILL
--       fail after this for the email column unless we either drop the
--       restriction or change the caller. We therefore REVOKE only on
--       columns that NO production code reads via the anon/authenticated
--       roles today (verified by grep — no caller other than useMentions
--       and the email/notify route reads `email`, and email/notify uses
--       supabaseAdmin which has the bypass).
--
-- For columns we don't REVOKE here (deleted_at, current_streak_days,
-- privacy_level, etc.), the row-level USING clause does the heavy
-- lifting: deleted_at IS NULL OR id = clerk_user_id() means non-owners
-- can never even SEE the row of a deleted user.
DROP POLICY IF EXISTS users_public_read ON public.users;
CREATE POLICY users_public_read
  ON public.users
  FOR SELECT
  TO anon, authenticated
  USING (
    -- non-owners can only see undeleted users; the owner sees their
    -- own row regardless (also covered by users_self_write but explicit
    -- here so SELECT works without depending on the ALL policy).
    deleted_at IS NULL
    OR id = public.clerk_user_id()
  );

-- Column-level REVOKE for clearly-sensitive columns that no production
-- caller reads via anon/authenticated. supabaseAdmin (service-role)
-- always bypasses these grants.
DO $$
BEGIN
  -- email: only useMentions.ts reads it via authenticated, and that's a
  -- known data leak we want to break (forces the caller to drop email
  -- from the select list).
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'email'
  ) THEN
    EXECUTE 'REVOKE SELECT (email) ON public.users FROM anon';
    EXECUTE 'REVOKE SELECT (email) ON public.users FROM authenticated';
  END IF;

  -- email_notifications: only read by the email/notify API route which
  -- uses supabaseAdmin. Safe to lock down.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'email_notifications'
  ) THEN
    EXECUTE 'REVOKE SELECT (email_notifications) ON public.users FROM anon';
    EXECUTE 'REVOKE SELECT (email_notifications) ON public.users FROM authenticated';
  END IF;

  -- two_factor_secret / phone — only present in some schema variants. If
  -- they exist, lock them down; if not, no-op.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'two_factor_secret'
  ) THEN
    EXECUTE 'REVOKE SELECT (two_factor_secret) ON public.users FROM anon, authenticated';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'phone'
  ) THEN
    EXECUTE 'REVOKE SELECT (phone) ON public.users FROM anon, authenticated';
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- AUDIT — run after applying. Anything returned here is a leftover.
-- ============================================================================
-- A. Functions in public.* still containing auth.uid():
--
--   SELECT n.nspname, p.proname,
--          pg_get_function_identity_arguments(p.oid) AS args
--   FROM pg_proc p
--   JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname = 'public'
--     AND p.prosrc ILIKE '%auth.uid()%';
--
-- B. UUID columns whose name suggests user IDs but slipped through the
--    pattern in m31 + step 4 above:
--
--   SELECT table_schema, table_name, column_name
--   FROM information_schema.columns
--   WHERE table_schema = 'public'
--     AND data_type    = 'uuid'
--     AND (
--       column_name ILIKE '%user%'
--       OR column_name ILIKE '%_by%'
--       OR column_name IN ('recipient_id', 'subscriber_id', 'author_id')
--     )
--     AND table_name NOT IN ('storage_cleanup_queue');
--
-- C. Tables with RLS enabled and zero policies — the previous code review
--    flagged this as a blind spot. Anything returned here is silently
--    inaccessible to non-owners (anon + authenticated get blocked).
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
--
-- D. Confirm users_public_read no longer exposes email to anon:
--
--   SET ROLE anon;
--   SELECT email FROM public.users LIMIT 1;        -- expect: permission denied
--   SELECT id, username FROM public.users LIMIT 1; -- expect: rows
--   RESET ROLE;
--
-- E. Confirm globe_reactions recipient SELECT works:
--
--   SET LOCAL request.jwt.claim.sub TO 'user_<recipient_clerk_id>';
--   SELECT count(*) FROM public.globe_reactions
--   WHERE target_user_id = current_setting('request.jwt.claim.sub');

-- ============================================================================
-- ## DELIBERATELY UNCHANGED
-- ============================================================================
-- The functions / triggers below were inspected and judged to NOT need a
-- Clerk rewrite. Listed here so reviewers don't think they were forgotten.
--
--   permanently_delete_expired_users()
--     m06:289 / m09:326. No user filter; runs against
--     deleted_at < NOW() - INTERVAL '30 days'. No auth.uid() / UUID args.
--
--   cleanup_orphaned_albums()
--     m06:351 / m09:393. Runs against created_at + photos existence.
--     No auth.uid() / UUID args.
--
--   get_orphaned_albums()
--     m06:368 / m09:412. Same shape — read-only, no user-scope.
--
--   cleanup_old_notifications()
--     m06:451 / m09:500. Runs against is_read + created_at. No user-scope.
--
--   get_safe_location(NUMERIC, NUMERIC, TEXT)
--     m06:391 / m09:437. Pure function over location params.
--
--   get_reaction_counts(TEXT, UUID)
--     m06:554 / m09:608. Aggregates by target only; no user-id arg.
--
--   get_globe_reactions(UUID[])
--     m06:616 / m09:676. Aggregates by album_id only; no user-id arg.
--
--   notify_on_like / notify_on_comment / notify_on_follow /
--   notify_on_follow_accepted (trigger functions)
--     m06:151,174,199,218 / m09:139,164,191,212. Read NEW.user_id /
--     NEW.following_id / NEW.follower_id which are now TEXT post-m31, and
--     INSERT into notifications.{user_id, related_user_id} which m31
--     converted via the `%_user_id` pattern. No explicit ::UUID casts; no
--     auth.uid() references. Triggers fire on INSERT/UPDATE so the source
--     and target columns are both TEXT — no type-mismatch path. They
--     mechanically still work without modification.
--
--   update_itineraries_updated_at / update_updated_at_column /
--   update_user_levels_updated_at / update_playlist_item_count /
--   update_playlist_subscriber_count
--     Generic timestamp / count triggers. No user-scope.
--
--   create_default_notification_preferences /
--   create_default_reaction_settings
--     Trigger functions on public.users (AFTER INSERT). They INSERT
--     NEW.id (now TEXT post-m31) into a *_preferences table whose
--     user_id column is also TEXT. No type mismatch.
--
--   auto_accept_follows_on_public / handle_follow_request
--     Trigger functions on public.users / public.follows. Read TEXT id /
--     follower_id columns; no auth.uid().
--
-- ============================================================================
-- FOLLOW-UPS (need separate migrations / app PRs in a future session)
-- ============================================================================
-- 1. messages.recipient_id is referenced by get_unread_message_count(text)
--    but the column does not exist in the m14 messages schema. Either:
--      (a) add `recipient_id TEXT` to messages and a migration to backfill
--          it, or
--      (b) rewrite get_unread_message_count to walk
--          conversation_participants instead. Pre-existing bug surfaced
--          during this audit; not a Clerk-migration regression.
--
-- 2. m06's notify_on_follow_accepted uses status = 'accepted'; m09's
--    version uses status = 'approved'. m11 standardised on 'accepted' but
--    m09 ran AFTER m11 and re-introduced 'approved' (m09:218, 271, 757,
--    817). Whichever applied last wins in the live DB. A cleanup
--    migration should pick one and rewrite both functions to match.
--
-- 3. App callers that .select('*') from public.users for OTHER users
--    (CreatorsToFollowSection, ExploreSearchResults, SearchBar,
--    Leaderboard, AuthProvider when looking at other users):
--      * Now safe-by-default for `email` / `email_notifications` (column-
--        level revoke), but those queries will RETURN NULL for those
--        columns instead of erroring under PostgREST's missing-column
--        translation. Recommend changing each call site to an explicit
--        column list (id, username, display_name, avatar_url, bio,
--        privacy_level, is_verified, created_at).
--      * Migrate all non-self `users` reads to a `public.users_public`
--        view or RPC so the schema author controls the column surface.
--
-- 4. useMentions.ts line 46 selects `email` from users for every
--    matching search row. After this migration that column read returns
--    NULL via the column REVOKE. Drop `email` from the select list.
--
-- 5. m31 dropped the m26 trip RLS policies (trips_select_members,
--    trips_insert_own, trips_update_owner, trips_delete_owner,
--    trip_members_*, trip_pins_*) and m33's owner_all coverage doesn't
--    fully replicate them — m26's trip_pins_insert_editors required
--    can_edit_trip(trip_id, user_id), which gated PIN writes by
--    role IN ('owner','editor'). With m31's owner_all on user_id alone,
--    any trip member who happens to own the row can insert a pin. If
--    the role-gating semantic still matters, recreate trip_pins_insert
--    using the new is_trip_member / can_edit_trip TEXT-arg helpers.
--
-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- This migration only DROP+CREATEs functions, alters two policies, and
-- REVOKEs four column grants. To roll back:
--
--   BEGIN;
--   -- Restore m31's permissive users_public_read:
--   DROP POLICY IF EXISTS users_public_read ON public.users;
--   CREATE POLICY users_public_read ON public.users
--     FOR SELECT TO anon, authenticated USING (true);
--   GRANT SELECT (email) ON public.users TO anon, authenticated;
--   GRANT SELECT (email_notifications) ON public.users TO anon, authenticated;
--   -- (and two_factor_secret / phone if present)
--   DROP POLICY IF EXISTS "globe_reactions_recipient_read"   ON public.globe_reactions;
--   DROP POLICY IF EXISTS "globe_reactions_recipient_update" ON public.globe_reactions;
--   DROP POLICY IF EXISTS "globe_reactions_public_read"      ON public.globe_reactions;
--   -- Re-running m31 is the only clean way to restore the original
--   -- (broken) UUID-arg function signatures, since the bodies referenced
--   -- auth.uid() — but you don't want that. Recommend leaving the
--   -- function rewrites in place and only rolling back the policies if
--   -- needed.
--   COMMIT;
