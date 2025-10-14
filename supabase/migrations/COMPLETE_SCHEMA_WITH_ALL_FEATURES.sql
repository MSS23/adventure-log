-- ============================================================================
-- ADVENTURE LOG: COMPLETE DATABASE SCHEMA (With All Features)
-- ============================================================================
-- This migration includes ALL tables and features for Adventure Log:
-- - Core: users, albums, photos
-- - Social: likes, comments, follows, stories
-- - Advanced: notifications, messaging, collaborations, achievements
-- - System: user levels, album sharing, cover photo positioning
-- ============================================================================

-- ============================================================================
-- 1. USERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  display_name text,
  bio text,
  avatar_url text,
  website text,
  location text,
  privacy_level text DEFAULT 'public' CHECK (privacy_level IN ('public', 'private', 'friends')),
  email text,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON public.users(deleted_at) WHERE deleted_at IS NOT NULL;

-- ============================================================================
-- 2. ALBUMS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.albums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  location_name text,
  location_country text,
  country_code text,
  latitude double precision,
  longitude double precision,
  date_start date,
  date_end date,
  start_date date, -- Alias
  end_date date,   -- Alias
  cover_photo_url text,
  cover_image_url text, -- Alias
  cover_photo_position jsonb DEFAULT '{"x": 50, "y": 50, "zoom": 1}'::jsonb,
  visibility text DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'friends')),
  status text DEFAULT 'published' CHECK (status IN ('draft', 'published')),
  photo_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_albums_user_id ON public.albums(user_id);
