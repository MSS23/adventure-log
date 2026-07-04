-- Migration 75: Album journey connections ("spider's web")
--
-- Adds an optional self-referencing link on albums so users can explicitly
-- connect a trip to the previous trip it continues from. The globe draws one
-- arc per explicit link (predecessor -> album) instead of guessing a route
-- chronologically — so London->Paris (2024) and London->Japan (2025) stay
-- separate journeys instead of being falsely chained Paris->Japan.
--
-- Nullable + ON DELETE SET NULL so deleting a predecessor album just drops the
-- connection rather than cascading. Additive and backward-compatible: existing
-- code that never sets the column keeps working.

ALTER TABLE public.albums
  ADD COLUMN IF NOT EXISTS connected_from_album_id uuid
  REFERENCES public.albums(id) ON DELETE SET NULL;

-- Index the FK for the "does this album's journey continue elsewhere?" lookups
-- and to keep the arc query fast.
CREATE INDEX IF NOT EXISTS idx_albums_connected_from_album_id
  ON public.albums(connected_from_album_id);

COMMENT ON COLUMN public.albums.connected_from_album_id IS
  'Optional: the album this trip continues from. Drives explicit journey arcs on the globe. Must belong to the same user (enforced in application layer).';
