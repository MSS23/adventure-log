-- ============================================================================
-- CLERK STORAGE POLICIES
-- ============================================================================
-- Rewrites Supabase Storage RLS so file paths are gated by
-- public.clerk_user_id() instead of auth.uid().
--
-- Buckets covered (from src/lib/utils/storage.ts):
--   * photos   — album photos. Public-read (CDN-style URLs are world-visible).
--   * avatars  — profile pictures. Public-read.
--   * covers   — profile cover banners. Public-read.
--
-- All three buckets are configured `public: true` in the app, so anonymous
-- read is the existing semantic. Owner-only writes are the new constraint.
--
-- Apply: paste into the Supabase SQL editor as the owner role (or use
-- `supabase db push`). Cannot be applied through PgBouncer transaction mode
-- if your project enforces it on the storage schema.
--
-- Rollback notes are at the bottom of this file.
--
-- ============================================================================
-- ## DISCOVERED
-- ============================================================================
-- The agent prompt described two storage path conventions:
--   * photos:  <user_id>/<album_id>/<file>
--   * avatars: <user_id>/<file>
--
-- Reality (grepped under src/) is messier:
--
--   PHOTOS BUCKET — three different conventions are live in the codebase:
--     A. <album_id>/<file>                (most flows: useAlbumCreation,
--                                          usePhotoUploadPage, useBulkImport,
--                                          useOfflineSync)
--     B. <user_id>/<album_id>/<file>      (server action
--                                          src/app/(app)/albums/actions.ts:406)
--     C. <user_id>-<timestamp>-<rand>.ext (helper uploadPhoto in storage.ts —
--                                          flat, no folder)
--
--   AVATARS BUCKET — uses convention C exclusively (uploadAvatar):
--     <user_id>-<timestamp>-<rand>.ext
--
--   COVERS BUCKET — uses convention C (uploadCoverPhoto):
--     <user_id>-<timestamp>-<rand>.ext
--
-- The cleanest fix in code is a follow-up: standardise every upload path on
-- <user_id>/<album_id>/<file> for photos and <user_id>/<file> for avatars
-- and covers. Until then, the policies below have to handle every existing
-- shape.
--
-- For the **photos** bucket, the only reliable common factor across A/B/C is
-- the row in public.photos that records the file_path. So the WRITE policies
-- below allow:
--   * convention A or B: ownership of the album whose UUID is the first or
--     second folder segment of the storage path; OR
--   * convention C (no folder): the filename starts with
--     `<clerk_user_id()>-`.
--
-- For **avatars** and **covers**, WRITE policies allow either:
--   * convention A: first folder segment matches clerk_user_id(); OR
--   * convention C: filename starts with `<clerk_user_id()>-`.
--
-- New uploads should adopt the folder-prefix convention. The flat-filename
-- branch is here so existing rows keep working until the upload code is
-- migrated.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Discover and drop every existing policy on storage.objects whose
--    definition references auth.uid(). The catalog stores the policy
--    expression as text in pg_policies.qual / .with_check; we drop on a
--    name match without re-reading the body.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND (
        COALESCE(qual,        '') ILIKE '%auth.uid()%'
        OR COALESCE(with_check,'') ILIKE '%auth.uid()%'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
  END LOOP;
END $$;

-- Also drop any prior versions of the policies we are about to create, so
-- this migration is safely re-runnable even if a previous attempt landed.
DROP POLICY IF EXISTS "photos_public_read"        ON storage.objects;
DROP POLICY IF EXISTS "photos_owner_insert"       ON storage.objects;
DROP POLICY IF EXISTS "photos_owner_update"       ON storage.objects;
DROP POLICY IF EXISTS "photos_owner_delete"       ON storage.objects;
DROP POLICY IF EXISTS "avatars_public_read"       ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_insert"      ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_update"      ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_delete"      ON storage.objects;
DROP POLICY IF EXISTS "covers_public_read"        ON storage.objects;
DROP POLICY IF EXISTS "covers_owner_insert"       ON storage.objects;
DROP POLICY IF EXISTS "covers_owner_update"       ON storage.objects;
DROP POLICY IF EXISTS "covers_owner_delete"       ON storage.objects;

-- ----------------------------------------------------------------------------
-- 2. Make sure RLS is on. Supabase enables it by default but be explicit.
-- ----------------------------------------------------------------------------
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 3. PHOTOS bucket
-- ----------------------------------------------------------------------------
-- Public-read: photos are served behind public CDN URLs. anon + authenticated
-- can read, matching the existing app behaviour.
CREATE POLICY "photos_public_read"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'photos');

