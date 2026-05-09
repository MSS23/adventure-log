-- Migration 30: Fix SECURITY DEFINER on reactions_with_users view
-- Description: Reconcile reactions schema drift and recreate the view with
--              security_invoker = true so it runs with the querying user's
--              permissions and respects RLS on the underlying `reactions`
--              and `users` tables, rather than the creator's privileges.
--
-- Lint reference:
--   https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view
--
-- Background:
--   * The `reactions` table was originally created by an older backup
--     migration that did NOT include the `is_read` column. Migration 16's
--     `CREATE TABLE IF NOT EXISTS` was therefore a no-op for environments
--     that already had the table, leaving the schema out of sync with what
--     migration 16 declared.
--   * Migration 16 also recreated `public.reactions_with_users` without
--     explicitly setting security_invoker. Postgres views default to
--     SECURITY DEFINER-like behavior, which Supabase's linter flags.
--
-- This migration is idempotent and safe to re-run.

-- ============================================================
-- 1. Reconcile reactions table schema
-- ============================================================
ALTER TABLE public.reactions
  ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT FALSE;

-- ============================================================
-- 2. Recreate the view with security_invoker = true
-- ============================================================
DROP VIEW IF EXISTS public.reactions_with_users;

CREATE VIEW public.reactions_with_users
WITH (security_invoker = true) AS
SELECT
  r.id,
  r.user_id,
  r.target_type,
  r.target_id,
  r.reaction_type,
  r.is_read,
  r.created_at,
  u.username,
  u.display_name,
  u.avatar_url
FROM public.reactions r
LEFT JOIN public.users u ON r.user_id = u.id;

GRANT SELECT ON public.reactions_with_users TO authenticated;
GRANT SELECT ON public.reactions_with_users TO anon;
