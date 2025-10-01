-- =============================================================================
-- SCHEMA SYNCHRONIZATION - Align with Actual Production Database
-- =============================================================================
-- This migration aligns the database with the actual schema visualizer output
-- Run this AFTER the previous migrations to ensure consistency
-- =============================================================================

-- Part 1: Fix Albums Table
-- =============================================================================

-- Add missing status column (already exists in actual DB)
ALTER TABLE albums ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published'
  CHECK (status = ANY (ARRAY['draft'::text, 'published'::text]));

-- Add location_display column (from our previous migration)
ALTER TABLE albums ADD COLUMN IF NOT EXISTS location_display VARCHAR(255);

-- Update albums constraints to match actual schema
ALTER TABLE albums DROP CONSTRAINT IF EXISTS albums_date_order;
-- No date order constraint in actual schema

-- Part 2: Fix Photos Table
-- =============================================================================

-- Add missing columns that exist in actual schema
ALTER TABLE photos ADD COLUMN IF NOT EXISTS file_size INTEGER CHECK (file_size IS NULL OR file_size > 0);
ALTER TABLE photos ADD COLUMN IF NOT EXISTS width INTEGER;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS height INTEGER;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS country VARCHAR(255);
ALTER TABLE photos ADD COLUMN IF NOT EXISTS city VARCHAR(255);
ALTER TABLE photos ADD COLUMN IF NOT EXISTS city_id INTEGER REFERENCES cities(id);
ALTER TABLE photos ADD COLUMN IF NOT EXISTS island_id INTEGER REFERENCES islands(id);
ALTER TABLE photos ADD COLUMN IF NOT EXISTS processing_status VARCHAR(50) DEFAULT 'completed'
  CHECK (processing_status IN ('processing', 'completed', 'error'));

-- Update order_index to have default
ALTER TABLE photos ALTER COLUMN order_index SET DEFAULT 0;

-- Part 3: Fix Comments Table
-- =============================================================================

-- Rename 'text' to 'content' if exists, or add content
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'comments' AND column_name = 'text') THEN
    ALTER TABLE comments RENAME COLUMN text TO content;
  END IF;
END $$;

-- Add content column if doesn't exist
ALTER TABLE comments ADD COLUMN IF NOT EXISTS content TEXT
  CHECK (length(content) >= 1 AND length(content) <= 2000);

-- Ensure comments have proper foreign keys (non-polymorphic)
ALTER TABLE comments ADD COLUMN IF NOT EXISTS album_id UUID REFERENCES albums(id) ON DELETE CASCADE;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS photo_id UUID REFERENCES photos(id) ON DELETE CASCADE;

-- Part 4: Fix Likes Table
-- =============================================================================

-- Ensure likes have proper foreign keys (non-polymorphic)
ALTER TABLE likes ADD COLUMN IF NOT EXISTS album_id UUID REFERENCES albums(id) ON DELETE CASCADE;
ALTER TABLE likes ADD COLUMN IF NOT EXISTS photo_id UUID REFERENCES photos(id) ON DELETE CASCADE;

-- Part 5: Handle Users vs Profiles Duplication
-- =============================================================================

-- The actual schema has BOTH 'users' and 'profiles' tables
-- 'profiles' references auth.users and is the main user table
-- 'users' also references auth.users (redundant)

-- Add 'name' column to profiles (from users table)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS name VARCHAR(100);

-- Sync data from users to profiles if users table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    -- Copy data from users to profiles where missing
    UPDATE profiles p
    SET
      name = COALESCE(p.name, u.name),
      bio = COALESCE(p.bio, u.bio),
      avatar_url = COALESCE(p.avatar_url, u.avatar_url)
    FROM users u
    WHERE p.id = u.id;
  END IF;
END $$;

-- Part 6: Handle Followers vs Follows Duplication
-- =============================================================================

-- The actual schema has BOTH 'followers' and 'follows' tables
-- 'followers' has status (pending/accepted/rejected)
-- 'follows' has status (pending/approved)

-- Ensure followers table has correct status values
ALTER TABLE followers DROP CONSTRAINT IF EXISTS followers_status_check;
ALTER TABLE followers ADD CONSTRAINT followers_status_check
  CHECK (status IN ('pending', 'accepted', 'rejected'));

-- If follows table exists, migrate data to followers
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'follows') THEN
    -- Migrate data from follows to followers
    INSERT INTO followers (follower_id, following_id, status, created_at)
    SELECT
      follower_id,
      following_id,
      CASE
        WHEN status = 'approved' THEN 'accepted'
        ELSE status
      END,
      created_at
    FROM follows
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Part 7: Fix User Levels Table
-- =============================================================================

