-- 72: Enable Supabase Realtime for the notifications table.
--
-- Two client subscriptions already listen to postgres_changes on
-- public.notifications:
--   * NotificationCenter — live bell badge + new-notification rows.
--   * PassportConnectListener — pulls the passport OWNER into the "you're now
--     connected" → Travel Blend experience the instant their QR is scanned, so
--     BOTH travelers land in the compatibility view (not just the scanner).
--
-- For those subscriptions to deliver events, the table must be a member of the
-- `supabase_realtime` publication. No migration ever added it (migration 40
-- only added trip_pins / trip_members), so on any environment where it wasn't
-- toggled on in the dashboard the subscriptions silently never fire. This makes
-- membership explicit and reproducible. Idempotent — safe to run repeatedly.
--
-- Note: INSERT events (the only ones the passport flow needs) always carry the
-- full new row regardless of REPLICA IDENTITY, so we intentionally do NOT change
-- the table's replica identity here — NotificationCenter already works around
-- the default identity for its UPDATE/DELETE handlers.

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
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;
