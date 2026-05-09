-- ============================================================================
-- CLERK-FIRST IDENTITY REWRITE
-- ============================================================================
-- DESTRUCTIVE MIGRATION — wipes every row in the public schema.
--
-- Decision (2026-05-09):
--   * Clerk owns authentication and is the source of truth for user identity.
--   * Supabase owns data, but every row that used to be keyed by an
--     auth.users(id) UUID is now keyed by the Clerk subject (e.g. "user_2x7…")
--     stored as TEXT.
--   * All existing data is being thrown away as part of this cutover.
--
-- What this migration does:
--   1. TRUNCATEs every table in the public schema (CASCADE).
--   2. Drops every foreign key that points at auth.users.
--   3. Drops every foreign key that points at public.users
--      (so we can change public.users.id's type without dependency errors).
--   4. Converts every UUID column whose name suggests it holds a user id
--      (user_id, *_user_id, owner_id, viewer_id, sender_id, receiver_id,
--      created_by, invited_by, blocker_id, blocked_id, follower_id,
--      following_id, reporter_id, resolved_by, mentioned_user_id,
--      shared_by_user_id, added_by_user_id) from UUID to TEXT.
--   5. Converts public.users.id from UUID to TEXT and removes its DEFAULT
--      (Clerk now mints the id; the app inserts it on webhook).
--   6. Drops every existing RLS policy in the public schema (they all
--      reference auth.uid() which is the Supabase-auth notion that's going
--      away).
--   7. Drops the create_profile_on_signup trigger on auth.users — the Clerk
--      webhook (Phase 6) takes over user provisioning.
--   8. Installs a public.clerk_user_id() helper that returns the Clerk
--      subject from the request JWT.
--   9. Re-enables RLS on every public table that has a "user_id" column and
--      installs a default owner-only ALL policy keyed off clerk_user_id().
--      Public-readable tables (albums, photos, profiles) still need their own
--      SELECT policies — see "FOLLOW-UPS" at the bottom of this file.
--  10. Drops the now-stale clerk_id bridge column / index that the previous
--      version of this migration would have created (idempotent — safe if
--      it was never applied).
--
-- What this migration does NOT do:
--   * Re-add foreign keys. Once the schema is stable, add them back per-table
--     so each can have an explicit ON DELETE rule.
--   * Touch storage.objects policies. Storage RLS policies that compare
--     auth.uid()::text to the first folder segment of the file path need to
--     be rewritten by hand to use public.clerk_user_id() — they live in the
--     storage schema and there's no reliable way to discover their original
--     intent from the catalog. See FOLLOW-UPS.
--   * Touch any view/function/trigger in the public schema other than the
--     auth signup trigger. If your DB has additional functions that compare
--     auth.uid() to a user_id, the right move is to grep them after this
--     migration and patch them manually.
--
-- How to apply:
--   * Supabase Dashboard → SQL Editor → paste this whole file → Run.
--   * Or `supabase db push` if you have the CLI configured.
--   * After running, execute the AUDIT block at the bottom to find any
--     remaining UUID columns or auth.uid() references that escaped discovery.
--
-- Rollback:
--   * There is no rollback — data is destroyed by step 1. Restore from a
--     backup if you need the old state.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 0. Idempotency: undo the previous (bridge-column) version of this migration
--    if it was ever applied.
-- ----------------------------------------------------------------------------
DROP INDEX IF EXISTS public.idx_users_clerk_id;
ALTER TABLE IF EXISTS public.users DROP COLUMN IF EXISTS clerk_id;

-- ----------------------------------------------------------------------------
-- 1. Wipe every row in the public schema. CASCADE handles cross-table FKs.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('TRUNCATE TABLE public.%I CASCADE', r.tablename);
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 2. Drop every FK in public.* that points at auth.users.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT
      con.conname        AS constraint_name,
      nsp.nspname        AS table_schema,
      cls.relname        AS table_name
    FROM pg_constraint con
    JOIN pg_class      cls ON cls.oid = con.conrelid
    JOIN pg_namespace  nsp ON nsp.oid = cls.relnamespace
    JOIN pg_class      ref ON ref.oid = con.confrelid
    JOIN pg_namespace  rnsp ON rnsp.oid = ref.relnamespace
    WHERE con.contype = 'f'
      AND nsp.nspname  = 'public'
      AND rnsp.nspname = 'auth'
      AND ref.relname  = 'users'
  LOOP
    EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT %I',
      r.table_schema, r.table_name, r.constraint_name);
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 3. Drop every FK in public.* that points at public.users — required before
--    we can ALTER public.users.id's type.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT
      con.conname  AS constraint_name,
      nsp.nspname  AS table_schema,
      cls.relname  AS table_name
    FROM pg_constraint con
    JOIN pg_class      cls ON cls.oid = con.conrelid
    JOIN pg_namespace  nsp ON nsp.oid = cls.relnamespace
    JOIN pg_class      ref ON ref.oid = con.confrelid
    JOIN pg_namespace  rnsp ON rnsp.oid = ref.relnamespace
    WHERE con.contype = 'f'
      AND nsp.nspname  = 'public'
      AND rnsp.nspname = 'public'
      AND ref.relname  = 'users'
  LOOP
    EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT %I',
      r.table_schema, r.table_name, r.constraint_name);
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 4. Drop every RLS policy in public.* — they all reference auth.uid().
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
      r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 5. Convert every "user-ish" UUID column in public.* to TEXT.