-- The actual schema has: current_xp, current_level
-- Our migration has: total_experience, current_level, albums_created, etc.

-- Add columns from actual schema
ALTER TABLE user_levels ADD COLUMN IF NOT EXISTS current_xp INTEGER DEFAULT 0;

-- Create mapping for backward compatibility
UPDATE user_levels
SET current_xp = COALESCE(total_experience, 0)
WHERE current_xp = 0 AND total_experience IS NOT NULL;

-- Part 8: Fix Favorites Table
-- =============================================================================

-- Favorites uses target_id (varchar) and target_type instead of specific FKs
ALTER TABLE favorites ADD COLUMN IF NOT EXISTS target_id VARCHAR(255);
ALTER TABLE favorites ADD COLUMN IF NOT EXISTS target_type VARCHAR(50)
  CHECK (target_type IN ('photo', 'album', 'location'));
ALTER TABLE favorites ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Part 9: Add Missing Wishlist Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS wishlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  location_name TEXT NOT NULL,
  location_country TEXT,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  notes TEXT,
  priority INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Part 10: Add Missing Stories Table Fields
-- =============================================================================

-- Ensure stories table matches actual schema
ALTER TABLE stories ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'photo'
  CHECK (media_type IN ('photo', 'video'));
ALTER TABLE stories ADD COLUMN IF NOT EXISTS caption TEXT;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS posted_at TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE stories ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Set default expiry (24 hours from posted_at)
UPDATE stories
SET expires_at = posted_at + INTERVAL '24 hours'
WHERE expires_at IS NULL AND posted_at IS NOT NULL;

-- Part 11: Ensure RLS is enabled on all tables
-- =============================================================================

ALTER TABLE albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_travel_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

-- Part 12: Create/Update Essential Indexes
-- =============================================================================

-- Albums indexes
CREATE INDEX IF NOT EXISTS idx_albums_user_id ON albums(user_id);
CREATE INDEX IF NOT EXISTS idx_albums_status ON albums(status);
CREATE INDEX IF NOT EXISTS idx_albums_country_code ON albums(country_code);
CREATE INDEX IF NOT EXISTS idx_albums_created_at ON albums(created_at);

-- Photos indexes
CREATE INDEX IF NOT EXISTS idx_photos_album_id ON photos(album_id);
CREATE INDEX IF NOT EXISTS idx_photos_user_id ON photos(user_id);
CREATE INDEX IF NOT EXISTS idx_photos_order_index ON photos(order_index);
CREATE INDEX IF NOT EXISTS idx_photos_created_at ON photos(created_at);

-- Comments indexes
CREATE INDEX IF NOT EXISTS idx_comments_album_id ON comments(album_id);
CREATE INDEX IF NOT EXISTS idx_comments_photo_id ON comments(photo_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);

-- Likes indexes
CREATE INDEX IF NOT EXISTS idx_likes_album_id ON likes(album_id);
CREATE INDEX IF NOT EXISTS idx_likes_photo_id ON likes(photo_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);

-- Followers indexes
CREATE INDEX IF NOT EXISTS idx_followers_follower_id ON followers(follower_id);
CREATE INDEX IF NOT EXISTS idx_followers_following_id ON followers(following_id);
CREATE INDEX IF NOT EXISTS idx_followers_status ON followers(status);

-- Stories indexes
CREATE INDEX IF NOT EXISTS idx_stories_user_id ON stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON stories(expires_at);

-- Part 13: Update Triggers
-- =============================================================================

-- Ensure updated_at triggers exist for all tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT table_name
    FROM information_schema.columns
    WHERE column_name = 'updated_at'
    AND table_schema = 'public'
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS update_%I_updated_at ON %I;
      CREATE TRIGGER update_%I_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    ', t, t, t, t);
  END LOOP;
END $$;

-- Part 14: Grant Permissions
-- =============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON albums TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON photos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON comments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON likes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON followers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON favorites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_travel_stats TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON wishlist TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON stories TO authenticated;

-- Part 15: Success Message
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Schema synchronization completed successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Updated tables:';
  RAISE NOTICE '- albums: Added status, location_display';
  RAISE NOTICE '- photos: Added file_size, dimensions, processing_status';
  RAISE NOTICE '- comments: Using album_id/photo_id (non-polymorphic)';
  RAISE NOTICE '- likes: Using album_id/photo_id (non-polymorphic)';
  RAISE NOTICE '- profiles: Added name column';
  RAISE NOTICE '- user_levels: Added current_xp';
  RAISE NOTICE '- wishlist: Created table';
  RAISE NOTICE '- stories: Added all fields';
  RAISE NOTICE '';
  RAISE NOTICE 'All indexes and triggers updated!';
END $$;
