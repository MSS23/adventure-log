-- 57_fix_social_query_timeout.sql
--
-- Fixes production statement timeouts (Postgres 57014) when loading comments
-- and likes on an album/photo page, e.g.:
--   GET /rest/v1/comments?...&target_type=eq.album&target_id=eq.<uuid>   -> 500
--   GET /rest/v1/likes?...&target_type=eq.album&target_id=eq.<uuid>      -> 500
--
-- Two compounding causes:
--
-- 1. The base "filter by target" indexes from 12_production_indexes.sql may be
--    missing in production (migration drift). Without them the query scans the
--    entire likes/comments table and runs the RLS check on every row.
--
-- 2. The public-read RLS policies (likes_public_target_read /
--    comments_public_target_read) compare the indexed uuid PK cast to text:
--        a.id::text = likes.target_id::text
--    Casting the indexed column `a.id` to text means Postgres CANNOT use the
--    uuid primary-key index, so each per-row EXISTS check becomes a full seq
--    scan of `albums` (and `photos`). Combined with (1) this is O(rows × albums)
--    and blows past statement_timeout.
--
-- This migration is purely additive (indexes only) and idempotent — it does NOT
-- change any RLS policy or privacy semantics. It re-asserts the target indexes
-- and adds functional indexes matching the policy's `id::text` comparison so the
-- per-row EXISTS becomes an index seek instead of a seq scan.

-- --- Outer filter: likes / comments by polymorphic target -------------------
CREATE INDEX IF NOT EXISTS idx_likes_target
  ON public.likes (target_type, target_id);

CREATE INDEX IF NOT EXISTS idx_likes_target_created
  ON public.likes (target_type, target_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_comments_target
  ON public.comments (target_type, target_id);

CREATE INDEX IF NOT EXISTS idx_comments_target_created
  ON public.comments (target_type, target_id, created_at DESC);

-- --- Inner RLS subquery: albums/photos id compared as text ------------------
-- Functional indexes on (id::text) so the policy's
--   EXISTS (... WHERE a.id::text = likes.target_id::text AND a.visibility='public')
-- can index-seek instead of seq-scanning every album/photo per candidate row.
CREATE INDEX IF NOT EXISTS idx_albums_id_text
  ON public.albums ((id::text));

CREATE INDEX IF NOT EXISTS idx_photos_id_text
  ON public.photos ((id::text));

-- Help the visibility gate in those same policies.
CREATE INDEX IF NOT EXISTS idx_albums_visibility
  ON public.albums (visibility);
