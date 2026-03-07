# Trip Planner Caching System

## Overview

The trip planner caching system stores generated trip itineraries to avoid redundant AI API calls when users request identical trip plans. This reduces costs and improves response times.

## How It Works

### Cache Key Generation

When a user requests a trip itinerary, we generate a unique cache key based on ALL input parameters:

```typescript
{
  country: "france",
  region: "paris",
  travelDates: "june 2025",
  travelStyle: "cultural",
  budget: "moderate",
  additionalDetails: "interested in museums"
}
```

This is normalized (lowercased, trimmed) and hashed using SHA-256 to create a deterministic cache key: `abc123...` (64 hex chars)

### Cache Lookup Flow

1. **User submits request** → Generate cache key from inputs
2. **Check cache** → Query `trip_planner_cache` table with user_id + cache_key
3. **If found** → Return cached itinerary immediately (doesn't count against usage limit!)
4. **If not found** → Generate fresh itinerary with Gemini API
5. **Store result** → Save itinerary in cache for future identical requests
6. **Increment usage** → Only increment counter for NEW generations

### Cache Behavior

**Identical requests return cached results:**
```
Request 1: Paris, France, Cultural, Moderate → Generates new ✓ (counts as 1 usage)
Request 2: Paris, France, Cultural, Moderate → Returns cache ✓ (doesn't count!)
Request 3: Paris, France, Adventure, Moderate → Generates new ✓ (counts as 2 usage)
Request 4: Paris, France, Cultural, Moderate → Returns cache ✓ (doesn't count!)
```

**Even tiny differences create new cache entries:**
```
"Paris" vs "paris" → Same (normalized)
"Paris" vs "Paris " → Same (trimmed)
"Paris" vs "PARIS" → Same (lowercased)
"Paris" vs "Pairs" → Different! (typo creates new entry)
"Paris" vs "paris, france" → Different! (different input)
```

## Database Schema

### Table: `trip_planner_cache`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | User who requested this trip (FK to users) |
| cache_key | TEXT | SHA-256 hash of all inputs (64 chars) |
| country | TEXT | Original country input |
| region | TEXT | Original region input |
| travel_dates | TEXT | Original dates input |
| travel_style | TEXT | Original style input |
| budget | TEXT | Original budget input |
| additional_details | TEXT | Original additional details |
| itinerary | TEXT | Generated trip itinerary (can be large!) |
| created_at | TIMESTAMPTZ | When first cached |
| accessed_at | TIMESTAMPTZ | Last time cache was hit |
| access_count | INTEGER | How many times returned from cache |

**Unique Constraint:** `(user_id, cache_key)` - Each user can have one entry per unique request

**Indexes:**
- `idx_trip_cache_user_key` on `(user_id, cache_key)` - Fast cache lookups
- `idx_trip_cache_accessed` on `accessed_at` - For cleanup queries

### Functions

#### `get_cached_trip(p_user_id, p_cache_key)`

Retrieves a cached trip itinerary if available and not expired.

**Parameters:**
- `p_user_id` (UUID) - User requesting the trip
- `p_cache_key` (TEXT) - SHA-256 hash of inputs

**Returns:**
```sql
TABLE(
  itinerary TEXT,      -- The cached itinerary (or NULL if not found)
  was_cached BOOLEAN   -- TRUE if found in cache, FALSE otherwise
)
```

**Behavior:**
- Returns NULL if no cache entry found
- Returns NULL if entry is older than 30 days (expired)
- Updates `accessed_at` and increments `access_count` on cache hit
- Returns the stored itinerary + `was_cached=TRUE`

**Usage:**
```sql
SELECT * FROM get_cached_trip(
  'user-uuid-here',
  'abc123...cache-key-here'
);
```

#### `cache_trip(...)`

Stores a generated trip itinerary in the cache.

**Parameters:**
- `p_user_id` (UUID)
- `p_cache_key` (TEXT) - SHA-256 hash
- `p_country` (TEXT)
- `p_region` (TEXT)
- `p_travel_dates` (TEXT)
- `p_travel_style` (TEXT)
- `p_budget` (TEXT)
- `p_additional_details` (TEXT)
- `p_itinerary` (TEXT) - The generated itinerary to cache

**Returns:** `BOOLEAN` (always TRUE)

**Behavior:**
- Inserts new cache entry if doesn't exist
- Updates existing entry if already cached (upsert)
- Resets `accessed_at` and increments `access_count`

**Usage:**
```sql
SELECT cache_trip(
  'user-uuid',
  'abc123...cache-key',
  'France',
  'Paris',
  'June 2025',
  'cultural',
  'moderate',
  'interested in museums',
  '**Destination Overview**...'  -- Full itinerary text
);
```

#### `cleanup_trip_cache()`

Removes old cache entries to prevent database bloat.

**Returns:** `INTEGER` - Number of entries deleted

**Behavior:**
- Deletes entries where `accessed_at` < 90 days ago
- Should be run periodically (cron job or manual)
- Non-destructive (only removes very old unused entries)

**Usage:**
```sql
SELECT cleanup_trip_cache();
-- Returns: 42 (deleted 42 old entries)
```

## Cache Expiration

**30-day expiration on read:**
- When `get_cached_trip()` is called, it only returns entries accessed within the last 30 days
- Expired entries are NOT automatically deleted (they just won't be returned)

**90-day cleanup:**
- The `cleanup_trip_cache()` function deletes entries older than 90 days
- This should be run periodically to prevent database bloat
- Can be scheduled with pg_cron or run manually

## Row-Level Security (RLS)

**Users can view their own cached trips:**
```sql
CREATE POLICY "Users can view own cached trips"
  ON trip_planner_cache
  FOR SELECT
  USING (auth.uid() = user_id);
```

**Only service role can insert/update:**
```sql
CREATE POLICY "Service role can manage trip cache"
  ON trip_planner_cache
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');
```

## Migration Instructions

### Apply to Database

**Option 1: Supabase Dashboard**
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `20250132_trip_planner_cache.sql`
3. Click "Run"

**Option 2: Supabase CLI**
```bash
supabase migration up
```

### Verify Migration

Check that table exists:
```sql
SELECT COUNT(*) FROM trip_planner_cache;
-- Should return 0 (empty table)
```

Check functions exist:
```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_name LIKE '%trip%';

-- Should show:
-- get_cached_trip
-- cache_trip
-- cleanup_trip_cache
```

## Monitoring & Analytics

### Cache Hit Rate

```sql
-- Overall cache statistics
SELECT
  COUNT(*) as total_cached_trips,
  SUM(access_count) as total_cache_hits,
  AVG(access_count) as avg_hits_per_entry,
  MIN(accessed_at) as oldest_access,
  MAX(accessed_at) as newest_access
FROM trip_planner_cache;
```

### Most Popular Trips

```sql
-- Top 10 most frequently cached trips
SELECT
  country,
  region,
  travel_style,
  budget,
  access_count,
  created_at,
  accessed_at
FROM trip_planner_cache
ORDER BY access_count DESC
LIMIT 10;
```

### User Cache Usage

```sql
-- How many cached trips each user has
SELECT
  user_id,
  COUNT(*) as cached_trips,
  SUM(access_count) as total_cache_hits
FROM trip_planner_cache
GROUP BY user_id
ORDER BY total_cache_hits DESC
LIMIT 20;
```

### Cache Age Distribution

```sql
-- How old are cached entries?
SELECT
  CASE
    WHEN accessed_at > NOW() - INTERVAL '7 days' THEN 'Last week'
    WHEN accessed_at > NOW() - INTERVAL '30 days' THEN 'Last month'
    WHEN accessed_at > NOW() - INTERVAL '90 days' THEN 'Last 3 months'
    ELSE 'Older than 3 months'
  END as age_bucket,
  COUNT(*) as entries
FROM trip_planner_cache
GROUP BY age_bucket
ORDER BY MIN(accessed_at) DESC;
```

## Best Practices

### Cache Invalidation

Currently, cached trips never change once generated. If you need to force fresh generation:

1. **Delete user's cache:**
```sql
DELETE FROM trip_planner_cache
WHERE user_id = 'user-uuid';
```

2. **Delete specific trip:**
```sql
DELETE FROM trip_planner_cache
WHERE user_id = 'user-uuid'
  AND cache_key = 'abc123...';
```

3. **Clear all cache:**
```sql
TRUNCATE trip_planner_cache;
```

### Scheduled Cleanup

Set up a cron job to run cleanup monthly:

```sql
-- Using pg_cron extension (if available)
SELECT cron.schedule(
  'trip-cache-cleanup',
  '0 0 1 * *',  -- First day of each month at midnight
  $$SELECT cleanup_trip_cache()$$
);
```

Or run manually:
```sql
SELECT cleanup_trip_cache();
```

### Cost Savings Estimation

**Without caching:**
- 100 users × 3 trips/month = 300 API calls/month
- At $0.001/call = $0.30/month

**With caching (50% cache hit rate):**
- 300 requests → 150 fresh generations + 150 cached
- 150 API calls/month
- At $0.001/call = $0.15/month
- **Savings: 50%**

**With higher cache hit rate (80%):**
- 300 requests → 60 fresh + 240 cached
- **Savings: 80%**

## Troubleshooting

### Cache not working?

1. **Check if migration applied:**
```sql
SELECT EXISTS (
  SELECT FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename = 'trip_planner_cache'
);
```

2. **Check RLS policies:**
```sql
SELECT * FROM pg_policies
WHERE tablename = 'trip_planner_cache';
```

3. **Test cache functions:**
```sql
-- Should return empty result (no cache yet)
SELECT * FROM get_cached_trip('test-user-id', 'test-key');

-- Should return TRUE
SELECT cache_trip(
  'test-user-id',
  'test-key',
  'Test',
  'Test',
  '',
  'test',
  'test',
  '',
  'Test itinerary'
);

-- Should now return the cached data
SELECT * FROM get_cached_trip('test-user-id', 'test-key');
```

### Cache returning stale data?

This is by design! Cached trips are immutable. To force refresh:
- Delete the cache entry (see Cache Invalidation above)
- User can change ANY input parameter slightly to bypass cache

### Database growing too large?

1. Run cleanup: `SELECT cleanup_trip_cache();`
2. Check entry sizes:
```sql
SELECT
  user_id,
  LENGTH(itinerary) as itinerary_bytes,
  LENGTH(itinerary) / 1024.0 as itinerary_kb
FROM trip_planner_cache
ORDER BY LENGTH(itinerary) DESC
LIMIT 10;
```

3. Consider reducing expiration from 90 to 30 days in cleanup function

## Future Enhancements

Potential improvements to consider:

1. **Global Cache:** Share cache across users for popular destinations
2. **Partial Matching:** Return cache for similar (but not identical) requests
3. **Version Control:** Track itinerary changes over time
4. **Cache Warming:** Pre-generate popular destination comb inations
5. **Analytics:** Track which destinations are most requested
6. **TTL Per Entry:** Different expiration times for different trip types
7. **Compression:** Compress `itinerary` column to save space

## Related Files

- **Migration:** `supabase/migrations/20250132_trip_planner_cache.sql`
- **API Route:** `src/app/api/trip-planner/generate/route.ts`
- **Usage Tracking Migration:** `supabase/migrations/20250131_ai_usage_tracking.sql`

## Support

For questions or issues:
1. Check server logs for cache-related errors
2. Verify migration applied successfully
3. Test cache functions directly in SQL Editor
4. Review RLS policies if permission errors occur
