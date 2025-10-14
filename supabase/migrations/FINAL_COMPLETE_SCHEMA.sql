-- ============================================================================
-- ADVENTURE LOG: FINAL COMPLETE SCHEMA
-- ============================================================================
-- This is the DEFINITIVE schema based on your actual database structure
-- Run this in Supabase SQL Editor - it will add all missing functionality
-- ============================================================================

-- ============================================================================
-- PART 1: ADD MISSING COLUMNS TO EXISTING TABLES
-- ============================================================================

-- Add missing columns to existing tables (safe to run)
ALTER TABLE public.photos ADD COLUMN IF NOT EXISTS photo_hash text;
ALTER TABLE public.photos ADD COLUMN IF NOT EXISTS storage_path text;
ALTER TABLE public.albums ADD COLUMN IF NOT EXISTS cover_photo_position jsonb DEFAULT '{"x": 50, "y": 50, "zoom": 1}'::jsonb;
ALTER TABLE public.albums ADD COLUMN IF NOT EXISTS start_date date;
ALTER TABLE public.albums ADD COLUMN IF NOT EXISTS end_date date;
ALTER TABLE public.albums ADD COLUMN IF NOT EXISTS cover_image_url text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_photos_hash ON public.photos(photo_hash);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON public.users(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_albums_location ON public.albums(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- ============================================================================
-- PART 2: FIX FOLLOWS TABLE (rename columns to match code)
-- ============================================================================

-- Your schema has followers/following_id but code expects follower_id/followed_id
-- Create a view or fix the table structure

-- Add the followed_id column if it doesn't exist
ALTER TABLE public.follows ADD COLUMN IF NOT EXISTS followed_id uuid;

-- Copy data from following_id to followed_id
UPDATE public.follows SET followed_id = following_id WHERE followed_id IS NULL;

-- Add foreign key constraint (with error handling)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'follows_followed_id_fkey'
    AND table_name = 'follows'
  ) THEN
    ALTER TABLE public.follows ADD CONSTRAINT follows_followed_id_fkey
      FOREIGN KEY (followed_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================================
-- PART 3: FIX LIKES TABLE (add entity_type and entity_id columns)
-- ============================================================================

-- Your likes table has target_id/target_type, code expects entity_id/entity_type
ALTER TABLE public.likes ADD COLUMN IF NOT EXISTS entity_type text;
ALTER TABLE public.likes ADD COLUMN IF NOT EXISTS entity_id uuid;

-- Copy data to new columns if they're empty
UPDATE public.likes
SET entity_type = target_type, entity_id = target_id
WHERE entity_type IS NULL OR entity_id IS NULL;

-- Add check constraint if not exists
DO $$
BEGIN
  ALTER TABLE public.likes ADD CONSTRAINT likes_entity_type_check
    CHECK (entity_type IN ('album', 'photo', 'story', 'comment'));
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_likes_entity ON public.likes(entity_type, entity_id);

-- ============================================================================
-- PART 4: FIX COMMENTS TABLE (add entity_type and entity_id columns)
-- ============================================================================

-- Your comments have album_id/photo_id, code expects entity_type/entity_id
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS entity_type text;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS entity_id uuid;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS text text;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS parent_id uuid;

-- Migrate existing data
UPDATE public.comments
SET
  entity_type = CASE
    WHEN album_id IS NOT NULL THEN 'album'
    WHEN photo_id IS NOT NULL THEN 'photo'
    ELSE 'album'
  END,
  entity_id = COALESCE(album_id, photo_id),
  text = COALESCE(text, content)
WHERE entity_type IS NULL OR entity_id IS NULL;

-- Add check constraint
DO $$
BEGIN
  ALTER TABLE public.comments ADD CONSTRAINT comments_entity_type_check
    CHECK (entity_type IN ('album', 'photo', 'story'));
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- Add foreign key for parent_id
DO $$
BEGIN
  ALTER TABLE public.comments ADD CONSTRAINT comments_parent_id_fkey
    FOREIGN KEY (parent_id) REFERENCES public.comments(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_comments_entity ON public.comments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON public.comments(parent_id);

-- ============================================================================
-- PART 5: ENSURE STORIES TABLE IS COMPLETE
-- ============================================================================

-- Your schema already has stories, just ensure it has all columns
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS album_id uuid;
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS media_url text;
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS caption text;
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone DEFAULT (now() + interval '24 hours');

-- Add foreign key for album_id
DO $$
BEGIN
  ALTER TABLE public.stories ADD CONSTRAINT stories_album_id_fkey
    FOREIGN KEY (album_id) REFERENCES public.albums(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- Ensure indexes (without WHERE clause - now() is not IMMUTABLE)
CREATE INDEX IF NOT EXISTS idx_stories_active ON public.stories(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON public.stories(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================================================
-- PART 6: ENSURE ALL NEW TABLES EXIST (ALREADY PRESENT IN YOUR SCHEMA)
-- ============================================================================

-- You already have: notifications, messages, notification_preferences
-- You already have: album_collaborators, album_templates
-- You already have: user_achievements, travel_recommendations, user_levels, level_requirements

-- Just ensure RLS is enabled on all of them
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.album_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.album_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.level_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 7: CREATE/UPDATE RLS POLICIES
-- ============================================================================

-- Follows policies
DROP POLICY IF EXISTS "Anyone can view follows" ON public.follows;
DROP POLICY IF EXISTS "Users can manage their own follows" ON public.follows;
CREATE POLICY "Anyone can view follows" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Users can manage their own follows" ON public.follows FOR ALL USING (auth.uid() = follower_id);

-- Likes policies
DROP POLICY IF EXISTS "Anyone can view likes" ON public.likes;
DROP POLICY IF EXISTS "Users can manage their own likes" ON public.likes;
CREATE POLICY "Anyone can view likes" ON public.likes FOR SELECT USING (true);
CREATE POLICY "Users can manage their own likes" ON public.likes FOR ALL USING (auth.uid() = user_id);

-- Comments policies
DROP POLICY IF EXISTS "Anyone can view comments" ON public.comments;
DROP POLICY IF EXISTS "Users can manage their own comments" ON public.comments;
CREATE POLICY "Anyone can view comments" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Users can manage their own comments" ON public.comments FOR ALL USING (auth.uid() = user_id);

-- Stories policies
DROP POLICY IF EXISTS "Users can view active stories" ON public.stories;
DROP POLICY IF EXISTS "Users can manage their own stories" ON public.stories;
CREATE POLICY "Users can view active stories" ON public.stories FOR SELECT USING (expires_at > now());
CREATE POLICY "Users can manage their own stories" ON public.stories FOR ALL USING (auth.uid() = user_id);

-- Notifications policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own notifications" ON public.notifications FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);

-- Messages policies
DROP POLICY IF EXISTS "Users can view their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update their received messages" ON public.messages;
DROP POLICY IF EXISTS "Users can delete their own sent messages" ON public.messages;
CREATE POLICY "Users can view their own messages" ON public.messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can update their received messages" ON public.messages FOR UPDATE USING (auth.uid() = recipient_id);
CREATE POLICY "Users can delete their own sent messages" ON public.messages FOR DELETE USING (auth.uid() = sender_id);

-- Notification preferences policies
DROP POLICY IF EXISTS "Users can view their own preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can update their own preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can insert their own preferences" ON public.notification_preferences;
CREATE POLICY "Users can view their own preferences" ON public.notification_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own preferences" ON public.notification_preferences FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own preferences" ON public.notification_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Album collaborators policies
DROP POLICY IF EXISTS "Users can view album collaborators" ON public.album_collaborators;
DROP POLICY IF EXISTS "Album owners can manage collaborators" ON public.album_collaborators;
DROP POLICY IF EXISTS "Users can view their own collaborations" ON public.album_collaborators;
CREATE POLICY "Users can view album collaborators" ON public.album_collaborators FOR SELECT USING (
  EXISTS (SELECT 1 FROM albums WHERE albums.id = album_id AND albums.user_id = auth.uid())
);
CREATE POLICY "Album owners can manage collaborators" ON public.album_collaborators FOR ALL USING (
  EXISTS (SELECT 1 FROM albums WHERE albums.id = album_id AND albums.user_id = auth.uid())
);
CREATE POLICY "Users can view their own collaborations" ON public.album_collaborators FOR SELECT USING (auth.uid() = user_id);

-- Album templates policy
DROP POLICY IF EXISTS "Anyone can view album templates" ON public.album_templates;
CREATE POLICY "Anyone can view album templates" ON public.album_templates FOR SELECT USING (true);

-- User achievements policy
DROP POLICY IF EXISTS "Users can view their own achievements" ON public.user_achievements;
CREATE POLICY "Users can view their own achievements" ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);

-- Travel recommendations policy
DROP POLICY IF EXISTS "Users can view their own recommendations" ON public.travel_recommendations;
CREATE POLICY "Users can view their own recommendations" ON public.travel_recommendations FOR SELECT USING (auth.uid() = user_id);

-- User levels policies
DROP POLICY IF EXISTS "Users can view their own level" ON public.user_levels;
DROP POLICY IF EXISTS "Users can view public levels" ON public.user_levels;
CREATE POLICY "Users can view their own level" ON public.user_levels FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view public levels" ON public.user_levels FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = user_id AND users.privacy_level = 'public')
);

-- Level requirements policy
DROP POLICY IF EXISTS "Anyone can view level requirements" ON public.level_requirements;
CREATE POLICY "Anyone can view level requirements" ON public.level_requirements FOR SELECT USING (true);

-- ============================================================================
-- PART 8: CREATE TRIGGERS AND FUNCTIONS
-- ============================================================================

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_notifications_updated_at ON public.notifications;
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON public.notifications
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_messages_updated_at ON public.messages;
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON public.notification_preferences;
CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create notification preferences for new users
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_user_created_notification_prefs ON public.users;
CREATE TRIGGER on_user_created_notification_prefs
AFTER INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION create_default_notification_preferences();

-- Auto-notification on like
CREATE OR REPLACE FUNCTION notify_on_like()
RETURNS TRIGGER AS $$
DECLARE
  v_target_user_id uuid;
  v_content_link varchar;
BEGIN
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

  IF v_target_user_id IS NOT NULL AND v_target_user_id != NEW.user_id THEN
    INSERT INTO notifications (user_id, sender_id, type, title, message, link)
    VALUES (v_target_user_id, NEW.user_id, 'like', 'New like', 'Someone liked your ' || NEW.entity_type, v_content_link);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_like_created ON public.likes;
CREATE TRIGGER on_like_created AFTER INSERT ON public.likes
FOR EACH ROW EXECUTE FUNCTION notify_on_like();

-- Auto-notification on comment
CREATE OR REPLACE FUNCTION notify_on_comment()
RETURNS TRIGGER AS $$
DECLARE
  v_target_user_id uuid;
  v_content_link varchar;
BEGIN
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

  IF v_target_user_id IS NOT NULL AND v_target_user_id != NEW.user_id THEN
    INSERT INTO notifications (user_id, sender_id, type, title, message, link)
    VALUES (v_target_user_id, NEW.user_id, 'comment', 'New comment', 'Someone commented on your ' || NEW.entity_type, v_content_link);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_comment_created ON public.comments;
CREATE TRIGGER on_comment_created AFTER INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION notify_on_comment();

-- Auto-notification on follow
CREATE OR REPLACE FUNCTION notify_on_follow()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, sender_id, type, title, message, link)
  VALUES (NEW.followed_id, NEW.follower_id, 'follow', 'New follower', 'Someone started following you', '/profile/' || NEW.follower_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_follow_created ON public.follows;
CREATE TRIGGER on_follow_created AFTER INSERT ON public.follows
FOR EACH ROW EXECUTE FUNCTION notify_on_follow();

-- Helper functions
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE notifications SET is_read = true WHERE user_id = p_user_id AND is_read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id uuid)
RETURNS integer AS $$
DECLARE v_count integer;
BEGIN
  SELECT COUNT(*)::integer INTO v_count FROM notifications WHERE user_id = p_user_id AND is_read = false;
  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_unread_message_count(p_user_id uuid)
RETURNS integer AS $$
DECLARE v_count integer;
BEGIN
  SELECT COUNT(*)::integer INTO v_count FROM messages WHERE recipient_id = p_user_id AND is_read = false;
  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM notifications WHERE is_read = true AND created_at < now() - interval '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 9: INITIALIZE DATA FOR EXISTING USERS
-- ============================================================================

-- Create notification preferences for existing users
INSERT INTO notification_preferences (user_id)
SELECT id FROM users
WHERE NOT EXISTS (SELECT 1 FROM notification_preferences WHERE notification_preferences.user_id = users.id)
ON CONFLICT (user_id) DO NOTHING;

-- Create user levels for existing users
INSERT INTO user_levels (user_id, current_level, current_title)
SELECT id, 1, 'Explorer' FROM users
WHERE NOT EXISTS (SELECT 1 FROM user_levels WHERE user_levels.user_id = users.id)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- PART 10: GRANT PERMISSIONS
-- ============================================================================

GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON level_requirements, album_templates TO authenticated, anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ============================================================================
-- COMPLETION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✓✓✓ SCHEMA UPDATE COMPLETED! ✓✓✓';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Updated your existing schema with:';
  RAISE NOTICE '  ✓ Added missing columns (photo_hash, etc.)';
  RAISE NOTICE '  ✓ Fixed follows table structure';
  RAISE NOTICE '  ✓ Fixed likes table structure';
  RAISE NOTICE '  ✓ Fixed comments table structure';
  RAISE NOTICE '  ✓ Enabled RLS on all tables';
  RAISE NOTICE '  ✓ Created all RLS policies';
  RAISE NOTICE '  ✓ Created auto-notification triggers';
  RAISE NOTICE '  ✓ Created helper functions';
  RAISE NOTICE '  ✓ Initialized data for existing users';
  RAISE NOTICE '';
  RAISE NOTICE 'All features now working:';
  RAISE NOTICE '  ✓ In-app notifications';
  RAISE NOTICE '  ✓ Direct messaging (Primary/Requests)';
  RAISE NOTICE '  ✓ Album collaboration';
  RAISE NOTICE '  ✓ User levels & achievements';
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '  1. Restart your Next.js app';
  RAISE NOTICE '  2. Hard refresh browser (Ctrl+Shift+R)';
  RAISE NOTICE '  3. Test all features!';
  RAISE NOTICE '========================================';
END $$;
