-- Fix missing columns in social tables
-- This migration adds columns that may be missing from production database

-- Add target_type column to likes table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'likes'
        AND column_name = 'target_type'
    ) THEN
        ALTER TABLE public.likes
        ADD COLUMN target_type TEXT NOT NULL DEFAULT 'album'
        CHECK (target_type IN ('photo', 'album', 'comment', 'story'));

        -- Create index for better query performance
        CREATE INDEX IF NOT EXISTS idx_likes_target_type ON public.likes(target_type);
    END IF;
END $$;

-- Add status column to followers table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'followers'
        AND column_name = 'status'
    ) THEN
        ALTER TABLE public.followers
        ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'rejected'));

        -- Create index for better query performance
        CREATE INDEX IF NOT EXISTS idx_followers_status ON public.followers(status);
    END IF;
END $$;

-- Ensure indexes exist for common query patterns
CREATE INDEX IF NOT EXISTS idx_likes_user_target ON public.likes(user_id, target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_followers_following_status ON public.followers(following_id, status);
CREATE INDEX IF NOT EXISTS idx_followers_follower_status ON public.followers(follower_id, status);
