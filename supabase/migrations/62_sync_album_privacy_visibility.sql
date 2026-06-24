-- 62_sync_album_privacy_visibility.sql
--
-- The `albums` table has TWO privacy columns: `privacy` (original) and
-- `visibility` (added later as an "alias", DEFAULT 'public'). They were never
-- synced, yet every RLS read policy gates on `visibility`. A write that set
-- only `privacy` (the create-album server action + bulk import did exactly
-- this) left a "private" album at visibility='public' → world-readable,
-- leaking its photos and GPS coordinates.
--
-- The application code now writes both columns together, but this migration is
-- the durable fix:
--   1. Backfill existing rows to the MOST RESTRICTIVE of the two values, so the
--      backfill itself can never expose anything that was meant to be hidden.
--   2. Add a BEFORE INSERT/UPDATE trigger that keeps the two columns in lockstep
--      regardless of which write path (app, REST, future code) touches them.
--
-- Idempotent and safe to re-run.

BEGIN;

-- 1) Backfill: resolve each row to the most restrictive of (privacy, visibility).
--    Restrictiveness order: private (0) < friends (1) < public (2).
--    NULLs are filled from the counterpart, then default to 'public'.
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
  AND (a.privacy IS DISTINCT FROM r.value OR a.visibility IS DISTINCT FROM r.value);

-- 2) Keep the two columns in sync on every future write.
CREATE OR REPLACE FUNCTION public.sync_album_privacy_visibility()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  rank_priv int;
  rank_vis  int;
BEGIN
  -- Normalize NULLs: fill from the counterpart, then default to 'public'.
  NEW.privacy    := COALESCE(NEW.privacy, NEW.visibility, 'public');
  NEW.visibility := COALESCE(NEW.visibility, NEW.privacy, 'public');

  -- On UPDATE, propagate an explicit single-column change to the other column
  -- so legitimate "make public"/"make private" edits work no matter which
  -- column the caller set.
  IF TG_OP = 'UPDATE' THEN
    IF NEW.privacy IS DISTINCT FROM OLD.privacy
       AND NEW.visibility IS NOT DISTINCT FROM OLD.visibility THEN
      NEW.visibility := NEW.privacy;
      RETURN NEW;
    ELSIF NEW.visibility IS DISTINCT FROM OLD.visibility
          AND NEW.privacy IS NOT DISTINCT FROM OLD.privacy THEN
      NEW.privacy := NEW.visibility;
      RETURN NEW;
    END IF;
  END IF;

  -- INSERT, or an UPDATE that changed both (or neither) column to differing
  -- values: fall back to the most restrictive so we never over-expose.
  IF NEW.privacy IS DISTINCT FROM NEW.visibility THEN
    rank_priv := CASE NEW.privacy    WHEN 'private' THEN 0 WHEN 'friends' THEN 1 ELSE 2 END;
    rank_vis  := CASE NEW.visibility WHEN 'private' THEN 0 WHEN 'friends' THEN 1 ELSE 2 END;
    IF rank_priv <= rank_vis THEN
      NEW.visibility := NEW.privacy;
    ELSE
      NEW.privacy := NEW.visibility;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_album_privacy_visibility ON public.albums;
CREATE TRIGGER trg_sync_album_privacy_visibility
  BEFORE INSERT OR UPDATE ON public.albums
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_album_privacy_visibility();

COMMIT;

-- Verify after applying:
--   SELECT count(*) FROM albums WHERE visibility IS DISTINCT FROM privacy; -- expect 0
