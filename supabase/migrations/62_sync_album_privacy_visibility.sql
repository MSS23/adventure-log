-- 62_sync_album_privacy_visibility.sql
--
-- CONTEXT CORRECTION (2026-06-24): the live `albums` table stores privacy in a
-- SINGLE column, `visibility` (which every RLS read policy gates on). An older
-- `privacy` column only appears in some non-applied backup migrations, never in
-- prod. So in prod there is nothing to sync and the application code writes only
-- `visibility`. This migration is therefore a guarded NO-OP on the real schema.
--
-- It still does the right thing in any environment that somehow has BOTH columns:
-- it backfills every row to the most restrictive of the two values
-- (private < friends < public) so the reconciliation can never over-expose.
--
-- No sync trigger is installed: a trigger body referencing NEW.privacy would
-- raise at runtime on the single-column schema and break every album write.
-- Since the app writes only `visibility`, no trigger is needed.
--
-- Idempotent and safe to re-run.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'albums'
      AND column_name = 'privacy'
  ) THEN
    -- Both columns exist: reconcile to the most restrictive value. The UPDATE
    -- references `privacy`, so it lives in a dynamic statement that is only
    -- parsed/run when the column is actually present.
    EXECUTE $sql$
      WITH resolved AS (
        SELECT
          id,
          CASE LEAST(
            CASE COALESCE(privacy, visibility, 'public')
              WHEN 'private' THEN 0 WHEN 'friends' THEN 1 ELSE 2 END,
            CASE COALESCE(visibility, privacy, 'public')
              WHEN 'private' THEN 0 WHEN 'friends' THEN 1 ELSE 2 END
          )
            WHEN 0 THEN 'private'
            WHEN 1 THEN 'friends'
            ELSE 'public'
          END AS value
        FROM public.albums
      )
      UPDATE public.albums a
      SET privacy = r.value,
          visibility = r.value
      FROM resolved r
      WHERE a.id = r.id
        AND (a.privacy IS DISTINCT FROM r.value OR a.visibility IS DISTINCT FROM r.value)
    $sql$;
    RAISE NOTICE 'albums.privacy present — reconciled privacy/visibility to most-restrictive.';
  ELSE
    RAISE NOTICE 'albums.privacy not present — single-column (visibility) schema, nothing to sync.';
  END IF;
END $$;
