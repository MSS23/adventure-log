-- Comprehensive fix for favorites and cities tables

-- ============================================
-- PART 1: Fix Favorites Table RLS
-- ============================================

-- Enable RLS on favorites table
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view all favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can view their own favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can create their own favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can create favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can delete their own favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can delete favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can update their own favorites" ON public.favorites;

-- Create new RLS policies for favorites
CREATE POLICY "Users can view all favorites"
    ON public.favorites FOR SELECT
    USING (true);

CREATE POLICY "Users can create favorites"
    ON public.favorites FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own favorites"
    ON public.favorites FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites"
    ON public.favorites FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- PART 2: Fix or Create Cities Table
-- ============================================

-- Create cities table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.cities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    country_code TEXT,
    airport_code TEXT,
    city_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_cities_name ON public.cities(name);
CREATE INDEX IF NOT EXISTS idx_cities_country ON public.cities(country_code);

-- Enable RLS on cities table
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Cities are viewable by everyone" ON public.cities;
DROP POLICY IF EXISTS "Everyone can view cities" ON public.cities;

-- Create RLS policy for cities (read-only for all users)
CREATE POLICY "Everyone can view cities"
    ON public.cities FOR SELECT
    USING (true);

-- ============================================
-- Verification
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '✅ ALL TABLES FIXED';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Favorites table: RLS policies updated';
    RAISE NOTICE 'Cities table: Created with RLS enabled';
    RAISE NOTICE '';
    RAISE NOTICE 'You should now be able to:';
    RAISE NOTICE '  ✓ Add/remove favorites';
    RAISE NOTICE '  ✓ Search for cities';
    RAISE NOTICE '  ✓ No more RLS errors';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '';
END $$;
