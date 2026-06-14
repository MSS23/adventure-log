-- Enable Supabase Realtime for collaborative trip planning.
--
-- The trip detail page subscribes to postgres_changes on trip_pins and
-- trip_members so collaborators see each other's pins (and member/color
-- changes) appear live, without a manual reload. Those tables must be members
-- of the `supabase_realtime` publication for the subscription to deliver
-- events. Idempotent — safe to run repeatedly.

DO $$
BEGIN
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