CREATE INDEX IF NOT EXISTS idx_albums_created_at ON public.albums(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_albums_visibility ON public.albums(visibility);
CREATE INDEX IF NOT EXISTS idx_albums_status ON public.albums(status);
CREATE INDEX IF NOT EXISTS idx_albums_location ON public.albums(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- ============================================================================
-- 3. PHOTOS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id uuid NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  storage_path text, -- Alias
  title text,
  caption text,
  description text,
  latitude double precision,
  longitude double precision,
  taken_at timestamp with time zone,
  exif_data jsonb,
  order_index integer DEFAULT 0,
  photo_hash text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_photos_album_id ON public.photos(album_id);
CREATE INDEX IF NOT EXISTS idx_photos_user_id ON public.photos(user_id);
CREATE INDEX IF NOT EXISTS idx_photos_order ON public.photos(album_id, order_index);
CREATE INDEX IF NOT EXISTS idx_photos_hash ON public.photos(photo_hash);

-- ============================================================================
-- 4. FOLLOWS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.follows (
  follower_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  followed_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (follower_id, followed_id),
  CONSTRAINT no_self_follow CHECK (follower_id != followed_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_followed ON public.follows(followed_id);

-- ============================================================================
-- 5. LIKES TABLE (Polymorphic)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('album', 'photo', 'story', 'comment')),
  entity_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_user_id ON public.likes(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_entity ON public.likes(entity_type, entity_id);

-- ============================================================================
-- 6. COMMENTS TABLE (Polymorphic)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('album', 'photo', 'story')),
  entity_id uuid NOT NULL,
  text text NOT NULL,
  content text, -- Alias
  parent_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_entity ON public.comments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON public.comments(parent_id);

-- ============================================================================
-- 7. STORIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  album_id uuid REFERENCES public.albums(id) ON DELETE SET NULL,
  media_url text NOT NULL,
  image_url text, -- Alias
  media_type text DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  caption text,
  expires_at timestamp with time zone DEFAULT (now() + interval '24 hours'),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_stories_user_id ON public.stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON public.stories(expires_at);
CREATE INDEX IF NOT EXISTS idx_stories_active ON public.stories(user_id, created_at DESC) WHERE expires_at > now();

-- ============================================================================
-- 8. NOTIFICATIONS TABLE (In-App Only)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
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

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);

-- ============================================================================
-- 9. MESSAGES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT no_self_messaging CHECK (sender_id != recipient_id)
);

CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON public.messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON public.messages(is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(sender_id, recipient_id, created_at DESC);

-- ============================================================================
-- 10. NOTIFICATION PREFERENCES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  likes_enabled boolean DEFAULT true,
  comments_enabled boolean DEFAULT true,
  follows_enabled boolean DEFAULT true,
  messages_enabled boolean DEFAULT true,
  collaborations_enabled boolean DEFAULT true,
  achievements_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 11. ALBUM COLLABORATORS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.album_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id uuid NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role varchar(20) NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  status varchar(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  invited_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(album_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_album_collaborators_album ON public.album_collaborators(album_id);
CREATE INDEX IF NOT EXISTS idx_album_collaborators_user ON public.album_collaborators(user_id);

-- ============================================================================
-- 12. ALBUM TEMPLATES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.album_templates (
  id varchar(50) PRIMARY KEY,
  name varchar(100) NOT NULL,
  description text,
  default_title varchar(200),
  suggested_tags text[],
  icon varchar(50),
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 13. USER ACHIEVEMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  achievement_type varchar(50) NOT NULL,
  achievement_name varchar(200) NOT NULL,
  description text,
  icon_emoji varchar(10),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON public.user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_type ON public.user_achievements(achievement_type);

-- ============================================================================
-- 14. TRAVEL RECOMMENDATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.travel_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  recommended_location varchar(200) NOT NULL,
  country varchar(100),
  reason text,
  match_score integer CHECK (match_score >= 0 AND match_score <= 100),
  expires_at timestamptz DEFAULT (now() + interval '30 days'),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_travel_recommendations_user ON public.travel_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_travel_recommendations_expires ON public.travel_recommendations(expires_at);

-- ============================================================================
-- 15. ALBUM SHARES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.album_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id uuid NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
  shared_by uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  shared_with uuid REFERENCES public.users(id) ON DELETE CASCADE,
  share_token text UNIQUE,
  permission_level text DEFAULT 'view' CHECK (permission_level IN ('view', 'contribute', 'edit')),
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_album_shares_album_id ON public.album_shares(album_id);
CREATE INDEX IF NOT EXISTS idx_album_shares_token ON public.album_shares(share_token);

-- ============================================================================
-- 16. USER LEVELS TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.level_requirements (
  level integer PRIMARY KEY CHECK (level >= 1),
  title text NOT NULL,
  experience_required integer NOT NULL DEFAULT 0,
  albums_required integer NOT NULL DEFAULT 0,
  countries_required integer NOT NULL DEFAULT 0,
  photos_required integer NOT NULL DEFAULT 0,
  description text
);

CREATE TABLE IF NOT EXISTS public.user_levels (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  current_level integer NOT NULL DEFAULT 1 CHECK (current_level >= 1),
  current_title text NOT NULL DEFAULT 'Explorer',
  total_experience integer NOT NULL DEFAULT 0,
  albums_created integer NOT NULL DEFAULT 0,
  countries_visited integer NOT NULL DEFAULT 0,
  photos_uploaded integer NOT NULL DEFAULT 0,
  social_interactions integer NOT NULL DEFAULT 0,
  level_up_date timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_levels_level ON public.user_levels(current_level);

-- ============================================================================
-- 17. ROW LEVEL SECURITY (RLS) - ENABLE
-- ============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.album_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.album_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.album_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.level_requirements ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 18. RLS POLICIES - USERS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view public profiles" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;

CREATE POLICY "Users can view their own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can view public profiles" ON public.users FOR SELECT USING (privacy_level = 'public' AND deleted_at IS NULL);
CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================================================
-- 19. RLS POLICIES - ALBUMS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own albums" ON public.albums;
DROP POLICY IF EXISTS "Users can view public albums" ON public.albums;
DROP POLICY IF EXISTS "Users can manage their own albums" ON public.albums;

CREATE POLICY "Users can view their own albums" ON public.albums FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view public albums" ON public.albums FOR SELECT USING (visibility = 'public' AND status = 'published');
CREATE POLICY "Users can manage their own albums" ON public.albums FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- 20. RLS POLICIES - PHOTOS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view photos in accessible albums" ON public.photos;
DROP POLICY IF EXISTS "Users can manage their own photos" ON public.photos;

CREATE POLICY "Users can view photos in accessible albums" ON public.photos FOR SELECT USING (
  EXISTS (SELECT 1 FROM albums WHERE albums.id = photos.album_id AND (albums.visibility = 'public' OR albums.user_id = auth.uid()))
);
CREATE POLICY "Users can manage their own photos" ON public.photos FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- 21. RLS POLICIES - FOLLOWS
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view follows" ON public.follows;
DROP POLICY IF EXISTS "Users can manage their own follows" ON public.follows;

CREATE POLICY "Anyone can view follows" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Users can manage their own follows" ON public.follows FOR ALL USING (auth.uid() = follower_id);

-- ============================================================================
-- 22. RLS POLICIES - LIKES
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view likes" ON public.likes;
DROP POLICY IF EXISTS "Users can manage their own likes" ON public.likes;

CREATE POLICY "Anyone can view likes" ON public.likes FOR SELECT USING (true);
CREATE POLICY "Users can manage their own likes" ON public.likes FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- 23. RLS POLICIES - COMMENTS
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view comments" ON public.comments;
DROP POLICY IF EXISTS "Users can manage their own comments" ON public.comments;

CREATE POLICY "Anyone can view comments" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Users can manage their own comments" ON public.comments FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- 24. RLS POLICIES - STORIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view active stories" ON public.stories;
DROP POLICY IF EXISTS "Users can manage their own stories" ON public.stories;

CREATE POLICY "Users can view active stories" ON public.stories FOR SELECT USING (expires_at > now());
CREATE POLICY "Users can manage their own stories" ON public.stories FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- 25. RLS POLICIES - NOTIFICATIONS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own notifications" ON public.notifications FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);

-- ============================================================================
-- 26. RLS POLICIES - MESSAGES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update their received messages" ON public.messages;
DROP POLICY IF EXISTS "Users can delete their own sent messages" ON public.messages;

CREATE POLICY "Users can view their own messages" ON public.messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can update their received messages" ON public.messages FOR UPDATE USING (auth.uid() = recipient_id);
CREATE POLICY "Users can delete their own sent messages" ON public.messages FOR DELETE USING (auth.uid() = sender_id);

-- ============================================================================
-- 27. RLS POLICIES - NOTIFICATION PREFERENCES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can update their own preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can insert their own preferences" ON public.notification_preferences;

CREATE POLICY "Users can view their own preferences" ON public.notification_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own preferences" ON public.notification_preferences FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own preferences" ON public.notification_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 28. RLS POLICIES - COLLABORATORS
-- ============================================================================

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

-- ============================================================================
-- 29. RLS POLICIES - OTHER TABLES
-- ============================================================================

-- Album templates (public)
DROP POLICY IF EXISTS "Anyone can view album templates" ON public.album_templates;
CREATE POLICY "Anyone can view album templates" ON public.album_templates FOR SELECT USING (true);

-- User achievements
DROP POLICY IF EXISTS "Users can view their own achievements" ON public.user_achievements;
CREATE POLICY "Users can view their own achievements" ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);

-- Travel recommendations
DROP POLICY IF EXISTS "Users can view their own recommendations" ON public.travel_recommendations;
CREATE POLICY "Users can view their own recommendations" ON public.travel_recommendations FOR SELECT USING (auth.uid() = user_id);

-- Album shares
DROP POLICY IF EXISTS "Users can view shares for their albums" ON public.album_shares;
CREATE POLICY "Users can view shares for their albums" ON public.album_shares FOR SELECT USING (
  auth.uid() = shared_by OR auth.uid() = shared_with
);

-- User levels
DROP POLICY IF EXISTS "Users can view their own level" ON public.user_levels;
DROP POLICY IF EXISTS "Users can view public levels" ON public.user_levels;
CREATE POLICY "Users can view their own level" ON public.user_levels FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view public levels" ON public.user_levels FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = user_id AND users.privacy_level = 'public')
);

-- Level requirements (public)
DROP POLICY IF EXISTS "Anyone can view level requirements" ON public.level_requirements;
CREATE POLICY "Anyone can view level requirements" ON public.level_requirements FOR SELECT USING (true);

-- ============================================================================
-- 30. TRIGGERS - AUTO-UPDATE TIMESTAMPS
-- ============================================================================

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

-- ============================================================================
-- 31. TRIGGERS - AUTO-CREATE NOTIFICATION PREFERENCES
-- ============================================================================

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

-- ============================================================================
-- 32. TRIGGERS - AUTO-NOTIFICATIONS
-- ============================================================================

-- Notify on new like
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
    VALUES (
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

DROP TRIGGER IF EXISTS on_like_created ON public.likes;
CREATE TRIGGER on_like_created AFTER INSERT ON public.likes
FOR EACH ROW EXECUTE FUNCTION notify_on_like();

-- Notify on new comment
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
    VALUES (
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

DROP TRIGGER IF EXISTS on_comment_created ON public.comments;
CREATE TRIGGER on_comment_created AFTER INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION notify_on_comment();

-- Notify on new follower
CREATE OR REPLACE FUNCTION notify_on_follow()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, sender_id, type, title, message, link)
  VALUES (
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

DROP TRIGGER IF EXISTS on_follow_created ON public.follows;
CREATE TRIGGER on_follow_created AFTER INSERT ON public.follows
FOR EACH ROW EXECUTE FUNCTION notify_on_follow();

-- ============================================================================
-- 33. HELPER FUNCTIONS
-- ============================================================================

-- Mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE notifications
  SET is_read = true
  WHERE user_id = p_user_id AND is_read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get unread notification count
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

-- Get unread message count
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

-- Cleanup old notifications
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM notifications
  WHERE is_read = true
    AND created_at < now() - interval '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 34. INSERT DEFAULT DATA
-- ============================================================================

-- Insert level requirements
INSERT INTO level_requirements (level, title, experience_required, albums_required, countries_required, photos_required, description)
VALUES
  (1, 'Explorer', 0, 0, 0, 0, 'Welcome to your adventure journey!'),
  (2, 'Wanderer', 500, 3, 1, 20, 'First steps into the world.'),
  (3, 'Adventurer', 1500, 8, 3, 50, 'Discovering new places.'),
  (4, 'Voyager', 3000, 15, 5, 100, 'Building travel memories.'),
  (5, 'Navigator', 5500, 25, 8, 200, 'Growing confidence.'),
  (6, 'Trailblazer', 9000, 40, 12, 350, 'Forging your own path.'),
  (7, 'Globetrotter', 14000, 60, 18, 550, 'The world is your playground.'),
  (8, 'World Traveler', 21000, 85, 25, 800, 'Seen more than most.'),
  (9, 'Explorer Elite', 30000, 120, 35, 1200, 'Inspiring others.'),
  (10, 'Legend', 45000, 175, 50, 1750, 'Legendary explorer status!')
ON CONFLICT (level) DO NOTHING;

-- Insert album templates
INSERT INTO album_templates (id, name, description, default_title, suggested_tags, icon)
VALUES
  ('weekend-getaway', 'Weekend Getaway', 'Quick weekend trip', 'Weekend in [City]', ARRAY['weekend', 'short-trip'], '🏖️'),
  ('city-explorer', 'City Explorer', 'Urban exploration', '[City] Adventures', ARRAY['city', 'urban', 'culture'], '🏙️'),
  ('nature-adventure', 'Nature Adventure', 'Outdoor activities', '[Location] Nature Trip', ARRAY['nature', 'hiking', 'outdoor'], '🏔️'),
  ('international-journey', 'International Journey', 'Cross-border travel', '[Country] Journey', ARRAY['international', 'culture', 'adventure'], '✈️'),
  ('culinary-tour', 'Culinary Tour', 'Food-focused travel', 'Tastes of [City]', ARRAY['food', 'culinary', 'restaurants'], '🍽️'),
  ('romantic-escape', 'Romantic Escape', 'Couples getaway', 'Romantic [Location]', ARRAY['romance', 'couples', 'honeymoon'], '💑')
ON CONFLICT (id) DO NOTHING;

-- Initialize user_levels for existing users
INSERT INTO user_levels (user_id, current_level, current_title)
SELECT id, 1, 'Explorer'
FROM users
WHERE NOT EXISTS (SELECT 1 FROM user_levels WHERE user_levels.user_id = users.id)
ON CONFLICT (user_id) DO NOTHING;

-- Initialize notification preferences for existing users
INSERT INTO notification_preferences (user_id)
SELECT id
FROM users
WHERE NOT EXISTS (SELECT 1 FROM notification_preferences WHERE notification_preferences.user_id = users.id)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- 35. GRANT PERMISSIONS
-- ============================================================================

GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON level_requirements, album_templates TO authenticated, anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ Adventure Log Complete Schema Setup!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tables created:';
  RAISE NOTICE '  ✓ Core: users, albums, photos';
  RAISE NOTICE '  ✓ Social: follows, likes, comments, stories';
  RAISE NOTICE '  ✓ Messaging: notifications, messages';
  RAISE NOTICE '  ✓ Advanced: collaborators, achievements, recommendations';
  RAISE NOTICE '  ✓ System: user_levels, album_shares, templates';
  RAISE NOTICE '';
  RAISE NOTICE 'Features enabled:';
  RAISE NOTICE '  ✓ In-app notifications (Instagram-style)';
  RAISE NOTICE '  ✓ Direct messaging with filtered inbox';
  RAISE NOTICE '  ✓ Album collaboration with roles';
  RAISE NOTICE '  ✓ User level system (10 levels)';
  RAISE NOTICE '  ✓ Travel recommendations';
  RAISE NOTICE '  ✓ Quick album templates';
  RAISE NOTICE '';
  RAISE NOTICE 'Security:';
  RAISE NOTICE '  ✓ Row Level Security enabled on all tables';
  RAISE NOTICE '  ✓ Proper policies for data access';
  RAISE NOTICE '  ✓ Auto-notification triggers configured';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Restart your application';
  RAISE NOTICE '  2. Hard refresh browser (Ctrl+Shift+R)';
  RAISE NOTICE '  3. Test all features!';
  RAISE NOTICE '========================================';
END $$;
