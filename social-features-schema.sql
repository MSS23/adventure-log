-- Social Features Schema Extension for Adventure Log
-- Apply this to your Supabase database for production deployment

-- Likes table
CREATE TABLE IF NOT EXISTS likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  album_id UUID REFERENCES albums(id) ON DELETE CASCADE,
  photo_id UUID REFERENCES photos(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Ensure a user can only like an album or photo once
  CONSTRAINT likes_unique_user_album UNIQUE (user_id, album_id),
  CONSTRAINT likes_unique_user_photo UNIQUE (user_id, photo_id),

  -- Ensure either album_id or photo_id is set, but not both
  CONSTRAINT likes_album_or_photo CHECK (
    (album_id IS NOT NULL AND photo_id IS NULL) OR
    (album_id IS NULL AND photo_id IS NOT NULL)
  )
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  album_id UUID REFERENCES albums(id) ON DELETE CASCADE,
  photo_id UUID REFERENCES photos(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(content) >= 1 AND length(content) <= 500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Ensure either album_id or photo_id is set, but not both
  CONSTRAINT comments_album_or_photo CHECK (
    (album_id IS NOT NULL AND photo_id IS NULL) OR
    (album_id IS NULL AND photo_id IS NOT NULL)
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS likes_user_id_idx ON likes(user_id);
CREATE INDEX IF NOT EXISTS likes_album_id_idx ON likes(album_id);
CREATE INDEX IF NOT EXISTS likes_photo_id_idx ON likes(photo_id);
CREATE INDEX IF NOT EXISTS likes_created_at_idx ON likes(created_at);

CREATE INDEX IF NOT EXISTS comments_user_id_idx ON comments(user_id);
CREATE INDEX IF NOT EXISTS comments_album_id_idx ON comments(album_id);
CREATE INDEX IF NOT EXISTS comments_photo_id_idx ON comments(photo_id);
CREATE INDEX IF NOT EXISTS comments_created_at_idx ON comments(created_at);

-- RLS (Row Level Security) policies
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Likes policies
CREATE POLICY "Users can view all likes" ON likes FOR SELECT USING (true);
CREATE POLICY "Users can insert their own likes" ON likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own likes" ON likes FOR DELETE
  USING (auth.uid() = user_id);

-- Comments policies
CREATE POLICY "Users can view all comments" ON comments FOR SELECT USING (true);
CREATE POLICY "Users can insert their own comments" ON comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own comments" ON comments FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own comments" ON comments FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update updated_at timestamp on comments
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;
CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();