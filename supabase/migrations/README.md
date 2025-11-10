# Adventure Log Database Migrations

This directory contains **consolidated, production-ready** database migrations for Adventure Log.

## Migration Files

### `02_ai_features.sql` - AI Usage Tracking & Trip Planner Caching
- `ai_usage` table - Tracks monthly AI feature usage per user (3 free/month limit)
- `trip_planner_cache` table - Caches generated trip itineraries to reduce API costs
- Functions for usage tracking and cache management
- RLS policies for user data privacy

## How to Apply

Go to Supabase Dashboard → SQL Editor → Copy contents of `02_ai_features.sql` → Run

## Verification

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('ai_usage', 'trip_planner_cache');
```

## Backup

All 48 old migration files moved to `supabase/migrations_backup/` for reference.

Last updated: 2025-01-31
