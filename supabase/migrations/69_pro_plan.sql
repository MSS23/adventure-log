-- 69: Pro plan flag on users.
--
-- Minimal Pro tier scaffold ($29/year). The column is flipped manually (or by
-- a future payment webhook) — there is intentionally NO checkout/subscription
-- lifecycle in the app. No RLS change needed: the users table is already
-- readable by its owner, so clients and API routes can read their own plan.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'pro'));

COMMENT ON COLUMN public.users.plan IS
  'Billing tier: free (default) or pro. Flipped manually / by payment webhook — no in-app subscription lifecycle.';
