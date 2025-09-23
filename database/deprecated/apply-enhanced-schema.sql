-- Apply Enhanced Schema Updates for Adventure Log
-- This builds on the fix-runtime-errors.sql to add advanced functionality

-- Drop existing views and functions for clean setup
DROP VIEW IF EXISTS travel_timeline_view CASCADE;
DROP FUNCTION IF EXISTS get_user_travel_years(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_user_travel_by_year(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS search_cities(TEXT, INTEGER) CASCADE;

-- Ensure cities table has all required columns
ALTER TABLE cities ADD COLUMN IF NOT EXISTS country_code CHAR(2);
ALTER TABLE cities ADD COLUMN IF NOT EXISTS population INTEGER;
ALTER TABLE cities ADD COLUMN IF NOT EXISTS city_type VARCHAR(20) DEFAULT 'city' CHECK (city_type IN ('city', 'island', 'archipelago', 'capital'));
ALTER TABLE cities ADD COLUMN IF NOT EXISTS airport_code VARCHAR(3);
ALTER TABLE cities ADD COLUMN IF NOT EXISTS timezone VARCHAR(50);
ALTER TABLE cities ADD COLUMN IF NOT EXISTS is_major_destination BOOLEAN DEFAULT false;

-- Create islands table for island destinations
CREATE TABLE IF NOT EXISTS islands (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  country_code CHAR(2),
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  island_group VARCHAR(100), -- 'Hawaiian Islands', 'Maldives', etc.
  area_km2 DECIMAL(10, 2),
  is_inhabited BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Update albums to link to specific cities and islands
ALTER TABLE albums ADD COLUMN IF NOT EXISTS island_id INTEGER REFERENCES islands(id);

-- Update photos for city-level precision
ALTER TABLE photos ADD COLUMN IF NOT EXISTS city_id INTEGER REFERENCES cities(id);
ALTER TABLE photos ADD COLUMN IF NOT EXISTS island_id INTEGER REFERENCES islands(id);

-- Enhanced travel timeline view for chronological ordering
CREATE OR REPLACE VIEW travel_timeline_view AS
SELECT
  a.id as album_id,
  a.user_id,
  a.title,
  a.start_date,
  a.end_date,
  COALESCE(c.latitude, i.latitude, a.latitude) as latitude,
  COALESCE(c.longitude, i.longitude, a.longitude) as longitude,
  COALESCE(c.name, i.name, a.location_name) as location_name,
  COALESCE(c.country_code, i.country_code, a.country_code) as country_code,
  EXTRACT(YEAR FROM COALESCE(a.start_date, a.created_at))::INTEGER as year,
  EXTRACT(MONTH FROM COALESCE(a.start_date, a.created_at))::INTEGER as month,
  EXTRACT(DAY FROM COALESCE(a.start_date, a.created_at))::INTEGER as day,
  COALESCE(c.city_type, 'country') as location_type,
  c.airport_code,
  c.timezone,
  i.island_group,
  COUNT(p.id) as photo_count,
  CASE
    WHEN a.end_date IS NOT NULL THEN
      EXTRACT(DAYS FROM (a.end_date - a.start_date))::INTEGER + 1
    ELSE 1
  END as duration_days,
  ROW_NUMBER() OVER (
    PARTITION BY a.user_id, EXTRACT(YEAR FROM COALESCE(a.start_date, a.created_at))
    ORDER BY COALESCE(a.start_date, a.created_at)
  ) as sequence_order
FROM albums a
LEFT JOIN cities c ON a.city_id = c.id
LEFT JOIN islands i ON a.island_id = i.id
LEFT JOIN photos p ON a.id = p.album_id
WHERE COALESCE(a.start_date, a.created_at) IS NOT NULL
  AND (a.latitude IS NOT NULL OR c.latitude IS NOT NULL OR i.latitude IS NOT NULL)
GROUP BY
  a.id, a.user_id, a.title, a.start_date, a.end_date,
  c.latitude, i.latitude, a.latitude,
  c.longitude, i.longitude, a.longitude,
  c.name, i.name, a.location_name,
  c.country_code, i.country_code, a.country_code,
  c.city_type, c.airport_code, c.timezone, i.island_group
ORDER BY a.user_id, COALESCE(a.start_date, a.created_at);

-- Update get_user_travel_years function to use the view
CREATE OR REPLACE FUNCTION get_user_travel_years(user_id_param UUID)
RETURNS TABLE (
  year INTEGER,
  location_count BIGINT,
  photo_count BIGINT,
  countries TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ttv.year,
    COUNT(DISTINCT ttv.album_id) as location_count,
    SUM(ttv.photo_count) as photo_count,
    ARRAY_AGG(DISTINCT ttv.country_code) FILTER (WHERE ttv.country_code IS NOT NULL) as countries
  FROM travel_timeline_view ttv
  WHERE ttv.user_id = user_id_param
  GROUP BY ttv.year
  ORDER BY ttv.year DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's travel data by year with city-level precision
CREATE OR REPLACE FUNCTION get_user_travel_by_year(
  user_id_param UUID,
  year_param INTEGER
) RETURNS TABLE (
  album_id UUID,
  title TEXT,
  location_name TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  location_type TEXT,
  country_code TEXT,
  visit_date DATE,
  duration_days INTEGER,
  sequence_order BIGINT,
  photo_count BIGINT,
  airport_code TEXT,
  timezone TEXT,
  island_group TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ttv.album_id,
    ttv.title,
    ttv.location_name,
    ttv.latitude,
    ttv.longitude,
    ttv.location_type,
    ttv.country_code,
    ttv.start_date::DATE as visit_date,
    ttv.duration_days,
    ttv.sequence_order,
    ttv.photo_count,
    ttv.airport_code,
    ttv.timezone,
    ttv.island_group
  FROM travel_timeline_view ttv
  WHERE ttv.user_id = user_id_param
    AND ttv.year = year_param
  ORDER BY ttv.sequence_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search cities for location tagging
CREATE OR REPLACE FUNCTION search_cities(search_term TEXT, limit_count INTEGER DEFAULT 20)
RETURNS TABLE (
  id INTEGER,
  name TEXT,
  country_code TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  city_type TEXT,
  airport_code TEXT,
  is_major_destination BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name::TEXT,
    c.country_code,
    c.latitude,
    c.longitude,
    c.city_type,
    c.airport_code,
    c.is_major_destination
  FROM cities c
  WHERE c.name ILIKE '%' || search_term || '%'
     OR c.airport_code ILIKE '%' || search_term || '%'
  ORDER BY
    c.is_major_destination DESC,
    c.population DESC NULLS LAST,
    c.name
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert comprehensive world cities data
INSERT INTO cities (name, country_code, latitude, longitude, population, city_type, airport_code, timezone, is_major_destination) VALUES
-- Major Global Cities
('Tokyo', 'JP', 35.6762, 139.6503, 37400068, 'capital', 'NRT', 'Asia/Tokyo', true),
('Osaka', 'JP', 34.6937, 135.5023, 19222665, 'city', 'KIX', 'Asia/Tokyo', true),
('Kyoto', 'JP', 35.0116, 135.7681, 1475183, 'city', 'ITM', 'Asia/Tokyo', true),
('Hiroshima', 'JP', 34.3853, 132.4553, 1199391, 'city', 'HIJ', 'Asia/Tokyo', true),
('Nara', 'JP', 34.6851, 135.8048, 358000, 'city', 'ITM', 'Asia/Tokyo', false),

-- United States
('New York', 'US', 40.7128, -74.0060, 8336817, 'city', 'JFK', 'America/New_York', true),
('Los Angeles', 'US', 34.0522, -118.2437, 3979576, 'city', 'LAX', 'America/Los_Angeles', true),
('San Francisco', 'US', 37.7749, -122.4194, 881549, 'city', 'SFO', 'America/Los_Angeles', true),
('Chicago', 'US', 41.8781, -87.6298, 2693976, 'city', 'ORD', 'America/Chicago', true),
('Miami', 'US', 25.7617, -80.1918, 467963, 'city', 'MIA', 'America/New_York', true),
('Las Vegas', 'US', 36.1699, -115.1398, 648685, 'city', 'LAS', 'America/Los_Angeles', true),
('Seattle', 'US', 47.6062, -122.3321, 753675, 'city', 'SEA', 'America/Los_Angeles', true),
('Boston', 'US', 42.3601, -71.0589, 695506, 'city', 'BOS', 'America/New_York', true),
('Washington DC', 'US', 38.9072, -77.0369, 705749, 'capital', 'DCA', 'America/New_York', true),

-- Europe
('London', 'GB', 51.5074, -0.1278, 9648110, 'capital', 'LHR', 'Europe/London', true),
('Paris', 'FR', 48.8566, 2.3522, 2161000, 'capital', 'CDG', 'Europe/Paris', true),
('Rome', 'IT', 41.9028, 12.4964, 2873000, 'capital', 'FCO', 'Europe/Rome', true),
('Barcelona', 'ES', 41.3851, 2.1734, 1620343, 'city', 'BCN', 'Europe/Madrid', true),
('Amsterdam', 'NL', 52.3676, 4.9041, 821752, 'capital', 'AMS', 'Europe/Amsterdam', true),
('Berlin', 'DE', 52.5200, 13.4050, 3664088, 'capital', 'BER', 'Europe/Berlin', true),
('Vienna', 'AT', 48.2082, 16.3738, 1911191, 'capital', 'VIE', 'Europe/Vienna', true),
('Prague', 'CZ', 50.0755, 14.4378, 1309000, 'capital', 'PRG', 'Europe/Prague', true),
('Zurich', 'CH', 47.3769, 8.5417, 415367, 'city', 'ZUR', 'Europe/Zurich', true),
('Istanbul', 'TR', 41.0082, 28.9784, 15519267, 'city', 'IST', 'Europe/Istanbul', true),

-- Asia Pacific
('Bangkok', 'TH', 13.7563, 100.5018, 8281099, 'capital', 'BKK', 'Asia/Bangkok', true),
('Singapore', 'SG', 1.3521, 103.8198, 5850342, 'capital', 'SIN', 'Asia/Singapore', true),
('Seoul', 'KR', 37.5665, 126.9780, 9776000, 'capital', 'ICN', 'Asia/Seoul', true),
('Hong Kong', 'HK', 22.3193, 114.1694, 7496981, 'city', 'HKG', 'Asia/Hong_Kong', true),
('Dubai', 'AE', 25.2048, 55.2708, 3331420, 'city', 'DXB', 'Asia/Dubai', true),
('Mumbai', 'IN', 19.0760, 72.8777, 20411274, 'city', 'BOM', 'Asia/Kolkata', true),
('Delhi', 'IN', 28.7041, 77.1025, 32941308, 'capital', 'DEL', 'Asia/Kolkata', true),
('Beijing', 'CN', 39.9042, 116.4074, 21893095, 'capital', 'PEK', 'Asia/Shanghai', true),
('Shanghai', 'CN', 31.2304, 121.4737, 27795702, 'city', 'PVG', 'Asia/Shanghai', true),
('Sydney', 'AU', -33.8688, 151.2093, 5312163, 'city', 'SYD', 'Australia/Sydney', true),
('Melbourne', 'AU', -37.8136, 144.9631, 5078193, 'city', 'MEL', 'Australia/Melbourne', true),

-- South America
('São Paulo', 'BR', -23.5558, -46.6396, 12325232, 'city', 'GRU', 'America/Sao_Paulo', true),
('Rio de Janeiro', 'BR', -22.9068, -43.1729, 6747815, 'city', 'GIG', 'America/Sao_Paulo', true),
('Buenos Aires', 'AR', -34.6118, -58.3960, 3075646, 'capital', 'EZE', 'America/Argentina/Buenos_Aires', true),
('Lima', 'PE', -12.0464, -77.0428, 10092000, 'capital', 'LIM', 'America/Lima', true),

-- Africa
('Cairo', 'EG', 30.0444, 31.2357, 10230350, 'capital', 'CAI', 'Africa/Cairo', true),
('Cape Town', 'ZA', -33.9249, 18.4241, 4618000, 'city', 'CPT', 'Africa/Johannesburg', true),
('Marrakech', 'MA', 31.6295, -7.9811, 928850, 'city', 'RAK', 'Africa/Casablanca', true),

-- Canada
('Toronto', 'CA', 43.6532, -79.3832, 2930000, 'city', 'YYZ', 'America/Toronto', true),
('Vancouver', 'CA', 49.2827, -123.1207, 675218, 'city', 'YVR', 'America/Vancouver', true),
('Montreal', 'CA', 45.5017, -73.5673, 1780000, 'city', 'YUL', 'America/Toronto', true)
ON CONFLICT (name, country_code) DO NOTHING;

-- Insert island destinations
INSERT INTO islands (name, country_code, latitude, longitude, island_group, area_km2, is_inhabited) VALUES
-- Hawaiian Islands
('Oahu', 'US', 21.4389, -158.0001, 'Hawaiian Islands', 1545.4, true),
('Maui', 'US', 20.7984, -156.3319, 'Hawaiian Islands', 1883.5, true),
('Big Island', 'US', 19.5429, -155.6659, 'Hawaiian Islands', 10432.5, true),
('Kauai', 'US', 22.0964, -159.5261, 'Hawaiian Islands', 1430.5, true),
('Molokai', 'US', 21.1444, -157.0226, 'Hawaiian Islands', 673.4, true),
('Lanai', 'US', 20.8283, -156.9197, 'Hawaiian Islands', 364.0, true),

-- Caribbean
('Nassau', 'BS', 25.0343, -77.3963, 'Bahamas', 207.0, true),
('Barbados', 'BB', 13.1939, -59.5432, 'Caribbean', 431.0, true),
('Jamaica', 'JM', 18.1096, -77.2975, 'Caribbean', 10991.0, true),
('Aruba', 'AW', 12.5211, -69.9683, 'Caribbean', 180.0, true),
('Curaçao', 'CW', 12.1696, -68.9900, 'Caribbean', 444.0, true),

-- Maldives
('Malé', 'MV', 4.1755, 73.5093, 'Maldives', 8.3, true),
('Hulhumalé', 'MV', 4.2167, 73.5400, 'Maldives', 3.9, true),

-- Greek Islands
('Santorini', 'GR', 36.3932, 25.4615, 'Greek Islands', 96.2, true),
('Mykonos', 'GR', 37.4467, 25.3289, 'Greek Islands', 105.2, true),
('Crete', 'GR', 35.2401, 24.8093, 'Greek Islands', 8336.0, true),

-- Seychelles
('Mahé', 'SC', -4.6796, 55.4920, 'Seychelles', 157.3, true),
('Praslin', 'SC', -4.3197, 55.7273, 'Seychelles', 38.5, true),

-- Philippines
('Boracay', 'PH', 11.9674, 121.9248, 'Philippines', 10.3, true),
('Palawan', 'PH', 9.8349, 118.7384, 'Philippines', 14649.7, true),

-- Indonesia
('Bali', 'ID', -8.4095, 115.1889, 'Indonesia', 5780.0, true),
('Lombok', 'ID', -8.6500, 116.3242, 'Indonesia', 4738.5, true),

-- Fiji
('Viti Levu', 'FJ', -17.7134, 178.0650, 'Fiji', 10531.0, true),
('Vanua Levu', 'FJ', -16.0236, 179.0850, 'Fiji', 5587.1, true)
ON CONFLICT (name, country_code) DO NOTHING;

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_cities_coordinates ON cities(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_cities_country ON cities(country_code);
CREATE INDEX IF NOT EXISTS idx_cities_major ON cities(is_major_destination) WHERE is_major_destination = true;
CREATE INDEX IF NOT EXISTS idx_islands_coordinates ON islands(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_islands_group ON islands(island_group);
CREATE INDEX IF NOT EXISTS idx_albums_city ON albums(city_id) WHERE city_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_albums_island ON albums(island_id) WHERE island_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_photos_city ON photos(city_id) WHERE city_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_photos_island ON photos(island_id) WHERE island_id IS NOT NULL;

-- Enhanced RLS policies
ALTER TABLE islands ENABLE ROW LEVEL SECURITY;

-- Islands are publicly readable for location data
CREATE POLICY "Islands are viewable by everyone" ON islands
  FOR SELECT USING (true);

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_travel_by_year(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION search_cities(TEXT, INTEGER) TO authenticated;

-- Final verification
DO $$
BEGIN
  RAISE NOTICE 'Enhanced schema applied successfully';
  RAISE NOTICE 'Cities table has % rows', (SELECT COUNT(*) FROM cities);
  RAISE NOTICE 'Islands table has % rows', (SELECT COUNT(*) FROM islands);
  RAISE NOTICE 'Countries table has % rows', (SELECT COUNT(*) FROM countries);
END
$$;