-- Adventure Log: Enhanced Travel Animation Schema
-- Advanced flight animation and city-level travel visualization

-- Enhanced cities table with comprehensive data
ALTER TABLE cities ADD COLUMN IF NOT EXISTS
  airport_code VARCHAR(3),
  timezone VARCHAR(50),
  population INTEGER,
  city_type VARCHAR(20) DEFAULT 'city' CHECK (city_type IN ('city', 'island', 'archipelago', 'capital')),
  is_major_destination BOOLEAN DEFAULT false;

-- Travel timeline for chronological flight animations
CREATE TABLE IF NOT EXISTS travel_timeline (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  year INTEGER NOT NULL,
  sequence_order INTEGER NOT NULL,
  location_type VARCHAR(20) DEFAULT 'city' CHECK (location_type IN ('city', 'country', 'island')),
  city_id INTEGER REFERENCES cities(id),
  country_id INTEGER REFERENCES countries(id),
  visit_date DATE,
  album_count INTEGER DEFAULT 0,
  photo_count INTEGER DEFAULT 0,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Flight paths for caching calculated routes
CREATE TABLE IF NOT EXISTS flight_paths (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  from_city_id INTEGER REFERENCES cities(id),
  to_city_id INTEGER REFERENCES cities(id),
  from_lat DECIMAL(10, 8) NOT NULL,
  from_lng DECIMAL(11, 8) NOT NULL,
  to_lat DECIMAL(10, 8) NOT NULL,
  to_lng DECIMAL(11, 8) NOT NULL,
  distance_km DECIMAL(10, 2),
  flight_duration_hours DECIMAL(5, 2),
  path_segments JSONB, -- Great circle calculation points
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Travel statistics for performance
CREATE TABLE IF NOT EXISTS travel_statistics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  year INTEGER NOT NULL,
  total_distance_km DECIMAL(10, 2) DEFAULT 0,
  total_flight_hours DECIMAL(8, 2) DEFAULT 0,
  countries_visited INTEGER DEFAULT 0,
  cities_visited INTEGER DEFAULT 0,
  total_albums INTEGER DEFAULT 0,
  total_photos INTEGER DEFAULT 0,
  first_trip_date DATE,
  last_trip_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, year)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_travel_timeline_user_year ON travel_timeline(user_id, year);
CREATE INDEX IF NOT EXISTS idx_travel_timeline_sequence ON travel_timeline(user_id, year, sequence_order);
CREATE INDEX IF NOT EXISTS idx_flight_paths_cities ON flight_paths(from_city_id, to_city_id);
CREATE INDEX IF NOT EXISTS idx_cities_major ON cities(is_major_destination, city_type);
CREATE INDEX IF NOT EXISTS idx_travel_stats_user_year ON travel_statistics(user_id, year);

-- RLS Policies
ALTER TABLE travel_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_statistics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own travel timeline" ON travel_timeline
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own travel timeline" ON travel_timeline
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own travel statistics" ON travel_statistics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own travel statistics" ON travel_statistics
  FOR ALL USING (auth.uid() = user_id);

-- Flight paths are public for performance (shared calculations)
CREATE POLICY "Flight paths are viewable by everyone" ON flight_paths
  FOR SELECT USING (true);

-- Function to calculate great circle distance
CREATE OR REPLACE FUNCTION calculate_distance(
  lat1 DECIMAL(10, 8),
  lng1 DECIMAL(11, 8),
  lat2 DECIMAL(10, 8),
  lng2 DECIMAL(11, 8)
) RETURNS DECIMAL(10, 2) AS $$
DECLARE
  earth_radius CONSTANT DECIMAL := 6371.0; -- Earth's radius in km
  lat1_rad DECIMAL;
  lng1_rad DECIMAL;
  lat2_rad DECIMAL;
  lng2_rad DECIMAL;
  dlat DECIMAL;
  dlng DECIMAL;
  a DECIMAL;
  c DECIMAL;
BEGIN
  lat1_rad := lat1 * PI() / 180.0;
  lng1_rad := lng1 * PI() / 180.0;
  lat2_rad := lat2 * PI() / 180.0;
  lng2_rad := lng2 * PI() / 180.0;

  dlat := lat2_rad - lat1_rad;
  dlng := lng2_rad - lng1_rad;

  a := SIN(dlat/2.0) * SIN(dlat/2.0) + COS(lat1_rad) * COS(lat2_rad) * SIN(dlng/2.0) * SIN(dlng/2.0);
  c := 2.0 * ATAN2(SQRT(a), SQRT(1.0-a));

  RETURN earth_radius * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to generate travel timeline from albums
CREATE OR REPLACE FUNCTION generate_travel_timeline(user_id_param UUID)
RETURNS VOID AS $$
DECLARE
  album_record RECORD;
  sequence_counter INTEGER;
  current_year INTEGER;
BEGIN
  -- Clear existing timeline for user
  DELETE FROM travel_timeline WHERE user_id = user_id_param;

  -- Generate timeline from albums with city data
  current_year := 0;
  sequence_counter := 1;

  FOR album_record IN
    SELECT DISTINCT
      EXTRACT(YEAR FROM COALESCE(start_date, created_at))::INTEGER as year,
      city_id,
      country_id,
      COALESCE(start_date, created_at) as visit_date,
      c.latitude,
      c.longitude,
      COUNT(*) as album_count,
      SUM(photo_count) as total_photos
    FROM albums a
    LEFT JOIN cities c ON a.city_id = c.id
    LEFT JOIN (
      SELECT album_id, COUNT(*) as photo_count
      FROM photos
      GROUP BY album_id
    ) p ON a.id = p.album_id
    WHERE a.user_id = user_id_param
      AND (a.city_id IS NOT NULL OR a.country_id IS NOT NULL)
    GROUP BY
      EXTRACT(YEAR FROM COALESCE(start_date, created_at)),
      city_id, country_id, COALESCE(start_date, created_at),
      c.latitude, c.longitude
    ORDER BY year, visit_date
  LOOP
    -- Reset sequence for new year
    IF album_record.year != current_year THEN
      current_year := album_record.year;
      sequence_counter := 1;
    END IF;

    INSERT INTO travel_timeline (
      user_id, year, sequence_order, location_type,
      city_id, country_id, visit_date,
      album_count, photo_count,
      latitude, longitude
    ) VALUES (
      user_id_param, album_record.year, sequence_counter,
      CASE WHEN album_record.city_id IS NOT NULL THEN 'city' ELSE 'country' END,
      album_record.city_id, album_record.country_id, album_record.visit_date,
      album_record.album_count, COALESCE(album_record.total_photos, 0),
      album_record.latitude, album_record.longitude
    );

    sequence_counter := sequence_counter + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate travel statistics
CREATE OR REPLACE FUNCTION calculate_travel_statistics(user_id_param UUID, year_param INTEGER)
RETURNS VOID AS $$
DECLARE
  stats_record RECORD;
  total_distance DECIMAL(10, 2) := 0;
  total_hours DECIMAL(8, 2) := 0;
  prev_lat DECIMAL(10, 8);
  prev_lng DECIMAL(11, 8);
  current_record RECORD;
  segment_distance DECIMAL(10, 2);
BEGIN
  -- Calculate total distance and flight time for the year
  FOR current_record IN
    SELECT latitude, longitude, sequence_order
    FROM travel_timeline
    WHERE user_id = user_id_param AND year = year_param
    ORDER BY sequence_order
  LOOP
    IF prev_lat IS NOT NULL AND prev_lng IS NOT NULL THEN
      segment_distance := calculate_distance(prev_lat, prev_lng, current_record.latitude, current_record.longitude);
      total_distance := total_distance + segment_distance;
      -- Estimate flight time (average 800 km/h commercial flight speed)
      total_hours := total_hours + (segment_distance / 800.0);
    END IF;

    prev_lat := current_record.latitude;
    prev_lng := current_record.longitude;
  END LOOP;

  -- Get aggregated statistics
  SELECT
    COUNT(DISTINCT country_id) as countries,
    COUNT(DISTINCT city_id) as cities,
    SUM(album_count) as albums,
    SUM(photo_count) as photos,
    MIN(visit_date) as first_trip,
    MAX(visit_date) as last_trip
  INTO stats_record
  FROM travel_timeline
  WHERE user_id = user_id_param AND year = year_param;

  -- Insert or update statistics
  INSERT INTO travel_statistics (
    user_id, year, total_distance_km, total_flight_hours,
    countries_visited, cities_visited, total_albums, total_photos,
    first_trip_date, last_trip_date
  ) VALUES (
    user_id_param, year_param, total_distance, total_hours,
    COALESCE(stats_record.countries, 0), COALESCE(stats_record.cities, 0),
    COALESCE(stats_record.albums, 0), COALESCE(stats_record.photos, 0),
    stats_record.first_trip, stats_record.last_trip
  ) ON CONFLICT (user_id, year) DO UPDATE SET
    total_distance_km = EXCLUDED.total_distance_km,
    total_flight_hours = EXCLUDED.total_flight_hours,
    countries_visited = EXCLUDED.countries_visited,
    cities_visited = EXCLUDED.cities_visited,
    total_albums = EXCLUDED.total_albums,
    total_photos = EXCLUDED.total_photos,
    first_trip_date = EXCLUDED.first_trip_date,
    last_trip_date = EXCLUDED.last_trip_date,
    updated_at = timezone('utc'::text, now());
END;
$$ LANGUAGE plpgsql;