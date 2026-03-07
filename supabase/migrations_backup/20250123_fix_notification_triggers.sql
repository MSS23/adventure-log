-- Fix notification triggers to use target_type instead of entity_type
-- Error: record "new" has no field "entity_type"

-- Drop existing triggers
DROP TRIGGER IF EXISTS on_like_created ON likes;
DROP TRIGGER IF EXISTS on_comment_created ON comments;

-- Drop existing functions
DROP FUNCTION IF EXISTS handle_like_notification();
DROP FUNCTION IF EXISTS handle_comment_notification();

-- Create updated like notification function
CREATE OR REPLACE FUNCTION handle_like_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_target_user_id uuid;
  v_content_type varchar;
  v_content_link varchar;
BEGIN
  -- Get the owner of the liked content using target_type (not entity_type)
  IF NEW.target_type = 'album' THEN
    SELECT user_id INTO v_target_user_id FROM albums WHERE id = NEW.target_id;
    v_content_link := '/albums/' || NEW.target_id;
  ELSIF NEW.target_type = 'photo' THEN
    SELECT user_id INTO v_target_user_id FROM photos WHERE id = NEW.target_id;
    v_content_link := '/photos/' || NEW.target_id;
  ELSIF NEW.target_type = 'story' THEN
    SELECT user_id INTO v_target_user_id FROM stories WHERE id = NEW.target_id;
    v_content_link := '/stories/' || NEW.target_id;
  END IF;

  -- Don't notify if user liked their own content
  IF v_target_user_id IS NOT NULL AND v_target_user_id != NEW.user_id THEN
    PERFORM create_notification(
      v_target_user_id,
      NEW.user_id,
      'like',
      'New like',
      'Someone liked your ' || NEW.target_type,
      v_content_link
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create updated comment notification function
CREATE OR REPLACE FUNCTION handle_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_target_user_id uuid;
  v_content_link varchar;
BEGIN
  -- Get the owner of the commented content using target_type (not entity_type)
  IF NEW.target_type = 'album' THEN
    SELECT user_id INTO v_target_user_id FROM albums WHERE id = NEW.target_id;
    v_content_link := '/albums/' || NEW.target_id;
  ELSIF NEW.target_type = 'photo' THEN
    SELECT user_id INTO v_target_user_id FROM photos WHERE id = NEW.target_id;
    v_content_link := '/photos/' || NEW.target_id;
  ELSIF NEW.target_type = 'story' THEN
    SELECT user_id INTO v_target_user_id FROM stories WHERE id = NEW.target_id;
    v_content_link := '/stories/' || NEW.target_id;
  END IF;

  -- Don't notify if user commented on their own content
  IF v_target_user_id IS NOT NULL AND v_target_user_id != NEW.user_id THEN
    PERFORM create_notification(
      v_target_user_id,
      NEW.user_id,
      'comment',
      'New comment',
      'Someone commented on your ' || NEW.target_type,
      v_content_link
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate triggers
CREATE TRIGGER on_like_created
  AFTER INSERT ON likes
  FOR EACH ROW
  EXECUTE FUNCTION handle_like_notification();

CREATE TRIGGER on_comment_created
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION handle_comment_notification();
