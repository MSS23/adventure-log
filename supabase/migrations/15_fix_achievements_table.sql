-- ============================================================================
-- FIX ACHIEVEMENTS TABLE
-- ============================================================================
-- Description: Fix achievements table to support all achievement types and
--              add seasonal/yearly achievement support
-- Version: 1.0
-- Date: 2025-02-06
-- ============================================================================
-- Issues Fixed:
-- 1. Remove restrictive CHECK constraint that only allowed 6 achievement types
-- 2. Add year/season columns for future seasonal/yearly achievements
-- 3. Update unique constraint to allow same achievement in different periods
-- ============================================================================

-- Create table if it doesn't exist (for fresh installs)
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  achievement_type VARCHAR NOT NULL,
  achievement_name VARCHAR NOT NULL,
  description TEXT,
  icon_emoji VARCHAR,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- New fields for seasonal/yearly achievements
  achievement_year INTEGER,  -- NULL for permanent achievements
  achievement_season VARCHAR(20),  -- 'spring', 'summer', 'fall', 'winter', or NULL
  metadata JSONB DEFAULT '{}'
);

-- Add new columns if table already exists (safe migration)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_achievements' AND column_name = 'achievement_year') THEN
    ALTER TABLE public.user_achievements ADD COLUMN achievement_year INTEGER;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_achievements' AND column_name = 'achievement_season') THEN
    ALTER TABLE public.user_achievements ADD COLUMN achievement_season VARCHAR(20);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_achievements' AND column_name = 'metadata') THEN
    ALTER TABLE public.user_achievements ADD COLUMN metadata JSONB DEFAULT '{}';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_achievements' AND column_name = 'created_at') THEN
    ALTER TABLE public.user_achievements ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;

-- Drop the restrictive CHECK constraint if it exists
-- This constraint only allowed 6 types but the code defines 24+
ALTER TABLE public.user_achievements DROP CONSTRAINT IF EXISTS user_achievements_achievement_type_check;

-- Drop old unique constraint to replace with new one
ALTER TABLE public.user_achievements DROP CONSTRAINT IF EXISTS user_achievements_unique;

-- Remove duplicate achievements before adding unique constraint
-- Keeps the earliest earned achievement for each user/type/year/season combination
DELETE FROM public.user_achievements
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY user_id, achievement_type,
                          COALESCE(achievement_year::text, 'null'),
                          COALESCE(achievement_season, 'null')
             ORDER BY earned_at ASC, created_at ASC
           ) as rn
    FROM public.user_achievements
  ) duplicates
  WHERE rn > 1
);

-- Create new unique constraint that allows seasonal variants
-- Same achievement can now be earned in different years/seasons
-- NULL values are treated as distinct, so permanent achievements (NULL year/season) work correctly
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_achievements_unique_with_period'
  ) THEN
    ALTER TABLE public.user_achievements
      ADD CONSTRAINT user_achievements_unique_with_period
      UNIQUE NULLS NOT DISTINCT (user_id, achievement_type, achievement_year, achievement_season);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON public.user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_type ON public.user_achievements(achievement_type);
CREATE INDEX IF NOT EXISTS idx_user_achievements_year ON public.user_achievements(achievement_year);
CREATE INDEX IF NOT EXISTS idx_user_achievements_season ON public.user_achievements(achievement_season);
CREATE INDEX IF NOT EXISTS idx_user_achievements_earned ON public.user_achievements(earned_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Users can view their own achievements
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_achievements'
    AND policyname = 'Users can view own achievements'
  ) THEN
    CREATE POLICY "Users can view own achievements"
      ON public.user_achievements FOR SELECT
      USING ((SELECT auth.uid()) = user_id);
  END IF;
END $$;

-- Anyone can view achievements (for profile pages)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_achievements'
    AND policyname = 'Anyone can view achievements'
  ) THEN
    CREATE POLICY "Anyone can view achievements"
      ON public.user_achievements FOR SELECT
      USING (true);
  END IF;
END $$;

-- Users/service can insert their own achievements
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_achievements'
    AND policyname = 'Users can earn achievements'
  ) THEN
    CREATE POLICY "Users can earn achievements"
      ON public.user_achievements FOR INSERT
      WITH CHECK ((SELECT auth.uid()) = user_id);
  END IF;
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.user_achievements IS 'User earned achievements with support for seasonal/yearly variants';
COMMENT ON COLUMN public.user_achievements.achievement_type IS 'Achievement type identifier (e.g., first_album, photos_100, winter_explorer)';
COMMENT ON COLUMN public.user_achievements.achievement_year IS 'Year for yearly achievements (NULL for permanent achievements)';
COMMENT ON COLUMN public.user_achievements.achievement_season IS 'Season for seasonal achievements: spring, summer, fall, winter (NULL for permanent)';
COMMENT ON COLUMN public.user_achievements.metadata IS 'Additional metadata about how the achievement was earned';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
