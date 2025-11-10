-- Auto-accept all pending follow requests when user changes privacy to public
-- This ensures users don't have to manually accept requests when they switch from private to public

-- Create function to accept all pending follow requests for a user
CREATE OR REPLACE FUNCTION accept_all_pending_follows(user_id_param UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    -- Update all pending follow requests where this user is being followed
    UPDATE public.follows
    SET
        status = 'accepted',
        updated_at = NOW()
    WHERE
        following_id = user_id_param
        AND status = 'pending';

    -- Get the number of rows updated
    GET DIAGNOSTICS updated_count = ROW_COUNT;

    RETURN updated_count;
END;
$$;

-- Create trigger function to auto-accept follows when privacy changes to public
CREATE OR REPLACE FUNCTION auto_accept_follows_on_public()
RETURNS TRIGGER AS $$
DECLARE
    accepted_count INTEGER;
BEGIN
    -- Check if privacy_level changed from private/friends to public
    IF (OLD.privacy_level IN ('private', 'friends') AND NEW.privacy_level = 'public') THEN
        -- Accept all pending follow requests for this user
        accepted_count := accept_all_pending_follows(NEW.id);

        -- Log the action (optional, for debugging)
        RAISE NOTICE 'Auto-accepted % pending follow requests for user % switching to public', accepted_count, NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that fires when users table is updated
DROP TRIGGER IF EXISTS trigger_auto_accept_follows_on_public ON public.users;

CREATE TRIGGER trigger_auto_accept_follows_on_public
    AFTER UPDATE OF privacy_level ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION auto_accept_follows_on_public();

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION accept_all_pending_follows(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION auto_accept_follows_on_public() TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION accept_all_pending_follows IS 'Accepts all pending follow requests for a user. Used when user switches to public profile.';
COMMENT ON TRIGGER trigger_auto_accept_follows_on_public ON public.users IS 'Automatically accepts all pending follow requests when a user changes their privacy level to public';