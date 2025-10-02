-- Add status column to albums table for draft/published state
-- Albums without photos are automatically saved as drafts

-- Add status column with default 'published' for existing albums
ALTER TABLE albums
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published'));

-- Create index for efficient filtering by status
CREATE INDEX IF NOT EXISTS idx_albums_status ON albums(status);

-- Create index for user drafts lookup
CREATE INDEX IF NOT EXISTS idx_albums_user_status ON albums(user_id, status);

-- Update existing albums: mark as draft if they have no photos
UPDATE albums
SET status = 'draft'
WHERE id NOT IN (
  SELECT DISTINCT album_id
  FROM photos
) AND status = 'published';

-- Comment
COMMENT ON COLUMN albums.status IS 'Album publication status: draft (no photos yet) or published (has photos)';
