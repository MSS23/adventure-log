-- World Cities Database for Flight Animation
-- Major destinations, cities, islands, and archipelagos with precise coordinates

-- Update existing countries with better coordinates (major airports)
UPDATE countries SET
  latitude = 40.7128, longitude = -74.0060 WHERE code = 'US'; -- NYC area
UPDATE countries SET
  latitude = 43.6532, longitude = -79.3832 WHERE code = 'CA'; -- Toronto area
UPDATE countries SET
  latitude = 51.5074, longitude = -0.1278 WHERE code = 'GB';  -- London
UPDATE countries SET
  latitude = 48.8566, longitude = 2.3522 WHERE code = 'FR';   -- Paris
UPDATE countries SET
  latitude = 52.5200, longitude = 13.4050 WHERE code = 'DE';  -- Berlin
UPDATE countries SET
  latitude = 41.9028, longitude = 12.4964 WHERE code = 'IT';  -- Rome
UPDATE countries SET
  latitude = 40.4168, longitude = -3.7038 WHERE code = 'ES';  -- Madrid
UPDATE countries SET
  latitude = 35.6762, longitude = 139.6503 WHERE code = 'JP'; -- Tokyo
UPDATE countries SET
  latitude = -33.8688, longitude = 151.2093 WHERE code = 'AU'; -- Sydney
UPDATE countries SET
  latitude = -23.5505, longitude = -46.6333 WHERE code = 'BR'; -- São Paulo

-- Insert comprehensive cities data
INSERT INTO cities (country_id, name, latitude, longitude, airport_code, timezone, population, city_type, is_major_destination) VALUES

-- United States (Major Cities)
((SELECT id FROM countries WHERE code = 'US'), 'New York City', 40.7128, -74.0060, 'JFK', 'America/New_York', 8336817, 'city', true),
((SELECT id FROM countries WHERE code = 'US'), 'Los Angeles', 34.0522, -118.2437, 'LAX', 'America/Los_Angeles', 3979576, 'city', true),
((SELECT id FROM countries WHERE code = 'US'), 'Chicago', 41.8781, -87.6298, 'ORD', 'America/Chicago', 2693976, 'city', true),
((SELECT id FROM countries WHERE code = 'US'), 'Houston', 29.7604, -95.3698, 'IAH', 'America/Chicago', 2320268, 'city', true),
((SELECT id FROM countries WHERE code = 'US'), 'San Francisco', 37.7749, -122.4194, 'SFO', 'America/Los_Angeles', 873965, 'city', true),
((SELECT id FROM countries WHERE code = 'US'), 'Las Vegas', 36.1699, -115.1398, 'LAS', 'America/Los_Angeles', 641903, 'city', true),
((SELECT id FROM countries WHERE code = 'US'), 'Miami', 25.7617, -80.1918, 'MIA', 'America/New_York', 470914, 'city', true),
((SELECT id FROM countries WHERE code = 'US'), 'Seattle', 47.6062, -122.3321, 'SEA', 'America/Los_Angeles', 753675, 'city', true),

-- Canada
((SELECT id FROM countries WHERE code = 'CA'), 'Toronto', 43.6532, -79.3832, 'YYZ', 'America/Toronto', 2731571, 'city', true),
((SELECT id FROM countries WHERE code = 'CA'), 'Vancouver', 49.2827, -123.1207, 'YVR', 'America/Vancouver', 675218, 'city', true),
((SELECT id FROM countries WHERE code = 'CA'), 'Montreal', 45.5017, -73.5673, 'YUL', 'America/Montreal', 1780000, 'city', true),

-- United Kingdom
((SELECT id FROM countries WHERE code = 'GB'), 'London', 51.5074, -0.1278, 'LHR', 'Europe/London', 9000000, 'capital', true),
((SELECT id FROM countries WHERE code = 'GB'), 'Edinburgh', 55.9533, -3.1883, 'EDI', 'Europe/London', 548000, 'city', true),
((SELECT id FROM countries WHERE code = 'GB'), 'Manchester', 53.4808, -2.2426, 'MAN', 'Europe/London', 547000, 'city', true),

