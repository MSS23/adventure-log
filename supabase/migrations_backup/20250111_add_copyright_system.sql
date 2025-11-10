-- Migration: Add Copyright & Attribution System
-- Created: 2025-01-11
-- Description: Adds copyright holder, license type, and photographer credits

-- Add copyright fields to albums table
ALTER TABLE albums
ADD COLUMN IF NOT EXISTS copyright_holder text,
ADD COLUMN IF NOT EXISTS license_type text DEFAULT 'all-rights-reserved'
  CHECK (license_type IN ('all-rights-reserved', 'cc-by', 'cc-by-sa', 'cc-by-nd', 'cc-by-nc', 'cc-by-nc-sa', 'cc-by-nc-nd', 'cc0', 'public-domain')),
ADD COLUMN IF NOT EXISTS license_url text;

-- Add photographer credit to photos table
ALTER TABLE photos
ADD COLUMN IF NOT EXISTS photographer_credit text,
ADD COLUMN IF NOT EXISTS copyright_holder text,
ADD COLUMN IF NOT EXISTS license_type text
  CHECK (license_type IN ('all-rights-reserved', 'cc-by', 'cc-by-sa', 'cc-by-nd', 'cc-by-nc', 'cc-by-nc-sa', 'cc-by-nc-nd', 'cc0', 'public-domain'));

-- Create index for license queries
CREATE INDEX IF NOT EXISTS idx_albums_license_type ON albums(license_type);
CREATE INDEX IF NOT EXISTS idx_photos_license_type ON photos(license_type);

-- Add comments for documentation
COMMENT ON COLUMN albums.copyright_holder IS 'Name of the copyright holder (e.g., photographer or user)';
COMMENT ON COLUMN albums.license_type IS 'Type of license: all-rights-reserved, Creative Commons variants, or public domain';
COMMENT ON COLUMN albums.license_url IS 'Full URL to license details (e.g., Creative Commons license page)';
COMMENT ON COLUMN photos.photographer_credit IS 'Name of the photographer to display as credit';
COMMENT ON COLUMN photos.copyright_holder IS 'Copyright holder for individual photos (if different from album)';
COMMENT ON COLUMN photos.license_type IS 'License for individual photos (if different from album)';
