-- 58_dedupe_likes_follows_unique.sql
--
-- Fixes two production error classes caused by DUPLICATE rows:
--
--   PGRST116 "Results contain 3 rows, ... requires 1 row"
--       -> checkIfLiked() did .maybeSingle() on likes; a user had multiple
--          like rows for the same album (no unique constraint existed).
--
--   406 on /follows?...&status=eq.accepted
--       -> follow-status checks do .maybeSingle(); duplicate follow rows for
--          the same (follower, following) pair make it error on "multiple rows".
--
-- Root cause: `likes` and `follows` never had a uniqueness guarantee, so retries
-- / double-taps / races inserted duplicates. This migration removes existing
-- duplicates (keeping the best row) and adds unique indexes to prevent new ones.
-- The unique indexes also speed up the per-target / per-pair lookups.
--
-- Idempotent and safe to re-run.

-- --- LIKES: keep the earliest row per (user, target) ------------------------
DELETE FROM public.likes l
WHERE l.id NOT IN (
  SELECT DISTINCT ON (user_id, target_type, target_id) id
  FROM public.likes
  ORDER BY user_id, target_type, target_id, created_at ASC
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_likes_user_target
  ON public.likes (user_id, target_type, target_id);

-- --- FOLLOWS: keep one row per (follower, following), preferring accepted ----
DELETE FROM public.follows f
WHERE f.id NOT IN (
  SELECT DISTINCT ON (follower_id, following_id) id
  FROM public.follows
  ORDER BY follower_id, following_id,
           (status = 'accepted') DESC,  -- prefer an accepted row over pending
           created_at ASC                -- then the earliest
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_follows_pair
  ON public.follows (follower_id, following_id);
