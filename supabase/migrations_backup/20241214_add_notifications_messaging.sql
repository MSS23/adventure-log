-- Migration: Add Notifications and Messaging System (In-App Only)
-- Description: Creates tables for notifications, messages, and notification preferences
-- Note: Email notifications are not included - this is an Instagram-style in-app only system
-- Date: 2024-12-14

-- =====================================================
-- NOTIFICATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES users(id) ON DELETE SET NULL,
  type varchar(50) NOT NULL CHECK (type IN (
    'like', 'comment', 'follow', 'message',
    'album_invite', 'collaboration', 'photo',
    'location', 'achievement'
  )),
  title varchar(255) NOT NULL,
  message text NOT NULL,
  link varchar(500),
  metadata jsonb DEFAULT '{}'::jsonb,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_is_read ON notifications(is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_type ON notifications(type);

-- =====================================================
-- MESSAGES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT no_self_messaging CHECK (sender_id != recipient_id)
);

-- Indexes for messages
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_is_read ON messages(is_read) WHERE is_read = false;
CREATE INDEX idx_messages_conversation ON messages(sender_id, recipient_id, created_at DESC);

-- =====================================================
-- NOTIFICATION PREFERENCES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  likes_enabled boolean DEFAULT true,
  comments_enabled boolean DEFAULT true,
  follows_enabled boolean DEFAULT true,
  messages_enabled boolean DEFAULT true,
  collaborations_enabled boolean DEFAULT true,
  achievements_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Notifications policies
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- Messages policies
CREATE POLICY "Users can view their own messages"
  ON messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their received messages"
  ON messages FOR UPDATE
  USING (auth.uid() = recipient_id);

CREATE POLICY "Users can delete their own sent messages"
  ON messages FOR DELETE
  USING (auth.uid() = sender_id);

-- Notification preferences policies
CREATE POLICY "Users can view their own preferences"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- AUTO-CREATE NOTIFICATION PREFERENCES FOR NEW USERS
-- =====================================================

CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_user_created_notification_prefs
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_preferences();

-- =====================================================
-- NOTIFICATION HELPER FUNCTIONS
-- =====================================================

-- Function to create notification (respects user preferences)
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id uuid,
  p_sender_id uuid,
  p_type varchar,
  p_title varchar,
  p_message text,
  p_link varchar DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid AS $$
DECLARE
  v_notification_id uuid;
  v_preference_enabled boolean;
BEGIN
  -- Check if user has this notification type enabled
  EXECUTE format('SELECT %I FROM notification_preferences WHERE user_id = $1', p_type || '_enabled')
  INTO v_preference_enabled
  USING p_user_id;

  -- If preference not found, default to true
  IF v_preference_enabled IS NULL THEN
    v_preference_enabled := true;
  END IF;

  -- Only create notification if enabled
  IF v_preference_enabled THEN
    INSERT INTO notifications (user_id, sender_id, type, title, message, link, metadata)
    VALUES (p_user_id, p_sender_id, p_type, p_title, p_message, p_link, p_metadata)
    RETURNING id INTO v_notification_id;

    RETURN v_notification_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE notifications
  SET is_read = true
  WHERE user_id = p_user_id AND is_read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id uuid)
RETURNS integer AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*)::integer
  INTO v_count
  FROM notifications
  WHERE user_id = p_user_id AND is_read = false;

  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread message count
CREATE OR REPLACE FUNCTION get_unread_message_count(p_user_id uuid)
RETURNS integer AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*)::integer
  INTO v_count
  FROM messages
  WHERE recipient_id = p_user_id AND is_read = false;

  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- AUTO-NOTIFICATION TRIGGERS
-- =====================================================

-- Trigger: Notify on new like
CREATE OR REPLACE FUNCTION notify_on_like()
RETURNS TRIGGER AS $$
DECLARE
  v_target_user_id uuid;
  v_content_type varchar;
  v_content_link varchar;
BEGIN
  -- Get the owner of the liked content
  IF NEW.entity_type = 'album' THEN
    SELECT user_id INTO v_target_user_id FROM albums WHERE id = NEW.entity_id;
    v_content_link := '/albums/' || NEW.entity_id;
  ELSIF NEW.entity_type = 'photo' THEN
    SELECT user_id INTO v_target_user_id FROM photos WHERE id = NEW.entity_id;
    v_content_link := '/photos/' || NEW.entity_id;
  ELSIF NEW.entity_type = 'story' THEN
    SELECT user_id INTO v_target_user_id FROM stories WHERE id = NEW.entity_id;
    v_content_link := '/stories/' || NEW.entity_id;
  END IF;

  -- Don't notify if user liked their own content
  IF v_target_user_id IS NOT NULL AND v_target_user_id != NEW.user_id THEN
    PERFORM create_notification(
      v_target_user_id,
      NEW.user_id,
      'like',
      'New like',
      'Someone liked your ' || NEW.entity_type,
      v_content_link
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_like_created
  AFTER INSERT ON likes
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_like();

-- Trigger: Notify on new comment
CREATE OR REPLACE FUNCTION notify_on_comment()
RETURNS TRIGGER AS $$
DECLARE
  v_target_user_id uuid;
  v_content_link varchar;
BEGIN
  -- Get the owner of the commented content
  IF NEW.entity_type = 'album' THEN
    SELECT user_id INTO v_target_user_id FROM albums WHERE id = NEW.entity_id;
    v_content_link := '/albums/' || NEW.entity_id;
  ELSIF NEW.entity_type = 'photo' THEN
    SELECT user_id INTO v_target_user_id FROM photos WHERE id = NEW.entity_id;
    v_content_link := '/photos/' || NEW.entity_id;
  ELSIF NEW.entity_type = 'story' THEN
    SELECT user_id INTO v_target_user_id FROM stories WHERE id = NEW.entity_id;
    v_content_link := '/stories/' || NEW.entity_id;
  END IF;

  -- Don't notify if user commented on their own content
  IF v_target_user_id IS NOT NULL AND v_target_user_id != NEW.user_id THEN
    PERFORM create_notification(
      v_target_user_id,
      NEW.user_id,
      'comment',
      'New comment',
      'Someone commented on your ' || NEW.entity_type,
      v_content_link
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_comment_created
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_comment();

-- Trigger: Notify on new follower
CREATE OR REPLACE FUNCTION notify_on_follow()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_notification(
    NEW.followed_id,
    NEW.follower_id,
    'follow',
    'New follower',
    'Someone started following you',
    '/profile/' || NEW.follower_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_follow_created
  AFTER INSERT ON follows
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_follow();

-- =====================================================
-- CLEANUP FUNCTION
-- =====================================================

-- Function to delete old read notifications (90 days)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM notifications
  WHERE is_read = true
    AND created_at < now() - interval '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_notification TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_notification_count TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_message_count TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_notifications TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE notifications IS 'Stores in-app notifications for users';
COMMENT ON TABLE messages IS 'Stores direct messages between users';
COMMENT ON TABLE notification_preferences IS 'User preferences for in-app notification types';
COMMENT ON FUNCTION create_notification IS 'Creates a notification respecting user preferences';
COMMENT ON FUNCTION mark_all_notifications_read IS 'Marks all notifications as read for a user';
COMMENT ON FUNCTION get_unread_notification_count IS 'Returns count of unread notifications for a user';
COMMENT ON FUNCTION get_unread_message_count IS 'Returns count of unread messages for a user';
COMMENT ON FUNCTION cleanup_old_notifications IS 'Deletes read notifications older than 90 days';
