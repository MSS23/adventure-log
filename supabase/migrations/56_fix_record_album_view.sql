-- ============================================================================
-- Migration 56: repair record_album_view RPC (clears the PostgREST 404)
-- ----------------------------------------------------------------------------
-- Symptom: POST /rest/v1/rpc/record_album_view returns 404 in production.
--
-- The client calls rpc('record_album_view', { p_album_id, p_viewer_id }) with
-- UUID values (src/lib/hooks/useAlbumViews.ts). The 404 means PostgREST cannot
-- resolve that signature — caused by migration drift (a leftover Clerk-era
-- UUID,TEXT variant from migration 38 that migration 39's revert didn't clear
-- in this project) and/or a stale PostgREST schema cache.
--
-- Per this project's drift rule, CREATE OR REPLACE cannot rename/retype a
-- function's parameters, so we DROP every known variant first, recreate the
-- canonical (UUID, UUID) function the client expects, re-grant, and reload the
-- PostgREST schema cache so the RPC resolves immediately.
--
-- Idempotent and safe to re-run.
-- ============================================================================

-- Safety net: the table/column the function writes to (normally from m22).
-- IF NOT EXISTS means this never alters an existing table's column types.
CREATE TABLE IF NOT EXISTS public.album_views (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  album_id   UUID NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
  viewer_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  viewed_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (album_id, viewer_id, (viewed_at::date))
);

ALTER TABLE public.albums ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Guarantee the ON CONFLICT inference target exists (one view per viewer/day).
CREATE UNIQUE INDEX IF NOT EXISTS uq_album_views_per_viewer_per_day
  ON public.album_views (album_id, viewer_id, (viewed_at::date));

-- Drop every historical variant: (UUID,UUID) from m22/m39, (UUID,TEXT) from m38.
DROP FUNCTION IF EXISTS public.record_album_view(UUID, UUID);
DROP FUNCTION IF EXISTS public.record_album_view(UUID, TEXT);

CREATE FUNCTION public.record_album_view(p_album_id UUID, p_viewer_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Deduplicate per viewer per album per day.
  INSERT INTO public.album_views (album_id, viewer_id, viewed_at)
  VALUES (p_album_id, p_viewer_id, NOW())
  ON CONFLICT (album_id, viewer_id, (viewed_at::date)) DO NOTHING;

  -- Only bump the denormalised counter when a new view was actually recorded.
  IF FOUND THEN
    UPDATE public.albums
    SET view_count = COALESCE(view_count, 0) + 1
    WHERE id = p_album_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_album_view(UUID, UUID) TO authenticated;

-- Force PostgREST to refresh its schema cache so the RPC resolves immediately,
-- without waiting for the periodic reload or a project restart.
NOTIFY pgrst, 'reload schema';