-- Owner writes. Three branches covering every live path convention in the
-- codebase (see ## DISCOVERED above).
CREATE POLICY "photos_owner_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'photos'
    AND public.clerk_user_id() IS NOT NULL
    AND (
      -- Convention B: <user_id>/<album_id>/<file>
      (storage.foldername(name))[1] = public.clerk_user_id()
      -- Convention A: <album_id>/<file> — verify ownership via public.albums
      OR EXISTS (
        SELECT 1 FROM public.albums a
        WHERE a.id::text = (storage.foldername(name))[1]
          AND a.user_id  = public.clerk_user_id()
      )
      -- Convention C: <user_id>-<timestamp>-<rand>.ext (no folder)
      OR (
        (storage.foldername(name))[1] = ''
        AND name LIKE public.clerk_user_id() || '-%'
      )
    )
  );

CREATE POLICY "photos_owner_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'photos'
    AND public.clerk_user_id() IS NOT NULL
    AND (
      (storage.foldername(name))[1] = public.clerk_user_id()
      OR EXISTS (
        SELECT 1 FROM public.albums a
        WHERE a.id::text = (storage.foldername(name))[1]
          AND a.user_id  = public.clerk_user_id()
      )
      OR (
        (storage.foldername(name))[1] = ''
        AND name LIKE public.clerk_user_id() || '-%'
      )
    )
  )
  WITH CHECK (
    bucket_id = 'photos'
    AND public.clerk_user_id() IS NOT NULL
    AND (
      (storage.foldername(name))[1] = public.clerk_user_id()
      OR EXISTS (
        SELECT 1 FROM public.albums a
        WHERE a.id::text = (storage.foldername(name))[1]
          AND a.user_id  = public.clerk_user_id()
      )
      OR (
        (storage.foldername(name))[1] = ''
        AND name LIKE public.clerk_user_id() || '-%'
      )
    )
  );

CREATE POLICY "photos_owner_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'photos'
    AND public.clerk_user_id() IS NOT NULL
    AND (
      (storage.foldername(name))[1] = public.clerk_user_id()
      OR EXISTS (
        SELECT 1 FROM public.albums a
        WHERE a.id::text = (storage.foldername(name))[1]
          AND a.user_id  = public.clerk_user_id()
      )
      OR (
        (storage.foldername(name))[1] = ''
        AND name LIKE public.clerk_user_id() || '-%'
      )
    )
  );

-- ----------------------------------------------------------------------------
-- 4. AVATARS bucket
-- ----------------------------------------------------------------------------
CREATE POLICY "avatars_public_read"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_owner_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND public.clerk_user_id() IS NOT NULL
    AND (
      -- Folder-prefix convention (preferred for new uploads)
      (storage.foldername(name))[1] = public.clerk_user_id()
      -- Legacy flat-filename convention used by uploadAvatar()
      OR (
        (storage.foldername(name))[1] = ''
        AND name LIKE public.clerk_user_id() || '-%'
      )
    )
  );

CREATE POLICY "avatars_owner_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND public.clerk_user_id() IS NOT NULL
    AND (
      (storage.foldername(name))[1] = public.clerk_user_id()
      OR (
        (storage.foldername(name))[1] = ''
        AND name LIKE public.clerk_user_id() || '-%'
      )
    )
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND public.clerk_user_id() IS NOT NULL
    AND (
      (storage.foldername(name))[1] = public.clerk_user_id()
      OR (
        (storage.foldername(name))[1] = ''
        AND name LIKE public.clerk_user_id() || '-%'
      )
    )
  );

