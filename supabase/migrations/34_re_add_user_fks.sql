-- ============================================================================
-- RE-ADD USER FOREIGN KEYS (Clerk identity model)
-- ============================================================================
-- Migration 31 dropped every foreign key from public.* to public.users so it
-- could change public.users.id from UUID to TEXT. This migration adds them
-- back, one ALTER TABLE per column, with an explicit ON DELETE rule chosen
-- per the rules in the project agent prompt:
--
--   CASCADE   — owned data and graph tables. When the user is deleted, the
--               row goes too.
--   SET NULL  — soft references where the row should outlive the user but
--               needs the name decoupled (e.g. moderation reviewer, page
--               viewer, admin who shared a thing).
--
-- Discovery is by name pattern over information_schema.columns (matching
-- the same set migration 31 converted to TEXT). We then ENUMERATE each
-- table+column ALTER below — not via DO loop — so a reviewer can audit the
-- ON DELETE choice for each one.
--
-- Every ALTER is wrapped in `IF EXISTS` checks so the migration is safe to
-- re-run, and safe in DBs where some optional tables have not been created.
--
-- A discovery query at the bottom of this file will list any TEXT user-id
-- column that did NOT get a FK in this migration so leftovers can be
-- patched in a follow-up.
--
-- Apply: paste into the Supabase SQL editor or `supabase db push`.
-- Rollback notes are at the bottom of this file.
--
-- ============================================================================
-- ## DISCOVERED
-- ============================================================================
-- 1. trip_pins.visited_by — migration 27 added this as UUID; migration 31's
--    name pattern only listed created_by / invited_by / resolved_by in the
--    `_by` family, so visited_by was NEVER converted to TEXT. We patch it
--    in migration 33_public_read_policies.sql step 0, then add its FK
--    here. If you skipped 33, the ALTER below will fail at the
--    type-mismatch step — apply 33 first.
--
-- 2. The `reports` table from migration 14 (with reported_user_id +
--    resolved_by + reporter_id) was effectively superseded by
--    `content_reports` in migration 29 (different columns: reporter_id
--    only). Both may exist in any given DB depending on apply order. We
--    add FKs to both via IF EXISTS.
--
-- 3. The `storage_cleanup_queue.original_user_id` column from migration 13
--    is a TEXT column post-migration 31 but has no ON DELETE behaviour
--    requirement (it's an audit trail of "this file used to belong to
--    user X"). Treated as SET NULL — but we leave the FK off because the
--    column is intentionally unconstrained (the user row may already be
--    gone when it's read). Mentioned here so reviewers don't think it was
--    forgotten.
--
-- 4. follows.follower_id / follows.following_id are CASCADE on both sides.
--    This intentionally produces "if you delete me, both my following AND
--    my followers rows go away" which is the right semantic for an
--    account deletion.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- A helper, scoped to this migration: drop a constraint by name, ignoring
-- "table does not exist" so the migration is safe to re-run.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION pg_temp.safe_add_user_fk(
  _table        text,
  _column       text,
  _on_delete    text       -- 'CASCADE' or 'SET NULL'
) RETURNS void
LANGUAGE plpgsql
AS $func$
DECLARE
  _constraint text := _table || '_' || _column || '_fkey';
  _qualified  text := 'public.' || quote_ident(_table);
BEGIN
  -- Skip silently if the table doesn't exist in this DB.
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = _table
  ) THEN
    RAISE NOTICE 'skip: table %.% does not exist', 'public', _table;
    RETURN;
  END IF;

  -- Skip silently if the column doesn't exist (e.g. older schema variant).
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = _table AND column_name = _column
  ) THEN
    RAISE NOTICE 'skip: column %.%.% does not exist', 'public', _table, _column;
    RETURN;
  END IF;

  -- Drop any prior FK on this exact (table, column) — name may differ from
  -- our convention if it was created elsewhere.
  EXECUTE format(
    'ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I',
    _qualified, _constraint
  );

  EXECUTE format(
    'ALTER TABLE %s '
    'ADD CONSTRAINT %I '
    'FOREIGN KEY (%I) REFERENCES public.users(id) ON DELETE %s',
    _qualified, _constraint, _column, _on_delete
  );
END;
$func$;

-- ============================================================================
-- CASCADE — owned data
-- ============================================================================

-- albums.user_id
SELECT pg_temp.safe_add_user_fk('albums',                  'user_id',           'CASCADE');

-- photos.user_id
SELECT pg_temp.safe_add_user_fk('photos',                  'user_id',           'CASCADE');

-- comments.user_id
SELECT pg_temp.safe_add_user_fk('comments',                'user_id',           'CASCADE');

