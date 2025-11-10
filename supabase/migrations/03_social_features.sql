-- ============================================================================
-- SOCIAL FEATURES MIGRATION
-- ============================================================================
-- Description: User mentions, hashtags, activity feed, search history, and 2FA
-- Version: 1.0
-- Date: 2025-02-01
-- ============================================================================

-- ============================================================================
-- TABLE: mentions
-- Purpose: Track @username mentions in comments and notifications
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, mentioned_user_id)
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_mentions_user ON public.mentions(mentioned_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mentions_comment ON public.mentions(comment_id);

-- Enable RLS
ALTER TABLE public.mentions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can view mentions where they're mentioned
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'mentions'
    AND policyname = 'Users can view their mentions'
  ) THEN
    CREATE POLICY "Users can view their mentions"
      ON public.mentions FOR SELECT
      USING (auth.uid() = mentioned_user_id OR auth.uid() = user_id);
  END IF;
END $$;

-- Anyone can create mentions
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'mentions'
    AND policyname = 'Authenticated users can create mentions'
  ) THEN
    CREATE POLICY "Authenticated users can create mentions"
      ON public.mentions FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================================
-- TABLE: hashtags
-- Purpose: Store unique hashtags with usage tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.hashtags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag TEXT NOT NULL UNIQUE,
  usage_count INTEGER DEFAULT 1,
  trending_rank INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint on lowercase tag
CREATE UNIQUE INDEX IF NOT EXISTS idx_hashtags_tag_lower ON public.hashtags(LOWER(tag));

-- Index for trending
CREATE INDEX IF NOT EXISTS idx_hashtags_trending ON public.hashtags(trending_rank NULLS LAST, usage_count DESC);

-- Enable RLS
ALTER TABLE public.hashtags ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Everyone can view hashtags
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'hashtags'
    AND policyname = 'Everyone can view hashtags'
  ) THEN
    CREATE POLICY "Everyone can view hashtags"
      ON public.hashtags FOR SELECT
      USING (true);
  END IF;
END $$;

-- Service role can manage hashtags
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'hashtags'
    AND policyname = 'Service role can manage hashtags'
  ) THEN
    CREATE POLICY "Service role can manage hashtags"
      ON public.hashtags FOR ALL
      USING (auth.jwt()->>'role' = 'service_role');
  END IF;
END $$;

-- ============================================================================
-- TABLE: album_hashtags
-- Purpose: Many-to-many relationship between albums and hashtags
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.album_hashtags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id UUID NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
  hashtag_id UUID NOT NULL REFERENCES public.hashtags(id) ON DELETE CASCADE,
  added_by_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(album_id, hashtag_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_album_hashtags_album ON public.album_hashtags(album_id);
CREATE INDEX IF NOT EXISTS idx_album_hashtags_hashtag ON public.album_hashtags(hashtag_id);

-- Enable RLS
ALTER TABLE public.album_hashtags ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Everyone can view
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'album_hashtags'
    AND policyname = 'Everyone can view album hashtags'
  ) THEN
    CREATE POLICY "Everyone can view album hashtags"
      ON public.album_hashtags FOR SELECT
      USING (true);
  END IF;
END $$;

-- Album owners can manage their album hashtags
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'album_hashtags'
    AND policyname = 'Album owners can manage hashtags'
  ) THEN
    CREATE POLICY "Album owners can manage hashtags"
      ON public.album_hashtags FOR ALL
      USING (
        auth.uid() IN (
          SELECT user_id FROM public.albums WHERE id = album_hashtags.album_id
        )
      );
  END IF;
END $$;

