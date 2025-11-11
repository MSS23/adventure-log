-- Migration: Itineraries Table
-- Description: Create table for storing user-created travel itineraries with AI-generated content
-- Author: Claude Code
-- Date: 2025-01-11

-- Create itineraries table
CREATE TABLE IF NOT EXISTS public.itineraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Basic info
  title TEXT NOT NULL,
  description TEXT,

  -- Trip details (from trip planner form)
  country TEXT NOT NULL,
  region TEXT NOT NULL,
  date_start DATE,
  date_end DATE,
  travel_style TEXT, -- adventure, relaxation, culture, food, nature, luxury, backpacking, family
  budget TEXT, -- budget-friendly, moderate, luxury, ultra-luxury
  additional_details TEXT,

  -- The generated itinerary content (markdown formatted)
  itinerary_content TEXT NOT NULL,

  -- Optional relation to albums
  related_album_ids UUID[], -- array of album IDs this itinerary is associated with

  -- Metadata
  is_favorite BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  ai_generated BOOLEAN DEFAULT TRUE,
  cache_key TEXT, -- SHA-256 hash for deduplication

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT itineraries_user_cache_key_unique UNIQUE(user_id, cache_key)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_itineraries_user_id ON public.itineraries(user_id);
CREATE INDEX IF NOT EXISTS idx_itineraries_user_created ON public.itineraries(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_itineraries_status ON public.itineraries(user_id, status);
CREATE INDEX IF NOT EXISTS idx_itineraries_favorite ON public.itineraries(user_id, is_favorite) WHERE is_favorite = TRUE;
CREATE INDEX IF NOT EXISTS idx_itineraries_dates ON public.itineraries(user_id, date_start, date_end);

-- Enable Row Level Security
ALTER TABLE public.itineraries ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their own itineraries
CREATE POLICY "Users can view own itineraries"
  ON public.itineraries FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own itineraries
CREATE POLICY "Users can create own itineraries"
  ON public.itineraries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own itineraries
CREATE POLICY "Users can update own itineraries"
  ON public.itineraries FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own itineraries
CREATE POLICY "Users can delete own itineraries"
  ON public.itineraries FOR DELETE
  USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_itineraries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER itineraries_updated_at
  BEFORE UPDATE ON public.itineraries
  FOR EACH ROW
  EXECUTE FUNCTION update_itineraries_updated_at();

-- Add comment to table
COMMENT ON TABLE public.itineraries IS 'User-created travel itineraries with AI-generated content from trip planner';
