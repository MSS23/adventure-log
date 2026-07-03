-- ============================================================================
-- Migration 71: Referral attribution + counter
--
-- Migration 68's claim_referral only creates mutual follows rows — there is
-- no durable record of WHO brought a user in, so "N friends joined from your
-- shares" cannot be computed. This migration:
--   1. adds users.referred_by (nullable, first-touch, never overwritten)
--   2. re-creates claim_referral to stamp referred_by on a successful claim
--   3. adds count_referrals(_user_id) so the referrer can read their own
--      count without any new SELECT surface on users
--
-- claim_referral stays SECURITY DEFINER for the same reason as migration 68
-- (the referrer's side of the follow can't be inserted under the claimer's
-- RLS), and the referred_by stamp also needs it (no UPDATE policy required).
-- ============================================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_referred_by
  ON public.users(referred_by)
  WHERE referred_by IS NOT NULL;

CREATE OR REPLACE FUNCTION public.claim_referral(referrer_username TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claimer UUID := auth.uid();
  referrer UUID;
BEGIN
  IF claimer IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Fresh accounts only — this is a signup incentive, not a follow backdoor.
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = claimer AND created_at > now() - interval '48 hours'
  ) THEN
    RETURN FALSE;
  END IF;

  SELECT id INTO referrer
  FROM public.users
  WHERE username = referrer_username;

  IF referrer IS NULL OR referrer = claimer THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.follows (follower_id, following_id, status)
  VALUES
    (claimer, referrer, 'accepted'),
    (referrer, claimer, 'accepted')
  ON CONFLICT (follower_id, following_id)
  DO UPDATE SET status = 'accepted', updated_at = now();

  -- First-touch attribution: only stamp if never attributed, so a re-claim
  -- (idempotent path above) can't reassign credit to a different referrer.
  UPDATE public.users
  SET referred_by = referrer
  WHERE id = claimer AND referred_by IS NULL;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_referral(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_referral(TEXT) TO authenticated;

-- How many users this user has brought in. SECURITY DEFINER so the count
-- works regardless of users RLS; scoped to the caller's own id so it exposes
-- nothing about other users' referral performance.
CREATE OR REPLACE FUNCTION public.count_referrals(_user_id UUID)
RETURNS BIGINT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> _user_id THEN
    RETURN 0;
  END IF;

  RETURN (
    SELECT count(*)
    FROM public.users
    WHERE referred_by = _user_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.count_referrals(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.count_referrals(UUID) TO authenticated;

-- ============================================================================
-- ROLLBACK (manual):
-- DROP FUNCTION IF EXISTS public.count_referrals(UUID);
-- DROP INDEX IF EXISTS idx_users_referred_by;
-- ALTER TABLE public.users DROP COLUMN IF EXISTS referred_by;
-- -- then re-apply supabase/migrations/68_referral_auto_follow.sql to restore
-- -- the pre-attribution claim_referral.
-- ============================================================================
