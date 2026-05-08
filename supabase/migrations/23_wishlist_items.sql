-- ============================================================================
-- Migration: Wishlist Items Table
-- Description: Travel wishlist / bucket list destinations with partner sharing
-- ============================================================================

-- Create wishlist_items table
CREATE TABLE IF NOT EXISTS public.wishlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_name TEXT NOT NULL,
  country_code TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  notes TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'from_album', 'shared')),
  shared_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, location_name, latitude, longitude)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wishlist_items_user_id ON public.wishlist_items(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_completed ON public.wishlist_items(user_id, completed_at);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_priority ON public.wishlist_items(user_id, priority) WHERE completed_at IS NULL;

-- Enable RLS
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (idempotent)
DROP POLICY IF EXISTS "Users can view own wishlist items" ON public.wishlist_items;
DROP POLICY IF EXISTS "Users can insert own wishlist items" ON public.wishlist_items;
DROP POLICY IF EXISTS "Users can update own wishlist items" ON public.wishlist_items;
DROP POLICY IF EXISTS "Users can delete own wishlist items" ON public.wishlist_items;
DROP POLICY IF EXISTS "Mutual follows can view wishlist items" ON public.wishlist_items;

-- RLS Policies

-- Users can view their own wishlist items
CREATE POLICY "Users can view own wishlist items"
  ON public.wishlist_items FOR SELECT
  USING (user_id = (SELECT auth.uid()));

-- Users can insert their own wishlist items
CREATE POLICY "Users can insert own wishlist items"
  ON public.wishlist_items FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Users can update their own wishlist items
CREATE POLICY "Users can update own wishlist items"
  ON public.wishlist_items FOR UPDATE
  USING (user_id = (SELECT auth.uid()));

-- Users can delete their own wishlist items
CREATE POLICY "Users can delete own wishlist items"
  ON public.wishlist_items FOR DELETE
  USING (user_id = (SELECT auth.uid()));

-- Mutual follows can view each other's wishlist items
CREATE POLICY "Mutual follows can view wishlist items"
  ON public.wishlist_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.follows f1
      JOIN public.follows f2
        ON f1.follower_id = f2.following_id
        AND f1.following_id = f2.follower_id
      WHERE f1.follower_id = (SELECT auth.uid())
        AND f1.following_id = wishlist_items.user_id
        AND f1.status = 'accepted'
        AND f2.status = 'accepted'
    )
  );
