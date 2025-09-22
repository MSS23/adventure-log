-- Fix Runtime Database Errors - Adventure Log
-- This script fixes the database schema mismatches causing 400/404 errors

-- Step 1: Add missing columns to albums table
ALTER TABLE albums ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE albums ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
ALTER TABLE albums ADD COLUMN IF NOT EXISTS country_code CHAR(2);

-- Step 2: Update countries table structure if needed
CREATE TABLE IF NOT EXISTS countries (
  id SERIAL PRIMARY KEY,
  code CHAR(2) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Step 3: Add relationship between cities and countries
ALTER TABLE cities ADD COLUMN IF NOT EXISTS countries_id INTEGER REFERENCES countries(id);

-- Populate some basic countries data if empty
INSERT INTO countries (code, name, latitude, longitude) VALUES
('US', 'United States', 39.8283, -98.5795),
('GB', 'United Kingdom', 55.3781, -3.4360),
('FR', 'France', 46.2276, 2.2137),
('DE', 'Germany', 51.1657, 10.4515),
('IT', 'Italy', 41.8719, 12.5674),
('ES', 'Spain', 40.4637, -3.7492),
('JP', 'Japan', 36.2048, 138.2529),
('AU', 'Australia', -25.2744, 133.7751),
('CA', 'Canada', 56.1304, -106.3468),
('BR', 'Brazil', -14.2350, -51.9253),
('IN', 'India', 20.5937, 78.9629),
('CN', 'China', 35.8617, 104.1954),
('RU', 'Russia', 61.5240, 105.3188),
('ZA', 'South Africa', -30.5595, 22.9375),
('EG', 'Egypt', 26.0975, 30.0444),
('MX', 'Mexico', 23.6345, -102.5528),
('AR', 'Argentina', -38.4161, -63.6167),
('TH', 'Thailand', 15.8700, 100.9925),
('SG', 'Singapore', 1.3521, 103.8198),
('AE', 'United Arab Emirates', 23.4241, 53.8478),
('TR', 'Turkey', 38.9637, 35.2433),
('GR', 'Greece', 39.0742, 21.8243),
('NL', 'Netherlands', 52.1326, 5.2913),
('CH', 'Switzerland', 46.8182, 8.2275),
('AT', 'Austria', 47.5162, 14.5501),
('BE', 'Belgium', 50.5039, 4.4699),
('SE', 'Sweden', 60.1282, 18.6435),
('NO', 'Norway', 60.4720, 8.4689),
('DK', 'Denmark', 56.2639, 9.5018),
('FI', 'Finland', 61.9241, 25.7482),
('PL', 'Poland', 51.9194, 19.1451),
('CZ', 'Czech Republic', 49.8175, 15.4730),
('HU', 'Hungary', 47.1625, 19.5033),
('PT', 'Portugal', 39.3999, -8.2245),
('IE', 'Ireland', 53.4129, -8.2439),
('IS', 'Iceland', 64.9631, -19.0208),
('KR', 'South Korea', 35.9078, 127.7669),
('MY', 'Malaysia', 4.2105, 101.9758),
('ID', 'Indonesia', -0.7893, 113.9213),
('PH', 'Philippines', 12.8797, 121.7740),
('VN', 'Vietnam', 14.0583, 108.2772),
('NZ', 'New Zealand', -40.9006, 174.8860),
('CL', 'Chile', -35.6751, -71.5430),
('PE', 'Peru', -9.1900, -75.0152),
('CO', 'Colombia', 4.5709, -74.2973),
('VE', 'Venezuela', 6.4238, -66.5897),
('EC', 'Ecuador', -1.8312, -78.1834),
('UY', 'Uruguay', -32.5228, -55.7658),
('PY', 'Paraguay', -23.4425, -58.4438),
('BO', 'Bolivia', -16.2902, -63.5887),
('CR', 'Costa Rica', 9.7489, -83.7534),
('PA', 'Panama', 8.5380, -80.7821),
('GT', 'Guatemala', 15.7835, -90.2308),
('HN', 'Honduras', 15.2000, -86.2419),
('NI', 'Nicaragua', 12.2651, -85.2072),
('SV', 'El Salvador', 13.7942, -88.8965),
('BZ', 'Belize', 17.1899, -88.4976),
('JM', 'Jamaica', 18.1096, -77.2975),
('CU', 'Cuba', 21.5218, -77.7812),
('DO', 'Dominican Republic', 18.7357, -70.1627),
('HT', 'Haiti', 18.9712, -72.2852),
('TT', 'Trinidad and Tobago', 10.6918, -61.2225),
('BB', 'Barbados', 13.1939, -59.5432),
('LC', 'Saint Lucia', 13.9094, -60.9789),
('GD', 'Grenada', 12.1165, -61.6790),
('VC', 'Saint Vincent and the Grenadines', 12.9843, -61.2872),
('AG', 'Antigua and Barbuda', 17.0608, -61.7964),
('KN', 'Saint Kitts and Nevis', 17.3578, -62.7830),
('DM', 'Dominica', 15.4140, -61.3710),
('BS', 'Bahamas', 25.0343, -77.3963),
('BM', 'Bermuda', 32.3078, -64.7505),
('KY', 'Cayman Islands', 19.3133, -81.2546),
('TC', 'Turks and Caicos Islands', 21.6940, -71.7979),
('VG', 'British Virgin Islands', 18.4207, -64.6399),
('VI', 'U.S. Virgin Islands', 18.3358, -64.8963),
('PR', 'Puerto Rico', 18.2208, -66.5901),
('MQ', 'Martinique', 14.6415, -61.0242),
('GP', 'Guadeloupe', 16.9950, -62.0679),
('AW', 'Aruba', 12.5211, -69.9683),
('CW', 'Curaçao', 12.1696, -68.9900),
('BQ', 'Caribbean Netherlands', 12.1784, -68.2385),
('SX', 'Sint Maarten', 18.0425, -63.0548),
('MF', 'Saint Martin', 18.0708, -63.0501),
('BL', 'Saint Barthélemy', 17.9000, -62.8333),
('FK', 'Falkland Islands', -51.7963, -59.5236),
('GS', 'South Georgia and South Sandwich Islands', -54.4296, -36.5879),
('GF', 'French Guiana', 3.9339, -53.1258),
('SR', 'Suriname', 3.9193, -56.0278),
('GY', 'Guyana', 4.8604, -58.9302),
('MV', 'Maldives', 3.2028, 73.2207),
('LK', 'Sri Lanka', 7.8731, 80.7718),
('BD', 'Bangladesh', 23.6850, 90.3563),
('NP', 'Nepal', 28.3949, 84.1240),
('BT', 'Bhutan', 27.5142, 90.4336),
('MM', 'Myanmar', 21.9162, 95.9560),
('KH', 'Cambodia', 12.5657, 104.9910),
('LA', 'Laos', 19.8563, 102.4955),
('MN', 'Mongolia', 46.8625, 103.8467),
('KP', 'North Korea', 40.3399, 127.5101),
('TW', 'Taiwan', 23.6978, 120.9605),
('HK', 'Hong Kong', 22.3193, 114.1694),
('MO', 'Macau', 22.1987, 113.5439),
('FJ', 'Fiji', -16.5780, 179.4144),
('TO', 'Tonga', -21.1789, -175.1982),
('WS', 'Samoa', -13.7590, -172.1046),
('VU', 'Vanuatu', -15.3767, 166.9592),
('SB', 'Solomon Islands', -9.6457, 160.1562),
('NC', 'New Caledonia', -20.9043, 165.6180),
('PF', 'French Polynesia', -17.6797, -149.4068),
('CK', 'Cook Islands', -21.2367, -159.7777),
('NU', 'Niue', -19.0544, -169.8672),
('TK', 'Tokelau', -8.9676, -171.8556),
('TV', 'Tuvalu', -7.1095, 177.6493),
('KI', 'Kiribati', -3.3704, -168.7340),
('NR', 'Nauru', -0.5228, 166.9315),
('MH', 'Marshall Islands', 7.1315, 171.1845),
('FM', 'Federated States of Micronesia', 7.4256, 150.5508),
('PW', 'Palau', 7.5150, 134.5825),
('PG', 'Papua New Guinea', -6.3150, 143.9555),
('TL', 'East Timor', -8.8742, 125.7275),
('BN', 'Brunei', 4.5353, 114.7277),
('SC', 'Seychelles', -4.6796, 55.4920),
('MU', 'Mauritius', -20.3484, 57.5522),
('RE', 'Réunion', -21.1151, 55.5364),
('YT', 'Mayotte', -12.8275, 45.1662),
('KM', 'Comoros', -11.6455, 43.3333),
('MG', 'Madagascar', -18.7669, 46.8691),
('MW', 'Malawi', -13.2543, 34.3015),
('ZM', 'Zambia', -13.1339, 27.8493),
('ZW', 'Zimbabwe', -19.0154, 29.1549),
('BW', 'Botswana', -22.3285, 24.6849),
('NA', 'Namibia', -22.9576, 18.4904),
('SZ', 'Eswatini', -26.5225, 31.4659),
('LS', 'Lesotho', -29.6100, 28.2336),
('MZ', 'Mozambique', -18.6657, 35.5296),
('TZ', 'Tanzania', -6.3690, 34.8888),
('KE', 'Kenya', -0.0236, 37.9062),
('UG', 'Uganda', 1.3733, 32.2903),
('RW', 'Rwanda', -1.9403, 29.8739),
('BI', 'Burundi', -3.3731, 29.9189),
('ET', 'Ethiopia', 9.1450, 40.4897),
('ER', 'Eritrea', 15.1794, 39.7823),
('DJ', 'Djibouti', 11.8251, 42.5903),
('SO', 'Somalia', 5.1521, 46.1996),
('SS', 'South Sudan', 6.8770, 31.3070),
('SD', 'Sudan', 12.8628, 30.2176),
('LY', 'Libya', 26.3351, 17.2283),
('TD', 'Chad', 15.4542, 18.7322),
('CF', 'Central African Republic', 6.6111, 20.9394),
('CM', 'Cameroon', 7.3697, 12.3547),
('GQ', 'Equatorial Guinea', 1.6508, 10.2679),
('GA', 'Gabon', -0.8037, 11.6094),
('CG', 'Republic of the Congo', -0.2280, 15.8277),
('CD', 'Democratic Republic of the Congo', -4.0383, 21.7587),
('AO', 'Angola', -11.2027, 17.8739),
('ST', 'São Tomé and Príncipe', 0.1864, 6.6131),
('GH', 'Ghana', 7.9465, -1.0232),
('TG', 'Togo', 8.6195, 0.8248),
('BJ', 'Benin', 9.3077, 2.3158),
('NG', 'Nigeria', 9.0820, 8.6753),
('NE', 'Niger', 17.6078, 8.0817),
('BF', 'Burkina Faso', 12.2383, -1.5616),
('ML', 'Mali', 17.5707, -3.9962),
('SN', 'Senegal', 14.4974, -14.4524),
('MR', 'Mauritania', 21.0079, -10.9408),
('GM', 'Gambia', 13.4432, -15.3101),
('GW', 'Guinea-Bissau', 11.8037, -15.1804),
('GN', 'Guinea', 9.9456, -9.6966),
('SL', 'Sierra Leone', 8.4606, -11.7799),
('LR', 'Liberia', 6.4281, -9.4295),
('CI', 'Ivory Coast', 7.5400, -5.5471),
('CV', 'Cape Verde', 16.5388, -24.0132),
('MA', 'Morocco', 31.7917, -7.0926),
('DZ', 'Algeria', 28.0339, 1.6596),
('TN', 'Tunisia', 33.8869, 9.5375)
ON CONFLICT (code) DO NOTHING;

-- Step 4: Create missing RPC functions

-- Function to get user dashboard stats
CREATE OR REPLACE FUNCTION get_user_dashboard_stats(user_id_param UUID)
RETURNS TABLE (
  total_albums BIGINT,
  total_photos BIGINT,
  countries_visited BIGINT,
  cities_visited BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM albums WHERE user_id = user_id_param) as total_albums,
    (SELECT COUNT(*) FROM photos WHERE user_id = user_id_param) as total_photos,
    (SELECT COUNT(DISTINCT country_code) FROM albums WHERE user_id = user_id_param AND country_code IS NOT NULL) as countries_visited,
    (SELECT COUNT(DISTINCT city_id) FROM albums WHERE user_id = user_id_param AND city_id IS NOT NULL) as cities_visited;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user travel years
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
    EXTRACT(YEAR FROM COALESCE(a.start_date, a.created_at))::INTEGER as year,
    COUNT(DISTINCT a.id) as location_count,
    COALESCE(SUM(p.photo_count), 0) as photo_count,
    ARRAY_AGG(DISTINCT a.country_code) FILTER (WHERE a.country_code IS NOT NULL) as countries
  FROM albums a
  LEFT JOIN (
    SELECT album_id, COUNT(*) as photo_count
    FROM photos
    GROUP BY album_id
  ) p ON a.id = p.album_id
  WHERE a.user_id = user_id_param
    AND COALESCE(a.start_date, a.created_at) IS NOT NULL
  GROUP BY EXTRACT(YEAR FROM COALESCE(a.start_date, a.created_at))
  ORDER BY year DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Update cities table to have proper countries relationship
-- First, let's update existing cities to link to countries
UPDATE cities SET countries_id = countries.id
FROM countries
WHERE cities.country_code = countries.code
AND cities.countries_id IS NULL;

-- Step 6: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_albums_user_id ON albums(user_id);
CREATE INDEX IF NOT EXISTS idx_albums_country_code ON albums(country_code);
CREATE INDEX IF NOT EXISTS idx_albums_city_id ON albums(city_id);
CREATE INDEX IF NOT EXISTS idx_albums_dates ON albums(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_photos_user_id ON photos(user_id);
CREATE INDEX IF NOT EXISTS idx_photos_album_id ON photos(album_id);
CREATE INDEX IF NOT EXISTS idx_cities_country_code ON cities(country_code);
CREATE INDEX IF NOT EXISTS idx_cities_major_dest ON cities(is_major_destination) WHERE is_major_destination = true;

-- Step 7: Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_user_dashboard_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_travel_years(UUID) TO authenticated;

-- Step 8: Enable RLS on new/updated tables
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;

-- Countries are publicly readable
CREATE POLICY IF NOT EXISTS "Countries are viewable by everyone" ON countries
  FOR SELECT USING (true);

-- Step 9: Update existing albums to have proper country codes if missing
UPDATE albums
SET country_code = 'US'
WHERE country_code IS NULL
  AND (location_name ILIKE '%united states%'
       OR location_name ILIKE '%usa%'
       OR location_name ILIKE '%america%');

UPDATE albums
SET country_code = 'GB'
WHERE country_code IS NULL
  AND (location_name ILIKE '%united kingdom%'
       OR location_name ILIKE '%england%'
       OR location_name ILIKE '%scotland%'
       OR location_name ILIKE '%wales%'
       OR location_name ILIKE '%london%');

UPDATE albums
SET country_code = 'FR'
WHERE country_code IS NULL
  AND (location_name ILIKE '%france%'
       OR location_name ILIKE '%paris%');

UPDATE albums
SET country_code = 'DE'
WHERE country_code IS NULL
  AND (location_name ILIKE '%germany%'
       OR location_name ILIKE '%berlin%');

UPDATE albums
SET country_code = 'IT'
WHERE country_code IS NULL
  AND (location_name ILIKE '%italy%'
       OR location_name ILIKE '%rome%'
       OR location_name ILIKE '%milan%');

UPDATE albums
SET country_code = 'ES'
WHERE country_code IS NULL
  AND (location_name ILIKE '%spain%'
       OR location_name ILIKE '%madrid%'
       OR location_name ILIKE '%barcelona%');

UPDATE albums
SET country_code = 'JP'
WHERE country_code IS NULL
  AND (location_name ILIKE '%japan%'
       OR location_name ILIKE '%tokyo%'
       OR location_name ILIKE '%osaka%');

-- Add a check to ensure all required functions exist
DO $$
BEGIN
  -- Verify functions exist
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_dashboard_stats') THEN
    RAISE EXCEPTION 'Function get_user_dashboard_stats was not created successfully';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_travel_years') THEN
    RAISE EXCEPTION 'Function get_user_travel_years was not created successfully';
  END IF;

  RAISE NOTICE 'All database functions created successfully';
END
$$;