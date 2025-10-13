# Database Documentation

Complete database schema, migration strategy, and RLS policies for Adventure Log.

**Database:** PostgreSQL 15+ (Supabase)
**Total Tables:** 18
**Total Migrations:** 23
**Last Updated:** January 2025

---

## Quick Reference

| Table | Purpose | Row Count (est.) |
|-------|---------|------------------|
| users | User profiles | 10K - 100K |
| albums | Travel albums | 50K - 500K |
| photos | Album photos | 500K - 5M |
| stories | 24hr ephemeral content | 10K (active) |
| follows | User relationships | 100K - 1M |
| likes | Polymorphic likes | 1M - 10M |
| comments | Nested comments | 500K - 5M |
| album_shares | Collaborative albums | 10K - 100K |
| globe_reactions | Interactive reactions | 50K - 500K |
| playlists | Location collections | 10K - 100K |

---

## Schema Overview

### Core Tables

#### `users`
User profiles linked to `auth.users`.

```sql
CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE,
  username text UNIQUE NOT NULL CHECK (username ~ '^[a-zA-Z0-9_]{3,50}$'),
  display_name text,
  bio text,
  avatar_url text,
  location text,
  website text,
  is_private boolean DEFAULT false,
  privacy_level text DEFAULT 'public' CHECK (privacy_level IN ('public', 'private', 'friends')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz  -- Soft delete (30-day recovery)
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NOT NULL;
```

**Triggers:**
```sql
-- Auto-create profile on signup
CREATE TRIGGER create_profile_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_profile();

-- Update timestamp
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

#### `albums`
Travel albums with location and date metadata.

```sql
CREATE TABLE albums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  cover_photo_id uuid REFERENCES photos(id) ON DELETE SET NULL,
  cover_photo_position text DEFAULT 'center' CHECK (
    cover_photo_position IN ('center', 'top', 'bottom', 'left', 'right', 'custom')
  ),
  cover_photo_x_offset numeric,  -- -100 to 100
  cover_photo_y_offset numeric,  -- -100 to 100

  -- Location data
  location_name text,
  location_country text,
  location_city text,
  country_code text,  -- ISO 3166-1 alpha-2
  latitude numeric,
  longitude numeric,

  -- Travel dates (NOT created_at - this is when trip happened)
  date_start timestamptz,
  date_end timestamptz,

  -- Privacy & publishing
  privacy text DEFAULT 'public' CHECK (privacy IN ('public', 'private', 'friends')),
  visibility text DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'friends')),
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published')),

  -- Privacy features
  hide_exact_location boolean DEFAULT false,
  location_precision text CHECK (location_precision IN ('exact', 'neighbourhood', 'city', 'country', 'hidden')),
  publish_delay_hours integer,
  scheduled_publish_at timestamptz,
  is_delayed_publish boolean DEFAULT false,

  -- Copyright
  copyright_holder text,
  license_type text CHECK (license_type IN (
    'all-rights-reserved', 'cc-by', 'cc-by-sa', 'cc-by-nd',
    'cc-by-nc', 'cc-by-nc-sa', 'cc-by-nc-nd', 'cc0', 'public-domain'
  )),
  license_url text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Critical indexes for performance
CREATE INDEX idx_albums_user_id ON albums(user_id);
CREATE INDEX idx_albums_user_created ON albums(user_id, created_at DESC) WHERE status != 'draft';
CREATE INDEX idx_albums_visibility ON albums(visibility, created_at DESC) WHERE status != 'draft';
CREATE INDEX idx_albums_location ON albums(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX idx_albums_date_start ON albums(date_start DESC);
```

**Computed Fields (via RPC):**
```sql
-- Get album with photo count
CREATE FUNCTION get_album_with_stats(album_id_param uuid)
RETURNS TABLE (
  id uuid,
  title text,
  photo_count bigint,
  like_count bigint,
  comment_count bigint
) AS $$
  SELECT
    a.id,
    a.title,
    COUNT(DISTINCT p.id) as photo_count,
    COUNT(DISTINCT l.id) as like_count,
    COUNT(DISTINCT c.id) as comment_count
  FROM albums a
  LEFT JOIN photos p ON p.album_id = a.id
  LEFT JOIN likes l ON l.target_id = a.id AND l.target_type = 'album'
  LEFT JOIN comments c ON c.target_id = a.id AND c.target_type = 'album'
  WHERE a.id = album_id_param
  GROUP BY a.id, a.title;
$$ LANGUAGE SQL STABLE;
```

---

#### `photos`
Photos with EXIF data and GPS coordinates.

```sql
CREATE TABLE photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  album_id uuid NOT NULL REFERENCES albums(id) ON DELETE CASCADE,

  -- Storage paths
  file_path text NOT NULL,  -- Relative path in Supabase Storage
  file_hash text,  -- SHA-256 for duplicate detection
  thumbnail_path text,
  medium_path text,
  large_path text,
  original_size bigint,
  file_size bigint,

  -- Metadata
  caption text,
  taken_at timestamptz,

  -- Location
  location_name text,
  latitude numeric,
  longitude numeric,

  -- EXIF data
  exif_data jsonb,  -- Full EXIF dump
  camera_make text,
  camera_model text,
  iso integer,
  aperture text,
  shutter_speed text,

  -- Organization
  order_index integer NOT NULL DEFAULT 0,
  is_favorite boolean DEFAULT false,
  processing_status text DEFAULT 'pending',

  -- Privacy
  hide_exact_location boolean DEFAULT false,
  location_precision text,

  -- Copyright
  photographer_credit text,
  copyright_holder text,
  license_type text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_photos_album_id ON photos(album_id);
CREATE INDEX idx_photos_user_id ON photos(user_id);
CREATE INDEX idx_photos_file_hash ON photos(file_hash) WHERE file_hash IS NOT NULL;
CREATE INDEX idx_photos_location ON photos(latitude, longitude) WHERE latitude IS NOT NULL;
CREATE INDEX idx_photos_taken_at ON photos(taken_at DESC);
CREATE INDEX idx_photos_order ON photos(album_id, order_index);
```

---

### Social Tables

#### `follows`
User following relationships.

```sql
CREATE TABLE follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved')),
  created_at timestamptz DEFAULT now(),

  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)  -- Can't follow yourself
);

