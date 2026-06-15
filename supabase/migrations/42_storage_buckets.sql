-- 42_storage_buckets.sql
-- ---------------------------------------------------------------------------
-- Create the storage buckets the app depends on.
--
-- RLS policies for these buckets already exist (see 32_clerk_storage_policies
-- and 39_revert_clerk_to_supabase_auth), but no prior migration actually
-- CREATES the buckets — on a fresh Supabase project uploads fail until the
-- buckets exist. This migration creates them idempotently so the schema is
-- self-bootstrapping from the SQL alone (no manual dashboard step).
--
-- All three are public:true (matches the app, which serves public photo URLs
-- via getPublicUrl). Object-level access is still governed by the RLS policies
-- on storage.objects defined in the migrations above.
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('photos',  'photos',  true),
  ('avatars', 'avatars', true),
  ('covers',  'covers',  true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;
