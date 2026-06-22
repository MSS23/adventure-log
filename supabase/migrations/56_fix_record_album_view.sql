-- ============================================================================
-- Migration 56: repair record_album_view RPC (clears the PostgREST 404)
-- ----------------------------------------------------------------------------
-- Symptom: POST /rest/v1/rpc/record_album_view returns 404 in production.
--
-- The client calls rpc('record_album_view', { p_album_id, p_viewer_id }) with
-- UUID values (src/lib/hooks/useAlbumViews.ts). The 404 means PostgREST cannot
-- resolve that signature — caused by migration drift (a leftover Clerk-era
-- UUID,TEXT variant from migration 38) and/or a stale PostgREST schema cache.
--
-- Per this project's drift rule, CREATE OR REPLACE cannot rename/retype a
-- function's parameters, so we DROP every known variant first, recreate the
-- canonical (UUID, UUID) function, re-grant, and reload the PostgREST cache.
--
-- NOTE on dedup: the original design used a UNIQUE index on
-- (album_id, viewer_id, (viewed_at::date)) as an ON CONFLICT target. That can't
-- be created — Postgres rejects expressions in a table-level UNIQUE, and
-- `timestamptz::date` is STABLE (timezone-dependent), not IMMUTABLE, so it's
-- illegal in an index expression too. Instead we dedup with an explicit
-- "already viewed today?" guard inside the function, which needs no index.
--
-- Idempotent and safe to re-run.
-- ============================================================================

-- Safety net: the table/column the function writes to (normally from m22).
-- Columns only — no expression UNIQUE (that was the original bug).
CREATE TABLE IF NOT EXISTS public.album_views (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id   UUID NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
  viewer_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  viewed_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.albums ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Plain (non-expression) indexes to keep the per-viewer/day lookup fast.
CREATE INDEX IF NOT EXISTS idx_album_views_album_id ON public.album_views (album_id);
CREATE INDEX IF NOT EXISTS idx_album_views_viewer_id ON public.album_views (viewer_id);

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
  -- Dedup one view per viewer per album per day without needing a unique index
  -- on an (illegal) immutable date expression. date_trunc here runs in a query
  -- context where STABLE is fine.
  IF NOT EXISTS (
    SELECT 1
    FROM public.album_views
    WHERE album_id = p_album_id
      AND viewer_id IS NOT DISTINCT FROM p_viewer_id
      AND viewed_at >= date_trunc('day', NOW())
  ) THEN
    INSERT INTO public.album_views (album_id, viewer_id, viewed_at)
    VALUES (p_album_id, p_viewer_id, NOW());

    UPDATE public.albums
    SET view_count = COALESCE(view_count, 0) + 1
    WHERE id = p_album_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_album_view(UUID, UUID) TO authenticated;

-- Force PostgREST to refresh its schema cache so the RPC resolves immediately.
NOTIFY pgrst, 'reload schema';