CREATE INDEX idx_follows_follower ON follows(follower_id, status);
CREATE INDEX idx_follows_following ON follows(following_id, status);
```

**RPC for mutual friends:**
```sql
CREATE FUNCTION get_mutual_friends(user_id_param uuid, other_user_id_param uuid)
RETURNS TABLE (user_id uuid, username text) AS $$
  SELECT u.id, u.username
  FROM users u
  WHERE u.id IN (
    SELECT following_id FROM follows
    WHERE follower_id = user_id_param AND status = 'approved'
    INTERSECT
    SELECT following_id FROM follows
    WHERE follower_id = other_user_id_param AND status = 'approved'
  );
$$ LANGUAGE SQL STABLE;
```

---

#### `likes`
Polymorphic likes for albums, photos, and comments.

```sql
CREATE TABLE likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('photo', 'album', 'comment')),
  target_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),

  UNIQUE(user_id, target_type, target_id)  -- One like per user per target
);

CREATE INDEX idx_likes_target ON likes(target_type, target_id);
CREATE INDEX idx_likes_user ON likes(user_id);
```

---

#### `comments`
Nested comments with replies.

```sql
CREATE TABLE comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('photo', 'album')),
  target_id uuid NOT NULL,
  content text NOT NULL,
  parent_id uuid REFERENCES comments(id) ON DELETE CASCADE,  -- NULL = top-level
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_comments_target ON comments(target_type, target_id, created_at DESC);
CREATE INDEX idx_comments_user ON comments(user_id);
CREATE INDEX idx_comments_parent ON comments(parent_id);
```

**Get comment tree:**
```sql
CREATE FUNCTION get_comment_tree(target_type_param text, target_id_param uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  content text,
  parent_id uuid,
  depth integer,
  path text[]
) AS $$
  WITH RECURSIVE comment_tree AS (
    -- Top-level comments
    SELECT
      id, user_id, content, parent_id,
      0 as depth,
      ARRAY[id::text] as path
    FROM comments
    WHERE target_type = target_type_param
      AND target_id = target_id_param
      AND parent_id IS NULL

    UNION ALL

    -- Replies
    SELECT
      c.id, c.user_id, c.content, c.parent_id,
      ct.depth + 1,
      ct.path || c.id::text
    FROM comments c
    JOIN comment_tree ct ON c.parent_id = ct.id
  )
  SELECT * FROM comment_tree ORDER BY path;
$$ LANGUAGE SQL STABLE;
```

---

## Row-Level Security (RLS)

### Albums RLS Policies

```sql
-- View policy (respects privacy)
CREATE POLICY "View visible albums" ON albums FOR SELECT
  USING (
    status != 'draft'
    AND (
      visibility = 'public'
      OR user_id = auth.uid()
      OR (visibility = 'friends' AND EXISTS (
        SELECT 1 FROM follows f1
        JOIN follows f2 ON f1.following_id = f2.follower_id
          AND f1.follower_id = f2.following_id
        WHERE f1.follower_id = auth.uid()
          AND f2.follower_id = user_id
          AND f1.status = 'approved'
          AND f2.status = 'approved'
      ))
    )
  );

-- Insert policy (own albums only)
CREATE POLICY "Users can create own albums" ON albums FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Update policy (own albums only)
CREATE POLICY "Users can update own albums" ON albums FOR UPDATE
  USING (auth.uid() = user_id);

-- Delete policy (own albums only)
CREATE POLICY "Users can delete own albums" ON albums FOR DELETE
  USING (auth.uid() = user_id);
