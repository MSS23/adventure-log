-- Fix follow functions to use correct table name and remove updated_at references

-- Drop old functions if they exist
DROP FUNCTION IF EXISTS public.handle_follow_request(UUID, UUID);
DROP FUNCTION IF EXISTS public.accept_follow_request(UUID, UUID);
DROP FUNCTION IF EXISTS public.reject_follow_request(UUID, UUID);

-- Create corrected handle_follow_request function
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
    -- Get the privacy level of the user being followed
    SELECT privacy_level INTO target_user_privacy
    FROM public.users
    WHERE id = following_id_param;

    -- Determine initial status based on privacy
    IF target_user_privacy = 'private' THEN
        result_status := 'pending';
    ELSE
        result_status := 'accepted';
    END IF;

    -- Insert or update the follow relationship (using 'follows' table)
    INSERT INTO public.follows (follower_id, following_id, status, created_at)
    VALUES (follower_id_param, following_id_param, result_status, now())
    ON CONFLICT (follower_id, following_id)
    DO UPDATE SET
        status = result_status;

    RETURN result_status;
END;
$$;

-- Create corrected accept_follow_request function
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

-- Create corrected reject_follow_request function
CREATE OR REPLACE FUNCTION public.reject_follow_request(
    follower_id_param UUID,
    following_id_param UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- For reject, we delete the follow request
    DELETE FROM public.follows
    WHERE follower_id = follower_id_param
        AND following_id = following_id_param
        AND status = 'pending';
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.handle_follow_request(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_follow_request(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_follow_request(UUID, UUID) TO authenticated;
