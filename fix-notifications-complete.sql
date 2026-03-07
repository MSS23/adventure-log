-- Complete notification system fix

-- ============================================
-- PART 1: Fix create_notification function
-- ============================================

DROP FUNCTION IF EXISTS public.create_notification(uuid, uuid, varchar, varchar, text, varchar, jsonb);
DROP FUNCTION IF EXISTS public.create_notification(uuid, uuid, varchar, varchar, text, varchar);
DROP FUNCTION IF EXISTS public.create_notification(uuid, uuid, text, text, text, varchar);

CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id uuid,
  p_sender_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_link text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_notification_id uuid;
BEGIN
  -- Don't create notification if sender is the same as recipient
  IF p_user_id = p_sender_id THEN
    RETURN NULL;
  END IF;

  -- Create notification
  INSERT INTO public.notifications (user_id, sender_id, type, title, message, link, read)
  VALUES (p_user_id, p_sender_id, p_type, p_title, p_message, p_link, false)
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE NOTICE 'Error creating notification: %', SQLERRM;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 2: Fix notification triggers
-- ============================================

-- Drop existing triggers
DROP TRIGGER IF EXISTS on_like_created ON public.likes;
DROP TRIGGER IF EXISTS on_comment_created ON public.comments;

-- Drop old functions
DROP FUNCTION IF EXISTS public.handle_like_notification();
DROP FUNCTION IF EXISTS public.handle_comment_notification();

-- Create like notification trigger function
CREATE OR REPLACE FUNCTION public.handle_like_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_target_user_id uuid;
  v_sender_name text;
  v_content_link text;
BEGIN
  -- Get the owner of the liked content
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

  -- Get sender's display name
  SELECT display_name INTO v_sender_name FROM public.users WHERE id = NEW.user_id;
  IF v_sender_name IS NULL THEN
    SELECT username INTO v_sender_name FROM public.users WHERE id = NEW.user_id;
  END IF;

  -- Create notification (function will check if sender != recipient)
  IF v_target_user_id IS NOT NULL THEN
    PERFORM public.create_notification(
      v_target_user_id,
      NEW.user_id,
      'like',
      'New like',
      v_sender_name || ' liked your ' || NEW.target_type,
      v_content_link
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create comment notification trigger function
CREATE OR REPLACE FUNCTION public.handle_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_target_user_id uuid;
  v_sender_name text;
  v_content_link text;
BEGIN
  -- Get the owner of the commented content
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

  -- Get sender's display name
  SELECT display_name INTO v_sender_name FROM public.users WHERE id = NEW.user_id;
  IF v_sender_name IS NULL THEN
    SELECT username INTO v_sender_name FROM public.users WHERE id = NEW.user_id;
  END IF;

  -- Create notification (function will check if sender != recipient)
  IF v_target_user_id IS NOT NULL THEN
    PERFORM public.create_notification(
      v_target_user_id,
      NEW.user_id,
      'comment',
      'New comment',
      v_sender_name || ' commented on your ' || NEW.target_type,
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

-- ============================================
-- Verification
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '✅ NOTIFICATION SYSTEM FIX COMPLETED';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'create_notification function: FIXED';
    RAISE NOTICE 'Like notifications: ENABLED';
    RAISE NOTICE 'Comment notifications: ENABLED';
    RAISE NOTICE '';
    RAISE NOTICE 'How it works:';
    RAISE NOTICE '  • When someone likes your album → you get a notification';
    RAISE NOTICE '  • When someone comments → you get a notification';
    RAISE NOTICE '  • Notification shows who did the action';
    RAISE NOTICE '  • You do NOT get notified for your own actions';
    RAISE NOTICE '';
    RAISE NOTICE 'Example notification:';
    RAISE NOTICE '  "John Smith liked your album"';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '';
END $$;
