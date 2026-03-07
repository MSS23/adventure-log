-- Discover feed function: returns public albums from non-followed users
-- Ranked by recency + engagement signals
CREATE OR REPLACE FUNCTION get_discover_feed(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  title TEXT,
  description TEXT,
  cover_photo_url TEXT,
  location_name TEXT,
  country_code TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  date_start TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  view_count INTEGER,
  like_count BIGINT,
  comment_count BIGINT,
  photo_count BIGINT,
  score DOUBLE PRECISION,
  owner_username TEXT,
  owner_display_name TEXT,
  owner_avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.user_id,
    a.title,
    a.description,
    a.cover_photo_url,
    a.location_name,
    a.country_code,
    a.latitude,
    a.longitude,
    a.date_start,
    a.created_at,
    COALESCE(a.view_count, 0) AS view_count,
    COALESCE(l.like_count, 0) AS like_count,
    COALESCE(c.comment_count, 0) AS comment_count,
    COALESCE(ph.photo_count, 0) AS photo_count,
    -- Scoring: recency (40%) + likes (30%) + comments (20%) + views (10%)
    (
      -- Recency score: decay over 30 days, max 1.0
      0.4 * GREATEST(0, 1.0 - EXTRACT(EPOCH FROM (NOW() - a.created_at)) / (30 * 86400))
      -- Like score: log scale, max ~1.0
      + 0.3 * LEAST(1.0, LN(GREATEST(1, COALESCE(l.like_count, 0)) + 1) / 5)
      -- Comment score: log scale
      + 0.2 * LEAST(1.0, LN(GREATEST(1, COALESCE(c.comment_count, 0)) + 1) / 4)
      -- View score: log scale
      + 0.1 * LEAST(1.0, LN(GREATEST(1, COALESCE(a.view_count, 0)) + 1) / 7)
    ) AS score,
    u.username AS owner_username,
    u.display_name AS owner_display_name,
    u.avatar_url AS owner_avatar_url
  FROM albums a
  INNER JOIN users u ON u.id = a.user_id
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::BIGINT AS like_count
    FROM likes WHERE target_type = 'album' AND target_id = a.id::text
  ) l ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::BIGINT AS comment_count
    FROM comments WHERE target_type = 'album' AND target_id = a.id::text
  ) c ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::BIGINT AS photo_count
    FROM photos WHERE album_id = a.id
  ) ph ON true
  WHERE
    -- Only public albums
    (a.visibility = 'public' OR a.privacy = 'public')
    -- Not from the requesting user
    AND a.user_id != p_user_id
    -- Not from followed users (these appear in the regular feed)
    AND NOT EXISTS (
      SELECT 1 FROM follows f
      WHERE f.follower_id = p_user_id
      AND f.following_id = a.user_id
      AND f.status = 'accepted'
    )
    -- Has at least one photo
    AND COALESCE(ph.photo_count, 0) > 0
    -- Published status
    AND (a.status IS NULL OR a.status = 'published')
  ORDER BY score DESC, a.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;
