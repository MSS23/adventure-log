-- 65: Deliver unlike (DELETE) events over Realtime.
--
-- With the default REPLICA IDENTITY (primary key only), a DELETE event's
-- `old` record carries just `id` — Realtime cannot match the client's
-- `target_id=eq.<id>` filter against it, so unlike events are silently
-- dropped and other viewers' like counts only correct on refetch.
--
-- REPLICA IDENTITY FULL makes Postgres log the whole old row for deletes,
-- letting Realtime both filter the event and hand subscribers the fields
-- they need. The likes table is small-row/high-churn, so the extra WAL
-- volume is negligible.
--
-- (The client already handles delivered DELETEs defensively — removal by id
-- + refetch — so this migration is about delivery, not correctness.)

ALTER TABLE public.likes REPLICA IDENTITY FULL;
