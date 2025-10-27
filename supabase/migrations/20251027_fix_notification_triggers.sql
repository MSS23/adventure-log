-- Fix notification triggers to use correct column names and ensure they work

-- Create helper function for notifications if it doesn't exist
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id uuid,
  p_sender_id uuid,
  p_type varchar,
  p_title varchar,
  p_message text,
  p_link varchar DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO notifications (user_id, sender_id, type, title, message, link, is_read, created_at)
  VALUES (p_user_id, p_sender_id, p_type, p_title, p_message, p_link, false, now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix the follow notification trigger (uses wrong column name)
DROP TRIGGER IF EXISTS on_follow_created ON follows;
DROP FUNCTION IF EXISTS notify_on_follow();

CREATE OR REPLACE FUNCTION notify_on_follow()
RETURNS TRIGGER AS $$
DECLARE
  v_follower_username text;
BEGIN
  -- Get follower's username for the notification
  SELECT username INTO v_follower_username
  FROM users
  WHERE id = NEW.follower_id;

  -- Create notification for the user being followed
  PERFORM create_notification(
    NEW.following_id,  -- FIXED: was NEW.followed_id
    NEW.follower_id,
    'follow',
    'New follow request',
    CASE
      WHEN NEW.status = 'pending' THEN v_follower_username || ' requested to follow you'
      ELSE v_follower_username || ' started following you'
    END,
    '/profile/' || NEW.follower_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_follow_created
  AFTER INSERT ON follows
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_follow();

-- Update the follow notification when status changes (accepted)
CREATE OR REPLACE FUNCTION notify_on_follow_accepted()
RETURNS TRIGGER AS $$
DECLARE
  v_follower_username text;
BEGIN
  -- Only notify if status changed from pending to accepted
  IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    SELECT username INTO v_follower_username
    FROM users
    WHERE id = NEW.follower_id;

    -- Notify the follower that their request was accepted
    PERFORM create_notification(
      NEW.follower_id,  -- Notify the person who requested
      NEW.following_id, -- From the person they wanted to follow
      'follow',
      'Follow request accepted',
      'Your follow request was accepted',
      '/profile/' || NEW.following_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_follow_accepted
  AFTER UPDATE ON follows
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_follow_accepted();

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_notification(uuid, uuid, varchar, varchar, text, varchar) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_on_like() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_on_comment() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_on_follow() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_on_follow_accepted() TO authenticated;