-- likes.user_id
SELECT pg_temp.safe_add_user_fk('likes',                   'user_id',           'CASCADE');

-- favorites.user_id
SELECT pg_temp.safe_add_user_fk('favorites',               'user_id',           'CASCADE');

-- wishlist_items.user_id   (migrations 16 + 23 both create this table; both
--                           name the FK as user_id)
SELECT pg_temp.safe_add_user_fk('wishlist_items',          'user_id',           'CASCADE');

-- stories.user_id          (baseline schema)
SELECT pg_temp.safe_add_user_fk('stories',                 'user_id',           'CASCADE');

-- notifications.user_id    (baseline schema)
SELECT pg_temp.safe_add_user_fk('notifications',           'user_id',           'CASCADE');

-- reactions.user_id         (migration 16)
SELECT pg_temp.safe_add_user_fk('reactions',               'user_id',           'CASCADE');

-- ai_usage.user_id          (migration 02)
SELECT pg_temp.safe_add_user_fk('ai_usage',                'user_id',           'CASCADE');

-- trip_planner_cache.user_id (migration 02)
SELECT pg_temp.safe_add_user_fk('trip_planner_cache',      'user_id',           'CASCADE');

-- itineraries.user_id       (migration 04)
SELECT pg_temp.safe_add_user_fk('itineraries',             'user_id',           'CASCADE');

-- mentions.user_id          (migration 03 — author of the comment)
SELECT pg_temp.safe_add_user_fk('mentions',                'user_id',           'CASCADE');

-- search_history.user_id    (migration 03)
SELECT pg_temp.safe_add_user_fk('search_history',          'user_id',           'CASCADE');

-- activity_feed.user_id     (migration 03)
SELECT pg_temp.safe_add_user_fk('activity_feed',           'user_id',           'CASCADE');

-- two_factor_auth.user_id   (migration 03)
SELECT pg_temp.safe_add_user_fk('two_factor_auth',         'user_id',           'CASCADE');

-- check_ins.user_id         (migration 14)
SELECT pg_temp.safe_add_user_fk('check_ins',               'user_id',           'CASCADE');

-- journal_entries.user_id   (migration 14)
SELECT pg_temp.safe_add_user_fk('journal_entries',         'user_id',           'CASCADE');

-- travel_profiles.user_id   (migration 14)
SELECT pg_temp.safe_add_user_fk('travel_profiles',         'user_id',           'CASCADE');

-- user_preferences.user_id  (migrations 14 + 16)
SELECT pg_temp.safe_add_user_fk('user_preferences',        'user_id',           'CASCADE');

-- conversation_participants.user_id (migration 14)
SELECT pg_temp.safe_add_user_fk('conversation_participants', 'user_id',         'CASCADE');

-- message_read_receipts.user_id     (migration 14)
SELECT pg_temp.safe_add_user_fk('message_read_receipts',   'user_id',           'CASCADE');

-- album_collaborators.user_id (migration 15 — invited collaborator)
SELECT pg_temp.safe_add_user_fk('album_collaborators',     'user_id',           'CASCADE');

-- user_achievements.user_id  (migration 21)
SELECT pg_temp.safe_add_user_fk('user_achievements',       'user_id',           'CASCADE');

-- user_challenges.user_id    (migrations 16 + 18)
SELECT pg_temp.safe_add_user_fk('user_challenges',         'user_id',           'CASCADE');

-- push_subscriptions.user_id (migration 25)
SELECT pg_temp.safe_add_user_fk('push_subscriptions',      'user_id',           'CASCADE');

-- trip_members.user_id       (migration 26)
SELECT pg_temp.safe_add_user_fk('trip_members',            'user_id',           'CASCADE');

-- trip_pins.user_id          (migration 26 — pin author)
SELECT pg_temp.safe_add_user_fk('trip_pins',               'user_id',           'CASCADE');

-- ============================================================================
-- CASCADE — owners on tables that use a different column name
-- ============================================================================

-- trips.owner_id             (migration 26)
SELECT pg_temp.safe_add_user_fk('trips',                   'owner_id',          'CASCADE');

-- conversations.created_by   (migration 14)
SELECT pg_temp.safe_add_user_fk('conversations',           'created_by',        'CASCADE');

-- ============================================================================
-- CASCADE — graph tables (both sides)
-- ============================================================================

-- follows.follower_id / following_id  (migration 11)
SELECT pg_temp.safe_add_user_fk('follows',                 'follower_id',       'CASCADE');
SELECT pg_temp.safe_add_user_fk('follows',                 'following_id',      'CASCADE');