-- France
((SELECT id FROM countries WHERE code = 'FR'), 'Paris', 48.8566, 2.3522, 'CDG', 'Europe/Paris', 2140000, 'capital', true),
((SELECT id FROM countries WHERE code = 'FR'), 'Nice', 43.7102, 7.2620, 'NCE', 'Europe/Paris', 343000, 'city', true),
((SELECT id FROM countries WHERE code = 'FR'), 'Lyon', 45.7640, 4.8357, 'LYS', 'Europe/Paris', 515000, 'city', true),

-- Germany
((SELECT id FROM countries WHERE code = 'DE'), 'Berlin', 52.5200, 13.4050, 'BER', 'Europe/Berlin', 3669000, 'capital', true),
((SELECT id FROM countries WHERE code = 'DE'), 'Munich', 48.1351, 11.5820, 'MUC', 'Europe/Berlin', 1472000, 'city', true),
((SELECT id FROM countries WHERE code = 'DE'), 'Frankfurt', 50.1109, 8.6821, 'FRA', 'Europe/Berlin', 748000, 'city', true),

-- Italy
((SELECT id FROM countries WHERE code = 'IT'), 'Rome', 41.9028, 12.4964, 'FCO', 'Europe/Rome', 2873000, 'capital', true),
((SELECT id FROM countries WHERE code = 'IT'), 'Milan', 45.4642, 9.1900, 'MXP', 'Europe/Rome', 1396000, 'city', true),
((SELECT id FROM countries WHERE code = 'IT'), 'Venice', 45.4408, 12.3155, 'VCE', 'Europe/Rome', 261000, 'city', true),
((SELECT id FROM countries WHERE code = 'IT'), 'Florence', 43.7696, 11.2558, 'FLR', 'Europe/Rome', 383000, 'city', true),

-- Spain
((SELECT id FROM countries WHERE code = 'ES'), 'Madrid', 40.4168, -3.7038, 'MAD', 'Europe/Madrid', 3223000, 'capital', true),
((SELECT id FROM countries WHERE code = 'ES'), 'Barcelona', 41.3851, 2.1734, 'BCN', 'Europe/Madrid', 1620000, 'city', true),
((SELECT id FROM countries WHERE code = 'ES'), 'Seville', 37.3891, -5.9845, 'SVQ', 'Europe/Madrid', 688000, 'city', true),

-- Japan
((SELECT id FROM countries WHERE code = 'JP'), 'Tokyo', 35.6762, 139.6503, 'NRT', 'Asia/Tokyo', 37400000, 'capital', true),
((SELECT id FROM countries WHERE code = 'JP'), 'Osaka', 34.6937, 135.5023, 'KIX', 'Asia/Tokyo', 19281000, 'city', true),
((SELECT id FROM countries WHERE code = 'JP'), 'Kyoto', 35.0116, 135.7681, 'ITM', 'Asia/Tokyo', 1475000, 'city', true),
((SELECT id FROM countries WHERE code = 'JP'), 'Hiroshima', 34.3853, 132.4553, 'HIJ', 'Asia/Tokyo', 1194000, 'city', true),

-- Australia
((SELECT id FROM countries WHERE code = 'AU'), 'Sydney', -33.8688, 151.2093, 'SYD', 'Australia/Sydney', 5312000, 'city', true),
((SELECT id FROM countries WHERE code = 'AU'), 'Melbourne', -37.8136, 144.9631, 'MEL', 'Australia/Melbourne', 5078000, 'city', true),
((SELECT id FROM countries WHERE code = 'AU'), 'Perth', -31.9505, 115.8605, 'PER', 'Australia/Perth', 2059000, 'city', true),

-- Brazil
((SELECT id FROM countries WHERE code = 'BR'), 'São Paulo', -23.5505, -46.6333, 'GRU', 'America/Sao_Paulo', 12300000, 'city', true),
((SELECT id FROM countries WHERE code = 'BR'), 'Rio de Janeiro', -22.9068, -43.1729, 'GIG', 'America/Sao_Paulo', 6748000, 'city', true),
((SELECT id FROM countries WHERE code = 'BR'), 'Brasília', -15.8267, -47.9218, 'BSB', 'America/Sao_Paulo', 3015000, 'capital', true);

