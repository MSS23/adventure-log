-- Adventure Log Reference Data - Countries, Cities, and Islands
-- Comprehensive geographical reference data for travel features
-- Run this SECOND after 01-core-schema.sql

-- =============================================================================
-- COUNTRIES DATA
-- =============================================================================

-- Essential countries for basic app functionality
-- Users will add specific locations through the app as they create albums
INSERT INTO countries (code, name, latitude, longitude) VALUES
-- Core English-speaking countries for initial functionality
('US', 'United States', 40.7128, -74.0060),
('GB', 'United Kingdom', 51.5074, -0.1278),
('CA', 'Canada', 43.6532, -79.3832),
('AU', 'Australia', -33.8688, 151.2093)

ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude;

-- =============================================================================
-- CITIES DATA (EMPTY - Users will add through the app)
-- =============================================================================

-- Cities table structure is ready for user-generated location data
-- The app will dynamically add cities as users create albums with location data

-- =============================================================================
-- ISLANDS DATA (EMPTY - Users will add through the app)
-- =============================================================================

-- Islands table structure is ready for user-generated island destination data
-- The app will dynamically add islands as users create albums with island locations

-- =============================================================================
-- DATA INTEGRITY UPDATES
-- =============================================================================

-- Update cities to ensure country_code matches country_id
UPDATE cities
SET country_code = countries.code
FROM countries
WHERE cities.country_id = countries.id
AND cities.country_code != countries.code;

-- =============================================================================
-- VERIFICATION AND SUMMARY
-- =============================================================================

DO $$
DECLARE
  country_count INTEGER;
  city_count INTEGER;
  island_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO country_count FROM countries;
  SELECT COUNT(*) INTO city_count FROM cities;
  SELECT COUNT(*) INTO island_count FROM islands;

  RAISE NOTICE 'Minimal reference data loaded successfully:';
  RAISE NOTICE '- Countries: % (essential countries only)', country_count;
  RAISE NOTICE '- Cities: % (empty - users will add through app)', city_count;
  RAISE NOTICE '- Islands: % (empty - users will add through app)', island_count;

  RAISE NOTICE 'Database ready for user-generated location data';
  RAISE NOTICE 'Ready for enhanced features installation';
END
$$;