-- ============================================================================
-- CLERK BASELINE COMPLETENESS
-- ============================================================================
-- Closes the gap between this repo's migration directory (m02-m37) and the
-- baseline `users`/`albums`/`photos`/etc. schema that lives OUTSIDE this
-- directory in the Supabase Dashboard setup script
-- (supabase/migrations/README_DATABASE_SETUP.md points testers there).
--
-- A Round 4 code review caught that migrations 31-37 reference columns,
-- tables, and storage buckets that no migration in THIS directory creates.
-- On a fresh `supabase db reset && supabase db push`, m31-m37 silently
-- mis-apply (REVOKEs no-op against missing columns; storage policies attach
-- to non-existent buckets; the m37 CHECK constraint validates a column that
-- isn't there; the m36 users_public view fails to compile because it
-- references is_verified / bio / etc.).
--
-- This migration is the closure: it makes m31-m37 safely re-runnable by
-- adding the columns, buckets, and conditional patches the baseline-script
-- branch was implicitly providing.
--
-- What this migration does:
--   1. Defensively ADD COLUMN IF NOT EXISTS every column the canonical
--      `User` type in src/types/database.ts expects on public.users, plus
--      the columns that m31-m37 reference but the type doesn't list
--      (is_verified, deleted_at, last_activity_date, etc.).
--   2. Re-apply the m35 REVOKEs on email / email_notifications / phone /
--      two_factor_secret defensively — m35's REVOKEs on non-existent
--      columns would have errored or no-op'd; this migration runs them
--      after the columns are guaranteed to exist.
--   3. Make m37's privacy_level CHECK constraint conditional + tolerant of
--      a freshly-added column with no rows. m37 used NOT VALID + VALIDATE
--      which is fine for a column with rows; the rewrite here drops any
--      prior version, then re-installs the constraint inline (safe even
--      when the column was just created with zero rows because the CHECK
--      allows NULL via the IS NULL branch — m37's variant did NOT allow
--      NULL, which is fine for a populated column but errors during
--      VALIDATE if any pre-existing row has a NULL).
--   4. Recreate the public.users_public view (m36 step 5) using only
--      columns that actually exist post-step 1. Falls back to the
--      guaranteed-minimal column set if the optional ones are still
--      somehow missing.
--   5. INSERT the three storage buckets (photos, avatars, covers) that m32
--      attaches policies to. ON CONFLICT DO NOTHING so re-applying is safe
--      and so we don't clobber a bucket the dashboard already created with
--      different settings.
--   6. Convert two more UUID-arg functions caught by the Round 4 RPC audit
--      to TEXT user-id parameters: record_album_view (m22) and
--      get_discover_feed (m17). Both are called from app code with Clerk
--      TEXT subjects — without these rewrites, useAlbumViews silently
--      never increments view counts and useDiscoverFeed silently degrades
--      to its fallback path.
--   7. Widen get_most_followed_users (m35:664-688) to return the user
--      profile shape its consumer in src/components/search/useSearchState.ts
--      expects ({id, username, display_name, avatar_url, follower_count})
--      instead of the (user_id, follower_count) shape it returns today.
--      Today's caller crashes on `traveler.id` returning undefined.
--
-- What this migration does NOT do:
--   * Modify migrations 31-37. Closure happens here, not retroactively.
--   * Re-validate the privacy_level CHECK against pre-existing rows that
--     might be NULL (the constraint we install allows NULL explicitly to
--     dodge that footgun on fresh-baseline boots).
--   * Touch storage object policies (those are m32's job; this only
--     creates the buckets so m32's policies have something to attach to).
--   * Add foreign keys for the new columns — none of them point at other
--     tables.
--
-- Apply: paste into the Supabase SQL editor or `supabase db push` AFTER
-- m37 has been applied. This file assumes m31-m37 ran first.
-- Rollback notes are at the bottom of this file.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. public.users — additive column additions
-- ----------------------------------------------------------------------------
-- Source of truth: the User interface in src/types/database.ts (lines 1-21)
-- plus the columns that m31-m37 reference but the type doesn't list. Each
-- ADD COLUMN IF NOT EXISTS is idempotent; the migration is safe to re-run.
--
-- Column-by-column rationale:
--   * email                — Clerk webhook INSERT (phone-only signups exist,
--                            so nullable). Re-revoked in step 2 below.
--   * username             — User type. UNIQUE (defensive — most baseline
--                            schemas already constrain it, but the m31
--                            ALTER COLUMN id chain doesn't touch it).
--   * display_name         — User type.
--   * avatar_url           — User type. Used by m36 users_public view.
--   * cover_photo_url      — User type.
--   * bio                  — User type. Used by m36 users_public view.
--   * privacy_level        — User type. m37 adds a CHECK constraint here
--                            (which we re-do conditionally in step 3
--                            because m37's VALIDATE step explodes on NULL).
--   * is_verified          — Used by m36 users_public view. Default FALSE.
--   * deleted_at           — Used by m35 users_public_read predicate, m36
--                            view, and the soft_delete_user / is_user_active
--                            helpers from m35. Nullable.
--   * email_notifications  — Re-revoked in step 2. Default TRUE so existing
--                            users keep getting notifications.
--   * phone                — Re-revoked in step 2. Nullable.
--   * two_factor_secret    — Re-revoked in step 2. Nullable.
--   * is_private           — User type ('is_private: boolean'). Distinct
--                            from privacy_level — many baseline schemas have
--                            both. Default FALSE.
--   * home_city / _country / _latitude / _longitude — User type.
--   * last_activity_date / current_streak_days / longest_streak_days
--                          — Read+written by record_user_activity (m37).
--   * name                 — User type. Legacy field, kept for the type to
--                            line up with whatever already exists in the
--                            baseline.
--   * location / website   — User type.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email                TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS name                 TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS username             TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS display_name         TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url           TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS cover_photo_url      TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bio                  TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS location             TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS website              TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS privacy_level        TEXT NOT NULL DEFAULT 'public';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_verified          BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_private           BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS deleted_at           TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_notifications  BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone                TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS two_factor_secret    TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS home_city            TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS home_country         TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS home_latitude        DOUBLE PRECISION;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS home_longitude       DOUBLE PRECISION;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_activity_date   DATE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS current_streak_days  INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS longest_streak_days  INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Username UNIQUE constraint — only attach if the column has no existing
-- unique index (defensive: most baseline schemas declare it UNIQUE in the
-- CREATE TABLE; if they didn't, we add it here). Wrap in a DO block because
-- ADD CONSTRAINT IF NOT EXISTS isn't a thing on UNIQUE constraints.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.users'::regclass
      AND contype  = 'u'
      AND conname  = 'users_username_key'
  ) THEN
    -- Only attach the constraint if no rows would violate it. If any
    -- duplicate usernames exist we surface them in a NOTICE and skip the
    -- constraint so the migration doesn't abort — operator follow-up.
    IF NOT EXISTS (
      SELECT 1 FROM (
        SELECT username FROM public.users
        WHERE username IS NOT NULL
        GROUP BY username HAVING COUNT(*) > 1
      ) dupes
    ) THEN
      ALTER TABLE public.users ADD CONSTRAINT users_username_key UNIQUE (username);
    ELSE
      RAISE NOTICE 'Skipping users_username_key — duplicate usernames exist; clean them up and re-run.';
    END IF;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. Re-apply the m35 REVOKEs defensively
-- ----------------------------------------------------------------------------
-- m35 step 6 issued column-level REVOKEs on email, email_notifications,
-- phone, and two_factor_secret. If any of those columns didn't exist when
-- m35 ran, the REVOKE either errored under STRICT settings or no-op'd. Now
-- that step 1 above guarantees they exist, re-issue the same REVOKEs so the
-- privacy posture m35 INTENDED is actually in place.
--
-- IF EXISTS guards make this safe even if the column genuinely doesn't exist
-- in some exotic schema variant.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'email'
  ) THEN
    EXECUTE 'REVOKE SELECT (email) ON public.users FROM anon';
    EXECUTE 'REVOKE SELECT (email) ON public.users FROM authenticated';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'email_notifications'
  ) THEN
    EXECUTE 'REVOKE SELECT (email_notifications) ON public.users FROM anon';
    EXECUTE 'REVOKE SELECT (email_notifications) ON public.users FROM authenticated';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'phone'
  ) THEN
    EXECUTE 'REVOKE SELECT (phone) ON public.users FROM anon, authenticated';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'two_factor_secret'
  ) THEN
    EXECUTE 'REVOKE SELECT (two_factor_secret) ON public.users FROM anon, authenticated';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. Re-apply m37's privacy_level CHECK constraint conditionally
