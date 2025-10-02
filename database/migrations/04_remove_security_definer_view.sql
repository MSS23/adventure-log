-- ============================================================================
-- Migration: Remove SECURITY DEFINER from travel_timeline_view
-- ============================================================================
-- This fixes the Supabase security warning about views with SECURITY DEFINER
-- Instead of using a view, we'll query albums directly with proper RLS
-- ============================================================================

-- Drop the existing view
DROP VIEW IF EXISTS travel_timeline_view CASCADE;

-- The view is no longer needed as the application queries albums directly
-- with proper RLS policies. This resolves the security warning.

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Removed travel_timeline_view to fix SECURITY DEFINER warning';
  RAISE NOTICE '📊 Application uses direct album queries with RLS instead';
END
$$;
