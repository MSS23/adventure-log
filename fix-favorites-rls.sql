-- Fix favorites table RLS policies
-- Error: "new row violates row-level security policy for table 'favorites'"

-- Enable RLS on favorites table
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view all favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can view their own favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can create their own favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can create favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can delete their own favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can delete favorites" ON public.favorites;

-- Create new RLS policies for favorites
CREATE POLICY "Users can view all favorites"
    ON public.favorites FOR SELECT
    USING (true);

CREATE POLICY "Users can create favorites"
    ON public.favorites FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites"
    ON public.favorites FOR DELETE
    USING (auth.uid() = user_id);

-- Verification
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '✅ FAVORITES TABLE RLS FIX COMPLETED';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Favorites table: RLS enabled';
    RAISE NOTICE 'Policies: RECREATED';
    RAISE NOTICE '';
    RAISE NOTICE 'You should now be able to:';
    RAISE NOTICE '  ✓ Add photos to favorites';
    RAISE NOTICE '  ✓ View favorites';
    RAISE NOTICE '  ✓ Remove favorites';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '';
END $$;
