# Adventure Log Database Migrations

This directory contains **consolidated, production-ready** database migrations for Adventure Log.

## Migration Files

### `02_ai_features.sql` - AI Usage Tracking & Trip Planner Caching
- `ai_usage` table - Tracks monthly AI feature usage per user (3 free/month limit)
- `trip_planner_cache` table - Caches generated trip itineraries to reduce API costs
- Functions for usage tracking and cache management
- RLS policies for user data privacy

### `03_social_features.sql` - Social Features & Engagement
- `mentions` table - Track @username mentions in comments
- `hashtags` table - Store unique hashtags with trending rankings
- `album_hashtags` table - Many-to-many album-hashtag relationships
- `search_history` table - Track user searches for autocomplete
- `activity_feed` table - Social activity stream (likes, comments, follows)
- `two_factor_auth` table - 2FA TOTP secrets and backup codes
- Functions for hashtag management and cleanup
- Auto-create activity feed entries via triggers

## How to Apply

Go to Supabase Dashboard → SQL Editor → Copy contents of migration files in order → Run

## Verification

```sql
-- Check AI features tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('ai_usage', 'trip_planner_cache');

-- Check social features tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('mentions', 'hashtags', 'album_hashtags', 'search_history', 'activity_feed', 'two_factor_auth');
```

## Backup

All 48 old migration files moved to `supabase/migrations_backup/` for reference.

Last updated: 2025-02-01
