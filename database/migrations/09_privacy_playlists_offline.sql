-- Migration: Privacy Features, Playlists, and Offline Support
-- This adds per-pin privacy controls, collections/playlists, and offline queue support

-- =============================================================================
-- PRIVACY FEATURES: Per-pin location privacy and delayed posting
-- =============================================================================

-- Add privacy fields to albums
ALTER TABLE albums ADD COLUMN IF NOT EXISTS hide_exact_location BOOLEAN DEFAULT false;
ALTER TABLE albums ADD COLUMN IF NOT EXISTS location_precision VARCHAR(20) DEFAULT 'exact' 
  CHECK (location_precision IN ('exact', 'neighbourhood', 'city', 'country', 'hidden'));
ALTER TABLE albums ADD COLUMN IF NOT EXISTS publish_delay_hours INTEGER DEFAULT 0;
ALTER TABLE albums ADD COLUMN IF NOT EXISTS scheduled_publish_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE albums ADD COLUMN IF NOT EXISTS is_delayed_publish BOOLEAN DEFAULT false;

-- Add privacy fields to photos
ALTER TABLE photos ADD COLUMN IF NOT EXISTS hide_exact_location BOOLEAN DEFAULT false;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS location_precision VARCHAR(20) DEFAULT 'exact'
  CHECK (location_precision IN ('exact', 'neighbourhood', 'city', 'country', 'hidden'));

-- Add indexes for privacy queries
CREATE INDEX IF NOT EXISTS idx_albums_scheduled_publish ON albums(scheduled_publish_at) 
  WHERE scheduled_publish_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_albums_privacy_settings ON albums(hide_exact_location, location_precision);

-- =============================================================================
-- COLLECTIONS & PLAYLISTS: Curated collections of albums and locations
-- =============================================================================

-- Playlists table (Globe Playlists like "Best Coffee in Lisbon")
CREATE TABLE IF NOT EXISTS playlists (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  
  -- Playlist metadata
  playlist_type VARCHAR(20) DEFAULT 'curated' CHECK (playlist_type IN ('curated', 'smart', 'travel_route', 'theme')),
  category VARCHAR(50), -- e.g., 'food', 'nature', 'architecture', 'adventure'
  tags TEXT[],
  
  -- Visibility and sharing
  visibility VARCHAR(20) DEFAULT 'public' CHECK (visibility IN ('private', 'friends', 'followers', 'public')),
  is_collaborative BOOLEAN DEFAULT false,
  allow_subscriptions BOOLEAN DEFAULT true,
  
  -- Stats
  item_count INTEGER DEFAULT 0,
  subscriber_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  CONSTRAINT playlists_title_length CHECK (length(title) >= 1 AND length(title) <= 200)
);

-- Playlist items (albums or custom locations)
CREATE TABLE IF NOT EXISTS playlist_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE NOT NULL,
  
  -- Reference to album or custom location
  album_id UUID REFERENCES albums(id) ON DELETE CASCADE,
  
  -- Custom location (for places not yet visited)
  custom_location_name VARCHAR(200),
  custom_latitude DECIMAL(10, 8),
  custom_longitude DECIMAL(11, 8),
  custom_notes TEXT,
  
  -- Item metadata
  order_index INTEGER DEFAULT 0,
  added_by_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Ensure either album_id OR custom location is set
  CONSTRAINT playlist_items_content CHECK (
    (album_id IS NOT NULL AND custom_location_name IS NULL) OR
    (album_id IS NULL AND custom_location_name IS NOT NULL)
  ),
  CONSTRAINT playlist_items_custom_coords CHECK (
    (custom_latitude IS NULL AND custom_longitude IS NULL) OR
    (custom_latitude IS NOT NULL AND custom_longitude IS NOT NULL AND
     custom_latitude BETWEEN -90 AND 90 AND custom_longitude BETWEEN -180 AND 180)
  )
);

-- Playlist subscriptions (follow/subscribe to others' playlists)
CREATE TABLE IF NOT EXISTS playlist_subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  is_favorited BOOLEAN DEFAULT false,
  notification_enabled BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  UNIQUE(playlist_id, user_id)
);

-- Playlist collaborators (for collaborative playlists)
CREATE TABLE IF NOT EXISTS playlist_collaborators (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role VARCHAR(20) DEFAULT 'contributor' CHECK (role IN ('owner', 'editor', 'contributor', 'viewer')),
  can_add_items BOOLEAN DEFAULT true,
  can_remove_items BOOLEAN DEFAULT false,
  can_invite_others BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  UNIQUE(playlist_id, user_id)
);

