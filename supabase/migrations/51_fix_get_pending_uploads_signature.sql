-- 51_fix_get_pending_uploads_signature.sql
--
-- Fix the offline-sync "Could not find the function
-- public.get_pending_uploads(p_user_id)" 404 (PGRST202).
--
-- The client (src/lib/hooks/useOfflineSync.ts) calls
--   supabase.rpc('get_pending_uploads', { p_user_id })
-- but the DEPLOYED database still has an older definition whose argument is
-- named user_id_param. PostgREST resolves overloads by argument NAME, so the
-- p_user_id call never matches and 404s.
--
-- Migration 39 already recreates this function with p_user_id, but it uses
-- CREATE OR REPLACE — and Postgres refuses to rename an input parameter on an
-- existing function ("cannot change name of input parameter"). So 39 errors out
-- against the live user_id_param function and the drift is never corrected.
--
-- This migration explicitly DROPs every plausible existing signature first
-- (DROP FUNCTION matches by argument TYPE regardless of parameter name, so this
-- removes the user_id_param variant), then recreates the canonical p_user_id
-- version. Idempotent and safe to re-run.
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_pending_uploads(UUID);
DROP FUNCTION IF EXISTS public.get_pending_uploads(TEXT);

CREATE FUNCTION public.get_pending_uploads(p_user_id UUID)
RETURNS TABLE(id UUID, file_name TEXT, file_size BIGINT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT upload_queue.id, upload_queue.file_name, upload_queue.file_size, upload_queue.created_at
  FROM public.upload_queue
  WHERE upload_queue.user_id = p_user_id AND upload_queue.status = 'pending'
  ORDER BY upload_queue.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pending_uploads(UUID) TO authenticated;