-- ============================================================================
-- TABLE: search_history
-- Purpose: Track user search queries for autocomplete and analytics
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  search_type TEXT CHECK (search_type IN ('album', 'hashtag', 'user', 'location')),
  result_id UUID,
  result_clicked BOOLEAN DEFAULT FALSE,
  searched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_search_history_user ON public.search_history(user_id, searched_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_history_query ON public.search_history(query);

-- Enable RLS
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only view their own search history
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'search_history'
    AND policyname = 'Users can view own search history'
  ) THEN
    CREATE POLICY "Users can view own search history"
      ON public.search_history FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Users can insert their own searches
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'search_history'
    AND policyname = 'Users can create search history'
  ) THEN
    CREATE POLICY "Users can create search history"
      ON public.search_history FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Users can delete their own history
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'search_history'
    AND policyname = 'Users can delete own search history'
  ) THEN
    CREATE POLICY "Users can delete own search history"
      ON public.search_history FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================================
-- TABLE: activity_feed
-- Purpose: Social activity stream for user engagement
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'album_created', 'album_liked', 'album_commented',
    'user_followed', 'user_mentioned', 'country_visited'
  )),
  target_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  target_album_id UUID REFERENCES public.albums(id) ON DELETE CASCADE,
  target_comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_activity_feed_user ON public.activity_feed(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_feed_target_user ON public.activity_feed(target_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_feed_type ON public.activity_feed(activity_type, created_at DESC);

-- Enable RLS
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can view activities from users they follow or activities targeting them
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'activity_feed'
    AND policyname = 'Users can view relevant activities'
  ) THEN
    CREATE POLICY "Users can view relevant activities"
      ON public.activity_feed FOR SELECT
      USING (
        -- Activities from users you follow
        user_id IN (
          SELECT following_id FROM public.follows
          WHERE follower_id = auth.uid() AND status = 'approved'
        )
        OR
        -- Activities targeting you
        target_user_id = auth.uid()
        OR
        -- Your own activities
        user_id = auth.uid()
      );
  END IF;
END $$;

-- Users can create activities
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'activity_feed'
    AND policyname = 'Users can create activities'
  ) THEN
    CREATE POLICY "Users can create activities"
      ON public.activity_feed FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Users can update their own activity read status
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'activity_feed'
    AND policyname = 'Users can update activity read status'
  ) THEN
    CREATE POLICY "Users can update activity read status"
      ON public.activity_feed FOR UPDATE
      USING (target_user_id = auth.uid())
      WITH CHECK (target_user_id = auth.uid());
  END IF;
END $$;

-- ============================================================================
-- TABLE: two_factor_auth
-- Purpose: Store 2FA secrets and backup codes for user accounts
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.two_factor_auth (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  secret TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT FALSE,
  backup_codes TEXT[], -- Array of hashed backup codes
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_2fa_user ON public.two_factor_auth(user_id);
CREATE INDEX IF NOT EXISTS idx_2fa_enabled ON public.two_factor_auth(is_enabled);

-- Enable RLS
ALTER TABLE public.two_factor_auth ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only view their own 2FA settings
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'two_factor_auth'
    AND policyname = 'Users can view own 2FA settings'
  ) THEN
    CREATE POLICY "Users can view own 2FA settings"
      ON public.two_factor_auth FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Users can manage their own 2FA
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'two_factor_auth'
    AND policyname = 'Users can manage own 2FA'
  ) THEN
    CREATE POLICY "Users can manage own 2FA"
      ON public.two_factor_auth FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================================
-- FUNCTIONS: Hashtag Management
-- ============================================================================

-- Function to get or create hashtag
CREATE OR REPLACE FUNCTION public.get_or_create_hashtag(p_tag TEXT)
RETURNS UUID AS $$
DECLARE
  v_hashtag_id UUID;
  v_normalized_tag TEXT;