CREATE POLICY "avatars_owner_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND public.clerk_user_id() IS NOT NULL
    AND (
      (storage.foldername(name))[1] = public.clerk_user_id()
      OR (
        (storage.foldername(name))[1] = ''
        AND name LIKE public.clerk_user_id() || '-%'
      )
    )
  );

-- ----------------------------------------------------------------------------
-- 5. COVERS bucket (profile cover banners — same shape as avatars)
-- ----------------------------------------------------------------------------
CREATE POLICY "covers_public_read"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'covers');

CREATE POLICY "covers_owner_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'covers'
    AND public.clerk_user_id() IS NOT NULL
    AND (
      (storage.foldername(name))[1] = public.clerk_user_id()
      OR (
        (storage.foldername(name))[1] = ''
        AND name LIKE public.clerk_user_id() || '-%'
      )
    )
  );

CREATE POLICY "covers_owner_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'covers'
    AND public.clerk_user_id() IS NOT NULL
    AND (
      (storage.foldername(name))[1] = public.clerk_user_id()
      OR (
        (storage.foldername(name))[1] = ''
        AND name LIKE public.clerk_user_id() || '-%'
      )
    )
  )
  WITH CHECK (
    bucket_id = 'covers'
    AND public.clerk_user_id() IS NOT NULL
    AND (
      (storage.foldername(name))[1] = public.clerk_user_id()
      OR (
        (storage.foldername(name))[1] = ''
        AND name LIKE public.clerk_user_id() || '-%'
      )
    )
  );

CREATE POLICY "covers_owner_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'covers'
    AND public.clerk_user_id() IS NOT NULL
    AND (
      (storage.foldername(name))[1] = public.clerk_user_id()
      OR (
        (storage.foldername(name))[1] = ''
        AND name LIKE public.clerk_user_id() || '-%'
      )
    )
  );

COMMIT;

-- ============================================================================
-- AUDIT — run after applying.
-- ============================================================================
-- A. Confirm every storage.objects policy now keys off clerk_user_id() and
--    none reference auth.uid():
--
--   SELECT policyname, qual, with_check
--   FROM pg_policies
--   WHERE schemaname = 'storage' AND tablename = 'objects'
--   ORDER BY policyname;
--
-- B. Spot-check that upload-from-app still works for each bucket. After the
--    Clerk webhook has provisioned a public.users row for your test account,
--    in the app:
--      1. Upload a profile avatar (covers convention C path on avatars).
--      2. Create an album + upload a photo via the new-album wizard (covers
--         convention A path on photos).
--      3. Use the server-action upload URL endpoint (covers convention B
--         path on photos).
--
-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- This migration only drops + creates RLS policies. To roll back, drop every
-- policy created above. Storage will then refuse all writes until the
-- previous (auth.uid()-based) policies are recreated by hand.
--
--   BEGIN;
--   DROP POLICY IF EXISTS "photos_public_read"        ON storage.objects;
--   DROP POLICY IF EXISTS "photos_owner_insert"       ON storage.objects;
--   DROP POLICY IF EXISTS "photos_owner_update"       ON storage.objects;
--   DROP POLICY IF EXISTS "photos_owner_delete"       ON storage.objects;
--   DROP POLICY IF EXISTS "avatars_public_read"       ON storage.objects;
--   DROP POLICY IF EXISTS "avatars_owner_insert"      ON storage.objects;
--   DROP POLICY IF EXISTS "avatars_owner_update"      ON storage.objects;
--   DROP POLICY IF EXISTS "avatars_owner_delete"      ON storage.objects;
--   DROP POLICY IF EXISTS "covers_public_read"        ON storage.objects;
--   DROP POLICY IF EXISTS "covers_owner_insert"       ON storage.objects;
--   DROP POLICY IF EXISTS "covers_owner_update"       ON storage.objects;
--   DROP POLICY IF EXISTS "covers_owner_delete"       ON storage.objects;
--   COMMIT;
