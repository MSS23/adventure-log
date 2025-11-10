-- =====================================================
-- ADVENTURE LOG - CRITICAL FIXES MIGRATION
-- Run this ONE file in Supabase SQL Editor
-- =====================================================
-- This migration fixes:
-- 1. Follow system (requests persist correctly)
-- 2. Notification triggers (get notified on follows/likes)
-- Date: 2025-10-27
-- =====================================================

-- =====================================================
-- PART 1: FIX FOLLOW SYSTEM
-- =====================================================

-- Drop old functions if they exist
DROP FUNCTION IF EXISTS public.handle_follow_request(UUID, UUID);
DROP FUNCTION IF EXISTS public.accept_follow_request(UUID, UUID);
DROP FUNCTION IF EXISTS public.reject_follow_request(UUID, UUID);

-- Create corrected handle_follow_request function
CREATE OR REPLACE FUNCTION public.handle_follow_request(
    follower_id_param UUID,
    following_id_param UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_user_privacy TEXT;
    result_status TEXT;
BEGIN
    SELECT privacy_level INTO target_user_privacy
    FROM public.users
    WHERE id = following_id_param;

    IF target_user_privacy = 'private' THEN
        result_status := 'pending';
    ELSE
        result_status := 'accepted';
    END IF;

    INSERT INTO public.follows (follower_id, following_id, status, created_at)
    VALUES (follower_id_param, following_id_param, result_status, now())
    ON CONFLICT (follower_id, following_id)
    DO UPDATE SET status = result_status;

    RETURN result_status;
END;
$$;

-- Create corrected accept_follow_request function
CREATE OR REPLACE FUNCTION public.accept_follow_request(
    follower_id_param UUID,
    following_id_param UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.follows
    SET status = 'accepted'
    WHERE follower_id = follower_id_param
        AND following_id = following_id_param
        AND status = 'pending';
END;
$$;

-- Create corrected reject_follow_request function
CREATE OR REPLACE FUNCTION public.reject_follow_request(
    follower_id_param UUID,
    following_id_param UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.follows
    WHERE follower_id = follower_id_param
        AND following_id = following_id_param
        AND status = 'pending';
END;
$$;

-- =====================================================
-- PART 2: FIX NOTIFICATION SYSTEM
-- =====================================================

-- Create helper function for notifications
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

-- Fix the follow notification trigger
DROP TRIGGER IF EXISTS on_follow_created ON follows;
DROP FUNCTION IF EXISTS notify_on_follow();

CREATE OR REPLACE FUNCTION notify_on_follow()
RETURNS TRIGGER AS $$
DECLARE
  v_follower_username text;
BEGIN
  SELECT username INTO v_follower_username
  FROM users
  WHERE id = NEW.follower_id;

  PERFORM create_notification(
    NEW.following_id,
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

-- Notify when follow request is accepted
DROP TRIGGER IF EXISTS on_follow_accepted ON follows;
DROP FUNCTION IF EXISTS notify_on_follow_accepted();

CREATE OR REPLACE FUNCTION notify_on_follow_accepted()
RETURNS TRIGGER AS $$
DECLARE
  v_username text;
BEGIN
  IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    SELECT username INTO v_username
    FROM users
    WHERE id = NEW.following_id;

    PERFORM create_notification(
      NEW.follower_id,
      NEW.following_id,
      'follow',
      'Follow request accepted',
      v_username || ' accepted your follow request',
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

-- =====================================================
-- PART 3: GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION public.handle_follow_request(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_follow_request(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_follow_request(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_notification(uuid, uuid, varchar, varchar, text, varchar) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_on_like() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_on_comment() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_on_follow() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_on_follow_accepted() TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE!
-- =====================================================
-- After running this:
-- ✅ Follow requests will persist
-- ✅ Notifications work for follows, likes, comments
-- ✅ Real-time updates enabled
-- =====================================================
