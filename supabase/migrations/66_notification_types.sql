-- 66: Widen the notifications.type CHECK constraint.
--
-- The live constraint allows only ('like','comment','follow','message',
-- 'album_invite','collaboration','photo','location','achievement'). Two
-- notification types the API already inserts violate it, so those inserts
-- fail silently (both routes catch-and-log so the primary action succeeds):
--
--   * 'album_tag'        — /api/albums/[id]/collaborators, sent when someone
--                          is tagged (credit-only role) on an album.
--   * 'passport_connect' — /api/passport/connect, tells the passport owner a
--                          traveler scanned their QR, deep-linking to their
--                          mutual Travel Blend.
--
-- Dropping + re-adding is the standard way to widen a CHECK; the DO block
-- makes it idempotent across environments where the constraint name differs
-- or is already gone.

DO $$
DECLARE
  cname text;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'public.notifications'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%type%IN%';

  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.notifications DROP CONSTRAINT %I', cname);
  END IF;
END $$;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check CHECK (type IN (
    'like', 'comment', 'follow', 'message',
    'album_invite', 'collaboration', 'photo',
    'location', 'achievement',
    'album_tag', 'passport_connect'
  ));