-- user_blocks.blocker_id / blocked_id (migrations 14 + 29)
SELECT pg_temp.safe_add_user_fk('user_blocks',             'blocker_id',        'CASCADE');
SELECT pg_temp.safe_add_user_fk('user_blocks',             'blocked_id',        'CASCADE');

-- companion_requests.sender_id / receiver_id (migration 14)
SELECT pg_temp.safe_add_user_fk('companion_requests',      'sender_id',         'CASCADE');
SELECT pg_temp.safe_add_user_fk('companion_requests',      'receiver_id',       'CASCADE');

-- messages.sender_id (migration 14)
SELECT pg_temp.safe_add_user_fk('messages',                'sender_id',         'CASCADE');

-- ============================================================================
-- CASCADE — join-with-context (migration 14 + 15 + 16)
-- ============================================================================

-- mentions.mentioned_user_id (migration 03 — when the mentioned user is
-- deleted, the mention row also goes; this matches CASCADE on user_id)
SELECT pg_temp.safe_add_user_fk('mentions',                'mentioned_user_id', 'CASCADE');

-- album_hashtags.added_by_user_id (migration 03)
SELECT pg_temp.safe_add_user_fk('album_hashtags',          'added_by_user_id',  'CASCADE');

-- album_collaborators.invited_by (migration 15 — the inviter)
SELECT pg_temp.safe_add_user_fk('album_collaborators',     'invited_by',        'CASCADE');

-- ============================================================================
-- SET NULL — soft references
-- ============================================================================

-- album_views.viewer_id (migration 22 — track-anonymously after user deletion)
SELECT pg_temp.safe_add_user_fk('album_views',             'viewer_id',         'SET NULL');

-- wishlist_items.shared_by_user_id (migrations 16 + 23)
SELECT pg_temp.safe_add_user_fk('wishlist_items',          'shared_by_user_id', 'SET NULL');

-- error_events.user_id (migration 29 — error logs survive user deletion)
SELECT pg_temp.safe_add_user_fk('error_events',            'user_id',           'SET NULL');

-- content_reports.reporter_id (migration 29 — reports are an audit trail)
SELECT pg_temp.safe_add_user_fk('content_reports',         'reporter_id',       'SET NULL');

