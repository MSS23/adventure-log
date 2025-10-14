-- Migration: Globe Reactions - Interactive stickers and pins on the globe
-- This adds the ability for friends to drop reactions/stickers on your globe locations

-- =============================================================================
-- GLOBE REACTIONS: Interactive stickers/pins from friends
-- =============================================================================

-- Globe reactions table (stickers/pins friends can drop on your globe)
CREATE TABLE IF NOT EXISTS globe_reactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

  -- Who reacted
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Target location/album
  target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('album', 'location', 'globe_point')),
  target_album_id UUID REFERENCES albums(id) ON DELETE CASCADE,
  target_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL, -- Whose globe is being reacted to

  -- Reaction details
  reaction_type VARCHAR(50) NOT NULL, -- e.g., 'i_was_here', 'add_this_spot', 'try_this_dish', 'must_see', 'love', 'wow', 'laugh', 'bookmark', 'question'
  sticker_emoji VARCHAR(10), -- Emoji representation (e.g., '📍', '🍕', '⭐', '❤️', '👀', '💭')

  -- Location data (for globe_point type or general pins)
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  location_name VARCHAR(200),
  country_code VARCHAR(2),

  -- Optional message/note
  message TEXT,

  -- Metadata
  is_read BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT true, -- If false, only visible to target_user

  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Constraints
  CONSTRAINT globe_reactions_coords CHECK (
    (latitude IS NULL AND longitude IS NULL) OR
    (latitude IS NOT NULL AND longitude IS NOT NULL AND
     latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
  ),

  -- Ensure either album_id OR location coords are provided
  CONSTRAINT globe_reactions_target CHECK (
    (target_album_id IS NOT NULL) OR
    (latitude IS NOT NULL AND longitude IS NOT NULL)
  )
);

