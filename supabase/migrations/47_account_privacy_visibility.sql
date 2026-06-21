-- ============================================================================
-- Migration: Account-level privacy + follower visibility
-- ============================================================================
-- Goal (Instagram-style account privacy):
--
--   * PUBLIC account  → their public albums are visible to everyone; their
--     friends-only albums are visible to accepted followers; private albums
--     stay owner-only.
--   * PRIVATE account → NOTHING is visible to non-followers (not even their
--     "public" albums). Their basic profile (name / avatar / bio) is still
--     readable by logged-in users so they can be recommended and sent a
--     follow request. Once a follower is ACCEPTED, that follower sees all of
--     the account's non-private albums (in the feed and on the profile).
--   * Per-album visibility = 'private' is always owner-only, for any account.
--
-- Why this migration exists — the canonical RLS state (migration 39) had three
-- gaps that broke the above:
--   1. No policy let accepted followers read a user's `friends` albums, so a
--      followed account's friends-only posts never appeared in the feed.
--   2. `users` was only readable by others when privacy_level='public', so a
--      private account 404'd (couldn't be recommended or sent a request).
--   3. `albums_public_read` ignored the OWNER's account privacy, so a private
--      account's default-'public' albums leaked into Discover / public pages.
--
-- Idempotent: safe to re-run. Apply via the Supabase SQL editor or `db push`.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. users — logged-in users can read any profile's basic info.
--    Content privacy is enforced on albums/photos below, not by hiding the
--    profile row. Anonymous visitors keep the public-only policy from m39.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "users_authenticated_read" ON public.users;
CREATE POLICY "users_authenticated_read"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (true);

-- ----------------------------------------------------------------------------
-- 2. albums_public_read — a 'public' album is world-readable ONLY when its
--    owner's account is also public. This stops a private/friends account's
--    albums from leaking into Discover, the SSR public profile, the globe, etc.
--    (Owners always see their own albums via albums_owner_all from m39.)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "albums_public_read" ON public.albums;
CREATE POLICY "albums_public_read"
  ON public.albums
  FOR SELECT
  TO anon, authenticated
  USING (
    visibility = 'public'
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = albums.user_id
        AND u.privacy_level = 'public'
    )
  );

-- ----------------------------------------------------------------------------
-- 3. albums_follower_read — accepted followers can read a user's NON-private
--    albums (public + friends), regardless of the owner's account privacy.
--    This is what surfaces a followed public OR private account's posts in the
--    Friends feed and on their profile.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "albums_follower_read" ON public.albums;
CREATE POLICY "albums_follower_read"
  ON public.albums
  FOR SELECT
  TO authenticated
  USING (
    visibility <> 'private'
    AND EXISTS (
      SELECT 1 FROM public.follows f
      WHERE f.follower_id  = auth.uid()
        AND f.following_id = albums.user_id
        AND f.status       = 'accepted'
    )
  );

-- ----------------------------------------------------------------------------
-- 4. photos_public_album_read — mirror the owner-privacy gate from (2).
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "photos_public_album_read" ON public.photos;
CREATE POLICY "photos_public_album_read"
  ON public.photos
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.albums a
      JOIN public.users  u ON u.id = a.user_id
      WHERE a.id = photos.album_id
        AND a.visibility    = 'public'
        AND u.privacy_level = 'public'
    )
  );

-- ----------------------------------------------------------------------------
-- 5. photos_follower_read — accepted followers can read photos of the
--    non-private albums they are now allowed to see (3).
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "photos_follower_read" ON public.photos;
CREATE POLICY "photos_follower_read"
  ON public.photos
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.albums  a
      JOIN public.follows f ON f.following_id = a.user_id
      WHERE a.id = photos.album_id
        AND a.visibility  <> 'private'
        AND f.follower_id  = auth.uid()
        AND f.status       = 'accepted'
    )
  );

-- ----------------------------------------------------------------------------
-- 6. get_suggested_travelers — recommendations that can include PRIVATE
--    accounts. SECURITY DEFINER so we can count a private account's albums
--    (hidden from the caller by RLS) for ranking. Returns only safe profile
--    fields + a content count; never any album rows. Excludes the caller and
--    anyone they already follow or have a pending request to.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_suggested_travelers(
  _user_id uuid,
  _limit   int DEFAULT 6
)
RETURNS TABLE (
  id            uuid,
  username      text,
  display_name  text,
  avatar_url    text,
  privacy_level text,
  album_count   bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id,
         u.username,
         u.display_name,
         u.avatar_url,
         u.privacy_level,
         count(a.id) AS album_count
  FROM public.users u
  JOIN public.albums a
    ON a.user_id   = u.id
   AND a.visibility <> 'private'
   AND coalesce(a.status, 'published') = 'published'
  WHERE u.id <> _user_id
    AND NOT EXISTS (
      SELECT 1 FROM public.follows f
      WHERE f.follower_id  = _user_id
        AND f.following_id = u.id
        AND f.status IN ('accepted', 'pending')
    )
  GROUP BY u.id, u.username, u.display_name, u.avatar_url, u.privacy_level
  HAVING count(a.id) > 0
  ORDER BY count(a.id) DESC, u.username ASC
  LIMIT greatest(_limit, 0);
$$;

GRANT EXECUTE ON FUNCTION public.get_suggested_travelers(uuid, int) TO authenticated;

COMMIT;

-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- BEGIN;
--   DROP FUNCTION IF EXISTS public.get_suggested_travelers(uuid, int);
--   DROP POLICY   IF EXISTS "photos_follower_read"     ON public.photos;
--   DROP POLICY   IF EXISTS "albums_follower_read"     ON public.albums;
--   DROP POLICY   IF EXISTS "users_authenticated_read" ON public.users;
--   -- Restore the m39 (leaky) public-read policies:
--   DROP POLICY IF EXISTS "albums_public_read" ON public.albums;
--   CREATE POLICY "albums_public_read" ON public.albums FOR SELECT
--     TO anon, authenticated USING (visibility = 'public');
--   DROP POLICY IF EXISTS "photos_public_album_read" ON public.photos;
--   CREATE POLICY "photos_public_album_read" ON public.photos FOR SELECT
--     TO anon, authenticated USING (
--       EXISTS (SELECT 1 FROM public.albums a
--               WHERE a.id = photos.album_id AND a.visibility = 'public'));
-- COMMIT;
