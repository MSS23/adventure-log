-- ============================================================================
-- FAVORITES TABLE MIGRATION
-- ============================================================================
-- Description: Allow users to save/bookmark albums, photos, and locations
-- Version: 1.0
-- Date: 2025-02-06
-- ============================================================================

-- Create favorites table
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  target_id UUID NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('photo', 'album', 'location')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Unique constraint: user can only favorite an item once
  UNIQUE(user_id, target_id, target_type)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_favorites_user ON public.favorites(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_favorites_target ON public.favorites(target_id, target_type);
CREATE INDEX IF NOT EXISTS idx_favorites_type ON public.favorites(target_type);

-- Enable RLS
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS Policies
-- ============================================================================

-- Users can view their own favorites
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'favorites'
    AND policyname = 'Users can view own favorites'
  ) THEN
    CREATE POLICY "Users can view own favorites"
      ON public.favorites FOR SELECT
      USING ((SELECT auth.uid()) = user_id);
  END IF;
END $$;

-- Users can add favorites
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'favorites'
    AND policyname = 'Users can add favorites'
  ) THEN
    CREATE POLICY "Users can add favorites"
      ON public.favorites FOR INSERT
      WITH CHECK ((SELECT auth.uid()) = user_id);
  END IF;
END $$;

-- Users can remove their own favorites
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'favorites'
    AND policyname = 'Users can remove own favorites'
  ) THEN
    CREATE POLICY "Users can remove own favorites"
      ON public.favorites FOR DELETE
      USING ((SELECT auth.uid()) = user_id);
  END IF;
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.favorites IS 'User saved/bookmarked items (albums, photos, locations)';
COMMENT ON COLUMN public.favorites.target_id IS 'UUID of the favorited item (album_id, photo_id, or location_id)';
COMMENT ON COLUMN public.favorites.target_type IS 'Type of favorited item: photo, album, or location';
COMMENT ON COLUMN public.favorites.metadata IS 'Optional metadata about the favorite (e.g., photo_url, title)';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
