-- ============================================================================
-- Migration 14: New Features - Messaging, Blocking, Check-ins, Journal,
-- Travel Companions, Theme Preferences
-- ============================================================================

-- ============================================================================
-- 1. DIRECT MESSAGING
-- ============================================================================

-- Conversations (supports 1:1 and group chats)
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
  name TEXT, -- Only for group conversations
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversation participants
CREATE TABLE IF NOT EXISTS conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  is_muted BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'album_share', 'location', 'system')),
  metadata JSONB DEFAULT '{}',
  reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  is_edited BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Message read receipts
CREATE TABLE IF NOT EXISTS message_read_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

-- Indexes for messaging
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conv_participants_user ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conv_participants_conv ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_message_receipts_message ON message_read_receipts(message_id);
CREATE INDEX IF NOT EXISTS idx_message_receipts_user ON message_read_receipts(user_id);

-- ============================================================================
-- 2. USER BLOCKING & REPORTING
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('user', 'album', 'photo', 'comment', 'story', 'message')),
  target_id UUID NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'harassment', 'inappropriate', 'copyright', 'misinformation', 'other')),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
  resolution_notes TEXT,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_target ON reports(target_type, target_id);

-- ============================================================================
-- 3. LOCATION CHECK-INS
-- ============================================================================

CREATE TABLE IF NOT EXISTS check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_name TEXT NOT NULL,
  location_address TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  country_code TEXT,
  note TEXT,
  mood TEXT CHECK (mood IN ('amazing', 'happy', 'relaxed', 'exploring', 'tired', 'adventurous')),
  photo_url TEXT,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'friends', 'private')),
  album_id UUID REFERENCES albums(id) ON DELETE SET NULL,
  like_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_check_ins_user ON check_ins(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_check_ins_location ON check_ins(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_check_ins_country ON check_ins(country_code);

-- ============================================================================
-- 4. TRAVEL JOURNAL / BLOG POSTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- Markdown content
  excerpt TEXT, -- Short preview text
  cover_image_url TEXT,
  location_name TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  country_code TEXT,
  album_id UUID REFERENCES albums(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'friends', 'private')),
  reading_time_minutes INTEGER DEFAULT 1,
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_journal_user ON journal_entries(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_journal_status ON journal_entries(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_journal_tags ON journal_entries USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_journal_location ON journal_entries(country_code);

-- ============================================================================
-- 5. TRAVEL COMPANION MATCHING
-- ============================================================================

CREATE TABLE IF NOT EXISTS travel_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  travel_styles TEXT[] DEFAULT '{}', -- adventure, relaxation, culture, food, etc.
  languages TEXT[] DEFAULT '{}',
  preferred_budget TEXT CHECK (preferred_budget IN ('budget', 'moderate', 'luxury')),
  preferred_pace TEXT CHECK (preferred_pace IN ('slow', 'moderate', 'fast')),
  interests TEXT[] DEFAULT '{}', -- hiking, photography, diving, history, etc.
  upcoming_destinations TEXT[] DEFAULT '{}',
  bio_travel TEXT, -- Travel-specific bio
  is_looking_for_companions BOOLEAN DEFAULT FALSE,
  age_range_min INTEGER,
  age_range_max INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS companion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  destination TEXT,
  date_start DATE,
  date_end DATE,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sender_id, receiver_id, destination)
);

CREATE INDEX IF NOT EXISTS idx_travel_profiles_user ON travel_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_travel_profiles_looking ON travel_profiles(is_looking_for_companions) WHERE is_looking_for_companions = TRUE;
CREATE INDEX IF NOT EXISTS idx_travel_profiles_styles ON travel_profiles USING GIN(travel_styles);
CREATE INDEX IF NOT EXISTS idx_companion_requests_receiver ON companion_requests(receiver_id, status);
CREATE INDEX IF NOT EXISTS idx_companion_requests_sender ON companion_requests(sender_id);

-- ============================================================================
-- 6. USER PREFERENCES (Theme, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  accent_color TEXT DEFAULT 'teal',
  notification_likes BOOLEAN DEFAULT TRUE,
  notification_comments BOOLEAN DEFAULT TRUE,
  notification_follows BOOLEAN DEFAULT TRUE,
  notification_mentions BOOLEAN DEFAULT TRUE,
  notification_messages BOOLEAN DEFAULT TRUE,
  notification_achievements BOOLEAN DEFAULT TRUE,
  compact_mode BOOLEAN DEFAULT FALSE,
  auto_play_videos BOOLEAN DEFAULT TRUE,
  map_style TEXT DEFAULT 'standard' CHECK (map_style IN ('standard', 'satellite', 'terrain', 'dark')),
  default_album_privacy TEXT DEFAULT 'public' CHECK (default_album_privacy IN ('public', 'friends', 'private')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 7. PHOTO AI TAGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS photo_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  confidence REAL, -- 0.0 to 1.0
  source TEXT NOT NULL DEFAULT 'ai' CHECK (source IN ('ai', 'user')),
  category TEXT CHECK (category IN ('scene', 'object', 'activity', 'landscape', 'food', 'architecture', 'wildlife', 'weather', 'transport', 'people')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(photo_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_photo_tags_photo ON photo_tags(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_tags_tag ON photo_tags(tag);
CREATE INDEX IF NOT EXISTS idx_photo_tags_category ON photo_tags(category);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_read_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_tags ENABLE ROW LEVEL SECURITY;

-- Conversations: participants can view
CREATE POLICY conversations_select ON conversations FOR SELECT USING (
  EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = conversations.id AND user_id = (select auth.uid()))
);
CREATE POLICY conversations_insert ON conversations FOR INSERT WITH CHECK (created_by = (select auth.uid()));

-- Conversation participants
CREATE POLICY conv_participants_select ON conversation_participants FOR SELECT USING (
  EXISTS (SELECT 1 FROM conversation_participants cp WHERE cp.conversation_id = conversation_participants.conversation_id AND cp.user_id = (select auth.uid()))
);
CREATE POLICY conv_participants_insert ON conversation_participants FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM conversations WHERE id = conversation_id AND created_by = (select auth.uid()))
  OR user_id = (select auth.uid())
);

-- Messages: participants can view messages in their conversations
CREATE POLICY messages_select ON messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = messages.conversation_id AND user_id = (select auth.uid()))
);
CREATE POLICY messages_insert ON messages FOR INSERT WITH CHECK (
  sender_id = (select auth.uid())
  AND EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = messages.conversation_id AND user_id = (select auth.uid()))
);
CREATE POLICY messages_update ON messages FOR UPDATE USING (sender_id = (select auth.uid()));

