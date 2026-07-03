-- ============================================================================
-- Migration 67: Merge saved_places into wishlist_items
--
-- One "places I want to go" concept instead of two. Wishlist items gain the
-- link-import fields (category, source platform/url, thumbnail, city); every
-- saved_places row is copied across (visited_at → completed_at, place_name →
-- location_name), then the saved_places table is dropped.
--
-- Safe to run whether or not migration 55 (saved_places) was ever applied.
-- ============================================================================

-- 1) Extend wishlist_items with the place-import fields (all nullable —
--    plain bucket-list destinations simply don't set them).
ALTER TABLE public.wishlist_items
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT
    CHECK (category IS NULL OR category IN ('see','eat','do','stay','other')),
  ADD COLUMN IF NOT EXISTS source_platform TEXT
    CHECK (source_platform IS NULL OR source_platform IN ('manual','tiktok','google_maps','instagram','other')),
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- 2) Copy saved_places rows in, then drop the table.
--    Wrapped in EXECUTE so this parses even when saved_places never existed.
DO $$
BEGIN
  IF to_regclass('public.saved_places') IS NOT NULL THEN
    EXECUTE $sql$
      INSERT INTO public.wishlist_items
        (user_id, location_name, country_code, latitude, longitude, notes,
         priority, source, created_at, completed_at,
         city, category, source_platform, source_url, thumbnail_url)
      SELECT
        user_id, place_name, country_code, latitude, longitude, notes,
        'medium', 'manual', created_at, visited_at,
        city, category, source_platform, source_url, thumbnail_url
      FROM public.saved_places
      ON CONFLICT (user_id, location_name, latitude, longitude) DO NOTHING
    $sql$;

    EXECUTE 'DROP TABLE public.saved_places';
  END IF;
END $$;
