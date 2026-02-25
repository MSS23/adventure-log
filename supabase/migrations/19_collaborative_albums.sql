-- Collaborative albums: allow multiple users to contribute to an album
-- Each collaborator invite multiplies the album's reach across networks

CREATE TABLE IF NOT EXISTS album_collaborators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  album_id UUID NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'contributor', -- 'contributor' or 'editor'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(album_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_album_collab_album ON album_collaborators(album_id);
CREATE INDEX IF NOT EXISTS idx_album_collab_user ON album_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_album_collab_status ON album_collaborators(status);

-- RLS
ALTER TABLE album_collaborators ENABLE ROW LEVEL SECURITY;

-- Album owners can manage collaborators
CREATE POLICY "Album owners can manage collaborators" ON album_collaborators
  FOR ALL USING (
    album_id IN (SELECT id FROM albums WHERE user_id = (select auth.uid()))
  );

-- Users can see invitations to them
CREATE POLICY "Users can see their own collaborator invites" ON album_collaborators
  FOR SELECT USING ((select auth.uid()) = user_id);

-- Users can update their own invite status (accept/decline)
CREATE POLICY "Users can respond to invites" ON album_collaborators
  FOR UPDATE USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id AND status IN ('accepted', 'declined'));
