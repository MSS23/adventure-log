-- =====================================================
-- ADVENTURE LOG - COMPLETE FIXES MIGRATION
-- Run this ONE file in Supabase SQL Editor
-- =====================================================
-- This migration includes ALL fixes:
-- 1. Follow system functions
-- 2. Notification system
-- 3. Reactions system
-- 4. Auto-accept followers on public
-- Date: 2025-10-28
-- =====================================================

-- =====================================================
-- PART 1: FOLLOW SYSTEM FUNCTIONS
-- =====================================================

-- Drop old functions if they exist
DROP FUNCTION IF EXISTS public.handle_follow_request(UUID, UUID);
DROP FUNCTION IF EXISTS public.accept_follow_request(UUID, UUID);
DROP FUNCTION IF EXISTS public.reject_follow_request(UUID, UUID);

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
-- PART 2: AUTO-ACCEPT FOLLOWS ON PUBLIC
-- =====================================================

-- Create function to accept all pending follow requests
CREATE OR REPLACE FUNCTION accept_all_pending_follows(user_id_param UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE public.follows
    SET
        status = 'accepted',
        updated_at = NOW()
    WHERE
        following_id = user_id_param
        AND status = 'pending';

    GET DIAGNOSTICS updated_count = ROW_COUNT;

    RETURN updated_count;
END;
$$;

-- Create trigger function for auto-accept
CREATE OR REPLACE FUNCTION auto_accept_follows_on_public()
RETURNS TRIGGER AS $$
DECLARE
    accepted_count INTEGER;
BEGIN
    IF (OLD.privacy_level IN ('private', 'friends') AND NEW.privacy_level = 'public') THEN
        accepted_count := accept_all_pending_follows(NEW.id);
        RAISE NOTICE 'Auto-accepted % pending follow requests for user % switching to public', accepted_count, NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_auto_accept_follows_on_public ON public.users;

CREATE TRIGGER trigger_auto_accept_follows_on_public
    AFTER UPDATE OF privacy_level ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION auto_accept_follows_on_public();

-- =====================================================
-- PART 3: NOTIFICATION SYSTEM
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

-- Follow notification trigger
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

-- Follow accepted notification trigger
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
-- PART 4: ADD DISPLAY_ORDER COLUMN TO PHOTOS
-- =====================================================

-- Add display_order column to photos table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'photos'
    AND column_name = 'display_order'
  ) THEN
    ALTER TABLE public.photos
    ADD COLUMN display_order integer;

    -- Set initial display_order based on created_at for existing photos
    WITH ordered_photos AS (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY album_id ORDER BY created_at) as rn
      FROM public.photos
    )
    UPDATE public.photos p
    SET display_order = op.rn
    FROM ordered_photos op
    WHERE p.id = op.id;

    RAISE NOTICE 'Added display_order column to photos table';
  END IF;
END $$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_photos_display_order ON public.photos(album_id, display_order);

-- =====================================================
-- PART 5: REACTIONS SYSTEM
-- =====================================================

-- Create reactions table
CREATE TABLE IF NOT EXISTS public.reactions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  target_type character varying NOT NULL CHECK (target_type IN ('album', 'photo')),
  target_id uuid NOT NULL,
  reaction_type character varying NOT NULL CHECK (reaction_type IN ('joy', 'fire', 'thumbsup', 'heart', 'star', 'clap')),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT reactions_pkey PRIMARY KEY (id),
  CONSTRAINT reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT reactions_unique UNIQUE (user_id, target_type, target_id, reaction_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reactions_target ON public.reactions(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user_id ON public.reactions(user_id);

-- Enable RLS
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Anyone can view reactions on public content" ON public.reactions;
CREATE POLICY "Anyone can view reactions on public content"
  ON public.reactions FOR SELECT
  USING (
    CASE
      WHEN target_type = 'album' THEN
        EXISTS (
          SELECT 1 FROM public.albums
          WHERE id = target_id
          AND (visibility = 'public' OR user_id = auth.uid())
        )
      WHEN target_type = 'photo' THEN
        EXISTS (
          SELECT 1 FROM public.photos p
          JOIN public.albums a ON p.album_id = a.id
          WHERE p.id = target_id
          AND (a.visibility = 'public' OR a.user_id = auth.uid())
        )
      ELSE false
    END
  );

DROP POLICY IF EXISTS "Authenticated users can add reactions" ON public.reactions;
CREATE POLICY "Authenticated users can add reactions"
  ON public.reactions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND
    CASE
      WHEN target_type = 'album' THEN
        EXISTS (
          SELECT 1 FROM public.albums
          WHERE id = target_id
          AND (visibility = 'public' OR user_id = auth.uid())
        )
      WHEN target_type = 'photo' THEN
        EXISTS (
          SELECT 1 FROM public.photos p
          JOIN public.albums a ON p.album_id = a.id
          WHERE p.id = target_id
          AND (a.visibility = 'public' OR a.user_id = auth.uid())
        )
      ELSE false
    END
  );

DROP POLICY IF EXISTS "Users can delete their own reactions" ON public.reactions;
CREATE POLICY "Users can delete their own reactions"
  ON public.reactions FOR DELETE
  USING (auth.uid() = user_id);

-- Reaction functions
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
-- PART 5: GRANT PERMISSIONS
-- =====================================================

-- Follow functions
GRANT EXECUTE ON FUNCTION public.handle_follow_request(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_follow_request(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_follow_request(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION accept_all_pending_follows(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION auto_accept_follows_on_public() TO authenticated;

-- Notification functions
GRANT EXECUTE ON FUNCTION create_notification(uuid, uuid, varchar, varchar, text, varchar) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_on_follow() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_on_follow_accepted() TO authenticated;

-- Reaction functions
GRANT EXECUTE ON FUNCTION public.toggle_reaction TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.reactions TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE!
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Follow requests will now persist';
  RAISE NOTICE 'Notifications work for follows';
  RAISE NOTICE 'Reactions system enabled';
  RAISE NOTICE 'Auto-accept on public enabled';
  RAISE NOTICE '========================================';
END $$;
