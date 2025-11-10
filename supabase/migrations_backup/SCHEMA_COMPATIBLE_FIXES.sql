-- =====================================================
-- ADVENTURE LOG - SCHEMA COMPATIBLE FIXES
-- Compatible with your current database schema
-- Run this file if APPLY_ALL_FIXES.sql has conflicts
-- =====================================================

-- =====================================================
-- PART 1: FIX FOLLOWS TABLE STATUS VALUES
-- =====================================================

-- Your schema uses 'approved' but the code expects 'accepted'
-- Add 'accepted' as a valid status value
ALTER TABLE public.follows
  DROP CONSTRAINT IF EXISTS follows_status_check;

ALTER TABLE public.follows
  ADD CONSTRAINT follows_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'accepted'::text, 'rejected'::text]));

-- Update existing 'approved' to 'accepted' for compatibility
UPDATE public.follows
SET status = 'accepted'
WHERE status = 'approved';

-- =====================================================
-- PART 2: FOLLOW SYSTEM FUNCTIONS
-- =====================================================

-- Create handle_follow_request function
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

-- Create accept_follow_request function
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

-- Create reject_follow_request function
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
-- PART 3: FOLLOWS TABLE RLS POLICIES (SKIP IF EXIST)
-- =====================================================

-- Note: If RLS policies already exist, skip this section
-- The policies are already working if you got the 42710 error

-- =====================================================
-- PART 4: ADD DISPLAY_ORDER TO PHOTOS (IF NOT EXISTS)
-- =====================================================

-- Your schema already has display_order column - skip this

-- =====================================================
-- PART 5: AUTO-ACCEPT FOLLOWS ON PUBLIC
-- =====================================================

CREATE OR REPLACE FUNCTION accept_all_pending_follows(user_id_param UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE public.follows
    SET status = 'accepted'
    WHERE following_id = user_id_param
      AND status = 'pending';

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$;

CREATE OR REPLACE FUNCTION auto_accept_follows_on_public()
RETURNS TRIGGER AS $$
DECLARE
    accepted_count INTEGER;
BEGIN
    IF (OLD.privacy_level IN ('private', 'friends') AND NEW.privacy_level = 'public') THEN
        accepted_count := accept_all_pending_follows(NEW.id);
        RAISE NOTICE 'Auto-accepted % pending follow requests', accepted_count;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_auto_accept_follows_on_public ON public.users;

CREATE TRIGGER trigger_auto_accept_follows_on_public
    AFTER UPDATE OF privacy_level ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION auto_accept_follows_on_public();

-- =====================================================
-- PART 6: NOTIFICATION SYSTEM
-- =====================================================

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

-- Follow notification
DROP TRIGGER IF EXISTS on_follow_created ON follows;
DROP FUNCTION IF EXISTS notify_on_follow();

CREATE OR REPLACE FUNCTION notify_on_follow()
RETURNS TRIGGER AS $$
DECLARE
  v_follower_username text;
BEGIN
  SELECT username INTO v_follower_username
  FROM users WHERE id = NEW.follower_id;

  PERFORM create_notification(
    NEW.following_id,
    NEW.follower_id,
    'follow',
    'New follow request',
    CASE
      WHEN NEW.status = 'pending' THEN v_follower_username || ' requested to follow you'
      ELSE v_follower_username || ' started following you'
    END,
    '/globe?user=' || NEW.follower_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_follow_created
  AFTER INSERT ON follows
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_follow();

-- Follow accepted notification
DROP TRIGGER IF EXISTS on_follow_accepted ON follows;
DROP FUNCTION IF EXISTS notify_on_follow_accepted();

CREATE OR REPLACE FUNCTION notify_on_follow_accepted()
RETURNS TRIGGER AS $$
DECLARE
  v_username text;
BEGIN
  IF OLD.status = 'pending' AND NEW.status IN ('accepted', 'approved') THEN
    SELECT username INTO v_username
    FROM users WHERE id = NEW.following_id;

    PERFORM create_notification(
      NEW.follower_id,
      NEW.following_id,
      'follow',
      'Follow request accepted',
      v_username || ' accepted your follow request',
      '/globe?user=' || NEW.following_id
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
-- PART 7: REACTIONS SYSTEM (ALREADY EXISTS IN SCHEMA)
-- =====================================================

-- Your schema already has reactions table - just add functions

CREATE OR REPLACE FUNCTION public.toggle_reaction(
  p_target_type text,
  p_target_id uuid,
  p_reaction_type text
)
RETURNS jsonb AS $$
DECLARE
  v_user_id uuid;
  v_existing_id uuid;
  v_result jsonb;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id INTO v_existing_id
  FROM public.reactions
  WHERE user_id = v_user_id
    AND target_type = p_target_type
    AND target_id = p_target_id
    AND reaction_type = p_reaction_type;

  IF v_existing_id IS NOT NULL THEN
    DELETE FROM public.reactions WHERE id = v_existing_id;
    v_result := jsonb_build_object('action', 'removed', 'reaction_type', p_reaction_type);
  ELSE
    INSERT INTO public.reactions (user_id, target_type, target_id, reaction_type)
    VALUES (v_user_id, p_target_type, p_target_id, p_reaction_type);
    v_result := jsonb_build_object('action', 'added', 'reaction_type', p_reaction_type);
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PART 8: GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION public.handle_follow_request(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_follow_request(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_follow_request(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION accept_all_pending_follows(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_notification(uuid, uuid, varchar, varchar, text, varchar) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_on_follow() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_on_follow_accepted() TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_reaction TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE!
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Schema-compatible migration completed!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Status values updated (approved→accepted)';
  RAISE NOTICE 'Follow functions created';
  RAISE NOTICE 'Auto-accept trigger enabled';
  RAISE NOTICE 'Notification triggers enabled';
  RAISE NOTICE 'Reaction functions created';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'You can now use follow requests!';
  RAISE NOTICE '========================================';
END $$;
