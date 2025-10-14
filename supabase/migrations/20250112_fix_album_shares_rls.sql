-- Migration: Fix Album Shares RLS Policy
-- Created: 2025-01-12
-- Description: Remove permissive 'OR true' from album_shares SELECT policy
-- SECURITY FIX: The previous policy allowed anyone to view all album shares

-- Drop the insecure policy
DROP POLICY IF EXISTS "Users can view their album shares" ON album_shares;

-- Create secure policy without 'OR true'
-- Token-based access should be handled in application layer with service role client
CREATE POLICY "Users can view their album shares"
  ON album_shares FOR SELECT
  USING (
    auth.uid() = shared_by_user_id OR
    auth.uid() = shared_with_user_id
  );

-- Comments for documentation
COMMENT ON POLICY "Users can view their album shares" ON album_shares IS
  'Allows users to view shares they created or received. Token-based access must be handled in application layer using service role client with proper validation.';
