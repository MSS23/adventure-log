-- Fix missing columns in social tables
-- This migration adds columns that may be missing from production database

-- Add target_id column to likes table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'likes'
        AND column_name = 'target_id'
    ) THEN
        ALTER TABLE public.likes
        ADD COLUMN target_id UUID NOT NULL;
    END IF;
END $$;

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
        ADD COLUMN target_type TEXT NOT NULL DEFAULT 'album';

        -- Add CHECK constraint separately
        ALTER TABLE public.likes
        ADD CONSTRAINT likes_target_type_check
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
        ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';

        -- Add CHECK constraint separately
        ALTER TABLE public.followers
        ADD CONSTRAINT followers_status_check
        CHECK (status IN ('pending', 'accepted', 'rejected'));

        -- Create index for better query performance
        CREATE INDEX IF NOT EXISTS idx_followers_status ON public.followers(status);
    END IF;
END $$;

-- Ensure indexes exist for common query patterns
CREATE INDEX IF NOT EXISTS idx_likes_user_target ON public.likes(user_id, target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_followers_following_status ON public.followers(following_id, status);
CREATE INDEX IF NOT EXISTS idx_followers_follower_status ON public.followers(follower_id, status);