-- trip_pins.visited_by (migration 27 — see ## DISCOVERED #1)
SELECT pg_temp.safe_add_user_fk('trip_pins',               'visited_by',        'SET NULL');

-- ============================================================================
-- SET NULL — legacy `reports` table (migration 14, may or may not exist)
-- ============================================================================
-- Spec says reports.resolved_by is SET NULL. If both `reports` and
-- `content_reports` exist in this DB, both get patched. The other
-- reports.* columns (reporter_id, reported_user_id) are part of the
-- moderation audit trail too, so SET NULL on all three.

SELECT pg_temp.safe_add_user_fk('reports',                 'reporter_id',       'SET NULL');
SELECT pg_temp.safe_add_user_fk('reports',                 'reported_user_id',  'SET NULL');
SELECT pg_temp.safe_add_user_fk('reports',                 'resolved_by',       'SET NULL');

-- ============================================================================
-- DONE — clean up the temp helper
-- ============================================================================
DROP FUNCTION IF EXISTS pg_temp.safe_add_user_fk(text, text, text);

COMMIT;

-- ============================================================================
-- AUDIT — run after applying.
-- ============================================================================
--
-- A. Which TEXT user-id columns in public.* are STILL missing a FK to
--    public.users? Anything this returns slipped through the enumeration
--    above and needs a follow-up patch.
--
--   WITH user_id_columns AS (
--     SELECT
--       c.table_schema,
--       c.table_name,
--       c.column_name
--     FROM information_schema.columns c
--     WHERE c.table_schema = 'public'
--       AND c.data_type   = 'text'
--       AND (
--         c.column_name = 'user_id'
--         OR c.column_name LIKE '%\_user\_id' ESCAPE '\'
--         OR c.column_name IN (
--           'owner_id', 'viewer_id', 'sender_id', 'receiver_id',
--           'created_by', 'invited_by', 'resolved_by',
--           'follower_id', 'following_id',
--           'blocker_id', 'blocked_id',
--           'reporter_id', 'visited_by'
--         )
--       )
--   )
--   SELECT u.table_schema, u.table_name, u.column_name
--   FROM user_id_columns u
--   LEFT JOIN information_schema.key_column_usage k
--     ON k.table_schema = u.table_schema
--    AND k.table_name   = u.table_name
--    AND k.column_name  = u.column_name
--   LEFT JOIN information_schema.referential_constraints rc
--     ON rc.constraint_schema = k.constraint_schema
--    AND rc.constraint_name   = k.constraint_name
--   WHERE rc.constraint_name IS NULL
--   ORDER BY u.table_name, u.column_name;
--
-- B. Spot-check a CASCADE: insert a user, an album, then delete the user
--    and confirm the album is gone:
--
--   INSERT INTO public.users (id, email) VALUES ('user_test', 'a@b.c');
--   INSERT INTO public.albums (id, user_id, title)
--     VALUES (gen_random_uuid(), 'user_test', 't');
--   DELETE FROM public.users WHERE id = 'user_test';
--   SELECT count(*) FROM public.albums WHERE user_id = 'user_test'; -- 0
--
-- ============================================================================
-- ON DELETE MATRIX (for human reviewers)
-- ============================================================================
--   table.column                          rule        rationale
--   ------------------------------------- ----------- ----------------------
--   albums.user_id                        CASCADE     owned data
--   photos.user_id                        CASCADE     owned data
--   comments.user_id                      CASCADE     owned data
--   likes.user_id                         CASCADE     owned data
--   favorites.user_id                     CASCADE     owned data
--   wishlist_items.user_id                CASCADE     owned data
--   stories.user_id                       CASCADE     owned data
--   notifications.user_id                 CASCADE     owned data
--   reactions.user_id                     CASCADE     owned data
--   ai_usage.user_id                      CASCADE     owned data
--   trip_planner_cache.user_id            CASCADE     owned data
--   itineraries.user_id                   CASCADE     owned data
--   mentions.user_id                      CASCADE     owned (author)
--   mentions.mentioned_user_id            CASCADE     join-with-context
--   search_history.user_id                CASCADE     owned data
--   activity_feed.user_id                 CASCADE     owned data
--   two_factor_auth.user_id               CASCADE     owned data
--   check_ins.user_id                     CASCADE     owned data
--   journal_entries.user_id               CASCADE     owned data
--   travel_profiles.user_id               CASCADE     owned data
--   user_preferences.user_id              CASCADE     owned data
--   conversation_participants.user_id     CASCADE     owned data
--   message_read_receipts.user_id         CASCADE     owned data
--   messages.sender_id                    CASCADE     owned data
--   album_collaborators.user_id           CASCADE     owned (invitee)
--   album_collaborators.invited_by        CASCADE     join-with-context
--   album_hashtags.added_by_user_id       CASCADE     join-with-context
--   user_achievements.user_id             CASCADE     owned data
--   user_challenges.user_id               CASCADE     owned data
--   push_subscriptions.user_id            CASCADE     owned data
--   trip_members.user_id                  CASCADE     owned (member row)
--   trip_pins.user_id                     CASCADE     owned (pin author)
--   trips.owner_id                        CASCADE     owned data
--   conversations.created_by              CASCADE     owned data
--   follows.follower_id                   CASCADE     graph table
--   follows.following_id                  CASCADE     graph table
--   user_blocks.blocker_id                CASCADE     graph table
--   user_blocks.blocked_id                CASCADE     graph table
--   companion_requests.sender_id          CASCADE     graph table
--   companion_requests.receiver_id        CASCADE     graph table
--   album_views.viewer_id                 SET NULL    soft reference
--   wishlist_items.shared_by_user_id      SET NULL    soft reference
--   error_events.user_id                  SET NULL    soft reference
--   content_reports.reporter_id           SET NULL    audit trail
--   trip_pins.visited_by                  SET NULL    soft reference
--   reports.reporter_id                   SET NULL    audit trail (legacy)
--   reports.reported_user_id              SET NULL    audit trail (legacy)
--   reports.resolved_by                   SET NULL    audit trail (legacy)
--
-- Intentionally not constrained:
--   storage_cleanup_queue.original_user_id (audit row read AFTER user is gone)
--
-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- To remove every FK this migration added (e.g. before re-running migration
-- 31), run:
--
--   DO $$
--   DECLARE
--     r RECORD;
--   BEGIN
--     FOR r IN
--       SELECT
--         con.conname        AS constraint_name,
--         nsp.nspname        AS table_schema,
--         cls.relname        AS table_name
--       FROM pg_constraint con
--       JOIN pg_class      cls ON cls.oid = con.conrelid
--       JOIN pg_namespace  nsp ON nsp.oid = cls.relnamespace
--       JOIN pg_class      ref ON ref.oid = con.confrelid
--       JOIN pg_namespace  rnsp ON rnsp.oid = ref.relnamespace
--       WHERE con.contype = 'f'
--         AND nsp.nspname  = 'public'
--         AND rnsp.nspname = 'public'
--         AND ref.relname  = 'users'
--     LOOP
--       EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT %I',
--         r.table_schema, r.table_name, r.constraint_name);
--     END LOOP;
--   END $$;