-- Add more countries and their major cities
INSERT INTO countries (code, name, latitude, longitude) VALUES
('CN', 'China', 39.9042, 116.4074),
('IN', 'India', 28.7041, 77.1025),
('RU', 'Russia', 55.7558, 37.6176),
('MX', 'Mexico', 19.4326, -99.1332),
('TH', 'Thailand', 13.7563, 100.5018),
('SG', 'Singapore', 1.3521, 103.8198),
('AE', 'United Arab Emirates', 25.2048, 55.2708),
('EG', 'Egypt', 30.0444, 31.2357),
('ZA', 'South Africa', -33.9249, 18.4241),
('AR', 'Argentina', -34.6037, -58.3816),
('TR', 'Turkey', 41.0082, 28.9784),
('GR', 'Greece', 37.9838, 23.7275),
('NL', 'Netherlands', 52.3676, 4.9041),
('BE', 'Belgium', 50.8503, 4.3517),
('CH', 'Switzerland', 46.9481, 7.4474),
('AT', 'Austria', 48.2082, 16.3738),
('NO', 'Norway', 59.9139, 10.7522),
('SE', 'Sweden', 59.3293, 18.0686),
('DK', 'Denmark', 55.6761, 12.5683),
('FI', 'Finland', 60.1699, 24.9384),
('IS', 'Iceland', 64.1466, -21.9426),
('IE', 'Ireland', 53.3498, -6.2603),
('PT', 'Portugal', 38.7223, -9.1393),
('PL', 'Poland', 52.2297, 21.0122),
('CZ', 'Czech Republic', 50.0755, 14.4378),
('HU', 'Hungary', 47.4979, 19.0402),
('RO', 'Romania', 44.4268, 26.1025),
('BG', 'Bulgaria', 42.6977, 23.3219),
('HR', 'Croatia', 45.8150, 15.9819),
('RS', 'Serbia', 44.7866, 20.4489),
('UA', 'Ukraine', 50.4501, 30.5234),
('IL', 'Israel', 32.0853, 34.7818),
('JO', 'Jordan', 31.9454, 35.9284),
('LB', 'Lebanon', 33.8938, 35.5018),
('MA', 'Morocco', 33.9716, -6.8498),
('KE', 'Kenya', -1.2921, 36.8219),
('TZ', 'Tanzania', -6.7924, 39.2083),
('GH', 'Ghana', 5.6037, -0.1870),
('NG', 'Nigeria', 9.0765, 7.3986),
('KR', 'South Korea', 37.5665, 126.9780),
('MY', 'Malaysia', 3.1390, 101.6869),
('ID', 'Indonesia', -6.2088, 106.8456),
('PH', 'Philippines', 14.5995, 120.9842),
('VN', 'Vietnam', 21.0285, 105.8542),
('NZ', 'New Zealand', -36.8485, 174.7633),
('CL', 'Chile', -33.4489, -70.6693),
('PE', 'Peru', -12.0464, -77.0428),
('CO', 'Colombia', 4.7110, -74.0721),
('EC', 'Ecuador', -0.1807, -78.4678),
('CR', 'Costa Rica', 9.9281, -84.0907),
('PA', 'Panama', 8.9824, -79.5199),
('JM', 'Jamaica', 18.1096, -77.2975),
('CU', 'Cuba', 23.1136, -82.3666),
('DO', 'Dominican Republic', 18.4861, -69.9312);