BEGIN
  -- Normalize tag (lowercase, trim, remove #)
  v_normalized_tag := LOWER(TRIM(BOTH FROM REPLACE(p_tag, '#', '')));

  -- Try to get existing hashtag
  SELECT id INTO v_hashtag_id
  FROM public.hashtags
  WHERE LOWER(tag) = v_normalized_tag;

  -- If not found, create it
  IF v_hashtag_id IS NULL THEN
    INSERT INTO public.hashtags (tag, usage_count)
    VALUES (v_normalized_tag, 1)
    RETURNING id INTO v_hashtag_id;
  ELSE
    -- Increment usage count
    UPDATE public.hashtags
    SET usage_count = usage_count + 1,
        updated_at = NOW()
    WHERE id = v_hashtag_id;
  END IF;

  RETURN v_hashtag_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update trending hashtags
CREATE OR REPLACE FUNCTION public.update_trending_hashtags()
RETURNS void AS $$
BEGIN
  -- Reset all trending ranks
  UPDATE public.hashtags SET trending_rank = NULL;

  -- Set trending rank for top 50 hashtags by recent usage
  WITH trending AS (
    SELECT h.id,
           ROW_NUMBER() OVER (ORDER BY h.usage_count DESC, h.updated_at DESC) as rank
    FROM public.hashtags h
    WHERE h.updated_at > NOW() - INTERVAL '7 days'
    LIMIT 50
  )
  UPDATE public.hashtags
  SET trending_rank = trending.rank
  FROM trending
  WHERE hashtags.id = trending.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old search history (keep last 50 per user)
CREATE OR REPLACE FUNCTION public.cleanup_search_history()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  WITH old_searches AS (
    SELECT id
    FROM (
      SELECT id,
             ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY searched_at DESC) as rn
      FROM public.search_history
    ) sub
    WHERE rn > 50
  )
  DELETE FROM public.search_history
  WHERE id IN (SELECT id FROM old_searches)
  RETURNING * INTO v_deleted_count;

  RETURN COALESCE(v_deleted_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGERS: Auto-create activity feed entries
-- ============================================================================

-- Trigger for album creation
CREATE OR REPLACE FUNCTION public.create_album_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.activity_feed (
    user_id,
    activity_type,
    target_album_id,
    metadata
  ) VALUES (
    NEW.user_id,
    'album_created',
    NEW.id,
    jsonb_build_object(
      'album_title', NEW.title,
      'location', NEW.location_name,
      'country_code', NEW.country_code
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trigger_album_activity'
  ) THEN
    CREATE TRIGGER trigger_album_activity
      AFTER INSERT ON public.albums
      FOR EACH ROW
      EXECUTE FUNCTION public.create_album_activity();
  END IF;
END $$;

-- Trigger for mentions
CREATE OR REPLACE FUNCTION public.create_mention_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.activity_feed (
    user_id,
    activity_type,
    target_user_id,
    target_comment_id,
    metadata
  ) VALUES (
    NEW.user_id,
    'user_mentioned',
    NEW.mentioned_user_id,
    NEW.comment_id,
    jsonb_build_object('mention_id', NEW.id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trigger_mention_activity'
  ) THEN
    CREATE TRIGGER trigger_mention_activity
      AFTER INSERT ON public.mentions
      FOR EACH ROW
      EXECUTE FUNCTION public.create_mention_activity();
  END IF;
END $$;

-- ============================================================================
-- GRANTS: Ensure proper permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.get_or_create_hashtag TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_trending_hashtags TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_search_history TO service_role;

-- ============================================================================
-- COMMENTS: Documentation
-- ============================================================================

COMMENT ON TABLE public.mentions IS 'Track @username mentions in comments for notifications';
COMMENT ON TABLE public.hashtags IS 'Store unique hashtags with usage tracking and trending rankings';
COMMENT ON TABLE public.album_hashtags IS 'Many-to-many relationship between albums and hashtags';
COMMENT ON TABLE public.search_history IS 'Track user search queries for autocomplete and analytics';
COMMENT ON TABLE public.activity_feed IS 'Social activity stream showing user engagement (likes, comments, follows, mentions)';
COMMENT ON TABLE public.two_factor_auth IS 'Store 2FA TOTP secrets and backup codes for enhanced security';

COMMENT ON FUNCTION public.get_or_create_hashtag IS 'Get existing hashtag or create new one, incrementing usage count';
COMMENT ON FUNCTION public.update_trending_hashtags IS 'Update trending rankings for top 50 hashtags based on recent usage';
COMMENT ON FUNCTION public.cleanup_search_history IS 'Remove old search history entries, keeping last 50 per user';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
