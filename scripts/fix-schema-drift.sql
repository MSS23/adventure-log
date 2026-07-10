-- ============================================================================
-- fix-schema-drift.sql — one-shot repair for production schema drift
-- ============================================================================
-- The live Supabase database is missing specific objects that the checked-in
-- migrations (supabase/migrations/, plus supabase/migrations_backup/ for
-- album_shares) define. This script recreates ONLY the confirmed-missing
-- objects:
--
--   1.  Table  public.reports                (migration 14, FKs repointed per 34/39)
--   2.  Table  public.album_shares           (migrations_backup/20250111 + 20250112 RLS fix)
--   3.  Table  public.album_photos           (NO migration exists — reconstructed from
--                                             src/app/(app)/albums/actions.ts addPhotos())
--   4.  Tables public.performance_logs, public.security_logs, public.web_vitals
--                                             (NO migration exists — reconstructed from
--                                             src/app/api/monitoring/* routes)
--   5.  wishlist_items link-import columns   (migration 67, incl. guarded saved_places merge)
--   6.  users.plan                           (migration 69; + the explicit column GRANT that
--                                             migration 76's allowlist comment mandates)
--   7.  Functions soft_delete_user / restore_user_account   (migration 39)
--   8.  Function  get_suggested_travelers(_user_id, _limit)  (migration 47)
--   9.  Function  find_overlap_album(_user_id, _location_name, _latitude, _longitude)
--                                             (migration 39; search_path already pinned)
--   10. Function  get_most_followed_users(p_limit)           (migration 39 — dropped first
--                                             because the live copy has a stale return type
--                                             and CREATE OR REPLACE cannot change it: 42804)
--
-- SAFE TO RE-RUN: every statement is idempotent (IF NOT EXISTS / IF EXISTS /
-- CREATE OR REPLACE / DROP POLICY IF EXISTS before CREATE POLICY).
-- Paste the whole file into the Supabase SQL Editor and run once.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. reports  (source: 14_new_features.sql:79-99, 251, 294-295;
--              FK targets repointed to public.users ON DELETE SET NULL per
--              34_re_add_user_fks.sql:270-272 / 39_revert_clerk_to_supabase_auth.sql:463-465)
-- Shape matches src/app/api/reports/route.ts insert:
--   reporter_id, reported_user_id, target_type, target_id, reason,
--   description, status  (UUID reporter ids)
-- ============================================================================

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Nullable (not m14's NOT NULL): the final FK below is ON DELETE SET NULL,
  -- and NOT NULL + SET NULL would make any hard-delete of a reporting user
  -- error out. The API route always sets it on insert.
  reporter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('user', 'album', 'photo', 'comment', 'story', 'message')),
  target_id UUID NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'harassment', 'inappropriate', 'copyright', 'misinformation', 'other')),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
  resolution_notes TEXT,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_target ON reports(target_type, target_id);

-- Migration 39 repointed every user-id FK from auth.users to public.users
-- with ON DELETE SET NULL for audit-trail tables (readd_user_fk 'SET NULL').
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_reporter_id_fkey;
ALTER TABLE public.reports
  ADD CONSTRAINT reports_reporter_id_fkey
    FOREIGN KEY (reporter_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_reported_user_id_fkey;
ALTER TABLE public.reports
  ADD CONSTRAINT reports_reported_user_id_fkey
    FOREIGN KEY (reported_user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_resolved_by_fkey;
ALTER TABLE public.reports
  ADD CONSTRAINT reports_resolved_by_fkey
    FOREIGN KEY (resolved_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Migration 14's Supabase-native policies. (m31 dropped all policies for the
-- Clerk experiment, m36 created clerk_user_id() versions, m39 dropped those
-- but never recreated reports policies — without these, the authenticated
-- insert in /api/reports would be RLS-denied, so m14's originals are restored.)
DROP POLICY IF EXISTS reports_select ON reports;
CREATE POLICY reports_select ON reports FOR SELECT USING (reporter_id = (select auth.uid()));
DROP POLICY IF EXISTS reports_insert ON reports;
CREATE POLICY reports_insert ON reports FOR INSERT WITH CHECK (reporter_id = (select auth.uid()));

-- Defense-in-depth: make sure the stale Clerk-era policy names are gone
-- (no-ops on a fresh table).
DROP POLICY IF EXISTS "reports_reporter_read" ON public.reports;
DROP POLICY IF EXISTS "reports_reporter_insert" ON public.reports;

GRANT SELECT, INSERT ON public.reports TO authenticated;

-- ============================================================================
-- 2. album_shares  (source: migrations_backup/20250111_add_album_sharing.sql,
--                   SELECT policy replaced per 20250112_fix_album_shares_rls.sql)
-- Shape matches src/app/actions/album-sharing.ts: album_id, shared_by_user_id,
-- shared_with_user_id, share_token, permission_level, expires_at, is_active.
-- (album_share_activity from the same backup migration is NOT recreated — it
-- has no callers in src/ and was not in the confirmed-missing list.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS album_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id uuid NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  shared_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shared_with_user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  share_token text UNIQUE NOT NULL,
  permission_level text NOT NULL DEFAULT 'view'
    CHECK (permission_level IN ('view', 'contribute', 'edit')),
  expires_at timestamp with time zone,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),

  -- Constraints
  CONSTRAINT unique_user_album_share UNIQUE(album_id, shared_with_user_id)
);

CREATE INDEX IF NOT EXISTS idx_album_shares_album_id ON album_shares(album_id);
CREATE INDEX IF NOT EXISTS idx_album_shares_shared_by ON album_shares(shared_by_user_id);
CREATE INDEX IF NOT EXISTS idx_album_shares_shared_with ON album_shares(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_album_shares_token ON album_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_album_shares_active ON album_shares(is_active) WHERE is_active = true;

ALTER TABLE album_shares ENABLE ROW LEVEL SECURITY;

-- SELECT policy: the FIXED version from 20250112 (the 20250111 original had a
-- permissive 'OR true' that exposed every share row).
DROP POLICY IF EXISTS "Users can view their album shares" ON album_shares;
CREATE POLICY "Users can view their album shares"
  ON album_shares FOR SELECT
  USING (
    auth.uid() = shared_by_user_id OR
    auth.uid() = shared_with_user_id
  );

-- Policy: Only album owners can create shares
DROP POLICY IF EXISTS "Album owners can create shares" ON album_shares;
CREATE POLICY "Album owners can create shares"
  ON album_shares FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM albums
      WHERE albums.id = album_id
      AND albums.user_id = auth.uid()
    )
  );

-- Policy: Only share creator can update shares
DROP POLICY IF EXISTS "Share creators can update shares" ON album_shares;
CREATE POLICY "Share creators can update shares"
  ON album_shares FOR UPDATE
  USING (auth.uid() = shared_by_user_id);

-- Policy: Only share creator can delete shares
DROP POLICY IF EXISTS "Share creators can delete shares" ON album_shares;
CREATE POLICY "Share creators can delete shares"
  ON album_shares FOR DELETE
  USING (auth.uid() = shared_by_user_id);

-- Function to generate unique share tokens. From the SAME backup migration:
-- createAlbumShare() calls supabase.rpc('generate_share_token'), and if the
-- table never made it to prod this function almost certainly didn't either.
-- CREATE OR REPLACE is a harmless no-op if it already exists.
CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS text AS $$
DECLARE
  token text;
  exists boolean;
BEGIN
  LOOP
    -- Generate a random 32-character token
    token := encode(gen_random_bytes(24), 'base64');
    -- Remove special characters
    token := regexp_replace(token, '[^a-zA-Z0-9]', '', 'g');
    token := substring(token, 1, 32);

    -- Check if token exists
    SELECT EXISTS(SELECT 1 FROM album_shares WHERE share_token = token) INTO exists;
    EXIT WHEN NOT exists;
  END LOOP;

  RETURN token;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp (a trigger cannot outlive its table,
-- so it is definitely missing alongside album_shares).
CREATE OR REPLACE FUNCTION update_album_shares_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS album_shares_updated_at ON album_shares;
CREATE TRIGGER album_shares_updated_at
  BEFORE UPDATE ON album_shares
  FOR EACH ROW
  EXECUTE FUNCTION update_album_shares_updated_at();

-- Comments for documentation
COMMENT ON TABLE album_shares IS 'Stores album sharing relationships with different permission levels';
COMMENT ON COLUMN album_shares.permission_level IS 'view: can only view, contribute: can add photos, edit: can add/delete photos and edit album';
COMMENT ON COLUMN album_shares.share_token IS 'Unique token for accessing shared albums via link';
COMMENT ON COLUMN album_shares.shared_with_user_id IS 'User receiving the share (NULL for link-based shares)';
COMMENT ON POLICY "Users can view their album shares" ON album_shares IS
  'Allows users to view shares they created or received. Token-based access must be handled in application layer using service role client with proper validation.';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.album_shares TO authenticated;

-- ============================================================================
-- 3. album_photos
-- *** NO migration anywhere in the repo defines this table. ***
-- Reconstructed from the only call site, src/app/(app)/albums/actions.ts:345
-- addPhotos(): inserts { album_id, storage_path, width, height, taken_at }
-- and then .select()s the rows back, after verifying album ownership in code.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.album_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id uuid NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  width integer,
  height integer,
  taken_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_album_photos_album_id ON public.album_photos(album_id);

ALTER TABLE public.album_photos ENABLE ROW LEVEL SECURITY;

-- Owner-of-the-parent-album may do everything (the insert path also SELECTs
-- the inserted rows back, so SELECT must be covered too — FOR ALL covers it).
DROP POLICY IF EXISTS album_photos_owner_all ON public.album_photos;
CREATE POLICY album_photos_owner_all ON public.album_photos
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.albums a
      WHERE a.id = album_photos.album_id
        AND a.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.albums a
      WHERE a.id = album_photos.album_id
        AND a.user_id = (select auth.uid())
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.album_photos TO authenticated;

-- ============================================================================
-- 4. Monitoring tables: performance_logs, security_logs, web_vitals
-- *** NO migration anywhere in the repo defines these. ***
-- Reconstructed from the exact insert shapes in:
--   src/app/api/monitoring/performance/route.ts  (performance_logs)
--   src/app/api/monitoring/security/route.ts     (security_logs)
--   src/app/api/monitoring/web-vitals/route.ts   (web_vitals — insert is
--     currently commented out in the route; shape taken from that comment)
-- ============================================================================

-- performance_logs: { name, value, unit, timestamp, url, user_id, context, session_id }
CREATE TABLE IF NOT EXISTS public.performance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  value double precision NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'ms' CHECK (unit IN ('ms', 'bytes', 'count')),
  "timestamp" timestamptz NOT NULL DEFAULT now(),
  url text,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_performance_logs_user_id ON public.performance_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_logs_created_at ON public.performance_logs(created_at DESC);

ALTER TABLE public.performance_logs ENABLE ROW LEVEL SECURITY;

-- Route requires auth and stamps user_id = auth user; reads happen via
-- service role / dashboard only, so no client SELECT policy.
DROP POLICY IF EXISTS performance_logs_insert_own ON public.performance_logs;
CREATE POLICY performance_logs_insert_own ON public.performance_logs
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

GRANT INSERT ON public.performance_logs TO authenticated;

-- security_logs: { type, message, ip, user_agent, path, user_id, timestamp, severity, context }
CREATE TABLE IF NOT EXISTS public.security_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'suspicious_activity'
    CHECK (type IN ('rate_limit', 'suspicious_activity', 'auth_failure', 'upload_error')),
  message text,
  ip text,
  user_agent text,
  path text,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  "timestamp" timestamptz NOT NULL DEFAULT now(),
  severity text NOT NULL DEFAULT 'medium'
    CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_logs_severity ON public.security_logs(severity);
CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON public.security_logs(created_at DESC);

ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS security_logs_insert_own ON public.security_logs;
CREATE POLICY security_logs_insert_own ON public.security_logs
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

GRANT INSERT ON public.security_logs TO authenticated;

-- web_vitals: { metric_name, metric_value, rating, url, user_agent, session_id, created_at }
-- The route accepts anonymous telemetry (middleware allowlists it), so anon
-- may insert too.
CREATE TABLE IF NOT EXISTS public.web_vitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name text NOT NULL,
  metric_value double precision NOT NULL,
  rating text,
  url text,
  user_agent text,
  session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_web_vitals_metric_name ON public.web_vitals(metric_name);
CREATE INDEX IF NOT EXISTS idx_web_vitals_created_at ON public.web_vitals(created_at DESC);

ALTER TABLE public.web_vitals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS web_vitals_insert_any ON public.web_vitals;
CREATE POLICY web_vitals_insert_any ON public.web_vitals
  FOR INSERT WITH CHECK (true);

GRANT INSERT ON public.web_vitals TO anon, authenticated;

-- ============================================================================
-- 5. wishlist_items link-import columns
--    (source: 67_merge_saved_places_into_wishlist.sql — VERBATIM, including
--     the to_regclass('public.saved_places') guard around the data merge)
-- ============================================================================

-- 1) Extend wishlist_items with the place-import fields (all nullable —
--    plain bucket-list destinations simply don't set them).
ALTER TABLE public.wishlist_items
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT
    CHECK (category IS NULL OR category IN ('see','eat','do','stay','other')),
  ADD COLUMN IF NOT EXISTS source_platform TEXT
    CHECK (source_platform IS NULL OR source_platform IN ('manual','tiktok','google_maps','instagram','other')),
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- 2) Restore the duplicate guard. The original wishlist_items definition has
--    UNIQUE(user_id, location_name, latitude, longitude) — the live table is
--    missing it (more drift), which both broke m67's ON CONFLICT merge and
--    leaves the API's 23505 "already on your wishlist" check inert. Guarded:
--    if duplicate rows already exist, the index is skipped with a NOTICE
--    instead of failing the whole script.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.wishlist_items
    GROUP BY user_id, location_name, latitude, longitude
    HAVING COUNT(*) > 1
  ) THEN
    RAISE NOTICE 'wishlist_items has duplicate (user,location,lat,lng) rows — unique index skipped; dedupe manually then re-run';
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS wishlist_items_user_location_key
      ON public.wishlist_items (user_id, location_name, latitude, longitude);
  END IF;
END $$;

-- 3) Copy saved_places rows in, then drop the table.
--    Wrapped in EXECUTE so this parses even when saved_places never existed.
--    Dedup via NOT EXISTS rather than ON CONFLICT so the merge works whether
--    or not the unique index above could be created.
DO $$
BEGIN
  IF to_regclass('public.saved_places') IS NOT NULL THEN
    EXECUTE $sql$
      INSERT INTO public.wishlist_items
        (user_id, location_name, country_code, latitude, longitude, notes,
         priority, source, created_at, completed_at,
         city, category, source_platform, source_url, thumbnail_url)
      SELECT
        sp.user_id, sp.place_name, sp.country_code, sp.latitude, sp.longitude, sp.notes,
        'medium', 'manual', sp.created_at, sp.visited_at,
        sp.city, sp.category, sp.source_platform, sp.source_url, sp.thumbnail_url
      FROM public.saved_places sp
      WHERE NOT EXISTS (
        SELECT 1 FROM public.wishlist_items wi
        WHERE wi.user_id = sp.user_id
          AND wi.location_name = sp.place_name
          AND wi.latitude  IS NOT DISTINCT FROM sp.latitude
          AND wi.longitude IS NOT DISTINCT FROM sp.longitude
      )
    $sql$;

    EXECUTE 'DROP TABLE public.saved_places';
  END IF;
END $$;

-- ============================================================================
-- 6. users.plan  (source: 69_pro_plan.sql — VERBATIM)
-- ============================================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'pro'));

COMMENT ON COLUMN public.users.plan IS
  'Billing tier: free (default) or pro. Flipped manually / by payment webhook — no in-app subscription lifecycle.';

-- Migration 76 (users PII lockdown) revoked table-level SELECT on public.users
-- and granted back an explicit column allowlist; its header states that `plan`
-- "must be granted explicitly or the two routes selecting it get 42501"
-- (76_users_pii_lockdown.sql:53-56). Since 76 is already applied live and we
-- are adding `plan` after it, grant the column now so
-- /api/photos/upload-url and /api/wishlist/extract can read the caller's plan.
GRANT SELECT (plan) ON public.users TO authenticated;

-- ============================================================================
-- 7. soft_delete_user / restore_user_account
--    (source: 39_revert_clerk_to_supabase_auth.sql:1035-1055 — same block,
--     VERBATIM. Caller: src/app/(app)/settings/page.tsx rpc('soft_delete_user',
--     { p_user_id }) — matches.)
-- ============================================================================

DROP FUNCTION IF EXISTS public.soft_delete_user(TEXT);
-- The live DB has an OLD soft_delete_user(uuid) (pre-migration-39, param named
-- user_id_param and a different return type) — the app's named-arg rpc call
-- can't find it, and CREATE OR REPLACE can't change a return type (42P13).
-- Drop it so the canonical m39 version installs cleanly.
DROP FUNCTION IF EXISTS public.soft_delete_user(UUID);
CREATE OR REPLACE FUNCTION public.soft_delete_user(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.users SET deleted_at = NOW() WHERE id = p_user_id;
  RETURN FOUND;
END;
$$;
GRANT EXECUTE ON FUNCTION public.soft_delete_user(UUID) TO authenticated;

DROP FUNCTION IF EXISTS public.restore_user_account(TEXT);
DROP FUNCTION IF EXISTS public.restore_user_account(UUID);
CREATE OR REPLACE FUNCTION public.restore_user_account(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.users SET deleted_at = NULL WHERE id = p_user_id;
  RETURN FOUND;
END;
$$;
GRANT EXECUTE ON FUNCTION public.restore_user_account(UUID) TO authenticated;

-- ============================================================================
-- 8. get_suggested_travelers
--    (source: 47_account_privacy_visibility.sql:130-170 — VERBATIM.
--     NOTE: the actual parameter names are _user_id/_limit (not
--     p_user_id/p_limit); the caller src/app/(app)/feed/useFeedPageData.ts
--     passes { _user_id, _limit }, matching this definition.)
-- ============================================================================

-- Defensive drop: if an old copy exists with the same arg types but different
-- param names/return shape, CREATE OR REPLACE would fail (42P13).
DROP FUNCTION IF EXISTS public.get_suggested_travelers(UUID, INT);
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

-- ============================================================================
-- 9. find_overlap_album
--    (source: 39_revert_clerk_to_supabase_auth.sql:858-890 — VERBATIM; the
--     highest-numbered definition. Migration 59 only re-pins search_path,
--     which this definition already sets.
--     NOTE: the actual signature is (_user_id UUID, _location_name TEXT,
--     _latitude DOUBLE PRECISION, _longitude DOUBLE PRECISION) — the caller
--     src/app/api/albums/[id]/you-were-here/route.ts:58 passes exactly those
--     named args.)
-- ============================================================================

DROP FUNCTION IF EXISTS public.find_overlap_album(TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION);
DROP FUNCTION IF EXISTS public.find_overlap_album(UUID, TEXT, DOUBLE PRECISION, DOUBLE PRECISION);
CREATE OR REPLACE FUNCTION public.find_overlap_album(
  _user_id UUID, _location_name TEXT, _latitude DOUBLE PRECISION, _longitude DOUBLE PRECISION
)
RETURNS TABLE (album_id UUID, title TEXT, date_start DATE, distance_km DOUBLE PRECISION)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT
    a.id AS album_id, a.title, a.date_start,
    CASE
      WHEN _latitude IS NOT NULL AND _longitude IS NOT NULL AND a.latitude IS NOT NULL
      THEN 6371.0 * 2 * ASIN(SQRT(
        POWER(SIN(RADIANS((_latitude - a.latitude) / 2)), 2) +
        COS(RADIANS(a.latitude)) * COS(RADIANS(_latitude)) *
        POWER(SIN(RADIANS((_longitude - a.longitude) / 2)), 2)))
      ELSE NULL
    END AS distance_km
  FROM public.albums a
  WHERE a.user_id = _user_id
    AND (
      (_location_name IS NOT NULL AND a.location_name IS NOT NULL
        AND (LOWER(a.location_name) LIKE '%' || LOWER(split_part(_location_name, ',', 1)) || '%'
             OR LOWER(split_part(_location_name, ',', 1)) LIKE '%' || LOWER(split_part(a.location_name, ',', 1)) || '%'))
      OR (_latitude IS NOT NULL AND _longitude IS NOT NULL AND a.latitude IS NOT NULL
        AND 6371.0 * 2 * ASIN(SQRT(
          POWER(SIN(RADIANS((_latitude - a.latitude) / 2)), 2) +
          COS(RADIANS(a.latitude)) * COS(RADIANS(_latitude)) *
          POWER(SIN(RADIANS((_longitude - a.longitude) / 2)), 2))) < 25)
    )
  ORDER BY a.date_start ASC NULLS LAST
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.find_overlap_album(UUID, TEXT, DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated;

-- ============================================================================
-- 10. get_most_followed_users
--     (source: 39_revert_clerk_to_supabase_auth.sql:795-825 — VERBATIM.
--      The live DB has this function with a STALE return type (42804 when
--      called), and CREATE OR REPLACE cannot change a return type, so it is
--      dropped first. Caller src/components/search/useSearchState.ts:510
--      passes { p_limit } — matches.)
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_most_followed_users(integer);
CREATE OR REPLACE FUNCTION public.get_most_followed_users(
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id              UUID,
  username        TEXT,
  display_name    TEXT,
  avatar_url      TEXT,
  follower_count  BIGINT
)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp
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
    AND (u.deleted_at IS NULL)
  GROUP BY u.id, u.username, u.display_name, u.avatar_url
  ORDER BY follower_count DESC
  LIMIT p_limit;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_most_followed_users(INTEGER) TO authenticated, anon;

-- ============================================================================
-- Done — ask PostgREST to pick up the new schema immediately.
-- ============================================================================
NOTIFY pgrst, 'reload schema';

COMMIT;