-- Major Asian Cities
INSERT INTO cities (country_id, name, latitude, longitude, airport_code, timezone, population, city_type, is_major_destination) VALUES
((SELECT id FROM countries WHERE code = 'CN'), 'Beijing', 39.9042, 116.4074, 'PEK', 'Asia/Shanghai', 21540000, 'capital', true),
((SELECT id FROM countries WHERE code = 'CN'), 'Shanghai', 31.2304, 121.4737, 'PVG', 'Asia/Shanghai', 24280000, 'city', true),
((SELECT id FROM countries WHERE code = 'CN'), 'Hong Kong', 22.3193, 114.1694, 'HKG', 'Asia/Hong_Kong', 7500000, 'city', true),
((SELECT id FROM countries WHERE code = 'IN'), 'Mumbai', 19.0760, 72.8777, 'BOM', 'Asia/Kolkata', 20400000, 'city', true),
((SELECT id FROM countries WHERE code = 'IN'), 'Delhi', 28.7041, 77.1025, 'DEL', 'Asia/Kolkata', 28500000, 'capital', true),
((SELECT id FROM countries WHERE code = 'IN'), 'Bangalore', 12.9716, 77.5946, 'BLR', 'Asia/Kolkata', 8440000, 'city', true),
((SELECT id FROM countries WHERE code = 'RU'), 'Moscow', 55.7558, 37.6176, 'SVO', 'Europe/Moscow', 11920000, 'capital', true),
((SELECT id FROM countries WHERE code = 'RU'), 'St. Petersburg', 59.9311, 30.3609, 'LED', 'Europe/Moscow', 5380000, 'city', true),
((SELECT id FROM countries WHERE code = 'TH'), 'Bangkok', 13.7563, 100.5018, 'BKK', 'Asia/Bangkok', 10539000, 'capital', true),
((SELECT id FROM countries WHERE code = 'SG'), 'Singapore', 1.3521, 103.8198, 'SIN', 'Asia/Singapore', 5850000, 'city', true),
((SELECT id FROM countries WHERE code = 'AE'), 'Dubai', 25.2048, 55.2708, 'DXB', 'Asia/Dubai', 3400000, 'city', true),
((SELECT id FROM countries WHERE code = 'AE'), 'Abu Dhabi', 24.4539, 54.3773, 'AUH', 'Asia/Dubai', 1450000, 'capital', true),
((SELECT id FROM countries WHERE code = 'KR'), 'Seoul', 37.5665, 126.9780, 'ICN', 'Asia/Seoul', 9700000, 'capital', true),
((SELECT id FROM countries WHERE code = 'MY'), 'Kuala Lumpur', 3.1390, 101.6869, 'KUL', 'Asia/Kuala_Lumpur', 1800000, 'capital', true),
((SELECT id FROM countries WHERE code = 'ID'), 'Jakarta', -6.2088, 106.8456, 'CGK', 'Asia/Jakarta', 10560000, 'capital', true),
((SELECT id FROM countries WHERE code = 'PH'), 'Manila', 14.5995, 120.9842, 'MNL', 'Asia/Manila', 1780000, 'capital', true),
((SELECT id FROM countries WHERE code = 'VN'), 'Ho Chi Minh City', 10.8231, 106.6297, 'SGN', 'Asia/Ho_Chi_Minh', 9000000, 'city', true),

-- European Cities
((SELECT id FROM countries WHERE code = 'NL'), 'Amsterdam', 52.3676, 4.9041, 'AMS', 'Europe/Amsterdam', 870000, 'capital', true),
((SELECT id FROM countries WHERE code = 'BE'), 'Brussels', 50.8503, 4.3517, 'BRU', 'Europe/Brussels', 1200000, 'capital', true),
((SELECT id FROM countries WHERE code = 'CH'), 'Zurich', 47.3769, 8.5417, 'ZUR', 'Europe/Zurich', 400000, 'city', true),
((SELECT id FROM countries WHERE code = 'AT'), 'Vienna', 48.2082, 16.3738, 'VIE', 'Europe/Vienna', 1900000, 'capital', true),
((SELECT id FROM countries WHERE code = 'NO'), 'Oslo', 59.9139, 10.7522, 'OSL', 'Europe/Oslo', 680000, 'capital', true),
((SELECT id FROM countries WHERE code = 'SE'), 'Stockholm', 59.3293, 18.0686, 'ARN', 'Europe/Stockholm', 975000, 'capital', true),
((SELECT id FROM countries WHERE code = 'DK'), 'Copenhagen', 55.6761, 12.5683, 'CPH', 'Europe/Copenhagen', 630000, 'capital', true),
((SELECT id FROM countries WHERE code = 'FI'), 'Helsinki', 60.1699, 24.9384, 'HEL', 'Europe/Helsinki', 650000, 'capital', true),
((SELECT id FROM countries WHERE code = 'IS'), 'Reykjavik', 64.1466, -21.9426, 'KEF', 'Atlantic/Reykjavik', 130000, 'capital', true),
((SELECT id FROM countries WHERE code = 'IE'), 'Dublin', 53.3498, -6.2603, 'DUB', 'Europe/Dublin', 550000, 'capital', true),
((SELECT id FROM countries WHERE code = 'PT'), 'Lisbon', 38.7223, -9.1393, 'LIS', 'Europe/Lisbon', 550000, 'capital', true),
((SELECT id FROM countries WHERE code = 'GR'), 'Athens', 37.9838, 23.7275, 'ATH', 'Europe/Athens', 3150000, 'capital', true),
((SELECT id FROM countries WHERE code = 'TR'), 'Istanbul', 41.0082, 28.9784, 'IST', 'Europe/Istanbul', 15460000, 'city', true),
((SELECT id FROM countries WHERE code = 'TR'), 'Ankara', 39.9334, 32.8597, 'ESB', 'Europe/Istanbul', 5663000, 'capital', true),

