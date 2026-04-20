-- ============================================================================
-- Migration 29: Moderation + client error logging
-- ============================================================================

-- 1. Block list — one user blocking another
CREATE TABLE IF NOT EXISTS public.user_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (blocker_id, blocked_id),
    CHECK (blocker_id <> blocked_id)
);

CREATE INDEX IF NOT EXISTS user_blocks_blocker_idx ON public.user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS user_blocks_blocked_idx ON public.user_blocks(blocked_id);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_blocks_select_own" ON public.user_blocks;
CREATE POLICY "user_blocks_select_own" ON public.user_blocks
    FOR SELECT USING (blocker_id = auth.uid() OR blocked_id = auth.uid());

DROP POLICY IF EXISTS "user_blocks_insert_own" ON public.user_blocks;
CREATE POLICY "user_blocks_insert_own" ON public.user_blocks
    FOR INSERT WITH CHECK (blocker_id = auth.uid());

DROP POLICY IF EXISTS "user_blocks_delete_own" ON public.user_blocks;
CREATE POLICY "user_blocks_delete_own" ON public.user_blocks
    FOR DELETE USING (blocker_id = auth.uid());

GRANT SELECT, INSERT, DELETE ON public.user_blocks TO authenticated;

-- 2. Reports — any user can report any album / comment / user
CREATE TABLE IF NOT EXISTS public.content_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
    target_type TEXT NOT NULL CHECK (target_type IN ('album', 'comment', 'user', 'photo')),
    target_id UUID NOT NULL,
    reason TEXT NOT NULL CHECK (reason IN ('spam', 'harassment', 'inappropriate', 'copyright', 'impersonation', 'other')),
    details TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'actioned', 'dismissed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS content_reports_target_idx ON public.content_reports(target_type, target_id);
CREATE INDEX IF NOT EXISTS content_reports_status_idx ON public.content_reports(status) WHERE status = 'pending';

ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

-- Reporters can create + read their own; admins read all (admins = null for now)
DROP POLICY IF EXISTS "content_reports_insert_own" ON public.content_reports;
CREATE POLICY "content_reports_insert_own" ON public.content_reports
    FOR INSERT WITH CHECK (reporter_id = auth.uid());

DROP POLICY IF EXISTS "content_reports_select_own" ON public.content_reports;
CREATE POLICY "content_reports_select_own" ON public.content_reports
    FOR SELECT USING (reporter_id = auth.uid());

GRANT SELECT, INSERT ON public.content_reports TO authenticated;

-- 3. Client error log — lightweight event sink for production errors
CREATE TABLE IF NOT EXISTS public.error_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    route TEXT,
    component TEXT,
    action TEXT,
    message TEXT NOT NULL,
    stack TEXT,
    user_agent TEXT,
    severity TEXT NOT NULL DEFAULT 'error' CHECK (severity IN ('info', 'warn', 'error', 'critical')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS error_events_created_idx ON public.error_events(created_at DESC);
CREATE INDEX IF NOT EXISTS error_events_severity_idx ON public.error_events(severity) WHERE severity IN ('error', 'critical');

ALTER TABLE public.error_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "error_events_insert_any" ON public.error_events;
CREATE POLICY "error_events_insert_any" ON public.error_events
    FOR INSERT WITH CHECK (true);

GRANT INSERT ON public.error_events TO authenticated, anon;
