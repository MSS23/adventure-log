-- 78: Drop the dead photos.display_order column
--
-- Commit 6beaf2c standardized every reader and writer on photos.order_index
-- (169/169 rows populated at the time; display_order was 0/169 — a
-- never-written twin that silently made ordering fall back to created_at).
-- No code references display_order anymore; dropping the column makes the
-- split-brain unrecreatable.
--
-- The column was added out-of-band (no migration in this directory creates
-- it), hence IF EXISTS: this migration is a no-op on databases that never
-- had it.

ALTER TABLE public.photos DROP COLUMN IF EXISTS display_order;

-- Note: the covering index for the comments fetch (TODO #7) already exists —
-- migration 57 created idx_comments_target ON comments (target_type, target_id).