-- Middle East & Africa
((SELECT id FROM countries WHERE code = 'EG'), 'Cairo', 30.0444, 31.2357, 'CAI', 'Africa/Cairo', 20900000, 'capital', true),
((SELECT id FROM countries WHERE code = 'ZA'), 'Cape Town', -33.9249, 18.4241, 'CPT', 'Africa/Johannesburg', 4620000, 'city', true),
((SELECT id FROM countries WHERE code = 'ZA'), 'Johannesburg', -26.2041, 28.0473, 'JNB', 'Africa/Johannesburg', 5635000, 'city', true),
((SELECT id FROM countries WHERE code = 'IL'), 'Tel Aviv', 32.0853, 34.7818, 'TLV', 'Asia/Jerusalem', 460000, 'city', true),
((SELECT id FROM countries WHERE code = 'JO'), 'Amman', 31.9454, 35.9284, 'AMM', 'Asia/Amman', 4000000, 'capital', true),
((SELECT id FROM countries WHERE code = 'MA'), 'Marrakech', 31.6295, -7.9811, 'RAK', 'Africa/Casablanca', 930000, 'city', true),
((SELECT id FROM countries WHERE code = 'MA'), 'Casablanca', 33.5731, -7.5898, 'CMN', 'Africa/Casablanca', 3360000, 'city', true),

-- Pacific Islands (Special Handling)
((SELECT id FROM countries WHERE code = 'US'), 'Honolulu', 21.3099, -157.8581, 'HNL', 'Pacific/Honolulu', 350000, 'island', true),
((SELECT id FROM countries WHERE code = 'US'), 'Maui', 20.7984, -156.3319, 'OGG', 'Pacific/Honolulu', 165000, 'island', true),

-- Central/South America
((SELECT id FROM countries WHERE code = 'MX'), 'Mexico City', 19.4326, -99.1332, 'MEX', 'America/Mexico_City', 21580000, 'capital', true),
((SELECT id FROM countries WHERE code = 'MX'), 'Cancun', 21.1619, -86.8515, 'CUN', 'America/Cancun', 890000, 'city', true),
((SELECT id FROM countries WHERE code = 'AR'), 'Buenos Aires', -34.6037, -58.3816, 'EZE', 'America/Argentina/Buenos_Aires', 15000000, 'capital', true),
((SELECT id FROM countries WHERE code = 'CL'), 'Santiago', -33.4489, -70.6693, 'SCL', 'America/Santiago', 6680000, 'capital', true),
((SELECT id FROM countries WHERE code = 'PE'), 'Lima', -12.0464, -77.0428, 'LIM', 'America/Lima', 10750000, 'capital', true),
((SELECT id FROM countries WHERE code = 'CO'), 'Bogotá', 4.7110, -74.0721, 'BOG', 'America/Bogota', 7413000, 'capital', true),

-- Oceania
((SELECT id FROM countries WHERE code = 'NZ'), 'Auckland', -36.8485, 174.7633, 'AKL', 'Pacific/Auckland', 1700000, 'city', true),
((SELECT id FROM countries WHERE code = 'NZ'), 'Wellington', -41.2865, 174.7762, 'WLG', 'Pacific/Auckland', 420000, 'capital', true);

-- Create view for easy flight animation queries
CREATE OR REPLACE VIEW travel_animation_data AS
SELECT
  tl.user_id,
  tl.year,
  tl.sequence_order,
  tl.visit_date,
  COALESCE(c.name, ct.name) as location_name,
  COALESCE(c.city_type, 'country') as location_type,
  tl.latitude,
  tl.longitude,
  tl.album_count,
  tl.photo_count,
  ct.name as country_name,
  c.airport_code,
  c.timezone
FROM travel_timeline tl
LEFT JOIN cities c ON tl.city_id = c.id
LEFT JOIN countries ct ON tl.country_id = ct.id
ORDER BY tl.user_id, tl.year, tl.sequence_order;