```

### Photos RLS Policies

```sql
-- Inherit visibility from parent album
CREATE POLICY "View photos from visible albums" ON photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM albums
      WHERE albums.id = photos.album_id
      AND albums.status != 'draft'
      AND (
        albums.visibility = 'public'
        OR albums.user_id = auth.uid()
        OR (albums.visibility = 'friends' AND ...)
      )
    )
  );
```

---

## Migrations

### Migration Naming Convention
```
YYYYMMDD_description.sql
```

### Running Migrations

**Local:**
```bash
npx supabase db push
```

**Production:**
```bash
# Via Supabase Dashboard or CLI
npx supabase db push --linked
```

### Migration Best Practices

1. **Always use transactions:**
```sql
BEGIN;
-- Migration code
COMMIT;
```

2. **Add constraints after backfill:**
```sql
-- Add column
ALTER TABLE albums ADD COLUMN new_field text;

-- Backfill data
UPDATE albums SET new_field = 'default' WHERE new_field IS NULL;

-- Then add constraint
ALTER TABLE albums ALTER COLUMN new_field SET NOT NULL;
```

3. **Test rollback scenario**

---

## Performance Optimization

### Missing Composite Indexes (RECOMMENDED)

```sql
-- Albums by user with visibility filter
CREATE INDEX idx_albums_user_visibility
  ON albums(user_id, visibility, created_at DESC)
  WHERE status != 'draft';

-- Photos with location data
CREATE INDEX idx_photos_location_coords
  ON photos(album_id, latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Follows bidirectional lookup
CREATE INDEX idx_follows_bidirectional
  ON follows(follower_id, following_id, status);

-- Comments on target with user
CREATE INDEX idx_comments_target_user
  ON comments(target_type, target_id, user_id, created_at DESC);
```

### Query Optimization

**Bad (N+1 pattern):**
```typescript
for (const album of albums) {
  const { count } = await supabase
    .from('photos')
    .select('count')
    .eq('album_id', album.id)
}
```

**Good (Batch query):**
```typescript
const { data } = await supabase
  .from('albums')
  .select('*, photos(count)')
  .in('id', albumIds)
```

---

## Backup & Recovery

### Automated Backups
Supabase automatically backs up every 24 hours (retained for 7 days).

### Manual Backup
```bash
pg_dump -h db.xxx.supabase.co -U postgres -d postgres > backup.sql
```

### Point-in-Time Recovery
Available on Supabase Pro plan.

---

## Monitoring

### Slow Query Detection
```sql
-- Enable pg_stat_statements
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Find slow queries
SELECT
  mean_exec_time,
  calls,
  query
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### Index Usage
```sql
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  idx_tup_read as tuples_read
FROM pg_stat_user_indexes
WHERE idx_scan = 0  -- Unused indexes
  AND indexrelname NOT LIKE 'pg_%';
```

---

## Common Queries

### Get user's travel stats
```sql
SELECT
  COUNT(DISTINCT id) as album_count,
  COUNT(DISTINCT location_country) as countries_visited,
  COUNT(DISTINCT location_city) as cities_visited,
  (SELECT COUNT(*) FROM photos WHERE photos.user_id = albums.user_id) as total_photos
FROM albums
WHERE user_id = 'user-id'
  AND status != 'draft';
```

### Get feed with engagement
```sql
SELECT
  a.*,
  u.username,
  u.display_name,
  u.avatar_url,
  COUNT(DISTINCT l.id) as like_count,
  COUNT(DISTINCT c.id) as comment_count,
  EXISTS (
    SELECT 1 FROM likes
    WHERE target_id = a.id
      AND target_type = 'album'
      AND user_id = auth.uid()
  ) as user_has_liked
FROM albums a
JOIN users u ON a.user_id = u.id
LEFT JOIN likes l ON l.target_id = a.id AND l.target_type = 'album'
LEFT JOIN comments c ON c.target_id = a.id AND c.target_type = 'album'
WHERE a.visibility = 'public'
  AND a.status != 'draft'
GROUP BY a.id, u.username, u.display_name, u.avatar_url
ORDER BY a.created_at DESC
LIMIT 30;
```

---

## Troubleshooting

### Connection Pool Exhausted
```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Kill idle connections
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
  AND state_change < now() - interval '10 minutes';
```

### RLS Policy Debugging
```sql
-- Test as specific user
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims.sub TO 'user-id';

-- Run query
SELECT * FROM albums WHERE user_id = 'user-id';
```

---

## Schema Diagram

```
users ──┬── albums ──── photos
        │               └── likes (polymorphic)
        │               └── comments (polymorphic)
        ├── follows
        ├── stories
        ├── album_shares
        ├── globe_reactions
        ├── playlists ──── playlist_items
        └── user_levels
```

---

## Resources

- [Supabase Database Documentation](https://supabase.com/docs/guides/database)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [RLS Best Practices](https://supabase.com/docs/guides/auth/row-level-security)
