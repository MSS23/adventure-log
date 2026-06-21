-- ============================================================================
-- Migration: Wishlist Item Checklist
-- Description: Optional "things to do / see" checklist per wishlist item.
--              Stored as a JSONB array of { id, text, done } objects to keep
--              it lightweight (no extra table / RLS). The wishlist_items RLS
--              policies already govern access to the whole row.
-- ============================================================================

ALTER TABLE public.wishlist_items
  ADD COLUMN IF NOT EXISTS checklist JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Guard against malformed payloads: the column must always hold a JSON array.
ALTER TABLE public.wishlist_items
  DROP CONSTRAINT IF EXISTS wishlist_items_checklist_is_array;

ALTER TABLE public.wishlist_items
  ADD CONSTRAINT wishlist_items_checklist_is_array
  CHECK (jsonb_typeof(checklist) = 'array');
