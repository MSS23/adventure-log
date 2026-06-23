-- 61_fix_social_rls_uuid_compare.sql
--
-- Definitive fix for the recurring Postgres 57014 statement timeouts on:
--   GET /rest/v1/comments?...&target_type=eq.album&target_id=eq.<uuid>   -> 500
--   GET /rest/v1/likes?...&target_type=eq.album&target_id=eq.<uuid>      -> 500
--   GET /rest/v1/likes?select=id&user_id=eq.<u>&target_type=eq.album&... -> 500
--
-- ROOT CAUSE (what migration 57 only papered over)
-- ------------------------------------------------------------------------
-- The public-READ RLS policies that gate likes/comments/reactions check each
-- candidate row with:
--     EXISTS (SELECT 1 FROM albums a WHERE a.id::text = target_id::text ...)
-- `albums.id` / `photos.id` are uuid PRIMARY KEYs. Casting the indexed `a.id`
-- to text makes Postgres UNABLE to use the uuid primary-key index, so the
-- per-row EXISTS degrades into a full seq scan of `albums` (and `photos`) for
-- EVERY candidate row — O(rows × albums). It blows past statement_timeout even
-- for a single-row `limit=1` check, because the cost is in the RLS subquery,
-- not the outer filter (which the unique index already satisfies instantly).
--
-- Migration 57 tried to work around this with functional indexes on (id::text).
-- That is brittle (the planner doesn't reliably pick it) and clearly did NOT
-- hold — the timeouts recurred. The clean fix is to compare uuid-to-uuid so the
-- existing primary-key index is used as a plain index seek.
--
-- SCOPE: this migration touches ONLY the public-READ (SELECT) policies — they
-- are the sole cause of the read timeouts and they reference NO user-identity
-- helper, so this is independent of the Clerk->Supabase auth revert
-- (migration 39 dropped public.clerk_user_id()). The INSERT/WITH-CHECK policies
-- are deliberately NOT touched here (their live shape after the auth revert is
-- uncertain — see the note at the bottom).
--
-- `target_id` is cast to uuid (NOT `a.id` to text) so:
--   * the comparison is uuid = uuid → albums/photos PK index seek, and
--   * it is safe whether `target_id` is stored as uuid or text (every album/
--     photo/story/comment id is a valid uuid string either way).
--
-- Semantics are IDENTICAL to before — same rows, same privacy. Idempotent.

BEGIN;

-- ===========================================================================
-- COMMENTS — read on public targets
-- ===========================================================================
DROP POLICY IF EXISTS "comments_public_target_read" ON public.comments;
CREATE POLICY "comments_public_target_read"
  ON public.comments
  FOR SELECT
  TO anon, authenticated
  USING (
    (
      target_type = 'album'
      AND EXISTS (
        SELECT 1 FROM public.albums a
        WHERE a.id = comments.target_id::uuid
          AND a.visibility = 'public'
      )
    )
    OR (
      target_type = 'photo'
      AND EXISTS (
        SELECT 1
        FROM public.photos p
        JOIN public.albums a ON a.id = p.album_id
        WHERE p.id = comments.target_id::uuid
          AND a.visibility = 'public'
      )
    )
  );

-- ===========================================================================
-- LIKES — read on public targets
-- ===========================================================================
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
        WHERE a.id = likes.target_id::uuid
          AND a.visibility = 'public'
      )
    )
    OR (
      target_type = 'photo'
      AND EXISTS (
        SELECT 1
        FROM public.photos p
        JOIN public.albums a ON a.id = p.album_id
        WHERE p.id = likes.target_id::uuid
          AND a.visibility = 'public'
      )
    )
  );

-- ===========================================================================
-- REACTIONS — read on public targets (only if the table exists)
-- ===========================================================================
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
              WHERE a.id = reactions.target_id::uuid
                AND a.visibility = 'public'
            )
          )
          OR (
            target_type = 'photo'
            AND EXISTS (
              SELECT 1
              FROM public.photos p
              JOIN public.albums a ON a.id = p.album_id
              WHERE p.id = reactions.target_id::uuid
                AND a.visibility = 'public'
            )
          )
        )
    $POLICY$;
  END IF;
END $$;

-- ===========================================================================
-- Drop the functional (id::text) indexes added by migration 57. The uuid=uuid
-- comparison above uses the regular primary-key index, so these are dead weight
-- (extra write cost on every album/photo insert/update for no read benefit).
-- ===========================================================================
DROP INDEX IF EXISTS public.idx_albums_id_text;
DROP INDEX IF EXISTS public.idx_photos_id_text;

COMMIT;

-- ===========================================================================
-- VERIFY (run after applying)
-- ===========================================================================
-- 1. Confirm the per-row EXISTS now does an Index Scan on albums_pkey instead
--    of a Seq Scan. Pick a real public album uuid for <id>:
--
--      EXPLAIN ANALYZE
--      SELECT id FROM public.likes
--      WHERE target_type = 'album' AND target_id = '<id>'::uuid;
--
--    The plan should reference albums_pkey and finish in single-digit ms.
--
-- 2. (Optional) The like/comment/reaction WRITE path was NOT changed here. If
--    liking/commenting on a public album fails in prod, the INSERT policies may
--    still reference the dropped public.clerk_user_id() (migration 39 dropped
--    that function but its committed body only restored the albums/photos read
--    policies). Inspect the live policies before fixing writes:
--
--      SELECT policyname, cmd, qual, with_check
--      FROM pg_policies
--      WHERE schemaname = 'public'
--        AND tablename IN ('likes','comments','reactions')
--      ORDER BY tablename, cmd, policyname;
--
--    The correct Supabase-native check is `user_id = auth.uid()` (NOT
--    clerk_user_id()). Send the output and a follow-up migration can repair the
--    write policies with the right user-id type for prod.
