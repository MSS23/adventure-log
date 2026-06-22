-- 59_harden_function_search_path.sql
--
-- Addresses Supabase database-linter SECURITY warnings:
--
-- 1) function_search_path_mutable (lint 0011) — SECURITY DEFINER / trigger
--    functions without a pinned search_path are vulnerable to search_path
--    hijacking. We pin `search_path = public, pg_temp` on every flagged
--    function. A DO-block over pg_proc handles every overload/signature so we
--    don't have to hand-write argument lists (and it's safe to re-run).
--
-- 2) trigger-only functions exposed as callable RPCs (lint 0028/0029) — these
--    are meant to fire as triggers, never to be called directly via
--    /rest/v1/rpc. Revoke EXECUTE from anon/authenticated; triggers still run
--    (they execute as the table owner regardless of these grants).
--
-- NOT touched here (deliberately):
--   * The app's SECURITY DEFINER RPCs that signed-in users legitimately call
--     (dashboard stats, notifications, reactions, follows, trips, AI usage,
--     username availability, album views, traveler suggestions, …). Revoking
--     EXECUTE on those would break the product. Review individually if desired.
--   * error_events_insert_any (anon error reporting is intentional).
--   * Leaked-password protection — enable in the Supabase Dashboard
--     (Authentication → Providers/Policies → "Leaked password protection").

-- --- 1) Pin search_path on every flagged function (all signatures) ----------
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'get_memory_albums',
        'auto_complete_expired_trips',
        'set_place_recommendation_updated_at',
        'can_edit_trip',
        'generate_trip_slug',
        'add_trip_owner_as_member',
        'find_overlap_album',
        'set_trip_updated_at',
        'auto_activate_current_trips',
        'is_trip_member',
        'record_user_activity'
      )
  LOOP
    EXECUTE format(
      'ALTER FUNCTION public.%I(%s) SET search_path = public, pg_temp',
      r.proname, r.args
    );
  END LOOP;
END $$;

-- --- 2) Remove trigger-only functions from the public RPC surface -----------
-- These take no args and return trigger; they should never be RPC-callable.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'set_place_recommendation_updated_at',
        'add_trip_owner_as_member',
        'set_trip_updated_at',
        'sync_place_recommendation_bump_count'
      )
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM anon, authenticated',
      r.proname, r.args
    );
  END LOOP;
END $$;
