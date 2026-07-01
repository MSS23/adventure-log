-- Add a lightweight "tagged" role to album collaborators.
--
-- Existing roles (migration 15) are edit-capable / participation roles:
--   contributor  – can add photos to the album
--   editor       – can add photos and edit album details
--   viewer       – explicitly granted read access
--
-- "tagged" is a credit-only relationship: the album owner tags a friend who
-- was there (a co-traveller) so they're credited on the album and it surfaces
-- under their profile / "Places" — but the tag grants no edit rights. This is
-- the "add friends to tags" half of the collabs feature; contributor/editor
-- remain the "collab" half.
--
-- Postgres has no ALTER ... ALTER CONSTRAINT for CHECKs, so we drop and
-- re-create the role constraint with the expanded value set. Idempotent:
-- guarded by IF EXISTS / IF NOT EXISTS so re-running is safe.

DO $$
BEGIN
  -- Drop the old role check if present (name comes from the inline CHECK in
  -- migration 15, which Postgres auto-names album_collaborators_role_check).
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'album_collaborators_role_check'
      AND conrelid = 'public.album_collaborators'::regclass
  ) THEN
    ALTER TABLE public.album_collaborators
      DROP CONSTRAINT album_collaborators_role_check;
  END IF;

  -- Re-add with the expanded set including 'tagged'.
  ALTER TABLE public.album_collaborators
    ADD CONSTRAINT album_collaborators_role_check
    CHECK (role IN ('contributor', 'editor', 'viewer', 'tagged'));
END $$;
