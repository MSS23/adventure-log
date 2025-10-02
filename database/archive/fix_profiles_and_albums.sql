-- =============================================================================
-- FIX: Profile and Album Issues
-- =============================================================================
-- This migration fixes:
-- 1. Profile update issue - adds 'name' column for backward compatibility
-- 2. Album location display - ensures proper location data
-- =============================================================================

-- Fix 1: Add 'name' column to profiles for backward compatibility
-- The app code updates both 'name' and 'display_name', but only 'display_name' exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS name VARCHAR(100);

-- Sync existing display_name to name column
UPDATE profiles SET name = display_name WHERE name IS NULL AND display_name IS NOT NULL;

-- Create trigger to keep name and display_name in sync
DROP FUNCTION IF EXISTS sync_profile_name();

CREATE FUNCTION sync_profile_name()
RETURNS TRIGGER AS $$
BEGIN
  -- When display_name is updated, sync to name
  IF NEW.display_name IS NOT NULL AND NEW.display_name != OLD.display_name THEN
    NEW.name = NEW.display_name;
  END IF;

  -- When name is updated, sync to display_name
  IF NEW.name IS NOT NULL AND NEW.name != OLD.name THEN
    NEW.display_name = NEW.name;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_profile_name_trigger ON profiles;
CREATE TRIGGER sync_profile_name_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_profile_name();

-- Fix 2: Update albums to ensure location_name is properly populated
-- Add helper column for location display
ALTER TABLE albums ADD COLUMN IF NOT EXISTS location_display VARCHAR(255);

-- Update existing albums to populate location_display from various sources
UPDATE albums a
SET location_display = COALESCE(
  a.location_name,
  (SELECT c.name FROM cities c WHERE c.id = a.city_id),
  (SELECT i.name FROM islands i WHERE i.id = a.island_id),
  (SELECT co.name FROM countries co WHERE co.id = a.country_id),
  (SELECT co.name FROM countries co WHERE co.code = a.country_code)
)
WHERE location_display IS NULL;

-- Create trigger to auto-populate location_display when album is created/updated
DROP FUNCTION IF EXISTS set_album_location_display();

CREATE FUNCTION set_album_location_display()
RETURNS TRIGGER AS $$
BEGIN
  -- If location_name is provided, use it
  IF NEW.location_name IS NOT NULL AND NEW.location_name != '' THEN
    NEW.location_display = NEW.location_name;
  -- Otherwise try to derive from city
  ELSIF NEW.city_id IS NOT NULL THEN
    SELECT name INTO NEW.location_display FROM cities WHERE id = NEW.city_id;
  -- Or from island
  ELSIF NEW.island_id IS NOT NULL THEN
    SELECT name INTO NEW.location_display FROM islands WHERE id = NEW.island_id;
  -- Or from country_id
  ELSIF NEW.country_id IS NOT NULL THEN
    SELECT name INTO NEW.location_display FROM countries WHERE id = NEW.country_id;
  -- Or from country_code
  ELSIF NEW.country_code IS NOT NULL THEN
    SELECT name INTO NEW.location_display FROM countries WHERE code = NEW.country_code;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_album_location_display_trigger ON albums;
CREATE TRIGGER set_album_location_display_trigger
  BEFORE INSERT OR UPDATE ON albums
  FOR EACH ROW
  EXECUTE FUNCTION set_album_location_display();

-- Fix 3: Add website and location fields to profiles if missing
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location VARCHAR(100);

-- Update constraints
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_website_format;
ALTER TABLE profiles ADD CONSTRAINT profiles_website_format
  CHECK (website IS NULL OR website ~ '^https?://');

-- Fix 4: Ensure albums have proper visibility values
-- The schema allows 'private', 'friends', 'followers', 'public'
-- But the app might be using 'public', 'private', 'friends' only
UPDATE albums
SET visibility = 'public'
WHERE visibility NOT IN ('private', 'friends', 'followers', 'public');

-- Fix 5: Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_albums_location_display ON albums(location_display);
CREATE INDEX IF NOT EXISTS idx_albums_country_code ON albums(country_code);
CREATE INDEX IF NOT EXISTS idx_albums_city_id ON albums(city_id);
CREATE INDEX IF NOT EXISTS idx_profiles_name ON profiles(name);
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON profiles(display_name);

