-- ============================================================================
-- Migration 55: saved_places
-- ----------------------------------------------------------------------------
-- "Things to do/see" that a user collects by pasting a TikTok or Google Maps
-- link (or adding manually). The app resolves the link, works out the place,
-- the user confirms, and the row is stored here. The UI groups these by
-- country -> city. This is distinct from `wishlist_items` (bucket-list
-- destinations): saved_places can have many rows per city and always tracks
-- where the inspiration came from (source_platform / source_url).
--
-- Mirrors the wishlist_items conventions (TEXT user_id, own-row RLS).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.saved_places (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- What the place is
  place_name      TEXT NOT NULL,                 -- "Bar Hermano", "Eiffel Tower"
  location_name   TEXT,                          -- "Shibuya, Tokyo, Japan"
  city            TEXT,                          -- "Tokyo"
  country_code    TEXT,                          -- ISO 3166-1 alpha-2, e.g. "JP"
  latitude        DOUBLE PRECISION NOT NULL,
  longitude       DOUBLE PRECISION NOT NULL,

  -- How it's categorised / annotated
  category        TEXT NOT NULL DEFAULT 'see'
                    CHECK (category IN ('see', 'eat', 'do', 'stay', 'other')),
  notes           TEXT,

  -- Where the inspiration came from
  source_platform TEXT NOT NULL DEFAULT 'manual'
                    CHECK (source_platform IN ('manual', 'tiktok', 'google_maps', 'instagram', 'other')),
  source_url      TEXT,
  thumbnail_url   TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  visited_at      TIMESTAMPTZ,

  -- A user shouldn't collect the exact same pin twice.
  UNIQUE (user_id, place_name, latitude, longitude)
);

CREATE INDEX IF NOT EXISTS idx_saved_places_user_id
  ON public.saved_places (user_id);
CREATE INDEX IF NOT EXISTS idx_saved_places_user_country
  ON public.saved_places (user_id, country_code);

-- ── Row Level Security ──────────────────────────────────────────────────────
ALTER TABLE public.saved_places ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own saved places" ON public.saved_places;
CREATE POLICY "Users can view own saved places"
  ON public.saved_places FOR SELECT
  USING (user_id = (select auth.uid())::text);

DROP POLICY IF EXISTS "Users can insert own saved places" ON public.saved_places;
CREATE POLICY "Users can insert own saved places"
  ON public.saved_places FOR INSERT
  WITH CHECK (user_id = (select auth.uid())::text);

DROP POLICY IF EXISTS "Users can update own saved places" ON public.saved_places;
CREATE POLICY "Users can update own saved places"
  ON public.saved_places FOR UPDATE
  USING (user_id = (select auth.uid())::text);

DROP POLICY IF EXISTS "Users can delete own saved places" ON public.saved_places;
CREATE POLICY "Users can delete own saved places"
  ON public.saved_places FOR DELETE
  USING (user_id = (select auth.uid())::text);
