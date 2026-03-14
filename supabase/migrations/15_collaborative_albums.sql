-- Collaborative albums: allow multiple users to contribute to an album
CREATE TABLE IF NOT EXISTS album_collaborators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  album_id UUID NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'contributor' CHECK (role IN ('contributor', 'editor', 'viewer')),
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(album_id, user_id)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_album_collaborators_album ON album_collaborators(album_id);
CREATE INDEX IF NOT EXISTS idx_album_collaborators_user ON album_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_album_collaborators_status ON album_collaborators(status);

-- RLS policies
ALTER TABLE album_collaborators ENABLE ROW LEVEL SECURITY;

-- Album owner can manage collaborators
CREATE POLICY "Album owners can manage collaborators"
  ON album_collaborators FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM albums WHERE albums.id = album_collaborators.album_id
      AND albums.user_id = (SELECT auth.uid())
    )
  );

-- Users can see their own collaborator entries
CREATE POLICY "Users can see own collaborations"
  ON album_collaborators FOR SELECT
  USING (user_id = (SELECT auth.uid()));

-- Users can update their own status (accept/decline)
CREATE POLICY "Users can update own collaboration status"
  ON album_collaborators FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