--    Discovery is name-based: we recognise the column-name patterns the app
--    actually uses. Add to USER_ID_COLUMN_NAMES below if you discover others.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT table_schema, table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND data_type    = 'uuid'
      AND (
        column_name = 'user_id'
        OR column_name LIKE '%\_user\_id' ESCAPE '\'
        OR column_name IN (
          'owner_id', 'viewer_id', 'sender_id', 'receiver_id',
          'created_by', 'invited_by', 'resolved_by',
          'follower_id', 'following_id',
          'blocker_id', 'blocked_id',
          'reporter_id'
        )
      )
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I ALTER COLUMN %I DROP DEFAULT',
      r.table_schema, r.table_name, r.column_name);
    EXECUTE format(
      'ALTER TABLE %I.%I ALTER COLUMN %I TYPE text USING %I::text',
      r.table_schema, r.table_name, r.column_name, r.column_name);
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 6. Convert public.users.id from UUID to TEXT. Strip its DEFAULT
--    (uuid_generate_v4 / gen_random_uuid) — Clerk now provides the id.
-- ----------------------------------------------------------------------------
ALTER TABLE public.users
  ALTER COLUMN id DROP DEFAULT,
  ALTER COLUMN id TYPE text USING id::text;

-- ----------------------------------------------------------------------------
-- 7. Drop the auto-create-profile trigger on auth.users. Clerk's webhook
--    will insert into public.users instead.
-- ----------------------------------------------------------------------------
DROP TRIGGER  IF EXISTS create_profile_on_signup ON auth.users;
DROP TRIGGER  IF EXISTS on_auth_user_created    ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 8. JWT helper. Returns the Clerk subject ("user_2x7…") from the current
--    request's JWT, or NULL when called outside a request context.
--    Marked STABLE + SECURITY INVOKER + locked search_path for the same
--    reasons every other helper in this codebase is.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.clerk_user_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT NULLIF(
    COALESCE(
      current_setting('request.jwt.claim.sub',      true),
      current_setting('request.jwt.claims',         true)::jsonb ->> 'sub'
    ),
    ''
  );
$$;

COMMENT ON FUNCTION public.clerk_user_id() IS
  'Returns the Clerk subject (user_…) from the current request JWT. '
  'Use this in RLS policies in place of auth.uid().';