-- ----------------------------------------------------------------------------
-- m37 step 6 (lines 643-652) does:
--   ADD CONSTRAINT users_privacy_level_check CHECK (privacy_level IN (...)) NOT VALID;
--   ALTER TABLE ... VALIDATE CONSTRAINT users_privacy_level_check;
-- That fails on a fresh boot because the column didn't exist when m37 ran
-- (so the ADD CONSTRAINT errored). Even if the column exists, VALIDATE
-- can fail if any row has privacy_level = NULL.
--
-- Now that step 1 guarantees the column exists with a DEFAULT 'public',
-- re-install the constraint with NULL-tolerance so it survives any baseline
-- that has NULL rows from before this migration ran. Drop any prior version
-- first so the migration is safe to re-run.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'privacy_level'
  ) THEN
    -- Drop both the m37 name and our new name so re-runs are clean.
    EXECUTE 'ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_privacy_level_check';

    -- NULL-tolerant variant. Step 1 added the column with DEFAULT 'public'
    -- so new rows are 'public' by default and existing baseline rows that
    -- already had a value will surface as either 'public', 'private', or
    -- 'friends'. NULL is permitted defensively to handle rows that
    -- pre-dated the column having a NOT NULL DEFAULT.
    EXECUTE $CHECK$
      ALTER TABLE public.users ADD CONSTRAINT users_privacy_level_check
        CHECK (privacy_level IS NULL OR privacy_level IN ('public', 'private', 'friends'))
    $CHECK$;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 4. Re-create users_public view conditionally