-- =============================================================================
-- OFFLINE SUPPORT: Queued uploads and sync management
-- =============================================================================

-- Upload queue for offline support
CREATE TABLE IF NOT EXISTS upload_queue (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Upload metadata
  resource_type VARCHAR(20) NOT NULL CHECK (resource_type IN ('album', 'photo', 'story', 'comment', 'like')),
  local_id VARCHAR(100), -- Client-generated ID for tracking
  
  -- Upload payload (JSON)
  payload JSONB NOT NULL,
  
  -- Files to upload
  files_to_upload JSONB, -- Array of file paths and metadata
  
  -- Status tracking
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'uploading', 'completed', 'failed', 'cancelled')),
  upload_started_at TIMESTAMP WITH TIME ZONE,
  upload_completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  -- Resulting IDs after successful upload
  remote_album_id UUID,
  remote_photo_ids UUID[],
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Offline basemap tiles cache metadata
CREATE TABLE IF NOT EXISTS offline_map_packs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Pack metadata
  pack_name VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- Geographic bounds
  min_latitude DECIMAL(10, 8) NOT NULL,
  max_latitude DECIMAL(10, 8) NOT NULL,
  min_longitude DECIMAL(11, 8) NOT NULL,
  max_longitude DECIMAL(11, 8) NOT NULL,
  
  -- Zoom levels included
  min_zoom INTEGER DEFAULT 0,
  max_zoom INTEGER DEFAULT 12,
  
  -- Pack status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'downloading', 'ready', 'expired', 'error')),
  download_progress DECIMAL(5, 2) DEFAULT 0, -- Percentage
  
  -- Storage info
  estimated_size_mb DECIMAL(10, 2),
  actual_size_mb DECIMAL(10, 2),
  tile_count INTEGER,
  
  -- Expiry
  expires_at TIMESTAMP WITH TIME ZONE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  CONSTRAINT offline_map_packs_bounds CHECK (
    min_latitude BETWEEN -90 AND 90 AND
    max_latitude BETWEEN -90 AND 90 AND
    min_longitude BETWEEN -180 AND 180 AND
    max_longitude BETWEEN -180 AND 180 AND
    min_latitude < max_latitude AND
    min_longitude < max_longitude
  )
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Playlist indexes
CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_playlists_visibility ON playlists(visibility);
CREATE INDEX IF NOT EXISTS idx_playlists_category ON playlists(category);
CREATE INDEX IF NOT EXISTS idx_playlists_created_at ON playlists(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_playlist_items_playlist_id ON playlist_items(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_items_album_id ON playlist_items(album_id);
CREATE INDEX IF NOT EXISTS idx_playlist_items_order ON playlist_items(playlist_id, order_index);

CREATE INDEX IF NOT EXISTS idx_playlist_subscriptions_user_id ON playlist_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_playlist_subscriptions_playlist_id ON playlist_subscriptions(playlist_id);

CREATE INDEX IF NOT EXISTS idx_playlist_collaborators_playlist_id ON playlist_collaborators(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_collaborators_user_id ON playlist_collaborators(user_id);

-- Upload queue indexes
CREATE INDEX IF NOT EXISTS idx_upload_queue_user_id ON upload_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_upload_queue_status ON upload_queue(status);
CREATE INDEX IF NOT EXISTS idx_upload_queue_created_at ON upload_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_upload_queue_local_id ON upload_queue(local_id);

-- Offline map packs indexes
CREATE INDEX IF NOT EXISTS idx_offline_map_packs_user_id ON offline_map_packs(user_id);
CREATE INDEX IF NOT EXISTS idx_offline_map_packs_status ON offline_map_packs(status);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE offline_map_packs ENABLE ROW LEVEL SECURITY;

-- Playlist policies
CREATE POLICY "Public playlists viewable by everyone" ON playlists
  FOR SELECT USING (visibility = 'public');

CREATE POLICY "Users can view their own playlists" ON playlists
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view playlists they collaborate on" ON playlists
  FOR SELECT USING (
    id IN (
      SELECT playlist_id FROM playlist_collaborators 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view playlists they subscribe to" ON playlists
  FOR SELECT USING (
    id IN (
      SELECT playlist_id FROM playlist_subscriptions 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own playlists" ON playlists
  FOR ALL USING (auth.uid() = user_id);

-- Playlist items policies
CREATE POLICY "Playlist items viewable based on playlist visibility" ON playlist_items
  FOR SELECT USING (
    playlist_id IN (
      SELECT id FROM playlists WHERE (
        visibility = 'public'
        OR user_id = auth.uid()
        OR id IN (SELECT playlist_id FROM playlist_collaborators WHERE user_id = auth.uid())
        OR id IN (SELECT playlist_id FROM playlist_subscriptions WHERE user_id = auth.uid())
      )
    )
  );

CREATE POLICY "Users can add items to playlists they own or collaborate on" ON playlist_items
  FOR INSERT WITH CHECK (
    playlist_id IN (
      SELECT id FROM playlists WHERE user_id = auth.uid()
    )
    OR playlist_id IN (
      SELECT playlist_id FROM playlist_collaborators 
      WHERE user_id = auth.uid() AND can_add_items = true
    )
  );

CREATE POLICY "Users can update items in playlists they own or collaborate on" ON playlist_items
  FOR UPDATE USING (
    playlist_id IN (
      SELECT id FROM playlists WHERE user_id = auth.uid()
    )
    OR playlist_id IN (
      SELECT playlist_id FROM playlist_collaborators 
      WHERE user_id = auth.uid() AND (can_add_items = true OR can_remove_items = true)
    )
  );

CREATE POLICY "Users can delete items from playlists they own or collaborate on" ON playlist_items
  FOR DELETE USING (
    playlist_id IN (
      SELECT id FROM playlists WHERE user_id = auth.uid()
    )
    OR playlist_id IN (
      SELECT playlist_id FROM playlist_collaborators 
      WHERE user_id = auth.uid() AND can_remove_items = true
    )
  );

-- Playlist subscription policies
CREATE POLICY "Users can view their own subscriptions" ON playlist_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Playlist owners can view subscribers" ON playlist_subscriptions
  FOR SELECT USING (
    playlist_id IN (SELECT id FROM playlists WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can manage their own subscriptions" ON playlist_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- Playlist collaborator policies
CREATE POLICY "Users can view collaborators of playlists they're involved in" ON playlist_collaborators
  FOR SELECT USING (
    auth.uid() = user_id 
    OR playlist_id IN (SELECT id FROM playlists WHERE user_id = auth.uid())
    OR playlist_id IN (SELECT playlist_id FROM playlist_collaborators WHERE user_id = auth.uid())
  );

CREATE POLICY "Playlist owners can manage collaborators" ON playlist_collaborators
  FOR ALL USING (
    playlist_id IN (SELECT id FROM playlists WHERE user_id = auth.uid())
  );

CREATE POLICY "Collaborators with invite permission can add others" ON playlist_collaborators
  FOR INSERT WITH CHECK (
    playlist_id IN (
      SELECT playlist_id FROM playlist_collaborators 
      WHERE user_id = auth.uid() AND can_invite_others = true
    )
  );

-- Upload queue policies
CREATE POLICY "Users can view their own upload queue" ON upload_queue
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own upload queue" ON upload_queue
  FOR ALL USING (auth.uid() = user_id);

-- Offline map packs policies
CREATE POLICY "Users can view their own map packs" ON offline_map_packs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own map packs" ON offline_map_packs
  FOR ALL USING (auth.uid() = user_id);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Update timestamps
CREATE TRIGGER update_playlists_updated_at
  BEFORE UPDATE ON playlists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_upload_queue_updated_at
  BEFORE UPDATE ON upload_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_offline_map_packs_updated_at
  BEFORE UPDATE ON offline_map_packs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update playlist item count
CREATE OR REPLACE FUNCTION update_playlist_item_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE playlists 
    SET item_count = item_count + 1,
        updated_at = timezone('utc'::text, now())
    WHERE id = NEW.playlist_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE playlists 
    SET item_count = GREATEST(0, item_count - 1),
        updated_at = timezone('utc'::text, now())
    WHERE id = OLD.playlist_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_playlist_item_count_trigger
  AFTER INSERT OR DELETE ON playlist_items
  FOR EACH ROW EXECUTE FUNCTION update_playlist_item_count();

-- Update playlist subscriber count
CREATE OR REPLACE FUNCTION update_playlist_subscriber_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE playlists 
    SET subscriber_count = subscriber_count + 1,
        updated_at = timezone('utc'::text, now())
    WHERE id = NEW.playlist_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE playlists 
    SET subscriber_count = GREATEST(0, subscriber_count - 1),
        updated_at = timezone('utc'::text, now())
    WHERE id = OLD.playlist_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_playlist_subscriber_count_trigger
  AFTER INSERT OR DELETE ON playlist_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_playlist_subscriber_count();

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to get user's playlists with stats
CREATE OR REPLACE FUNCTION get_user_playlists(user_id_param UUID)
RETURNS TABLE (
  playlist_id UUID,
  title TEXT,
  description TEXT,
  cover_image_url TEXT,
  playlist_type TEXT,
  category TEXT,
  visibility TEXT,
  item_count INTEGER,
  subscriber_count INTEGER,
  is_owner BOOLEAN,
  is_collaborator BOOLEAN,
  is_subscribed BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as playlist_id,
    p.title::TEXT,
    p.description::TEXT,
    p.cover_image_url::TEXT,
    p.playlist_type::TEXT,
    p.category::TEXT,
    p.visibility::TEXT,
    p.item_count,
    p.subscriber_count,
    (p.user_id = user_id_param) as is_owner,
    EXISTS(SELECT 1 FROM playlist_collaborators WHERE playlist_id = p.id AND user_id = user_id_param) as is_collaborator,
    EXISTS(SELECT 1 FROM playlist_subscriptions WHERE playlist_id = p.id AND user_id = user_id_param) as is_subscribed,
    p.created_at
  FROM playlists p
  WHERE p.user_id = user_id_param
    OR p.id IN (SELECT playlist_id FROM playlist_collaborators WHERE user_id = user_id_param)
    OR p.id IN (SELECT playlist_id FROM playlist_subscriptions WHERE user_id = user_id_param)
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get pending uploads for user
CREATE OR REPLACE FUNCTION get_pending_uploads(user_id_param UUID)
RETURNS TABLE (
  upload_id UUID,
  resource_type TEXT,
  local_id TEXT,
  payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  retry_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    id as upload_id,
    uq.resource_type::TEXT,
    uq.local_id::TEXT,
    uq.payload,
    uq.created_at,
    uq.retry_count
  FROM upload_queue uq
  WHERE uq.user_id = user_id_param
    AND uq.status IN ('pending', 'failed')
    AND uq.retry_count < uq.max_retries
  ORDER BY uq.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get obscured location based on privacy settings
CREATE OR REPLACE FUNCTION get_safe_location(
  exact_lat DECIMAL,
  exact_lng DECIMAL,
  precision_level VARCHAR,
  city_name VARCHAR DEFAULT NULL,
  country_code VARCHAR DEFAULT NULL
)
RETURNS TABLE (
  display_lat DECIMAL,
  display_lng DECIMAL,
  display_name TEXT
) AS $$
BEGIN
  CASE precision_level
    WHEN 'exact' THEN
      RETURN QUERY SELECT exact_lat, exact_lng, NULL::TEXT;
    WHEN 'neighbourhood' THEN
      -- Round to ~1km precision (2 decimal places)
      RETURN QUERY SELECT 
        ROUND(exact_lat::numeric, 2)::DECIMAL,
        ROUND(exact_lng::numeric, 2)::DECIMAL,
        COALESCE(city_name, 'Unknown location')::TEXT;
    WHEN 'city' THEN
      -- Round to ~10km precision (1 decimal place)
      RETURN QUERY SELECT 
        ROUND(exact_lat::numeric, 1)::DECIMAL,
        ROUND(exact_lng::numeric, 1)::DECIMAL,
        COALESCE(city_name, 'Unknown city')::TEXT;
    WHEN 'country' THEN
      -- Return country center or very rough location
      RETURN QUERY SELECT 
        ROUND(exact_lat::numeric, 0)::DECIMAL,
        ROUND(exact_lng::numeric, 0)::DECIMAL,
        COALESCE(country_code, 'Unknown country')::TEXT;
    WHEN 'hidden' THEN
      RETURN QUERY SELECT NULL::DECIMAL, NULL::DECIMAL, 'Location hidden'::TEXT;
    ELSE
      RETURN QUERY SELECT exact_lat, exact_lng, NULL::TEXT;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Privacy, Playlists, and Offline Support migration completed!';
  RAISE NOTICE '🔒 Added per-pin privacy controls (location hiding, delayed posting)';
  RAISE NOTICE '🎵 Added Collections & Playlists system with sharing and subscriptions';
  RAISE NOTICE '📦 Added offline support with upload queue and map packs';
  RAISE NOTICE '✨ Database ready for new features!';
END
$$;

