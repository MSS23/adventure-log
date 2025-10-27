# Fix Follow System - URGENT

## Problem
Follow requests are not persisting because the RPC functions have bugs:
1. Using old table name `followers` instead of `follows`
2. Trying to update `updated_at` column which doesn't exist

## Solution

### Run this migration in Supabase SQL Editor:

1. Go to: https://supabase.com/dashboard/project/jtdkbjvqujgpwcqjydma/sql/new
2. Copy and paste the contents of `supabase/migrations/20251027_fix_follow_functions.sql`
3. Click "Run"

### OR run this SQL directly:

```sql
-- Fix follow functions to use correct table name

DROP FUNCTION IF EXISTS public.handle_follow_request(UUID, UUID);
DROP FUNCTION IF EXISTS public.accept_follow_request(UUID, UUID);
DROP FUNCTION IF EXISTS public.reject_follow_request(UUID, UUID);

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

GRANT EXECUTE ON FUNCTION public.handle_follow_request(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_follow_request(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_follow_request(UUID, UUID) TO authenticated;
```

## After Running Migration

The follow system will work correctly:
- ✅ Follow requests will persist
- ✅ Pending status will save correctly
- ✅ Follow requests appear in target user's account
- ✅ Accept/reject functions work

## Test It

1. Run the migration
2. Try following "PC Manraj" account
3. Should show "Pending" status
4. Request should appear in PC Manraj's follow requests
5. Can accept/reject from there
