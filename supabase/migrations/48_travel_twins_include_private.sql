-- ============================================================================
-- Migration: Travel Twins — include private accounts (privacy-safe)
-- ============================================================================
-- Depends on: 47_account_privacy_visibility.sql (account-level privacy model).
--
-- Product intent (from the owner):
--   "Travel Twins should show ALL accounts — public OR private — where you've
--    been to similar places, and you can choose to follow them. If they're
--    public, clicking the profile shows their albums. If they're private, it
--    takes you to a Follow / request screen (Instagram-style)."
--
-- Two SECURITY DEFINER functions back this feature. Because they run as the
-- definer they BYPASS RLS, so privacy must be enforced inside the SQL:
--
--   * get_travel_twins        — MATCHING. Now includes private accounts. The
--     match is computed on aggregate country overlap only (counts, never album
--     rows), so no private content is exposed. Per-album 'private' is excluded
--     from the count so a "just for me" album never leaks even in aggregate.
--
--   * get_twin_recommendations — CONTENT. Returns the twin's actual albums for
--     the right-hand "places they've been" panel. This MUST stay private-safe:
--     a private twin's albums are only returned to an ACCEPTED follower. A
--     public twin's public albums are returned to anyone (unchanged).
--
-- Idempotent: safe to re-run.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- get_travel_twins — drop the `privacy_level = 'public'` gate so private
-- accounts surface as twins. Adds `privacy_level` to the result so the UI can
-- show a lock + route private twins to the gated follow screen.
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_travel_twins(UUID, INTEGER);
CREATE OR REPLACE FUNCTION public.get_travel_twins(_user_id UUID, _limit INTEGER DEFAULT 10)
RETURNS TABLE (
  user_id UUID, username TEXT, display_name TEXT, avatar_url TEXT,
  overlap_count INTEGER, their_country_count INTEGER, my_country_count INTEGER,
  privacy_level TEXT
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
    WHERE a.user_id <> _user_id
      AND a.country_code IS NOT NULL
      AND a.visibility <> 'private'   -- per-album "just for me" never counts
    GROUP BY a.user_id
  )
  SELECT u.id AS user_id, u.username, u.display_name, u.avatar_url,
         ts.overlap::INTEGER, ts.their_total::INTEGER,
         (SELECT COUNT(*)::INTEGER FROM my_countries),
         u.privacy_level
  FROM their_stats ts
  JOIN public.users u ON u.id = ts.user_id
  WHERE ts.overlap > 0           -- public AND private accounts both qualify
  ORDER BY ts.overlap DESC, ts.their_total DESC
  LIMIT _limit;
$$;
GRANT EXECUTE ON FUNCTION public.get_travel_twins(UUID, INTEGER) TO authenticated;

-- ----------------------------------------------------------------------------
-- get_twin_recommendations — privacy-safe album reveal. Returns the twin's
-- albums only when the viewer is allowed to see them:
--   * twin's account is public  → their public albums (anyone), OR
--   * viewer is an ACCEPTED follower → the twin's non-private albums.
-- A private twin the viewer hasn't been accepted by yields zero rows (the UI
-- shows a "follow to unlock" hint).
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_twin_recommendations(UUID, UUID, INTEGER);
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
  ),
  access AS (
    SELECT
      (SELECT privacy_level FROM public.users WHERE id = _twin_id) = 'public'
        AS twin_is_public,
      EXISTS (
        SELECT 1 FROM public.follows f
        WHERE f.follower_id  = _user_id
          AND f.following_id = _twin_id
          AND f.status       = 'accepted'
      ) AS viewer_is_follower
  )
  SELECT a.id AS album_id, a.title, a.location_name, a.country_code,
         a.latitude, a.longitude, a.cover_photo_url, a.date_start
  FROM public.albums a, access ac
  WHERE a.user_id = _twin_id
    AND a.location_name IS NOT NULL
    AND LOWER(a.location_name) NOT IN (SELECT loc FROM my_locations)
    AND (
      (ac.twin_is_public    AND a.visibility = 'public')
      OR
      (ac.viewer_is_follower AND a.visibility <> 'private')
    )
  ORDER BY a.created_at DESC
  LIMIT _limit;
$$;
GRANT EXECUTE ON FUNCTION public.get_twin_recommendations(UUID, UUID, INTEGER) TO authenticated;

COMMIT;
