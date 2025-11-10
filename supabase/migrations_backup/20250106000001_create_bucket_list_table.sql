-- Create bucket_list table for user travel wishlist
CREATE TABLE IF NOT EXISTS bucket_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  destination TEXT NOT NULL,
  country TEXT NOT NULL,
  notes TEXT,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_bucket_list_user_id ON bucket_list(user_id);
CREATE INDEX IF NOT EXISTS idx_bucket_list_completed ON bucket_list(completed);
CREATE INDEX IF NOT EXISTS idx_bucket_list_created_at ON bucket_list(created_at DESC);

-- Enable RLS
ALTER TABLE bucket_list ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own bucket list items
CREATE POLICY "Users can view own bucket list items"
  ON bucket_list
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own bucket list items
CREATE POLICY "Users can insert own bucket list items"
  ON bucket_list
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own bucket list items
CREATE POLICY "Users can update own bucket list items"
  ON bucket_list
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own bucket list items
CREATE POLICY "Users can delete own bucket list items"
  ON bucket_list
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_bucket_list_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_bucket_list_updated_at_trigger
  BEFORE UPDATE ON bucket_list
  FOR EACH ROW
  EXECUTE FUNCTION update_bucket_list_updated_at();
