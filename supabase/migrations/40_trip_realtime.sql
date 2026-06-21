-- Enable Supabase Realtime for collaborative trip planning.
--
-- The trip detail page subscribes to postgres_changes on trip_pins and
-- trip_members so collaborators see each other's pins (and member/color
-- changes) appear live, without a manual reload. Those tables must be members
-- of the `supabase_realtime` publication for the subscription to deliver
-- events. Idempotent — safe to run repeatedly.

DO $$
BEGIN
  -- The publication always exists on hosted Supabase, but guard anyway so this
  -- migration is portable to a bare-Postgres instance (where ADD TABLE against a
  -- missing publication would abort with 42704 — an error the runner does NOT
  -- treat as idempotent).
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'trip_pins'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_pins;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'trip_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_members;
  END IF;
END $$;

-- Realtime DELETE events only carry the row's REPLICA IDENTITY columns. With the
-- default (PRIMARY KEY) identity, a DELETE payload includes `id` but NOT
-- `trip_id`, so the client's `filter: trip_id=eq.<id>` channel binding never
-- matches and pin/member removals silently fail to sync live — the headline
-- collaborative feature. REPLICA IDENTITY FULL ships the whole old row on DELETE
-- so the trip_id filter matches. Idempotent.
ALTER TABLE public.trip_pins REPLICA IDENTITY FULL;
ALTER TABLE public.trip_members REPLICA IDENTITY FULL;