-- ----------------------------------------------------------------------------
-- m36 step 5 created public.users_public selecting (id, username,
-- display_name, avatar_url, bio, is_verified, created_at). On a fresh boot
-- where the optional columns (bio, is_verified, avatar_url) didn't exist,
-- the m36 CREATE VIEW would have failed and rolled back the entire m36
-- migration.
--
-- Fix: introspect information_schema.columns and dynamically build the view
-- with only the columns that actually exist. Always include the
-- guaranteed-minimal set (id, username, display_name, avatar_url) and only
-- optionally add bio, is_verified, created_at if those columns exist (they
-- now do, post-step 1, but we're paranoid).
--
-- The view stays SECURITY INVOKER so m35's users_public_read predicate
-- continues to gate row visibility.
DROP VIEW IF EXISTS public.users_public;

DO $$
DECLARE
  v_columns TEXT;
  v_has_bio          BOOLEAN;
  v_has_is_verified  BOOLEAN;
  v_has_created_at   BOOLEAN;
  v_has_deleted_at   BOOLEAN;
BEGIN
  -- Existence checks for optional columns.
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='users' AND column_name='bio')
    INTO v_has_bio;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='users' AND column_name='is_verified')
    INTO v_has_is_verified;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='users' AND column_name='created_at')
    INTO v_has_created_at;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='users' AND column_name='deleted_at')
    INTO v_has_deleted_at;

  -- Always include the minimal-guaranteed set. id is the PK; username /
  -- display_name / avatar_url are universal across every baseline schema.
  v_columns := 'u.id, u.username, u.display_name, u.avatar_url';

  IF v_has_bio          THEN v_columns := v_columns || ', u.bio';          END IF;
  IF v_has_is_verified  THEN v_columns := v_columns || ', u.is_verified';  END IF;
  IF v_has_created_at   THEN v_columns := v_columns || ', u.created_at';   END IF;

  -- Build the view. If deleted_at exists, filter soft-deleted users out
  -- defensively so the view never exposes a deleted user even if
  -- users_public_read on the underlying table is briefly misconfigured.
  IF v_has_deleted_at THEN
    EXECUTE format(
      'CREATE VIEW public.users_public WITH (security_invoker = true) AS '
      'SELECT %s FROM public.users u WHERE u.deleted_at IS NULL',
      v_columns
    );
  ELSE
    EXECUTE format(
      'CREATE VIEW public.users_public WITH (security_invoker = true) AS '
      'SELECT %s FROM public.users u',
      v_columns
    );
  END IF;
END $$;

COMMENT ON VIEW public.users_public IS
  'm38 rebuild of m36 view. Column list is dynamic — only includes columns '
  'that exist post-m38 step 1. SECURITY INVOKER so users_public_read RLS '
  'on the underlying table still applies.';

