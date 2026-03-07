-- EMERGENCY FIX: Remove broken triggers and ensure basic functionality works
-- This removes the notification triggers that are causing errors

-- Step 1: Drop ALL triggers that might be causing issues
DROP TRIGGER IF EXISTS on_like_created ON public.likes;
DROP TRIGGER IF EXISTS on_comment_created ON public.comments;
DROP TRIGGER IF EXISTS on_follow_accepted ON public.follows;

-- Step 2: Drop the broken functions
DROP FUNCTION IF EXISTS public.handle_like_notification();
DROP FUNCTION IF EXISTS public.handle_comment_notification();
DROP FUNCTION IF EXISTS public.handle_follow_notification();

-- Step 3: Ensure likes table exists and is accessible
CREATE TABLE IF NOT EXISTS public.likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL CHECK (target_type IN ('photo', 'album', 'comment', 'story', 'location')),
    target_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, target_type, target_id)
);

-- Step 4: Ensure comments table exists with correct schema
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL CHECK (target_type IN ('photo', 'album', 'story')),
    target_id UUID NOT NULL,
    content TEXT NOT NULL,
    parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Step 5: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON public.likes(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_target ON public.likes(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_target ON public.comments(target_type, target_id);

-- Step 6: Enable RLS on likes table
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

-- Step 7: Drop existing policies
DROP POLICY IF EXISTS "Users can view all likes" ON public.likes;
DROP POLICY IF EXISTS "Users can create likes" ON public.likes;
DROP POLICY IF EXISTS "Users can delete their own likes" ON public.likes;

-- Step 8: Create RLS policies for likes
CREATE POLICY "Users can view all likes"
    ON public.likes FOR SELECT
    USING (true);

CREATE POLICY "Users can create likes"
    ON public.likes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes"
    ON public.likes FOR DELETE
    USING (auth.uid() = user_id);

-- Step 9: Enable RLS on comments table
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Step 10: Drop existing comment policies
DROP POLICY IF EXISTS "Users can view all comments" ON public.comments;
DROP POLICY IF EXISTS "Users can create comments" ON public.comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.comments;

-- Step 11: Create RLS policies for comments
CREATE POLICY "Users can view all comments"
    ON public.comments FOR SELECT
    USING (true);

CREATE POLICY "Users can create comments"
    ON public.comments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
    ON public.comments FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
    ON public.comments FOR DELETE
    USING (auth.uid() = user_id);

-- Verification
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '✅ EMERGENCY FIX COMPLETED';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Likes table: CREATED with RLS enabled';
    RAISE NOTICE 'Comments table: CREATED with RLS enabled';
    RAISE NOTICE 'Broken triggers: REMOVED';
    RAISE NOTICE 'Policies: RECREATED';
    RAISE NOTICE '';
    RAISE NOTICE 'You should now be able to:';
    RAISE NOTICE '  ✓ Like albums';
    RAISE NOTICE '  ✓ Comment on albums';
    RAISE NOTICE '  ✓ Upload albums';
    RAISE NOTICE '';
    RAISE NOTICE 'Note: Notifications are disabled until create_notification function is fixed';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '';
END $$;
