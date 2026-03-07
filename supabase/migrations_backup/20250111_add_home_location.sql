-- Add home location fields to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS home_city TEXT,
ADD COLUMN IF NOT EXISTS home_country TEXT,
ADD COLUMN IF NOT EXISTS home_latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS home_longitude DOUBLE PRECISION;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_home_location
ON users(home_latitude, home_longitude)
WHERE home_latitude IS NOT NULL AND home_longitude IS NOT NULL;

-- Add comment
COMMENT ON COLUMN users.home_city IS 'User''s home city for distance calculation';
COMMENT ON COLUMN users.home_country IS 'User''s home country';
COMMENT ON COLUMN users.home_latitude IS 'Latitude of user''s home location';
COMMENT ON COLUMN users.home_longitude IS 'Longitude of user''s home location';
