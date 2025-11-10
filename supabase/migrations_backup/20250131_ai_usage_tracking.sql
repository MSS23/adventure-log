-- Create AI usage tracking table
CREATE TABLE IF NOT EXISTS ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature_type TEXT NOT NULL, -- 'trip_planner', 'photo_caption', etc.
  usage_month DATE NOT NULL, -- First day of the month for tracking
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, feature_type, usage_month)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_month
  ON ai_usage(user_id, usage_month);

-- Create index for feature type lookups
CREATE INDEX IF NOT EXISTS idx_ai_usage_feature
  ON ai_usage(feature_type);

-- Enable RLS
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only view their own usage
CREATE POLICY "Users can view own AI usage"
  ON ai_usage
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only the backend can insert/update usage (through service role)
CREATE POLICY "Service role can manage AI usage"
  ON ai_usage
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Function to get or create usage record for current month
CREATE OR REPLACE FUNCTION get_or_create_ai_usage(
  p_user_id UUID,
  p_feature_type TEXT
)
RETURNS TABLE(
  usage_count INTEGER,
  limit_exceeded BOOLEAN
) AS $$
DECLARE
  v_current_month DATE;
  v_usage_count INTEGER;
  v_monthly_limit INTEGER := 3; -- Free tier limit
BEGIN
  -- Get first day of current month
  v_current_month := DATE_TRUNC('month', CURRENT_DATE)::DATE;

  -- Get or create usage record
  INSERT INTO ai_usage (user_id, feature_type, usage_month, usage_count)
  VALUES (p_user_id, p_feature_type, v_current_month, 0)
  ON CONFLICT (user_id, feature_type, usage_month)
  DO NOTHING;

  -- Get current usage count
  SELECT ai_usage.usage_count INTO v_usage_count
  FROM ai_usage
  WHERE ai_usage.user_id = p_user_id
    AND ai_usage.feature_type = p_feature_type
    AND ai_usage.usage_month = v_current_month;

  -- Return usage info
  RETURN QUERY SELECT
    v_usage_count,
    v_usage_count >= v_monthly_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment usage count
CREATE OR REPLACE FUNCTION increment_ai_usage(
  p_user_id UUID,
  p_feature_type TEXT
)
RETURNS TABLE(
  new_count INTEGER,
  success BOOLEAN
) AS $$
DECLARE
  v_current_month DATE;
  v_new_count INTEGER;
  v_monthly_limit INTEGER := 3; -- Free tier limit
BEGIN
  -- Get first day of current month
  v_current_month := DATE_TRUNC('month', CURRENT_DATE)::DATE;

  -- Update usage count
  UPDATE ai_usage
  SET usage_count = usage_count + 1,
      updated_at = NOW()
  WHERE user_id = p_user_id
    AND feature_type = p_feature_type
    AND usage_month = v_current_month
  RETURNING usage_count INTO v_new_count;

  -- Return result
  RETURN QUERY SELECT
    v_new_count,
    v_new_count <= v_monthly_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_or_create_ai_usage TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION increment_ai_usage TO authenticated, service_role;

-- Add comment
COMMENT ON TABLE ai_usage IS 'Tracks AI feature usage per user per month for billing and limits';
