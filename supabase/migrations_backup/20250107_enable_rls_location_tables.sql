-- Enable RLS on location reference tables
-- These tables contain public reference data that should be readable by all users

-- Enable RLS on countries table
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;

-- Enable RLS on cities table
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

-- Enable RLS on islands table
ALTER TABLE public.islands ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public read access
-- These are reference/lookup tables that should be readable by everyone

CREATE POLICY "Countries are viewable by everyone"
  ON public.countries
  FOR SELECT
  USING (true);

CREATE POLICY "Cities are viewable by everyone"
  ON public.cities
  FOR SELECT
  USING (true);

CREATE POLICY "Islands are viewable by everyone"
  ON public.islands
  FOR SELECT
  USING (true);

-- Note: No INSERT/UPDATE/DELETE policies are created
-- These tables should only be modified by admins via direct database access
