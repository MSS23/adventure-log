-- Add date privacy setting to albums table
-- This allows users to control whether exact dates are shown (default) or only month/year

ALTER TABLE public.albums
ADD COLUMN IF NOT EXISTS show_exact_dates boolean DEFAULT true;

COMMENT ON COLUMN public.albums.show_exact_dates IS 'Controls whether exact dates (day/month/year) or only month/year are displayed. Default is true (show exact dates).';

-- Create index for better query performance when filtering by this setting
CREATE INDEX IF NOT EXISTS idx_albums_show_exact_dates ON public.albums(show_exact_dates);
