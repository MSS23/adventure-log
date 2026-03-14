-- Album view tracking for social proof and discovery ranking
-- Tracks unique views per user per album per day to prevent inflated counts

-- View tracking table
CREATE TABLE IF NOT EXISTS album_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  album_id UUID NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  -- One view per user per album per day
  UNIQUE(album_id, viewer_id, (viewed_at::date))
);

-- Add view_count column to albums for fast reads
ALTER TABLE albums ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_album_views_album_id ON album_views(album_id);
CREATE INDEX IF NOT EXISTS idx_album_views_viewer_id ON album_views(viewer_id);
CREATE INDEX IF NOT EXISTS idx_album_views_viewed_at ON album_views(viewed_at);
CREATE INDEX IF NOT EXISTS idx_albums_view_count ON albums(view_count DESC);

-- RPC function to record a view and increment count
-- Uses ON CONFLICT to deduplicate (one view per user per album per day)
CREATE OR REPLACE FUNCTION record_album_view(p_album_id UUID, p_viewer_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Try to insert the view record (deduplicates per user per day)
  INSERT INTO album_views (album_id, viewer_id, viewed_at)
  VALUES (p_album_id, p_viewer_id, NOW())
  ON CONFLICT (album_id, viewer_id, (viewed_at::date)) DO NOTHING;

  -- Only increment if a new row was actually inserted
  IF FOUND THEN
    UPDATE albums SET view_count = COALESCE(view_count, 0) + 1
    WHERE id = p_album_id;
  END IF;
END;
$$;

-- RLS policies for album_views
ALTER TABLE album_views ENABLE ROW LEVEL SECURITY;

-- Anyone can insert their own view
CREATE POLICY "Users can record their own views"
  ON album_views FOR INSERT
  WITH CHECK ((select auth.uid()) = viewer_id);

-- Album owners can see who viewed their albums
CREATE POLICY "Album owners can see views"
  ON album_views FOR SELECT
  USING (
    album_id IN (
      SELECT id FROM albums WHERE user_id = (select auth.uid())
    )
  );

-- Backfill existing view counts from album_views if table existed before
-- (Safe to run even if no prior data)
UPDATE albums SET view_count = COALESCE(
  (SELECT COUNT(*) FROM album_views WHERE album_views.album_id = albums.id),
  0
)
WHERE view_count IS NULL OR view_count = 0;
