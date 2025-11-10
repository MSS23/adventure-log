-- Add soft delete functionality to users table
-- This allows users to delete their account with a 30-day recovery period

-- Add deleted_at column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add index for efficient querying of deleted users
CREATE INDEX IF NOT EXISTS idx_users_deleted_at
ON users(deleted_at)
WHERE deleted_at IS NOT NULL;

-- Create function to soft delete user and all their data
CREATE OR REPLACE FUNCTION soft_delete_user(user_id_param UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Mark user as deleted
  UPDATE users
  SET deleted_at = NOW()
  WHERE id = user_id_param
    AND deleted_at IS NULL;

  -- Note: We keep all user data (albums, photos, etc.) intact
  -- This allows for full account recovery within 30 days
END;
$$;

-- Create function to restore deleted user account
CREATE OR REPLACE FUNCTION restore_user_account(user_id_param UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user was deleted within last 30 days
  IF EXISTS (
    SELECT 1 FROM users
    WHERE id = user_id_param
      AND deleted_at IS NOT NULL
      AND deleted_at > NOW() - INTERVAL '30 days'
  ) THEN
    -- Restore the user account
    UPDATE users
    SET deleted_at = NULL
    WHERE id = user_id_param;
  ELSE
    RAISE EXCEPTION 'Account cannot be restored. Either not deleted or past 30-day recovery period.';
  END IF;
END;
$$;

-- Create function to permanently delete users past 30-day recovery period
-- This should be run as a scheduled job (e.g., daily via pg_cron)
CREATE OR REPLACE FUNCTION permanently_delete_expired_users()
RETURNS TABLE(deleted_user_id UUID, deleted_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
  total_deleted INTEGER := 0;
BEGIN
  -- Find users deleted more than 30 days ago
  FOR user_record IN
    SELECT id
    FROM users
    WHERE deleted_at IS NOT NULL
      AND deleted_at < NOW() - INTERVAL '30 days'
  LOOP
    -- Delete user's data in order (respecting foreign key constraints)

    -- Delete story guesses
    DELETE FROM story_guesses WHERE user_id = user_record.id;

    -- Delete stories
    DELETE FROM stories WHERE user_id = user_record.id;

    -- Delete comments
    DELETE FROM comments WHERE user_id = user_record.id;

    -- Delete likes
    DELETE FROM likes WHERE user_id = user_record.id;

    -- Delete follows (both as follower and following)
    DELETE FROM follows WHERE follower_id = user_record.id OR following_id = user_record.id;

    -- Delete wishlist items
    DELETE FROM wishlist WHERE user_id = user_record.id;

    -- Delete user levels/XP
    DELETE FROM user_levels WHERE user_id = user_record.id;

    -- Delete photos (storage files should be cleaned up separately)
    DELETE FROM photos WHERE user_id = user_record.id;

    -- Delete albums
    DELETE FROM albums WHERE user_id = user_record.id;

    -- Finally delete the user
    DELETE FROM users WHERE id = user_record.id;

    deleted_user_id := user_record.id;
    total_deleted := total_deleted + 1;
    deleted_count := total_deleted;

    RETURN NEXT;
  END LOOP;

  RETURN;
END;
$$;

-- Add RLS policies for deleted users
-- Prevent deleted users from accessing the system
CREATE POLICY "Deleted users cannot access data" ON users
  FOR SELECT
  USING (
    deleted_at IS NULL OR
    auth.uid() = id -- Allow user to see their own deleted status for recovery
  );

-- Update existing queries to exclude deleted users by default
-- Add helper function to check if user is active
CREATE OR REPLACE FUNCTION is_user_active(user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = user_id_param
      AND deleted_at IS NULL
  );
END;
$$;

-- Add comment explaining the soft delete system
COMMENT ON COLUMN users.deleted_at IS 'Timestamp when user deleted their account. NULL means active. Users can recover within 30 days.';
COMMENT ON FUNCTION soft_delete_user IS 'Soft deletes a user account. User data is preserved for 30 days.';
COMMENT ON FUNCTION restore_user_account IS 'Restores a deleted user account if within 30-day recovery period.';
COMMENT ON FUNCTION permanently_delete_expired_users IS 'Permanently deletes users and their data after 30-day recovery period. Should be run as scheduled job.';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION soft_delete_user TO authenticated;
GRANT EXECUTE ON FUNCTION restore_user_account TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_active TO authenticated;
