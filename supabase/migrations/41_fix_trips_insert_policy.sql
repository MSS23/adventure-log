-- Restore the trips INSERT row-level-security policy.
--
-- The `trips` table lost its INSERT policy during the Clerk auth migration
-- (migrations 31–39). Its SELECT/UPDATE/DELETE policies survived, but with no
-- valid INSERT policy, even a legitimate owner insert (owner_id = auth.uid())
-- is rejected — which broke trip creation for every user.
--
-- The POST /api/trips route now creates trips via the service-role client as a
-- runtime safeguard (owner_id is forced to the authenticated user), so trip
-- creation works without this migration. This restores correct RLS so any
-- direct client-side insert path is also covered. Idempotent.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'trips'
  ) THEN
    EXECUTE 'ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "trips_insert_owner" ON public.trips';
    EXECUTE 'CREATE POLICY "trips_insert_owner" ON public.trips '
            'FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid())';
  END IF;
END $$;
