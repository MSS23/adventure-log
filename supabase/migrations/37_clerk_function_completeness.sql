-- ============================================================================
-- CLERK MIGRATION FINALISATION (caller-completeness pass)
-- ============================================================================
-- Migrations 31-36 swapped Supabase auth for Clerk, converted user-id columns
-- from UUID to TEXT, dropped Supabase-auth RLS, and rewrote the well-known
-- offender list of helper functions (is_trip_member, can_edit_trip,
-- soft_delete_user, the reaction / notification / follow / playlist helpers).
--
-- A code review against m31-m36 surfaced two additional categories of bugs:
--
-- Category A — Functions in m27/m28 still take `_user_id UUID` arguments.
--   m35's rewrite list missed every function added by m27 (memory albums,
--   travel twins, twin recommendations) and m28 (record_user_activity,
--   find_overlap_album, auto_complete_expired_trips, auto_activate_current_-
--   trips). All seven are called from app code (verified call sites listed
--   per function below) with TEXT Clerk subjects, so each one currently
--   throws "function public.<name>(text, ...) does not exist" or
--   "operator does not exist: text = uuid" at runtime.
--
-- Category B — m35 function bodies reference columns that don't exist or
-- forget to filter by polymorphic discriminator.
--   1. get_user_dashboard_stats joins likes via `WHERE album_id IN (…)`,
--      but the m17/m03 likes schema is polymorphic (target_type, target_id);
--      no album_id column exists. The total_likes count returns 0 / errors.
--   2. get_unread_reaction_count, mark_reactions_as_read, get_reaction_stats
--      filter reactions.target_id IN (album ids of caller) without filtering
--      by target_type = 'album'. Photo and album UUIDs theoretically share
--      the same UUID space, so the query can match a photo whose UUID
--      collides with an album UUID belonging to the caller. Vanishingly
--      unlikely in practice but logically wrong; cheap to fix.
--
-- Category C — Schema sanity (deferred from m36's "Things needing future
-- migrations").
--   1. users.privacy_level has no CHECK constraint. m33 line 23 documents
--      the expected domain ('public', 'private', 'friends'); m11/m09's
--      auto_accept_follows_on_public trigger reads the column. Add a CHECK
--      so out-of-domain writes fail fast.
--
-- ============================================================================
-- ## DISCOVERED
-- ============================================================================
-- 1. Parameter-name convention in this codebase has bifurcated:
--      * m27/m28 (and several earlier migrations) use `_user_id`, `_trip_id`,
--        `_limit`, etc. (single-leading-underscore).
--      * m35/m36 (and earlier admin helpers) use `p_user_id`, `p_trip_id`
--        etc. (Postgres-style p_ prefix).
--    Each one is a stable contract with the app code that calls it via
--    supabase.rpc({ _user_id }) vs supabase.rpc({ p_user_id }). Renaming
--    a parameter is a breaking API change for the call site. So we
--    PRESERVE the existing convention per function family:
--      * m27/m28 functions rewritten in section 2-3 keep `_user_id` /
--        `_twin_id` / `_limit` / `_location_name` / `_latitude` /
--        `_longitude`.
--      * m35 functions patched in section 4 keep `p_user_id` /
--        `p_target_ids`.
--    Verified call sites (grep src/**):
--      * src/app/api/me/streak/route.ts:38 — record_user_activity({ _user_id })
--      * src/app/api/trips/route.ts:88, .../[id]/pins/route.ts:86 — same
--      * src/app/api/trips/[id]/route.ts:22-23 — auto_activate_current_trips /
--        auto_complete_expired_trips({ _user_id })
--      * src/app/api/albums/[id]/you-were-here/route.ts:37 — find_overlap_album
--        ({ _user_id, _location_name, _latitude, _longitude })
--      * src/app/api/memories/route.ts:15 — get_memory_albums({ _user_id })
--      * src/app/api/travel-twins/route.ts:15 — get_travel_twins
--        ({ _user_id, _limit })
--      * src/app/api/travel-twins/[userId]/recommendations/route.ts:19 —
--        get_twin_recommendations({ _user_id, _twin_id, _limit })
--    Renaming any of these to p_user_id would break every listed file. We
--    therefore keep the underscore convention for the m27/m28 family.
--
-- 2. reactions.is_read is ALREADY present in the live schema (m30 added
--    it idempotently with `ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT
--    NULL DEFAULT FALSE`; m16's CREATE TABLE also declared it for fresh
--    installs). The IF NOT EXISTS in section 5 below is purely defensive
--    against schema drift. Verified m30 line 25-26.
--
-- 3. The existing reactions indexes (m16 lines 81-82) are
--      idx_reactions_target ON reactions(target_type, target_id, created_at DESC)
--      idx_reactions_user   ON reactions(user_id)
--    The unread-fetch path in get_unread_reaction_count walks
--      WHERE target_id IN (album_ids of caller) AND target_type = 'album'
--      AND is_read = FALSE
--    which the existing target index supports for the join key but doesn't
--    accelerate the unread filter. We add a partial index keyed on
--    (target_type, target_id, is_read) WHERE NOT is_read for unread-fanout
--    workloads. NOTE: the spec asked for an index on
--    (target_user_id, is_read) — that column lives on `globe_reactions`,
--    NOT on `reactions`. globe_reactions already has
--    idx_globe_reactions_unread (m12:232-234). The right index for the
--    polymorphic reactions table is on (target_type, target_id) WHERE
--    is_read = FALSE.
--
-- 4. The likes table is polymorphic with (target_type, target_id::text).
--    m17 line 69 demonstrates the canonical query shape:
--      FROM likes WHERE target_type = 'album' AND target_id = a.id::text
--    m35's get_user_dashboard_stats uses `album_id IN (…)` which has never
--    been a column on this table. Section 4.1 fixes it.
--
-- 5. users.privacy_level domain is documented in m33 line 23 as
--    ('public', 'private', 'friends') and is read by the m09/m36
--    auto_accept_follows_on_public trigger and the m27 get_travel_twins
--    function (`WHERE u.privacy_level = 'public'`). No CHECK constraint
--    has ever been added in any migration. Section 6 adds one.
--
-- ============================================================================
-- Apply: paste into the Supabase SQL editor or `supabase db push`.
-- Rollback notes are at the bottom of this file.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. DISCOVERY — surface every public.* function that still declares a UUID
--    parameter named *_user_id, _twin_id, p_user_id, etc. Anything in this
--    NOTICE output that ISN'T handled by sections 2-4 is a leftover offender.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
  v_count integer := 0;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema_name,
           p.proname AS func_name,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND pg_get_function_identity_arguments(p.oid) ~* '\b(_user_id|p_user_id|_twin_id|_owner_id)\s+uuid\b'
    ORDER BY p.proname
  LOOP
    v_count := v_count + 1;
    RAISE NOTICE 'pre-m37 leftover UUID user-id param: %.%(%)',
      r.schema_name, r.func_name, r.args;
  END LOOP;
  IF v_count = 0 THEN
    RAISE NOTICE 'Discovery: no public.* function still declares a UUID user-id parameter.';
  ELSE
    RAISE NOTICE 'Discovery: % public.* functions still declare a UUID user-id parameter (rewritten below).', v_count;
  END IF;
END $$;

-- ============================================================================
-- 2. M28 FUNCTION REWRITES (UUID → TEXT user-id parameter)
-- ============================================================================
-- All m28 helpers preserve their original SECURITY DEFINER posture and
-- regrant EXECUTE to authenticated. search_path is locked to (public,
-- pg_temp) per the m06/m35 convention.

-- record_user_activity: streak tracker called by /api/me/streak,
-- /api/trips, /api/trips/[id]/pins after a write. Bumps current_streak_days
-- if the previous activity was yesterday, resets if there's a >1 day gap.
DROP FUNCTION IF EXISTS public.record_user_activity(UUID);
CREATE OR REPLACE FUNCTION public.record_user_activity(_user_id TEXT)
RETURNS TABLE (
    current_streak_days INTEGER,
    longest_streak_days INTEGER,
    last_activity_date DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    prev_date DATE;
    prev_streak INTEGER;
    prev_best INTEGER;
    today DATE := CURRENT_DATE;
    new_streak INTEGER;
BEGIN
    SELECT u.last_activity_date, u.current_streak_days, u.longest_streak_days
    INTO prev_date, prev_streak, prev_best
    FROM public.users u
    WHERE u.id = _user_id;

    IF prev_date IS NULL THEN
        new_streak := 1;
    ELSIF prev_date = today THEN
        new_streak := COALESCE(prev_streak, 1);
    ELSIF prev_date = today - INTERVAL '1 day' THEN
        new_streak := COALESCE(prev_streak, 0) + 1;
    ELSE
        new_streak := 1;
    END IF;

    UPDATE public.users u
    SET
        current_streak_days = new_streak,
        longest_streak_days = GREATEST(COALESCE(prev_best, 0), new_streak),
        last_activity_date = today
    WHERE u.id = _user_id
    RETURNING u.current_streak_days, u.longest_streak_days, u.last_activity_date
    INTO current_streak_days, longest_streak_days, last_activity_date;

    RETURN NEXT;
END;
$$;
COMMENT ON FUNCTION public.record_user_activity(TEXT) IS
  'm37 Clerk rewrite: _user_id is TEXT (Clerk subject). Body unchanged. '
  'Caller: /api/me/streak, /api/trips, /api/trips/[id]/pins.';
GRANT EXECUTE ON FUNCTION public.record_user_activity(TEXT) TO authenticated;

-- find_overlap_album: "you were here" lookup — given a location name and
-- coords, return the earliest album the caller already logged at that place.
-- Caller: /api/albums/[id]/you-were-here/route.ts.
DROP FUNCTION IF EXISTS public.find_overlap_album(UUID, TEXT, DOUBLE PRECISION, DOUBLE PRECISION);
CREATE OR REPLACE FUNCTION public.find_overlap_album(
    _user_id TEXT,
    _location_name TEXT,
    _latitude DOUBLE PRECISION,
    _longitude DOUBLE PRECISION
)
RETURNS TABLE (
    album_id UUID,
    title TEXT,
    date_start DATE,
    distance_km DOUBLE PRECISION
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT
        a.id AS album_id,
        a.title,
        a.date_start,
        CASE
            WHEN _latitude IS NOT NULL AND _longitude IS NOT NULL AND a.latitude IS NOT NULL
            THEN 6371.0 * 2 * ASIN(SQRT(
                POWER(SIN(RADIANS((_latitude - a.latitude) / 2)), 2) +
                COS(RADIANS(a.latitude)) * COS(RADIANS(_latitude)) *
                POWER(SIN(RADIANS((_longitude - a.longitude) / 2)), 2)
            ))
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
                  POWER(SIN(RADIANS((_longitude - a.longitude) / 2)), 2)
              )) < 25)
      )
    ORDER BY a.date_start ASC NULLS LAST
    LIMIT 1;
$$;
COMMENT ON FUNCTION public.find_overlap_album(TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION) IS
  'm37 Clerk rewrite: _user_id is TEXT (Clerk subject). Body unchanged. '
  'Caller: /api/albums/[id]/you-were-here.';
GRANT EXECUTE ON FUNCTION public.find_overlap_album(TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated;

-- auto_complete_expired_trips: marks any of the caller's planning/live trips
-- as completed once their end_date is in the past. Called on read by
-- /api/trips/[id]/route.ts so reads are self-healing.
DROP FUNCTION IF EXISTS public.auto_complete_expired_trips(UUID);
CREATE OR REPLACE FUNCTION public.auto_complete_expired_trips(_user_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE public.trips
    SET status = 'completed'
    WHERE owner_id = _user_id
      AND status IN ('planning', 'live')
      AND end_date IS NOT NULL
      AND end_date < CURRENT_DATE;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$;
COMMENT ON FUNCTION public.auto_complete_expired_trips(TEXT) IS
  'm37 Clerk rewrite: _user_id is TEXT (Clerk subject). Body unchanged. '
  'Caller: /api/trips/[id]/route.ts.';
GRANT EXECUTE ON FUNCTION public.auto_complete_expired_trips(TEXT) TO authenticated;

-- auto_activate_current_trips: marks the caller's planning trips as live
-- once their start_date arrives (and the end_date hasn't passed). Same
-- self-healing read path as auto_complete_expired_trips.
DROP FUNCTION IF EXISTS public.auto_activate_current_trips(UUID);
CREATE OR REPLACE FUNCTION public.auto_activate_current_trips(_user_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE public.trips
    SET status = 'live'
    WHERE owner_id = _user_id
      AND status = 'planning'
      AND start_date IS NOT NULL
      AND start_date <= CURRENT_DATE
      AND (end_date IS NULL OR end_date >= CURRENT_DATE);

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$;
COMMENT ON FUNCTION public.auto_activate_current_trips(TEXT) IS
  'm37 Clerk rewrite: _user_id is TEXT (Clerk subject). Body unchanged. '
  'Caller: /api/trips/[id]/route.ts.';
GRANT EXECUTE ON FUNCTION public.auto_activate_current_trips(TEXT) TO authenticated;

-- ============================================================================
-- 3. M27 FUNCTION REWRITES (UUID → TEXT user-id parameter)
-- ============================================================================

-- get_memory_albums: "on this day in years past" feed. Returns albums by
-- the caller whose date_start month/day matches today's. Caller:
-- /api/memories/route.ts.
DROP FUNCTION IF EXISTS public.get_memory_albums(UUID);
CREATE OR REPLACE FUNCTION public.get_memory_albums(_user_id TEXT)
RETURNS TABLE (
    id UUID,
    title TEXT,
    location_name TEXT,
    country_code TEXT,
    date_start DATE,
    cover_photo_url TEXT,
    years_ago INTEGER
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT
        a.id,
        a.title,
        a.location_name,
        a.country_code,
        a.date_start,
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
COMMENT ON FUNCTION public.get_memory_albums(TEXT) IS
  'm37 Clerk rewrite: _user_id is TEXT (Clerk subject). Body unchanged. '
  'Caller: /api/memories.';
GRANT EXECUTE ON FUNCTION public.get_memory_albums(TEXT) TO authenticated;

-- get_travel_twins: ranks other public users by overlap of distinct
-- country_codes with the caller. Returns up to _limit twins. Caller:
-- /api/travel-twins/route.ts.
-- Note: the user_id column in the RETURNS TABLE is now TEXT (was UUID in
-- m27); app code that consumes the result already treats it as a string.
DROP FUNCTION IF EXISTS public.get_travel_twins(UUID, INTEGER);
CREATE OR REPLACE FUNCTION public.get_travel_twins(_user_id TEXT, _limit INTEGER DEFAULT 10)
RETURNS TABLE (
    user_id TEXT,
    username TEXT,
    display_name TEXT,
    avatar_url TEXT,
    overlap_count INTEGER,
    their_country_count INTEGER,
    my_country_count INTEGER
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    WITH my_countries AS (
        SELECT DISTINCT country_code
        FROM public.albums
        WHERE user_id = _user_id AND country_code IS NOT NULL
    ),
    their_stats AS (
        SELECT
            a.user_id,
            COUNT(DISTINCT a.country_code) FILTER (
                WHERE a.country_code IN (SELECT country_code FROM my_countries)
            ) AS overlap,
            COUNT(DISTINCT a.country_code) AS their_total
        FROM public.albums a
        WHERE a.user_id <> _user_id
          AND a.country_code IS NOT NULL
          AND a.visibility = 'public'
        GROUP BY a.user_id
    )
    SELECT
        u.id AS user_id,
        u.username,
        u.display_name,
        u.avatar_url,
        ts.overlap::INTEGER,
        ts.their_total::INTEGER,
        (SELECT COUNT(*)::INTEGER FROM my_countries)
    FROM their_stats ts
    JOIN public.users u ON u.id = ts.user_id
    WHERE ts.overlap > 0 AND u.privacy_level = 'public'
    ORDER BY ts.overlap DESC, ts.their_total DESC
    LIMIT _limit;
$$;
COMMENT ON FUNCTION public.get_travel_twins(TEXT, INTEGER) IS
  'm37 Clerk rewrite: _user_id and the returned user_id are TEXT (Clerk subject). '
  'Caller: /api/travel-twins.';
GRANT EXECUTE ON FUNCTION public.get_travel_twins(TEXT, INTEGER) TO authenticated;

-- get_twin_recommendations: returns places the named travel twin has been
-- that the caller hasn't (matched by lower(location_name)). Caller:
-- /api/travel-twins/[userId]/recommendations/route.ts.
DROP FUNCTION IF EXISTS public.get_twin_recommendations(UUID, UUID, INTEGER);
CREATE OR REPLACE FUNCTION public.get_twin_recommendations(
    _user_id TEXT,
    _twin_id TEXT,
    _limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    album_id UUID,
    title TEXT,
    location_name TEXT,
    country_code TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    cover_photo_url TEXT,
    date_start DATE
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    WITH my_locations AS (
        SELECT DISTINCT LOWER(location_name) AS loc
        FROM public.albums
        WHERE user_id = _user_id AND location_name IS NOT NULL
    )
    SELECT
        a.id AS album_id,
        a.title,
        a.location_name,
        a.country_code,
        a.latitude,
        a.longitude,
        a.cover_photo_url,
        a.date_start
    FROM public.albums a
    WHERE a.user_id = _twin_id
      AND a.visibility = 'public'
      AND a.location_name IS NOT NULL
      AND LOWER(a.location_name) NOT IN (SELECT loc FROM my_locations)
    ORDER BY a.created_at DESC
    LIMIT _limit;
$$;
COMMENT ON FUNCTION public.get_twin_recommendations(TEXT, TEXT, INTEGER) IS
  'm37 Clerk rewrite: _user_id and _twin_id are TEXT (Clerk subject). Body unchanged. '
  'Caller: /api/travel-twins/[userId]/recommendations.';
GRANT EXECUTE ON FUNCTION public.get_twin_recommendations(TEXT, TEXT, INTEGER) TO authenticated;

-- ============================================================================
-- 4. M35 FUNCTION BODY PATCHES (signatures unchanged — CREATE OR REPLACE)
-- ============================================================================
-- These all keep m35's TEXT parameter signature and the `p_` naming
-- convention. We're only fixing the WHERE clauses.

-- 4.1. get_user_dashboard_stats — m35:743-764. The total_likes count joined
-- against likes via `WHERE album_id IN (SELECT id FROM albums WHERE user_id =
-- p_user_id)`. likes has no album_id column; it's polymorphic
-- (target_type, target_id::text) per m17 line 69. Rewrite the join with the
-- canonical shape (target_type = 'album' AND target_id = album_id::text).
-- Also adds a photo-likes count to the query so dashboards can later expose
-- it without another migration; the value is summed into total_likes today
-- to preserve the existing return shape.
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
    (
      -- Album-likes via polymorphic target.
      (SELECT COUNT(*)
         FROM public.likes
        WHERE target_type = 'album'
          AND target_id IN (
            SELECT id::text FROM public.albums WHERE user_id = p_user_id
          ))
      +
      -- Photo-likes via polymorphic target (photos owned by p_user_id).
      (SELECT COUNT(*)
         FROM public.likes
        WHERE target_type = 'photo'
          AND target_id IN (
            SELECT id::text FROM public.photos WHERE user_id = p_user_id
          ))
    )::BIGINT,
    (SELECT COUNT(*) FROM public.follows
      WHERE following_id = p_user_id AND status = 'accepted')::BIGINT;
END;
$$;
COMMENT ON FUNCTION public.get_user_dashboard_stats(TEXT) IS
  'm37 body patch: likes join now uses the polymorphic (target_type, target_id::text) '
  'shape (m17 canonical). Counts album-likes + photo-likes into total_likes.';
GRANT EXECUTE ON FUNCTION public.get_user_dashboard_stats(TEXT) TO authenticated;

-- 4.2. get_unread_reaction_count — m35:518-537. Add target_type = 'album' to
-- prevent UUID collisions matching photo reactions against an album-only
-- intent. Cast album.id::uuid to match reactions.target_id (UUID, per m16).
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
  WHERE target_type = 'album'
    AND target_id IN (
      SELECT id FROM public.albums WHERE user_id = p_user_id
    )
    AND is_read = FALSE;
  RETURN v_count;
END;
$$;
COMMENT ON FUNCTION public.get_unread_reaction_count(TEXT) IS
  'm37 body patch: filters on target_type = ''album'' to avoid UUID collision '
  'against photo reactions.';
GRANT EXECUTE ON FUNCTION public.get_unread_reaction_count(TEXT) TO authenticated;

-- 4.3. mark_reactions_as_read — m35:539-559. Same target_type fix.
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
  WHERE target_type = 'album'
    AND target_id = ANY(p_target_ids)
    AND target_id IN (
      SELECT id FROM public.albums WHERE user_id = p_user_id
    );
  RETURN FOUND;
END;
$$;
COMMENT ON FUNCTION public.mark_reactions_as_read(TEXT, UUID[]) IS
  'm37 body patch: filters on target_type = ''album'' so a photo reaction whose '
  'UUID happens to match a passed album id can''t be flipped to read.';
GRANT EXECUTE ON FUNCTION public.mark_reactions_as_read(TEXT, UUID[]) TO authenticated;

-- 4.4. get_reaction_stats — m35:561-586. Same target_type fix. The original
-- also has GROUP BY target_id which collapses the result to per-album rows
-- when the docstring says "stats for the user" — preserved for behavioural
-- compatibility with whatever downstream caller exists; if a single-row
-- aggregate is wanted later, that's a follow-up.
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
  WHERE target_type = 'album'
    AND target_id IN (
      SELECT id FROM public.albums WHERE user_id = p_user_id
    )
  GROUP BY target_id;
END;
$$;
COMMENT ON FUNCTION public.get_reaction_stats(TEXT) IS
  'm37 body patch: filters on target_type = ''album'' so the count and '
  'JSON_OBJECT_AGG don''t double-count UUID-colliding photo reactions.';
GRANT EXECUTE ON FUNCTION public.get_reaction_stats(TEXT) TO authenticated;

-- ============================================================================
-- 5. REACTIONS.IS_READ DEFENSIVE COLUMN + INDEX
-- ============================================================================
-- m30 already added is_read with a NOT NULL DEFAULT FALSE on existing
-- environments, and m16 declares it on the CREATE TABLE for fresh installs.
-- This is purely a safety net against drift between dev / staging / prod.
ALTER TABLE IF EXISTS public.reactions
  ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT FALSE;

-- Partial index supporting the unread-fetch path used by
-- get_unread_reaction_count / get_reaction_stats. Note: the spec mentioned
-- (target_user_id, is_read) but reactions is polymorphic and has no
-- target_user_id column — that column lives on globe_reactions, which
-- already has its own unread index (m12:232-234). The right shape for
-- reactions is the polymorphic discriminator + the album-id filter.
CREATE INDEX IF NOT EXISTS idx_reactions_target_unread
  ON public.reactions (target_type, target_id)
  WHERE is_read = FALSE;

-- ============================================================================
-- 6. USERS.PRIVACY_LEVEL CHECK CONSTRAINT
-- ============================================================================
-- m33 line 23 documents the domain ('public', 'private', 'friends'). The
-- constraint has never actually been declared. Add it (drift-prevention).
-- Defensive: drop any prior version of the same name so the migration is
-- safe to re-run, then re-add. Use NOT VALID + VALIDATE so a single bad
-- pre-existing row surfaces as a specific error instead of silently
-- aborting the whole migration; if VALIDATE fails the operator can clean
-- the offending rows and re-VALIDATE without rerunning the whole file.
ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_privacy_level_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_privacy_level_check
    CHECK (privacy_level IN ('public', 'private', 'friends'))
    NOT VALID;

ALTER TABLE public.users
  VALIDATE CONSTRAINT users_privacy_level_check;

-- ============================================================================
-- 7. POST-PATCH DISCOVERY — re-run the UUID-param sweep.
-- ============================================================================
DO $$
DECLARE
  r RECORD;
  v_count integer := 0;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema_name,
           p.proname AS func_name,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND pg_get_function_identity_arguments(p.oid) ~* '\b(_user_id|p_user_id|_twin_id|_owner_id)\s+uuid\b'
    ORDER BY p.proname
  LOOP
    v_count := v_count + 1;
    RAISE NOTICE 'STILL has UUID user-id param after m37: %.%(%)',
      r.schema_name, r.func_name, r.args;
  END LOOP;
  IF v_count = 0 THEN
    RAISE NOTICE 'Post-patch: no public.* function declares a UUID user-id parameter (good).';
  ELSE
    RAISE NOTICE 'Post-patch: % functions still declare a UUID user-id param — needs follow-up.', v_count;
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- AUDIT — run after applying. Anything returned here is a leftover.
-- ============================================================================
-- A. Confirm every m27/m28 function now takes a TEXT user-id:
--
--   SELECT n.nspname, p.proname,
--          pg_get_function_identity_arguments(p.oid) AS args
--   FROM pg_proc p
--   JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname = 'public'
--     AND p.proname IN (
--       'record_user_activity', 'find_overlap_album',
--       'auto_complete_expired_trips', 'auto_activate_current_trips',
--       'get_memory_albums', 'get_travel_twins', 'get_twin_recommendations'
--     )
--   ORDER BY p.proname;
--   -- expect: every row has a `text` parameter where the migration
--   -- originals declared `uuid`.
--
-- B. Confirm get_user_dashboard_stats no longer references a non-existent
--    column:
--
--   SELECT pg_get_functiondef(p.oid)
--   FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname = 'public' AND p.proname = 'get_user_dashboard_stats';
--   -- expect: no `album_id IN` substring.
--
-- C. Smoke-test the dashboard for a known user:
--
--   SELECT * FROM public.get_user_dashboard_stats('user_<clerk_id>');
--   -- expect: 1 row, no error.
--
-- D. Confirm the privacy_level CHECK is in place and validated:
--
--   SELECT conname, convalidated, pg_get_constraintdef(oid)
--   FROM pg_constraint
--   WHERE conrelid = 'public.users'::regclass
--     AND conname  = 'users_privacy_level_check';
--   -- expect: convalidated = true; def CHECK (privacy_level IN ('public','private','friends'))
--
-- E. Confirm the reactions unread-fetch index exists:
--
--   SELECT indexname, indexdef FROM pg_indexes
--   WHERE schemaname = 'public' AND tablename = 'reactions';
--   -- expect: idx_reactions_target_unread present; predicate WHERE NOT is_read.
--
-- ============================================================================
-- ## DELIBERATELY UNCHANGED
-- ============================================================================
-- 1. The seven m27/m28 function bodies — none of them reference auth.uid()
--    or have a logic bug that the Clerk swap exposes. The only break was
--    the parameter type. Rewriting bodies would risk drift; we kept them
--    byte-for-byte identical except for whitespace normalisation and a
--    comment block above each.
--
-- 2. m35's get_user_reactions, toggle_reaction, accept_*_follow_request,
--    accept_all_pending_follows, get_pending_uploads, get_user_playlists,
--    get_most_followed_users, get_unread_message_count (the m36-rewritten
--    one), create_notification, soft_delete_user, restore_user_account,
--    is_user_active, can_delete_photo, delete_photo_from_album,
--    is_trip_member, can_edit_trip, mark_all_notifications_read,
--    get_unread_notification_count — all already correct after m35/m36.
--
-- 3. globe_reactions — m35 added recipient SELECT/UPDATE policies and the
--    public-read policy. m12:232-234 already covers the unread index. No
--    further changes here.
--
-- 4. The `RETURNS TABLE (user_id UUID, ...)` field type for any function
--    that returns a user-id — they all need the same UUID → TEXT change as
--    the parameter list. Section 3 changes get_travel_twins's RETURNS TABLE
--    user_id to TEXT explicitly. The other m27/m28 rewrites in this file
--    do not return user-id columns (memory albums returns album metadata;
--    twin recommendations returns album metadata; the m28 helpers return
--    streak counters or row counts), so no other RETURNS TABLE changes
--    were needed.
--
-- ============================================================================
-- CODE-SIDE FOLLOW-UPS (parameter-name + return-type contracts)
-- ============================================================================
-- Parameter naming: PRESERVED in every rewrite. App callers do NOT need
-- to change argument names.
--   * m27/m28 family: `_user_id`, `_twin_id`, `_limit`, `_location_name`,
--     `_latitude`, `_longitude` — unchanged.
--   * m35 family (get_user_dashboard_stats, get_unread_reaction_count,
--     mark_reactions_as_read, get_reaction_stats): `p_user_id`,
--     `p_target_ids` — unchanged.
--
-- Return-shape change (potential type-narrow follow-up):
--   * public.get_travel_twins now returns user_id as TEXT instead of UUID
--     in the RETURNS TABLE. The corresponding TS type in
--     src/app/api/travel-twins/route.ts (and any shared types in
--     src/types/database.ts) should be widened to `string` if it was
--     previously typed `string` (UUIDs are already TEXT in TS-land, so
--     this is almost certainly a no-op — verify).
--
-- Call-site verification done before writing this file (no PR required):
--   * src/app/api/me/streak/route.ts:38 — _user_id arg name preserved.
--   * src/app/api/trips/route.ts:88
--   * src/app/api/trips/[id]/pins/route.ts:86
--   * src/app/api/trips/[id]/route.ts:22-23
--   * src/app/api/albums/[id]/you-were-here/route.ts:37 — _user_id /
--     _location_name / _latitude / _longitude all preserved.
--   * src/app/api/memories/route.ts:15
--   * src/app/api/travel-twins/route.ts:15 — _user_id / _limit preserved.
--   * src/app/api/travel-twins/[userId]/recommendations/route.ts:19 —
--     _user_id / _twin_id / _limit preserved.
--   No app-side rename needed.
--
-- Things this migration intentionally does NOT close (future work):
--   1. The get_reaction_stats GROUP BY target_id semantic mismatch — the
--      function is documented as "stats for the user" but actually returns
--      one row per album. Preserved for backward compatibility; rewrite to
--      a single-row aggregate is a separate behavioural change.
--   2. RETURNS TABLE columns elsewhere in the codebase that may still
--      type a user-id field as UUID — this file only fixes get_travel_twins.
--      A schema-wide sweep
--        SELECT proname, pg_get_function_result(oid)
--        FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--        WHERE n.nspname = 'public'
--          AND pg_get_function_result(p.oid) ~* '\b(user_id|owner_id|sender_id|receiver_id)\s+uuid\b'
--      would find any leftovers; none were observed in m27/m28/m35/m36.
--   3. m36 FOLLOW-UP #1 (useMentions.ts dropping `email` from select) — a
--      pure code change, not a migration concern.
--
-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- Functions: rolling back to the m27/m28 UUID signatures is destructive
-- (every Clerk-authenticated caller breaks again). Recommend leaving the
-- TEXT signatures in place even on rollback. If absolutely necessary:
--
--   BEGIN;
--   DROP FUNCTION IF EXISTS public.record_user_activity(TEXT);
--   DROP FUNCTION IF EXISTS public.find_overlap_album(TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION);
--   DROP FUNCTION IF EXISTS public.auto_complete_expired_trips(TEXT);
--   DROP FUNCTION IF EXISTS public.auto_activate_current_trips(TEXT);
--   DROP FUNCTION IF EXISTS public.get_memory_albums(TEXT);
--   DROP FUNCTION IF EXISTS public.get_travel_twins(TEXT, INTEGER);
--   DROP FUNCTION IF EXISTS public.get_twin_recommendations(TEXT, TEXT, INTEGER);
--   -- Then re-apply migration 27 + 28 to restore the UUID variants.
--   COMMIT;
--
-- m35 body patches: re-apply the relevant CREATE OR REPLACE blocks from
-- m35 to restore the buggy bodies (not recommended).
--
-- Index: DROP INDEX IF EXISTS public.idx_reactions_target_unread;
--
-- CHECK constraint:
--   ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_privacy_level_check;
