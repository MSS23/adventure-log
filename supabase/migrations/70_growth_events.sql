-- ============================================================================
-- Migration 70: Growth events
--
-- Lightweight product-analytics table for the growth rail. Client code
-- fire-and-forgets rows via trackGrowthEvent() (src/lib/utils/growth-events.ts);
-- nothing in the app reads them back — analysis happens with the service-role
-- key (SQL in docs/growth/METRICS.md), so there are deliberately NO SELECT
-- policies for anon/authenticated.
--
-- Write rules:
--   * authenticated: any event, but only as themselves (or ownerless)
--   * anon: only the two events an anonymous visitor can legitimately
--     produce — landing on a share link or viewing a public wrapped —
--     and only with user_id IS NULL
--
-- Idempotent and safe to re-run.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.growth_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  event TEXT NOT NULL CHECK (event IN (
    'signup',
    'signup_via_ref',
    'first_pin',
    'album_created',
    'video_export',
    'card_export',
    'share_link_created',
    'share_link_visit',
    'wrapped_public_view'
  )),
  -- Duration payload where the event is a timing (e.g. time-to-first-pin).
  value_ms INTEGER,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- The analysis queries all group by event over a time window.
CREATE INDEX IF NOT EXISTS idx_growth_events_event_created_at
  ON public.growth_events (event, created_at);

ALTER TABLE public.growth_events ENABLE ROW LEVEL SECURITY;

-- Signed-in users may record any event, but cannot impersonate another user.
DROP POLICY IF EXISTS "growth_events_insert_authenticated" ON public.growth_events;
CREATE POLICY "growth_events_insert_authenticated" ON public.growth_events
  FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- Anonymous visitors may only record ownerless view-type events.
DROP POLICY IF EXISTS "growth_events_insert_anon" ON public.growth_events;
CREATE POLICY "growth_events_insert_anon" ON public.growth_events
  FOR INSERT TO anon
  WITH CHECK (
    user_id IS NULL
    AND event IN ('share_link_visit', 'wrapped_public_view')
  );

-- No SELECT/UPDATE/DELETE policies on purpose: only the service role
-- (which bypasses RLS) reads this table, from analysis scripts.
GRANT INSERT ON public.growth_events TO authenticated, anon;

-- ============================================================================
-- ROLLBACK (run manually if this migration must be reverted):
--
--   BEGIN;
--   DROP POLICY IF EXISTS "growth_events_insert_authenticated" ON public.growth_events;
--   DROP POLICY IF EXISTS "growth_events_insert_anon"          ON public.growth_events;
--   DROP INDEX IF EXISTS public.idx_growth_events_event_created_at;
--   DROP TABLE IF EXISTS public.growth_events;
--   COMMIT;
-- ============================================================================
