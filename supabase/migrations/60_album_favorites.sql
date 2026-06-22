-- 60_album_favorites.sql
--
-- Adds a "favourite album" flag so a user can mark their OWN album as a
-- favourite. This is the foundation the "Travel Blend" feature consumes
-- (it reads each user's favourited albums to build the blend).
--
-- Storage model: a single boolean column on `albums`. Favourite is an
-- owner-private signal scoped to the album row itself, so no separate
-- join table is needed.
--
-- RLS: no changes required.
--   * Toggling is an UPDATE on the user's own album row — already governed
--     by the existing owner UPDATE policy on `albums`.
--   * The column is returned by the existing public/owner SELECT policies,
--     so the Travel Blend reader sees it wherever it can already read albums.
--
-- Idempotent and safe to re-run.

-- --- COLUMN: is_favorite ----------------------------------------------------
-- Default false so every existing album is "not favourited" without a backfill.
ALTER TABLE public.albums
  ADD COLUMN IF NOT EXISTS is_favorite boolean NOT NULL DEFAULT false;

-- --- INDEX: fast favourite lookups per user ---------------------------------
-- Partial index keeps it tiny (only favourited rows are indexed) and makes
-- "this user's favourite albums" lookups — the Travel Blend query shape —
-- an index-only scan.
CREATE INDEX IF NOT EXISTS idx_albums_user_favorite
  ON public.albums (user_id)
  WHERE is_favorite = true;
