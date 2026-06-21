-- 45_feedback.sql
--
-- In-app feedback capture. Every submission is stored here as a durable record;
-- the /api/feedback route then best-effort fans the submission out to Linear
-- (creates an issue) and Discord (posts to a webhook). Storing first means no
-- feedback is ever lost even if those integrations are unconfigured or down.
--
-- Writes happen via the service-role API route (bypasses RLS). RLS is still
-- enabled and closed by default; we add a narrow self-insert/self-select policy
-- so a signed-in client could read back its own submissions.
--
-- Idempotent and safe to re-run.

CREATE TABLE IF NOT EXISTS public.feedback (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email              text,
  category           text NOT NULL DEFAULT 'other'
                       CHECK (category IN ('bug', 'idea', 'praise', 'other')),
  message            text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 4000),
  page_url           text,
  user_agent         text,
  app_version        text,
  status             text NOT NULL DEFAULT 'new'
                       CHECK (status IN ('new', 'triaged', 'resolved', 'wont_fix')),
  linear_issue_id    text,
  linear_issue_url   text,
  delivered_discord  boolean NOT NULL DEFAULT false,
  delivered_linear   boolean NOT NULL DEFAULT false,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS feedback_user_id_idx ON public.feedback(user_id);
CREATE INDEX IF NOT EXISTS feedback_created_at_idx ON public.feedback(created_at DESC);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- A signed-in user may insert their own (or an anonymous) row. The service-role
-- route bypasses this, but the policy keeps direct client inserts safe.
DROP POLICY IF EXISTS "feedback_insert_own" ON public.feedback;
CREATE POLICY "feedback_insert_own" ON public.feedback
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- A user can read back only their own submissions.
DROP POLICY IF EXISTS "feedback_select_own" ON public.feedback;
CREATE POLICY "feedback_select_own" ON public.feedback
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
