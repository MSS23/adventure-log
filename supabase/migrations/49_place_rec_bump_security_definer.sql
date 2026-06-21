-- ============================================================================
-- Migration 49: Let bump-count stay accurate without the service-role key
-- ============================================================================
-- POST /api/place-recommendations/[id]/bump now toggles a user's bump through
-- the normal RLS-bound client instead of the service-role client, so the trip
-- planner's place recommendations work even when SUPABASE_SERVICE_ROLE_KEY is
-- not configured.
--
-- The denormalized place_recommendations.bump_count is maintained by the
-- AFTER INSERT/DELETE trigger sync_place_recommendation_bump_count(). That
-- trigger UPDATEs the recommendation row — which, for the common case of
-- bumping SOMEONE ELSE'S recommendation, is blocked by the owner-only
-- "place_recs_update_own" RLS policy when the trigger runs as the calling user
-- (SECURITY INVOKER). The UPDATE silently matches zero rows and the count never
-- moves.
--
-- Making the trigger function SECURITY DEFINER lets it maintain the count
-- regardless of who owns the recommendation, while the user-facing INSERT/DELETE
-- of the bump row stays fully governed by RLS (place_rec_bumps_insert_own /
-- _delete_own). search_path is pinned for safety. Idempotent.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_place_recommendation_bump_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.place_recommendations
            SET bump_count = bump_count + 1
            WHERE id = NEW.recommendation_id;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.place_recommendations
            SET bump_count = GREATEST(bump_count - 1, 0)
            WHERE id = OLD.recommendation_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;