-- ----------------------------------------------------------------------------
-- 9. Default owner-only RLS for every public table that has a `user_id`
--    column. Public-readable tables (albums, photos, users themselves) need
--    additional SELECT policies — see FOLLOW-UPS at the bottom.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
  policy_name text;
BEGIN
  FOR r IN
    SELECT DISTINCT t.tablename
    FROM pg_tables t
    JOIN information_schema.columns c
      ON c.table_schema = t.schemaname
     AND c.table_name   = t.tablename
    WHERE t.schemaname = 'public'
      AND c.column_name = 'user_id'
      AND c.data_type   = 'text'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
    policy_name := r.tablename || '_owner_all';
    EXECUTE format(
      'CREATE POLICY %I ON public.%I '
      'FOR ALL '
      'TO authenticated '
      'USING      (user_id = public.clerk_user_id()) '
      'WITH CHECK (user_id = public.clerk_user_id())',
      policy_name, r.tablename
    );
  END LOOP;
END $$;

-- public.users uses .id, not .user_id, for the owner check.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_self_write
  ON public.users
  FOR ALL
  TO authenticated
  USING      (id = public.clerk_user_id())
  WITH CHECK (id = public.clerk_user_id());

-- Profiles are public-readable so users can view each other.
CREATE POLICY users_public_read
  ON public.users
  FOR SELECT
  TO anon, authenticated
  USING (true);

COMMIT;

-- ============================================================================
-- AUDIT — run after applying. Anything returned here is a leftover that
-- should be patched by hand.
-- ============================================================================
-- A. UUID columns that look like user ids but slipped through name-based
--    discovery in step 5:
--
--   SELECT table_schema, table_name, column_name
--   FROM information_schema.columns
--   WHERE table_schema = 'public'
--     AND data_type    = 'uuid'
--     AND (column_name ILIKE '%user%' OR column_name ILIKE '%_by%');
--
-- B. Functions, views, or triggers in public.* that still reference
--    auth.uid():
--
--   SELECT n.nspname, p.proname, pg_get_functiondef(p.oid)
--   FROM pg_proc p
--   JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname = 'public'
--     AND pg_get_functiondef(p.oid) ILIKE '%auth.uid()%';
--
-- C. Any table that lost its FK in step 2/3 and needs one re-added:
--
--   SELECT table_schema, table_name, column_name
--   FROM information_schema.columns
--   WHERE table_schema = 'public'
--     AND data_type    = 'text'
--     AND (column_name = 'user_id' OR column_name LIKE '%_user_id'
--          OR column_name IN ('owner_id','sender_id','receiver_id'))
--   ORDER BY table_name, column_name;
--
--   For each row, decide on the ON DELETE behaviour and re-add:
--
--   ALTER TABLE public.<table>
--     ADD CONSTRAINT <table>_<col>_fkey
--       FOREIGN KEY (<col>) REFERENCES public.users(id) ON DELETE CASCADE;

-- ============================================================================
-- FOLLOW-UPS (separate migrations or hand-applied)
-- ============================================================================
-- 1. Re-add FKs on user-id columns to public.users(id). Skipped above so each
--    table can choose its own ON DELETE behaviour.
--
-- 2. Public-read SELECT policies for tables the app expects to be world-
--    readable: albums (where visibility = 'public'), photos (joined to
--    public albums), follows (so social graph is visible), comments / likes
--    on public albums. Today, only the owner can SELECT them.
--
-- 3. Storage policies. The storage.objects policies that previously did
--      (storage.foldername(name))[1] = auth.uid()::text
--    must be updated to
--      (storage.foldername(name))[1] = public.clerk_user_id()
--    Find them with:
--      SELECT * FROM pg_policies WHERE schemaname = 'storage';
--
-- 4. Drop the auth.users dependency from the database advisor: in the
--    Supabase dashboard, disable the "Email & Password" auth provider once
--    Clerk is the sole identity source.
