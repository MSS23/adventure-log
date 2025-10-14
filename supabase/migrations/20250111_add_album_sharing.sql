-- Migration: Album Sharing & Collaboration System
-- Created: 2025-01-11
-- Description: Enables users to share albums and collaborate with others

-- Create album_shares table
CREATE TABLE IF NOT EXISTS album_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id uuid NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  shared_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shared_with_user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  share_token text UNIQUE NOT NULL,
  permission_level text NOT NULL DEFAULT 'view'
    CHECK (permission_level IN ('view', 'contribute', 'edit')),
  expires_at timestamp with time zone,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),

  -- Constraints
  CONSTRAINT unique_user_album_share UNIQUE(album_id, shared_with_user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_album_shares_album_id ON album_shares(album_id);
CREATE INDEX IF NOT EXISTS idx_album_shares_shared_by ON album_shares(shared_by_user_id);
CREATE INDEX IF NOT EXISTS idx_album_shares_shared_with ON album_shares(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_album_shares_token ON album_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_album_shares_active ON album_shares(is_active) WHERE is_active = true;

-- Create album_share_activity table for tracking changes
CREATE TABLE IF NOT EXISTS album_share_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  album_share_id uuid NOT NULL REFERENCES album_shares(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type text NOT NULL
    CHECK (activity_type IN ('photo_added', 'photo_deleted', 'comment_added', 'like_added', 'album_edited')),
  activity_data jsonb,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_album_share_activity_share_id ON album_share_activity(album_share_id);
CREATE INDEX IF NOT EXISTS idx_album_share_activity_created_at ON album_share_activity(created_at DESC);

-- Add RLS (Row Level Security) policies
ALTER TABLE album_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE album_share_activity ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view shares they created or received
CREATE POLICY "Users can view their album shares"
  ON album_shares FOR SELECT
  USING (
    auth.uid() = shared_by_user_id OR
    auth.uid() = shared_with_user_id OR
    -- Allow access via share token (will be handled in application logic)
    true
  );

-- Policy: Only album owners can create shares
CREATE POLICY "Album owners can create shares"
  ON album_shares FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM albums
      WHERE albums.id = album_id
      AND albums.user_id = auth.uid()
    )
  );

-- Policy: Only share creator can update shares
CREATE POLICY "Share creators can update shares"
  ON album_shares FOR UPDATE
  USING (auth.uid() = shared_by_user_id);

-- Policy: Only share creator can delete shares
CREATE POLICY "Share creators can delete shares"
  ON album_shares FOR DELETE
  USING (auth.uid() = shared_by_user_id);

-- Policy: Users can view activity for shares they're involved in
CREATE POLICY "Users can view share activity"
  ON album_share_activity FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM album_shares
      WHERE album_shares.id = album_share_id
      AND (
        album_shares.shared_by_user_id = auth.uid() OR
        album_shares.shared_with_user_id = auth.uid()
      )
    )
  );

-- Policy: Collaborators can add activity
CREATE POLICY "Collaborators can add activity"
  ON album_share_activity FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM album_shares
      WHERE album_shares.id = album_share_id
      AND (
        album_shares.shared_by_user_id = auth.uid() OR
        album_shares.shared_with_user_id = auth.uid()
      )
      AND album_shares.is_active = true
    )
  );

-- Function to generate unique share tokens
CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS text AS $$
DECLARE
  token text;
  exists boolean;
BEGIN
  LOOP
    -- Generate a random 32-character token
    token := encode(gen_random_bytes(24), 'base64');
    -- Remove special characters
    token := regexp_replace(token, '[^a-zA-Z0-9]', '', 'g');
    token := substring(token, 1, 32);

    -- Check if token exists
    SELECT EXISTS(SELECT 1 FROM album_shares WHERE share_token = token) INTO exists;
    EXIT WHEN NOT exists;
  END LOOP;

  RETURN token;
END;
$$ LANGUAGE plpgsql;

-- Function to check if a share is valid
CREATE OR REPLACE FUNCTION is_share_valid(token_param text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM album_shares
    WHERE share_token = token_param
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  );
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_album_shares_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER album_shares_updated_at
  BEFORE UPDATE ON album_shares
  FOR EACH ROW
  EXECUTE FUNCTION update_album_shares_updated_at();

-- Comments for documentation
COMMENT ON TABLE album_shares IS 'Stores album sharing relationships with different permission levels';
COMMENT ON COLUMN album_shares.permission_level IS 'view: can only view, contribute: can add photos, edit: can add/delete photos and edit album';
COMMENT ON COLUMN album_shares.share_token IS 'Unique token for accessing shared albums via link';
COMMENT ON COLUMN album_shares.shared_with_user_id IS 'User receiving the share (NULL for link-based shares)';
COMMENT ON TABLE album_share_activity IS 'Activity log for collaborative albums';