GRANT SELECT ON public.users_public TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 5. Storage buckets
-- ----------------------------------------------------------------------------
-- m32 attaches RLS policies to storage.objects scoped by bucket_id IN
-- ('photos', 'avatars', 'covers'). Without rows in storage.buckets for
-- those ids, the buckets don't exist and uploads fail with "Bucket not
-- found". Create them here, ON CONFLICT DO NOTHING so we don't clobber a
-- dashboard-created bucket with different settings.
--
-- File-size and MIME settings come from src/lib/config/security.ts:
--   * photos:  10MB, image/{jpeg,png,webp,gif}
--   * avatars:  5MB, image/{jpeg,png,webp}
--   * covers:   5MB, image/{jpeg,png,webp}
-- All three buckets are public-read because the app constructs CDN-style
-- URLs that go through Supabase Storage's anonymous-read path.
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES
  ('photos',  'photos',  true,  false, 10485760, ARRAY['image/jpeg','image/png','image/webp','image/gif']),
  ('avatars', 'avatars', true,  false,  5242880, ARRAY['image/jpeg','image/png','image/webp']),
  ('covers',  'covers',  true,  false,  5242880, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 6. UUID-arg → TEXT-arg function rewrites caught by Round 4 RPC audit
-- ----------------------------------------------------------------------------

-- 6a. record_album_view(p_album_id UUID, p_viewer_id UUID) — m22:25
-- Caller: src/lib/hooks/useAlbumViews.ts:22 calls with Clerk TEXT subject.
-- Today the RPC errors with "function record_album_view(uuid, text) does
-- not exist" and the JS try/catch swallows it silently. Result: no album
-- view tracking ever increments. Rewrite param to TEXT.
--
-- Body changes beyond the parameter type:
--   * album_views.viewer_id was originally `UUID REFERENCES auth.users(id)`
--     in m22. m31 step 5 converted it to TEXT (column ends in `_id` and is
--     in the user-id pattern set, so it matched). The body's INSERT and
--     ON CONFLICT clauses don't need any cast change because both sides
--     are now TEXT.
--   * SET search_path tightened to (public, pg_temp) per the m06/m35
--     convention (m22 only set it to public).
DROP FUNCTION IF EXISTS public.record_album_view(UUID, UUID);
DROP FUNCTION IF EXISTS public.record_album_view(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.record_album_view(
  p_album_id UUID,
  p_viewer_id TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Try to insert the view record (deduplicates per user per day via the
  -- UNIQUE(album_id, viewer_id, viewed_at::date) constraint added in m22).
  INSERT INTO public.album_views (album_id, viewer_id, viewed_at)
  VALUES (p_album_id, p_viewer_id, NOW())
  ON CONFLICT (album_id, viewer_id, (viewed_at::date)) DO NOTHING;

  -- Only increment if a new row was actually inserted (FOUND is true after
  -- a successful INSERT, false when ON CONFLICT no-ops).
  IF FOUND THEN
    UPDATE public.albums
    SET view_count = COALESCE(view_count, 0) + 1
    WHERE id = p_album_id;
  END IF;
END;
$$;
COMMENT ON FUNCTION public.record_album_view(UUID, TEXT) IS
  'm38 Clerk rewrite: p_viewer_id is TEXT (Clerk subject). '
  'Without this, useAlbumViews silently never increments view counts.';
GRANT EXECUTE ON FUNCTION public.record_album_view(UUID, TEXT) TO authenticated;

-- 6b. get_discover_feed(p_user_id UUID, p_limit INTEGER, p_offset INTEGER)
-- m17:3. Caller: src/lib/hooks/useDiscoverFeed.ts:46 calls with Clerk TEXT
-- subject. Today the RPC errors and the JS falls back to a manual albums
-- query that returns no engagement metrics — so the discover feed silently
-- degrades. Rewrite param to TEXT and update the user_id RETURNS TABLE
-- column to TEXT (consumer already treats it as a string).
--
-- Body changes beyond the parameter / return-shape type:
--   * No auth.uid() in the body to swap out. The existing body already used
--     polymorphic likes/comments joins via target_id::text per m17:69. No
--     other body changes required.
--   * SET search_path tightened to (public, pg_temp) per the m06/m35
--     convention (m17 only set it to public).
--   * The original SELECT used `a.user_id != p_user_id` (UUID vs UUID) which
--     would have errored under Clerk; rewrite uses TEXT comparison.
DROP FUNCTION IF EXISTS public.get_discover_feed(UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.get_discover_feed(TEXT, INTEGER, INTEGER);
CREATE OR REPLACE FUNCTION public.get_discover_feed(
  p_user_id TEXT,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id TEXT,
  title TEXT,
  description TEXT,
  cover_photo_url TEXT,
  location_name TEXT,
  country_code TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  date_start TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  view_count INTEGER,
  like_count BIGINT,
  comment_count BIGINT,
  photo_count BIGINT,
  score DOUBLE PRECISION,
  owner_username TEXT,
  owner_display_name TEXT,
  owner_avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.user_id,
    a.title,
    a.description,
    a.cover_photo_url,
    a.location_name,
    a.country_code,
    a.latitude,
    a.longitude,
    a.date_start,
    a.created_at,
    COALESCE(a.view_count, 0) AS view_count,
    COALESCE(l.like_count, 0) AS like_count,
    COALESCE(c.comment_count, 0) AS comment_count,
    COALESCE(ph.photo_count, 0) AS photo_count,
    -- Scoring: recency (40%) + likes (30%) + comments (20%) + views (10%)
    (
      0.4 * GREATEST(0, 1.0 - EXTRACT(EPOCH FROM (NOW() - a.created_at)) / (30 * 86400))
      + 0.3 * LEAST(1.0, LN(GREATEST(1, COALESCE(l.like_count, 0)) + 1) / 5)
      + 0.2 * LEAST(1.0, LN(GREATEST(1, COALESCE(c.comment_count, 0)) + 1) / 4)
      + 0.1 * LEAST(1.0, LN(GREATEST(1, COALESCE(a.view_count, 0)) + 1) / 7)
    ) AS score,
    u.username AS owner_username,
    u.display_name AS owner_display_name,
    u.avatar_url AS owner_avatar_url
  FROM public.albums a
  INNER JOIN public.users u ON u.id = a.user_id
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::BIGINT AS like_count
    FROM public.likes WHERE target_type = 'album' AND target_id = a.id::text
  ) l ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::BIGINT AS comment_count
    FROM public.comments WHERE target_type = 'album' AND target_id = a.id::text
  ) c ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::BIGINT AS photo_count
    FROM public.photos WHERE album_id = a.id
  ) ph ON true
  WHERE
    -- Only public albums (visibility OR privacy because the column has
    -- drifted between baseline schemas — m17 hedges both).
    (a.visibility = 'public' OR a.privacy = 'public')
    -- Not from the requesting user (TEXT comparison, both sides TEXT
    -- post-m31).
    AND a.user_id <> p_user_id
    -- Not from followed users (these appear in the regular feed).
    AND NOT EXISTS (
      SELECT 1 FROM public.follows f
      WHERE f.follower_id = p_user_id
        AND f.following_id = a.user_id
        AND f.status = 'accepted'
    )
    -- Has at least one photo.
    AND COALESCE(ph.photo_count, 0) > 0
    -- Published status (NULL means draft-or-published per m17 hedge).
    AND (a.status IS NULL OR a.status = 'published')
  ORDER BY score DESC, a.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;
COMMENT ON FUNCTION public.get_discover_feed(TEXT, INTEGER, INTEGER) IS
  'm38 Clerk rewrite: p_user_id and the returned user_id are TEXT (Clerk '
  'subject). Without this, useDiscoverFeed silently degrades to its '
  'fallback path that returns zeroed engagement metrics.';
GRANT EXECUTE ON FUNCTION public.get_discover_feed(TEXT, INTEGER, INTEGER) TO authenticated;

-- ----------------------------------------------------------------------------
-- 7. get_most_followed_users return-shape widening
-- ----------------------------------------------------------------------------
-- m35:664-688 returns (user_id TEXT, follower_count BIGINT). The JS
-- consumer in src/components/search/useSearchState.ts:556-569 destructures
-- {id, username, display_name, avatar_url, bio, privacy_level,
-- followers_count}. Today's caller crashes on `traveler.id` returning
-- undefined (it would also fail on traveler.username, .display_name, etc.).
--
-- Fix: widen the RETURNS TABLE to the full user-card shape and JOIN against
-- public.users in the body. Renaming the column from user_id to id is a
-- minor RPC-contract break, but the consumer already expects `id` — the
-- current contract is the bug.
--
-- Note: the DROP FUNCTION must come BEFORE the CREATE OR REPLACE because
-- the RETURNS TABLE column list is changing (PostgreSQL can't replace a
-- function with a different return type).
DROP FUNCTION IF EXISTS public.get_most_followed_users(INTEGER);
CREATE OR REPLACE FUNCTION public.get_most_followed_users(
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id              TEXT,
  username        TEXT,
  display_name    TEXT,
  avatar_url      TEXT,
  follower_count  BIGINT
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.username,
    u.display_name,
    u.avatar_url,
    COUNT(f.*)::BIGINT AS follower_count
  FROM public.follows f
  INNER JOIN public.users u ON u.id = f.following_id
  WHERE f.status = 'accepted'
    -- Don't surface soft-deleted users (m35 users_public_read aside, this
    -- prevents a deleted account from leading the leaderboard).
    AND (u.deleted_at IS NULL)
  GROUP BY u.id, u.username, u.display_name, u.avatar_url
  ORDER BY follower_count DESC
  LIMIT p_limit;
END;
$$;
COMMENT ON FUNCTION public.get_most_followed_users(INTEGER) IS
  'm38 widen: returns full user-card shape (id, username, display_name, '
  'avatar_url, follower_count) matching the consumer in '
  'src/components/search/useSearchState.ts. Previously returned just '
  '(user_id, follower_count) which crashed `traveler.id` on the caller.';
GRANT EXECUTE ON FUNCTION public.get_most_followed_users(INTEGER) TO authenticated, anon;

COMMIT;

-- ============================================================================
-- AUDIT — run after applying. Anything returned here is a leftover.
-- ============================================================================
-- A. Columns that the app expects on public.users that the type lists but
--    which still aren't on the table (should be empty):
--
--   WITH expected(col) AS (VALUES
--     ('id'), ('email'), ('name'), ('username'), ('display_name'),
--     ('avatar_url'), ('cover_photo_url'), ('bio'), ('location'),
--     ('website'), ('privacy_level'), ('is_verified'), ('is_private'),
--     ('deleted_at'), ('email_notifications'), ('phone'),
--     ('two_factor_secret'), ('home_city'), ('home_country'),
--     ('home_latitude'), ('home_longitude'), ('last_activity_date'),
--     ('current_streak_days'), ('longest_streak_days'),
--     ('created_at'), ('updated_at')
--   )
--   SELECT col FROM expected
--   EXCEPT
--   SELECT column_name FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='users';
--   -- expect: empty set.
--
-- B. Confirm the email / email_notifications / phone / two_factor_secret
--    REVOKEs are in place:
--
--   SELECT grantee, column_name, privilege_type
--   FROM information_schema.column_privileges
--   WHERE table_schema = 'public' AND table_name = 'users'
--     AND column_name IN ('email','email_notifications','phone','two_factor_secret')
--     AND grantee IN ('anon','authenticated');
--   -- expect: NO rows for SELECT on those columns.
--
-- C. Confirm the privacy_level CHECK is in place:
--
--   SELECT conname, pg_get_constraintdef(oid)
--   FROM pg_constraint
--   WHERE conrelid = 'public.users'::regclass
--     AND conname  = 'users_privacy_level_check';
--   -- expect: CHECK ((privacy_level IS NULL) OR (privacy_level IN ('public','private','friends')))
--
-- D. Confirm the users_public view exists with the expected column list:
--
--   SELECT column_name, ordinal_position
--   FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'users_public'
--   ORDER BY ordinal_position;
--   -- expect: id, username, display_name, avatar_url, bio, is_verified, created_at
--   -- (the optional ones may be absent if step 1 didn't add them somehow)
--
-- E. Confirm the storage buckets exist:
--
--   SELECT id, public, file_size_limit FROM storage.buckets
--   WHERE id IN ('photos','avatars','covers')
--   ORDER BY id;
--   -- expect: 3 rows with public = true.
--
-- F. Confirm the rewritten functions take TEXT user-id:
--
--   SELECT proname, pg_get_function_identity_arguments(oid)
--   FROM pg_proc
--   WHERE proname IN ('record_album_view','get_discover_feed','get_most_followed_users')
--     AND pronamespace = 'public'::regnamespace
--   ORDER BY proname;
--   -- expect:
--   --   get_discover_feed         | p_user_id text, p_limit integer, p_offset integer
--   --   get_most_followed_users   | p_limit integer
--   --   record_album_view         | p_album_id uuid, p_viewer_id text
--
-- G. Confirm get_most_followed_users returns the user-card shape:
--
--   SELECT pg_get_function_result(oid)
--   FROM pg_proc
--   WHERE proname = 'get_most_followed_users' AND pronamespace = 'public'::regnamespace;
--   -- expect: TABLE(id text, username text, display_name text, avatar_url text, follower_count bigint)
--
-- H. Final sweep — any UUID-arg user-id functions still exposed?
--
--   SELECT proname, pg_get_function_identity_arguments(oid)
--   FROM pg_proc p
--   JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname = 'public'
--     AND pg_get_function_identity_arguments(p.oid) ~* '\b(_user_id|p_user_id|p_viewer_id|_twin_id|_owner_id)\s+uuid\b';
--   -- expect: empty set after m37 + m38.
--
-- I. m31's discovery query — UUID columns whose name suggests user ids and
--    which slipped through earlier passes (should still be empty post-m38;
--    m38 adds new TEXT columns only):
--
--   SELECT table_schema, table_name, column_name
--   FROM information_schema.columns
--   WHERE table_schema = 'public'
--     AND data_type    = 'uuid'
--     AND (column_name ILIKE '%user%' OR column_name ILIKE '%_by%')
--     AND table_name NOT IN ('storage_cleanup_queue');
--   -- expect: empty set.

-- ============================================================================
-- ## DELIBERATELY UNCHANGED
-- ============================================================================
-- 1. m31 step 6 already converted public.users.id from UUID to TEXT. We do
--    NOT re-issue that ALTER here — m31 owns it. If a fresh boot somehow
--    reaches m38 with public.users.id still UUID, every other migration
--    would have already failed; this migration assumes m31-m37 applied.
--
-- 2. The polymorphic likes/comments target_id columns. m17/m22/m35 all
--    treat them as compatible with `a.id::text`; no schema change needed.
--
-- 3. Storage object policies. m32 owns those. This migration only ensures
--    the buckets exist so m32's policies have something to attach to.
--
-- 4. Re-validation of m37's CHECK against existing rows. If any row has
--    a privacy_level value outside ('public','private','friends') it would
--    have to have been set by app code before the column existed (impossible)
--    OR by a manual SQL write. The NULL-tolerant CHECK we install handles
--    the "fresh column with NULL rows" case; out-of-domain values surface
--    on next write, which is the right escalation path.
--
-- 5. The owner-only ALL policy from m31 step 9 already covers user_id-keyed
--    tables. The new columns we added (email, deleted_at, etc.) are on
--    public.users itself, which uses .id-keyed policies (users_self_write
--    + users_public_read) installed in m31 lines 273-285. No additional
--    policies are needed for the new columns.
--
-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- This migration is purely additive (new columns, a constraint, a view, a
-- handful of buckets, three function rewrites). To roll back:
--
--   BEGIN;
--   -- Functions: re-apply m17 / m22 / m35 to restore the UUID-arg /
--   -- narrow-return shapes (NOT recommended — those bodies are broken
--   -- under Clerk).
--   DROP FUNCTION IF EXISTS public.record_album_view(UUID, TEXT);
--   DROP FUNCTION IF EXISTS public.get_discover_feed(TEXT, INTEGER, INTEGER);
--   DROP FUNCTION IF EXISTS public.get_most_followed_users(INTEGER);
--
--   -- View: drop and let m36 own the recreate (m36's CREATE VIEW will
--   -- fail again on a fresh boot — the whole point of this migration).
--   DROP VIEW IF EXISTS public.users_public;
--
--   -- Constraint:
--   ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_privacy_level_check;
--
--   -- Buckets: only drop if you're certain no objects reference them.
--   -- DELETE FROM storage.buckets WHERE id IN ('photos','avatars','covers');
--
--   -- Columns: each ADD COLUMN IF NOT EXISTS in step 1 has a matching
--   -- DROP COLUMN IF EXISTS rollback. Most of these are safe to drop
--   -- ONLY if app code has not started writing to them; a partial
--   -- rollback is dangerous.
--   --   ALTER TABLE public.users DROP COLUMN IF EXISTS last_activity_date;
--   --   ALTER TABLE public.users DROP COLUMN IF EXISTS current_streak_days;
--   --   (etc.)
--   COMMIT;
--
-- Recommended: leave m38 in place even if you need to roll back later
-- migrations; nothing it does is breaking.
