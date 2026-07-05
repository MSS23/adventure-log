-- ============================================================================
-- Migration 77: home location visibility toggle + public read RPC
-- ============================================================================
--
-- WHAT & WHY:
--   Migration 76 locked down public.users so that home_latitude/home_longitude
--   (precise-ish, city-level home coordinates) are NOT readable by anon/
--   authenticated — they were self-only, used for distance stats.
--
--   Users now want to OPT IN to showing their base location on their globe /
--   profile ("home hub" — the point every travel line radiates from). This
--   migration adds:
--
--     1. users.home_location_is_public  — per-user opt-in flag, default FALSE
--        (existing users stay private; matches the prior "never shown" promise).
--        The boolean itself is safe to expose, so it is granted to clients.
--
--     2. get_public_home_location(uuid) — SECURITY DEFINER RPC that returns the
--        home city/country/coordinates for a user ONLY when that user has
--        opted in. Column-level GRANTs cannot be made row-conditional, so a
--        DEFINER function guarded by the flag is the correct shape: it never
--        leaks a private user's coordinates, while still letting the globe of
--        an opted-in user render its home hub to visitors.
--
--   The owner's own coordinates keep flowing through get_my_profile() (m76),
--   so a user always sees their OWN home hub regardless of this flag.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Opt-in flag
-- ----------------------------------------------------------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS home_location_is_public boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.users.home_location_is_public IS
  'When true, the user opted in to showing their base/home location (city-level '
  'home_latitude/home_longitude) on their globe and profile to other viewers. '
  'Default false preserves the migration-76 self-only privacy of home coords. '
  'Read by other users via get_public_home_location(); never exposes coords '
  'directly (home_latitude/home_longitude remain outside the m76 SELECT grant).';

-- The flag is not sensitive — grant SELECT so clients can tell whether a
-- profile advertises a public base. (Additive to the m76 allowlist grant.)
GRANT SELECT (home_location_is_public) ON public.users TO anon, authenticated;


-- ----------------------------------------------------------------------------
-- 2. get_public_home_location() — opt-in-gated public read of home coords
-- ----------------------------------------------------------------------------
-- Returns AT MOST one row, and only when the target user has flipped the flag.
-- SECURITY DEFINER bypasses the column grants (home_latitude/home_longitude are
-- not client-readable), but the WHERE home_location_is_public predicate ensures
-- private users' coordinates are never returned. NULL coords (user set the flag
-- but never geocoded a home) simply yield no useful hub — callers handle that.
CREATE OR REPLACE FUNCTION public.get_public_home_location(p_user_id uuid)
RETURNS TABLE (
  home_city      text,
  home_country   text,
  home_latitude  double precision,
  home_longitude double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT u.home_city, u.home_country, u.home_latitude, u.home_longitude
  FROM public.users u
  WHERE u.id = p_user_id
    AND u.home_location_is_public = true
    AND u.deleted_at IS NULL
    AND u.home_latitude IS NOT NULL
    AND u.home_longitude IS NOT NULL
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.get_public_home_location(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_home_location(uuid) TO anon, authenticated;

COMMENT ON FUNCTION public.get_public_home_location(uuid) IS
  'Returns a user''s home city/country/coordinates ONLY when they have set '
  'home_location_is_public = true. SECURITY DEFINER so it can read the '
  'coordinate columns excluded from the migration-76 SELECT grant, gated by '
  'the opt-in flag so private users'' coordinates are never exposed.';


-- ============================================================================
-- VERIFY (run after applying)
-- ============================================================================
--   -- As a normal signed-in user against another user's id:
--   select * from get_public_home_location('<opted-in-user-uuid>');   -- 1 row
--   select * from get_public_home_location('<private-user-uuid>');    -- 0 rows
--   -- Coordinates still not directly selectable:
--   select home_latitude from users limit 1;   -- 42501 permission denied
--   -- Flag is readable:
--   select home_location_is_public from users limit 1;   -- ok
-- ============================================================================
