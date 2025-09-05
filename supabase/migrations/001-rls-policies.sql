-- Enable Row Level Security (RLS) on core tables
-- This ensures users can only access their own data

-- Enable RLS on albums table
ALTER TABLE albums ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own albums
CREATE POLICY "Users can view own albums"
ON albums FOR SELECT
USING (auth.uid()::text = user_id);

-- Policy: Users can insert their own albums
CREATE POLICY "Users can insert own albums"
ON albums FOR INSERT
WITH CHECK (auth.uid()::text = user_id);

-- Policy: Users can update their own albums
CREATE POLICY "Users can update own albums"
ON albums FOR UPDATE
USING (auth.uid()::text = user_id);

-- Policy: Users can delete their own albums
CREATE POLICY "Users can delete own albums"
ON albums FOR DELETE
USING (auth.uid()::text = user_id);

-- Enable RLS on photos table
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view photos in their albums or public albums
CREATE POLICY "Users can view photos"
ON photos FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM albums 
    WHERE albums.id = photos.album_id 
    AND (
      albums.user_id = auth.uid()::text 
      OR albums.privacy = 'PUBLIC'
      OR (albums.privacy = 'FRIENDS_ONLY' AND EXISTS (
        SELECT 1 FROM user_follows 
        WHERE follower_id = auth.uid()::text 
        AND following_id = albums.user_id 
        AND status = 'ACCEPTED'
      ))
    )
  )
);

-- Policy: Users can insert photos to their own albums
CREATE POLICY "Users can insert photos to own albums"
ON photos FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM albums 
    WHERE albums.id = photos.album_id 
    AND albums.user_id = auth.uid()::text
  )
);

-- Policy: Users can update photos in their own albums
CREATE POLICY "Users can update own photos"
ON photos FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM albums 
    WHERE albums.id = photos.album_id 
    AND albums.user_id = auth.uid()::text
  )
);

-- Policy: Users can delete photos from their own albums
CREATE POLICY "Users can delete own photos"
ON photos FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM albums 
    WHERE albums.id = photos.album_id 
    AND albums.user_id = auth.uid()::text
  )
);

-- Enable RLS on user_follows table for social features
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view follows involving them
CREATE POLICY "Users can view own follow relationships"
ON user_follows FOR SELECT
USING (
  follower_id = auth.uid()::text 
  OR following_id = auth.uid()::text
);

-- Policy: Users can create follow requests
CREATE POLICY "Users can create follow requests"
ON user_follows FOR INSERT
WITH CHECK (follower_id = auth.uid()::text);

-- Policy: Users can update follow requests they're involved in
CREATE POLICY "Users can update follow relationships"
ON user_follows FOR UPDATE
USING (
  follower_id = auth.uid()::text 
  OR following_id = auth.uid()::text
);

-- Policy: Users can delete their own follow relationships
CREATE POLICY "Users can delete own follow relationships"
ON user_follows FOR DELETE
USING (
  follower_id = auth.uid()::text 
  OR following_id = auth.uid()::text
);

-- Enable RLS on likes table
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all likes (public information)
CREATE POLICY "Anyone can view likes"
ON likes FOR SELECT
USING (true);

-- Policy: Users can only create likes as themselves
CREATE POLICY "Users can create own likes"
ON likes FOR INSERT
WITH CHECK (user_id = auth.uid()::text);

-- Policy: Users can only delete their own likes
CREATE POLICY "Users can delete own likes"
ON likes FOR DELETE
USING (user_id = auth.uid()::text);

-- Enable RLS on comments table
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view comments on content they can access
CREATE POLICY "Users can view accessible comments"
ON comments FOR SELECT
USING (
  CASE 
    WHEN target_type = 'Album' THEN
      EXISTS (
        SELECT 1 FROM albums 
        WHERE albums.id = comments.target_id::uuid 
        AND (
          albums.user_id = auth.uid()::text 
          OR albums.privacy = 'PUBLIC'
          OR (albums.privacy = 'FRIENDS_ONLY' AND EXISTS (
            SELECT 1 FROM user_follows 
            WHERE follower_id = auth.uid()::text 
            AND following_id = albums.user_id 
            AND status = 'ACCEPTED'
          ))
        )
      )
    ELSE true
  END
);

-- Policy: Users can create comments on accessible content
CREATE POLICY "Users can create comments on accessible content"
ON comments FOR INSERT
WITH CHECK (
  user_id = auth.uid()::text AND
  CASE 
    WHEN target_type = 'Album' THEN
      EXISTS (
        SELECT 1 FROM albums 
        WHERE albums.id = target_id::uuid 
        AND (
          albums.user_id = auth.uid()::text 
          OR albums.privacy = 'PUBLIC'
          OR (albums.privacy = 'FRIENDS_ONLY' AND EXISTS (
            SELECT 1 FROM user_follows 
            WHERE follower_id = auth.uid()::text 
            AND following_id = albums.user_id 
            AND status = 'ACCEPTED'
          ))
        )
      )
    ELSE true
  END
);

-- Policy: Users can update their own comments
CREATE POLICY "Users can update own comments"
ON comments FOR UPDATE
USING (user_id = auth.uid()::text);

-- Policy: Users can delete their own comments or comments on their content
CREATE POLICY "Users can delete own comments or comments on own content"
ON comments FOR DELETE
USING (
  user_id = auth.uid()::text OR
  CASE 
    WHEN target_type = 'Album' THEN
      EXISTS (
        SELECT 1 FROM albums 
        WHERE albums.id = target_id::uuid 
        AND albums.user_id = auth.uid()::text
      )
    ELSE false
  END
);

-- Enable RLS on activities table
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own activities and public activities from followed users
CREATE POLICY "Users can view relevant activities"
ON activities FOR SELECT
USING (
  user_id = auth.uid()::text OR
  EXISTS (
    SELECT 1 FROM user_follows 
    WHERE follower_id = auth.uid()::text 
    AND following_id = activities.user_id 
    AND status = 'ACCEPTED'
  )
);

-- Policy: Users can create their own activities
CREATE POLICY "Users can create own activities"
ON activities FOR INSERT
WITH CHECK (user_id = auth.uid()::text);

-- Enable RLS on notifications table
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own notifications
CREATE POLICY "Users can view own notifications"
ON notifications FOR SELECT
USING (user_id = auth.uid()::text);

-- Policy: System can create notifications for users
CREATE POLICY "System can create notifications"
ON notifications FOR INSERT
WITH CHECK (true);

-- Policy: Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON notifications FOR UPDATE
USING (user_id = auth.uid()::text);

-- Policy: Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
ON notifications FOR DELETE
USING (user_id = auth.uid()::text);

-- Create function to automatically set user_id from auth context
CREATE OR REPLACE FUNCTION set_user_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_id = auth.uid()::text;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add triggers for automatic user_id setting (optional, for enhanced security)
-- Note: Only enable these if you want automatic user_id setting
-- CREATE TRIGGER set_user_id_albums
--   BEFORE INSERT ON albums
--   FOR EACH ROW EXECUTE FUNCTION set_user_id();

-- CREATE TRIGGER set_user_id_photos
--   BEFORE INSERT ON photos
--   FOR EACH ROW EXECUTE FUNCTION set_user_id();