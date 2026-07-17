-- Establish a forward-only schema version contract for release health checks.
-- The preflight prevents a database missing critical earlier features from
-- claiming it is current simply because this migration was run out of order.

DO $$
DECLARE
  required_table TEXT;
  required_tables TEXT[] := ARRAY[
    'users',
    'albums',
    'photos',
    'trips',
    'wishlist_items',
    'place_recommendations',
    'place_recommendation_completions',
    'user_blocks'
  ];
BEGIN
  FOREACH required_table IN ARRAY required_tables LOOP
    IF to_regclass('public.' || required_table) IS NULL THEN
      RAISE EXCEPTION 'Cannot mark schema v81: required table public.% is missing', required_table;
    END IF;
  END LOOP;
END;
$$;

CREATE TABLE IF NOT EXISTS public.app_schema_version (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
  version INTEGER NOT NULL CHECK (version > 0),
  migration_name TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.app_schema_version ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.app_schema_version FROM PUBLIC, anon, authenticated;

INSERT INTO public.app_schema_version (singleton, version, migration_name, updated_at)
VALUES (TRUE, 81, '81_release_schema_version.sql', NOW())
ON CONFLICT (singleton) DO UPDATE SET
  version = EXCLUDED.version,
  migration_name = EXCLUDED.migration_name,
  updated_at = EXCLUDED.updated_at;

CREATE OR REPLACE FUNCTION public.get_app_schema_version()
RETURNS INTEGER
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT version FROM public.app_schema_version WHERE singleton = TRUE;
$$;

REVOKE ALL ON FUNCTION public.get_app_schema_version() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_app_schema_version() TO anon, authenticated, service_role;
