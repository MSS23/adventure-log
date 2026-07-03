-- ============================================================================
-- Migration 68: Referral auto-follow
--
-- Viral loop: share links carry ?ref=<username>. When the invited person
-- creates an account, the client calls claim_referral(referrer_username) and
-- both users end up following each other (status accepted, both directions).
--
-- SECURITY DEFINER because RLS (correctly) only lets a user insert follow
-- rows where follower_id = auth.uid() — the referrer's side of the follow
-- has to be created on their behalf. Guards:
--   * caller must be authenticated
--   * caller's account must be < 48h old (stale ref links on long-lived
--     accounts do nothing)
--   * no self-referral; unknown usernames are a no-op
--   * idempotent (re-claims just re-assert 'accepted')
-- ============================================================================

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

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_referral(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_referral(TEXT) TO authenticated;