-- Message read receipts
CREATE POLICY read_receipts_select ON message_read_receipts FOR SELECT USING (user_id = (select auth.uid()));
CREATE POLICY read_receipts_insert ON message_read_receipts FOR INSERT WITH CHECK (user_id = (select auth.uid()));

-- User blocks
CREATE POLICY blocks_select ON user_blocks FOR SELECT USING (blocker_id = (select auth.uid()));
CREATE POLICY blocks_insert ON user_blocks FOR INSERT WITH CHECK (blocker_id = (select auth.uid()));
CREATE POLICY blocks_delete ON user_blocks FOR DELETE USING (blocker_id = (select auth.uid()));

-- Reports
CREATE POLICY reports_select ON reports FOR SELECT USING (reporter_id = (select auth.uid()));
CREATE POLICY reports_insert ON reports FOR INSERT WITH CHECK (reporter_id = (select auth.uid()));

-- Check-ins: public visible, friends/private filtered in app
CREATE POLICY check_ins_select ON check_ins FOR SELECT USING (
  user_id = (select auth.uid())
  OR visibility = 'public'
  OR (visibility = 'friends' AND EXISTS (SELECT 1 FROM follows WHERE follower_id = (select auth.uid()) AND following_id = check_ins.user_id AND status = 'accepted'))
);
CREATE POLICY check_ins_insert ON check_ins FOR INSERT WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY check_ins_update ON check_ins FOR UPDATE USING (user_id = (select auth.uid()));
CREATE POLICY check_ins_delete ON check_ins FOR DELETE USING (user_id = (select auth.uid()));

-- Journal entries
CREATE POLICY journal_select ON journal_entries FOR SELECT USING (
  user_id = (select auth.uid())
  OR (status = 'published' AND visibility = 'public')
  OR (status = 'published' AND visibility = 'friends' AND EXISTS (SELECT 1 FROM follows WHERE follower_id = (select auth.uid()) AND following_id = journal_entries.user_id AND status = 'accepted'))
);
CREATE POLICY journal_insert ON journal_entries FOR INSERT WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY journal_update ON journal_entries FOR UPDATE USING (user_id = (select auth.uid()));
CREATE POLICY journal_delete ON journal_entries FOR DELETE USING (user_id = (select auth.uid()));

-- Travel profiles: visible to all authenticated users
CREATE POLICY travel_profiles_select ON travel_profiles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY travel_profiles_insert ON travel_profiles FOR INSERT WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY travel_profiles_update ON travel_profiles FOR UPDATE USING (user_id = (select auth.uid()));

-- Companion requests
CREATE POLICY companion_req_select ON companion_requests FOR SELECT USING (
  sender_id = (select auth.uid()) OR receiver_id = (select auth.uid())
);
CREATE POLICY companion_req_insert ON companion_requests FOR INSERT WITH CHECK (sender_id = (select auth.uid()));
CREATE POLICY companion_req_update ON companion_requests FOR UPDATE USING (
  sender_id = (select auth.uid()) OR receiver_id = (select auth.uid())
);

-- User preferences: own only
CREATE POLICY prefs_select ON user_preferences FOR SELECT USING (user_id = (select auth.uid()));
CREATE POLICY prefs_insert ON user_preferences FOR INSERT WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY prefs_update ON user_preferences FOR UPDATE USING (user_id = (select auth.uid()));

-- Photo tags: viewable by photo owner or public albums
CREATE POLICY photo_tags_select ON photo_tags FOR SELECT USING (
  EXISTS (SELECT 1 FROM photos WHERE id = photo_tags.photo_id AND user_id = (select auth.uid()))
  OR EXISTS (
    SELECT 1 FROM photos p JOIN albums a ON p.album_id = a.id
    WHERE p.id = photo_tags.photo_id AND a.visibility = 'public'
  )
);
CREATE POLICY photo_tags_insert ON photo_tags FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM photos WHERE id = photo_tags.photo_id AND user_id = (select auth.uid()))
);
CREATE POLICY photo_tags_delete ON photo_tags FOR DELETE USING (
  EXISTS (SELECT 1 FROM photos WHERE id = photo_tags.photo_id AND user_id = (select auth.uid()))
);
