-- Quick Fix for Database Function Conflicts
-- Run this FIRST before running the main production-schema.sql

-- Drop all conflicting functions to avoid signature conflicts
DROP FUNCTION IF EXISTS get_user_dashboard_stats(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_user_travel_years(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_user_travel_by_year(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS handle_follow_request(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS accept_follow_request(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS reject_follow_request(uuid, uuid) CASCADE;

-- Drop any views that might depend on these functions
DROP VIEW IF EXISTS travel_timeline_view CASCADE;

-- Success message
SELECT 'Functions dropped successfully - now run production-schema.sql' as status;