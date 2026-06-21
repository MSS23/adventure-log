-- 50_feedback_anon_insert.sql
--
-- Let feedback be stored without the service-role key.
--
-- /api/feedback originally wrote the durable feedback row only through the
-- service-role client, so when SUPABASE_SERVICE_ROLE_KEY is unconfigured the
-- submission was fanned out to Discord/Linear but never landed in the table.
-- The route now persists through the normal RLS-bound client first (mirroring
-- migration 49's "work without the service-role key" approach).
--
-- Migration 45 added feedback_insert_own only TO authenticated. The route also
-- accepts anonymous (signed-out) feedback, which inserts a row with
-- user_id IS NULL. Without an anon policy that write is rejected and falls back
-- to the service-role client — which doesn't exist when the key is absent. This
-- adds a narrow anon insert policy covering exactly that case.
--
-- Idempotent and safe to re-run.

-- An anonymous (signed-out) visitor may insert a row only with no owner.
DROP POLICY IF EXISTS "feedback_insert_anon" ON public.feedback;
CREATE POLICY "feedback_insert_anon" ON public.feedback
  FOR INSERT TO anon
  WITH CHECK (user_id IS NULL);
