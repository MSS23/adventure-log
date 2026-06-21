-- 53_fix_get_pending_uploads_columns.sql
--
-- Fix the offline-sync runtime error:
--   ERROR [useOfflineSync, fetch-pending]: column upload_queue.file_name
--   does not exist (SQLSTATE 42703)
--
-- Every historical definition of public.get_pending_uploads (migrations 09, 35,
-- 39, 51) declares its result as TABLE(id, file_name, file_size, created_at)
-- and SELECTs upload_queue.file_name / upload_queue.file_size. But the
-- upload_queue table has no such columns — it stores resource_type, local_id,
-- payload (jsonb), files_to_upload (jsonb), status, retry_count, etc. (see the
-- UploadQueueItem type in src/types/database.ts and the insert/update calls in
-- src/lib/hooks/useOfflineSync.ts). So the function compiles but throws 42703 at
-- call time, and even if those columns existed the client needs the full row to
-- actually process a queued upload (resource_type, local_id, payload, …).
--
-- Fix: return the whole row as SETOF public.upload_queue. This matches the
-- client's UploadQueueItem shape exactly and — by never naming individual
-- columns — can't drift out of sync with the table again.
--
-- Changing the return type requires dropping the function first (CREATE OR
-- REPLACE can't change the return type). DROP matches by argument TYPE
-- regardless of parameter name, so this also clears any stale user_id_param
-- variant. Idempotent and safe to re-run. See migration 51 for the related
-- argument-name (p_user_id) drift fix.
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_pending_uploads(UUID);
DROP FUNCTION IF EXISTS public.get_pending_uploads(TEXT);

CREATE FUNCTION public.get_pending_uploads(p_user_id UUID)
RETURNS SETOF public.upload_queue
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.upload_queue
  WHERE upload_queue.user_id = p_user_id
    AND upload_queue.status = 'pending'
  ORDER BY upload_queue.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pending_uploads(UUID) TO authenticated;
