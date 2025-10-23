-- Fix notification triggers to use target_type instead of entity_type

-- Drop existing triggers first
DROP TRIGGER IF EXISTS on_like_created ON public.likes;
DROP TRIGGER IF EXISTS on_comment_created ON public.comments;

-- Drop old functions
DROP FUNCTION IF EXISTS public.handle_like_notification();
DROP FUNCTION IF EXISTS public.handle_comment_notification();

-- Create NEW like notification function with target_type
CREATE OR REPLACE FUNCTION public.handle_like_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_target_user_id uuid;
  v_content_link varchar;
BEGIN
  -- Use target_type and target_id (not entity_type/entity_id)
  IF NEW.target_type = 'album' THEN
    SELECT user_id INTO v_target_user_id FROM public.albums WHERE id = NEW.target_id;
    v_content_link := '/albums/' || NEW.target_id;
  ELSIF NEW.target_type = 'photo' THEN
    SELECT user_id INTO v_target_user_id FROM public.photos WHERE id = NEW.target_id;
    v_content_link := '/photos/' || NEW.target_id;
  ELSIF NEW.target_type = 'story' THEN
    SELECT user_id INTO v_target_user_id FROM public.stories WHERE id = NEW.target_id;
    v_content_link := '/stories/' || NEW.target_id;
  END IF;

  -- Don't notify if user liked their own content
  IF v_target_user_id IS NOT NULL AND v_target_user_id != NEW.user_id THEN
    PERFORM public.create_notification(
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

-- Create NEW comment notification function with target_type
CREATE OR REPLACE FUNCTION public.handle_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_target_user_id uuid;
  v_content_link varchar;
BEGIN
  -- Use target_type and target_id (not entity_type/entity_id)
  IF NEW.target_type = 'album' THEN
    SELECT user_id INTO v_target_user_id FROM public.albums WHERE id = NEW.target_id;
    v_content_link := '/albums/' || NEW.target_id;
  ELSIF NEW.target_type = 'photo' THEN
    SELECT user_id INTO v_target_user_id FROM public.photos WHERE id = NEW.target_id;
    v_content_link := '/photos/' || NEW.target_id;
  ELSIF NEW.target_type = 'story' THEN
    SELECT user_id INTO v_target_user_id FROM public.stories WHERE id = NEW.target_id;
    v_content_link := '/stories/' || NEW.target_id;
  END IF;

  -- Don't notify if user commented on their own content
  IF v_target_user_id IS NOT NULL AND v_target_user_id != NEW.user_id THEN
    PERFORM public.create_notification(
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
  AFTER INSERT ON public.likes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_like_notification();

CREATE TRIGGER on_comment_created
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_comment_notification();
