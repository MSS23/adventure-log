-- Migration: Remove SECURITY DEFINER View
-- Description: Drop the reactions_with_users view that has SECURITY DEFINER
-- Author: Claude Code
-- Date: 2025-01-11

-- ============================================================================
-- REMOVE SECURITY DEFINER VIEW
-- ============================================================================

-- Drop the reactions_with_users view if it exists
-- This view was flagged by Supabase linter as a security risk because:
-- 1. It uses SECURITY DEFINER which bypasses RLS
-- 2. It exposes user profile data without proper privacy checks
-- 3. It's not needed in active migrations

DROP VIEW IF EXISTS public.reactions_with_users;

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

-- The reactions_with_users view was removed because:
-- 1. SECURITY DEFINER views bypass Row Level Security (RLS)
-- 2. They execute with the privileges of the view creator, not the querying user
-- 3. This can lead to unauthorized data access
-- 4. The view is not used in the current application
--
-- If this view is needed in the future, it should be recreated as:
-- - A regular view (without SECURITY DEFINER)
-- - With proper RLS policies on the underlying tables
-- - Or as a SECURITY INVOKER view that respects the querying user's permissions
--
-- See: https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view