-- Reaction templates/types (predefined reaction types)
CREATE TABLE IF NOT EXISTS globe_reaction_types (
  id VARCHAR(50) PRIMARY KEY,
  label VARCHAR(100) NOT NULL,
  emoji VARCHAR(10) NOT NULL,
  description TEXT,
  category VARCHAR(20) CHECK (category IN ('suggestion', 'memory', 'emotion', 'action')),
  color VARCHAR(7), -- Hex color for UI (e.g., '#FF5733')
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default reaction types
INSERT INTO globe_reaction_types (id, label, emoji, description, category, color, sort_order) VALUES
  ('i_was_here', 'I was here!', '📍', 'Mark a place you''ve also visited', 'memory', '#3B82F6', 1),
  ('add_this_spot', 'Add this spot', '⭐', 'Suggest a place to visit', 'suggestion', '#F59E0B', 2),
  ('try_this_dish', 'Try this dish', '🍕', 'Food recommendation', 'suggestion', '#EF4444', 3),
  ('must_see', 'Must see!', '👀', 'Highly recommend visiting', 'suggestion', '#8B5CF6', 4),
  ('love', 'Love this', '❤️', 'Show appreciation', 'emotion', '#EC4899', 5),
  ('wow', 'Wow!', '🤩', 'Impressed by the place', 'emotion', '#F97316', 6),
  ('bookmark', 'Bookmark', '🔖', 'Save for later', 'action', '#10B981', 7),
  ('question', 'Tell me more', '💭', 'Ask for details', 'action', '#6366F1', 8),
  ('laughing', 'Laughing', '😂', 'Found it funny/amusing', 'emotion', '#FCD34D', 9),
  ('adventure', 'Adventure!', '🎒', 'Adventure spot', 'suggestion', '#059669', 10),
  ('nature', 'Nature spot', '🌿', 'Beautiful natural location', 'suggestion', '#10B981', 11),
  ('photo_spot', 'Photo spot', '📸', 'Great place for photos', 'suggestion', '#A855F7', 12),
  ('hidden_gem', 'Hidden gem', '💎', 'Underrated place', 'suggestion', '#14B8A6', 13),
  ('budget_friendly', 'Budget friendly', '💰', 'Affordable option', 'suggestion', '#84CC16', 14),
  ('romantic', 'Romantic', '💕', 'Perfect for couples', 'suggestion', '#F472B6', 15)
ON CONFLICT (id) DO NOTHING;

-- Notification preferences for globe reactions
CREATE TABLE IF NOT EXISTS globe_reaction_settings (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,

  -- Notification settings
  notify_on_reaction BOOLEAN DEFAULT true,
  notify_on_suggestion BOOLEAN DEFAULT true,
  notify_on_message BOOLEAN DEFAULT true,

  -- Privacy settings
  allow_reactions_from VARCHAR(20) DEFAULT 'friends' CHECK (allow_reactions_from IN ('everyone', 'followers', 'friends', 'nobody')),
  auto_approve_suggestions BOOLEAN DEFAULT true,

  -- Display settings
  show_reactions_on_globe BOOLEAN DEFAULT true,
  show_reaction_count BOOLEAN DEFAULT true,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_globe_reactions_user_id ON globe_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_globe_reactions_target_user_id ON globe_reactions(target_user_id);
CREATE INDEX IF NOT EXISTS idx_globe_reactions_target_album_id ON globe_reactions(target_album_id);
CREATE INDEX IF NOT EXISTS idx_globe_reactions_type ON globe_reactions(reaction_type);
CREATE INDEX IF NOT EXISTS idx_globe_reactions_created_at ON globe_reactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_globe_reactions_location ON globe_reactions(latitude, longitude) WHERE latitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_globe_reactions_unread ON globe_reactions(target_user_id, is_read) WHERE is_read = false;

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_globe_reactions_target_visibility
  ON globe_reactions(target_user_id, is_public, created_at DESC);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

ALTER TABLE globe_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE globe_reaction_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE globe_reaction_settings ENABLE ROW LEVEL SECURITY;

-- Globe reactions policies
CREATE POLICY "Users can view public reactions on their globe" ON globe_reactions
  FOR SELECT USING (
    (target_user_id = auth.uid() OR is_public = true)
    OR user_id = auth.uid()
  );

CREATE POLICY "Users can view reactions on albums they can see" ON globe_reactions
  FOR SELECT USING (
    target_album_id IN (
      SELECT id FROM albums WHERE
        user_id = auth.uid()
        OR visibility = 'public'
        OR (visibility = 'friends' AND user_id IN (
          SELECT following_id FROM follows WHERE follower_id = auth.uid() AND status = 'approved'
        ))
    )
  );

CREATE POLICY "Users can create reactions (with permission check)" ON globe_reactions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND (
      -- Check if target user allows reactions from this user
      target_user_id IN (
        SELECT user_id FROM globe_reaction_settings
        WHERE allow_reactions_from = 'everyone'
      )
      OR target_user_id IN (
        SELECT user_id FROM globe_reaction_settings
        WHERE allow_reactions_from = 'followers'
        AND user_id IN (
          SELECT following_id FROM follows WHERE follower_id = auth.uid() AND status = 'approved'
        )
      )
      OR target_user_id IN (
        SELECT user_id FROM globe_reaction_settings
        WHERE allow_reactions_from = 'friends'
        AND user_id IN (
          SELECT following_id FROM follows WHERE follower_id = auth.uid() AND status = 'approved'
          INTERSECT
          SELECT follower_id FROM follows WHERE following_id = auth.uid() AND status = 'approved'
        )
      )
      OR target_user_id = auth.uid() -- Can always react to own content
    )
  );

CREATE POLICY "Users can update their own reactions" ON globe_reactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions" ON globe_reactions
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Target users can mark reactions as read" ON globe_reactions
  FOR UPDATE USING (auth.uid() = target_user_id)
  WITH CHECK (auth.uid() = target_user_id);

-- Reaction types are publicly viewable
CREATE POLICY "Anyone can view reaction types" ON globe_reaction_types
  FOR SELECT USING (is_active = true);

-- Reaction settings policies
CREATE POLICY "Users can view their own reaction settings" ON globe_reaction_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own reaction settings" ON globe_reaction_settings
  FOR ALL USING (auth.uid() = user_id);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Update timestamps
CREATE TRIGGER update_globe_reactions_updated_at
  BEFORE UPDATE ON globe_reactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_globe_reaction_settings_updated_at
  BEFORE UPDATE ON globe_reaction_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create default reaction settings for new users
CREATE OR REPLACE FUNCTION create_default_reaction_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO globe_reaction_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER create_user_reaction_settings
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION create_default_reaction_settings();

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Get reactions for a specific user's globe
CREATE OR REPLACE FUNCTION get_globe_reactions(
  target_user_id_param UUID,
  requesting_user_id_param UUID DEFAULT NULL,
  limit_param INTEGER DEFAULT 50
)
RETURNS TABLE (
  reaction_id UUID,
  user_id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  reaction_type TEXT,
  sticker_emoji TEXT,
  reaction_label TEXT,
  reaction_color TEXT,
  target_album_id UUID,
  album_title TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  location_name TEXT,
  message TEXT,
  is_read BOOLEAN,
  is_public BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    gr.id as reaction_id,
    gr.user_id,
    p.username::TEXT,
    p.display_name::TEXT,
    p.avatar_url::TEXT,
    gr.reaction_type::TEXT,
    gr.sticker_emoji::TEXT,
    grt.label::TEXT as reaction_label,
    grt.color::TEXT as reaction_color,
    gr.target_album_id,
    a.title::TEXT as album_title,
    gr.latitude,
    gr.longitude,
    gr.location_name::TEXT,
    gr.message::TEXT,
    gr.is_read,
    gr.is_public,
    gr.created_at
  FROM globe_reactions gr
  LEFT JOIN profiles p ON gr.user_id = p.id
  LEFT JOIN globe_reaction_types grt ON gr.reaction_type = grt.id
  LEFT JOIN albums a ON gr.target_album_id = a.id
  WHERE gr.target_user_id = target_user_id_param
    AND (
      gr.is_public = true
      OR gr.target_user_id = requesting_user_id_param
      OR gr.user_id = requesting_user_id_param
    )
  ORDER BY gr.created_at DESC
  LIMIT limit_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get unread reaction count
CREATE OR REPLACE FUNCTION get_unread_reaction_count(user_id_param UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM globe_reactions
  WHERE target_user_id = user_id_param
    AND is_read = false;
$$ LANGUAGE sql SECURITY DEFINER;

-- Mark reactions as read
CREATE OR REPLACE FUNCTION mark_reactions_as_read(
  user_id_param UUID,
  reaction_ids UUID[] DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  IF reaction_ids IS NULL THEN
    -- Mark all unread reactions as read
    UPDATE globe_reactions
    SET is_read = true, updated_at = timezone('utc'::text, now())
    WHERE target_user_id = user_id_param AND is_read = false;
  ELSE
    -- Mark specific reactions as read
    UPDATE globe_reactions
    SET is_read = true, updated_at = timezone('utc'::text, now())
    WHERE id = ANY(reaction_ids)
      AND target_user_id = user_id_param
      AND is_read = false;
  END IF;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get reaction statistics for a user
CREATE OR REPLACE FUNCTION get_reaction_stats(user_id_param UUID)
RETURNS TABLE (
  total_reactions_received INTEGER,
  total_reactions_given INTEGER,
  unread_count INTEGER,
  top_reaction_type TEXT,
  top_reaction_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INTEGER FROM globe_reactions WHERE target_user_id = user_id_param) as total_reactions_received,
    (SELECT COUNT(*)::INTEGER FROM globe_reactions WHERE user_id = user_id_param) as total_reactions_given,
    (SELECT get_unread_reaction_count(user_id_param)) as unread_count,
    (
      SELECT reaction_type::TEXT
      FROM globe_reactions
      WHERE target_user_id = user_id_param
      GROUP BY reaction_type
      ORDER BY COUNT(*) DESC
      LIMIT 1
    ) as top_reaction_type,
    (
      SELECT COUNT(*)::INTEGER
      FROM globe_reactions
      WHERE target_user_id = user_id_param
        AND reaction_type = (
          SELECT reaction_type
          FROM globe_reactions
          WHERE target_user_id = user_id_param
          GROUP BY reaction_type
          ORDER BY COUNT(*) DESC
          LIMIT 1
        )
    ) as top_reaction_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- GRANTS
-- =============================================================================

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Globe Reactions migration completed!';
  RAISE NOTICE '✨ Users can now drop stickers/reactions on friends'' globes';
  RAISE NOTICE '📍 15 default reaction types added (I was here!, Add this spot, etc.)';
  RAISE NOTICE '🔔 Notification preferences system ready';
  RAISE NOTICE '🔒 RLS policies enforce permission-based reactions';
  RAISE NOTICE '🚀 Helper functions for easy frontend integration';
END
$$;