-- Fix 6: Update the get_user_travel_locations view/function to use location_display
DROP VIEW IF EXISTS user_travel_locations CASCADE;
CREATE OR REPLACE VIEW user_travel_locations AS
SELECT
  a.user_id,
  a.id as album_id,
  a.title as album_title,
  COALESCE(a.location_display, a.location_name, 'Unknown Location') as location_name,
  a.country_code,
  a.latitude,
  a.longitude,
  a.start_date,
  a.end_date,
  a.created_at,
  COALESCE(c.name, co.name) as city_or_country_name,
  co.name as country_name,
  COUNT(p.id) as photo_count
FROM albums a
LEFT JOIN cities c ON a.city_id = c.id
LEFT JOIN countries co ON a.country_code = co.code OR a.country_id = co.id
LEFT JOIN photos p ON p.album_id = a.id
WHERE a.latitude IS NOT NULL
  AND a.longitude IS NOT NULL
GROUP BY
  a.user_id, a.id, a.title, a.location_display, a.location_name,
  a.country_code, a.latitude, a.longitude, a.start_date, a.end_date,
  a.created_at, c.name, co.name;

-- Grant permissions
GRANT SELECT ON user_travel_locations TO authenticated;

-- Fix 7: Create helper function to get album location
DROP FUNCTION IF EXISTS get_album_location(UUID);

CREATE FUNCTION get_album_location(album_id UUID)
RETURNS TEXT AS $$
DECLARE
  location_text TEXT;
BEGIN
  SELECT COALESCE(
    location_display,
    location_name,
    (SELECT name FROM cities WHERE id = albums.city_id),
    (SELECT name FROM islands WHERE id = albums.island_id),
    (SELECT name FROM countries WHERE code = albums.country_code),
    'Unknown Location'
  ) INTO location_text
  FROM albums
  WHERE id = album_id;

  RETURN location_text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix 8: Update profiles trigger to handle new user creation properly
DROP FUNCTION IF EXISTS handle_new_user();

CREATE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_username TEXT;
  username_counter INTEGER := 0;
  final_username TEXT;
BEGIN
  -- Generate username from email or metadata
  default_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1)
  );

  -- Clean username (remove special chars, limit length)
  default_username := lower(regexp_replace(default_username, '[^a-zA-Z0-9_]', '', 'g'));
  default_username := substring(default_username from 1 for 20);

  -- Ensure username is unique
  final_username := default_username;
  WHILE EXISTS (SELECT 1 FROM profiles WHERE username = final_username) LOOP
    username_counter := username_counter + 1;
    final_username := default_username || username_counter::TEXT;
  END LOOP;

  -- Insert profile
  INSERT INTO public.profiles (
    id,
    username,
    display_name,
    name,
    privacy_level,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    final_username,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'New User'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'New User'),
    'public',
    NOW(),
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Fix 9: Add RLS policy for profiles to allow users to update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  USING (
    auth.uid() = id OR
    privacy_level = 'public' OR
    (privacy_level = 'friends' AND EXISTS (
      SELECT 1 FROM followers
      WHERE follower_id = auth.uid()
      AND following_id = profiles.id
      AND status = 'accepted'
    ))
  );

-- Fix 10: Ensure all existing users have both name and display_name
UPDATE profiles
SET
  name = COALESCE(name, display_name, username),
  display_name = COALESCE(display_name, name, username)
WHERE name IS NULL OR display_name IS NULL;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Fixed issues:';
  RAISE NOTICE '1. ✅ Added name column to profiles';
  RAISE NOTICE '2. ✅ Added location_display to albums';
  RAISE NOTICE '3. ✅ Created sync triggers for profile names';
  RAISE NOTICE '4. ✅ Created auto-populate trigger for album locations';
  RAISE NOTICE '5. ✅ Updated RLS policies';
  RAISE NOTICE '6. ✅ Added missing profile fields (website, location)';
  RAISE NOTICE '7. ✅ Created helper functions';
  RAISE NOTICE '8. ✅ Improved new user creation';
END $$;
