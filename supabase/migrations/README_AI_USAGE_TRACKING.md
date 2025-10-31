# AI Usage Tracking Migration

This migration adds the infrastructure for tracking AI feature usage to implement usage limits for free users.

## What This Migration Does

1. **Creates `ai_usage` Table**
   - Tracks how many times a user has used AI features per month
   - Supports multiple feature types (trip_planner, photo_caption, etc.)
   - Automatically tracks usage by month

2. **Implements Usage Limits**
   - Free tier: 3 AI generations per month per feature
   - Usage resets at the start of each month
   - Can be extended for premium/paid tiers in the future

3. **Adds Helper Functions**
   - `get_or_create_ai_usage()` - Check current usage and if limit is exceeded
   - `increment_ai_usage()` - Increment usage counter after successful generation

## How to Run This Migration

If you're using Supabase locally:
```bash
supabase db push
```

If you're using Supabase cloud:
1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `20250131_ai_usage_tracking.sql`
4. Run the query

## Environment Variables Required

For the AI Trip Planner to work, you need to set:

```env
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

Get your API key from: https://console.anthropic.com/

## Usage in Application

The API endpoint `/api/trip-planner/generate` automatically:
1. Checks if user has exceeded monthly limit (3 generations)
2. Returns error 429 if limit exceeded
3. Generates the trip itinerary using Claude
4. Increments the usage counter
5. Returns remaining generations to the user

## Future Extensions

This infrastructure can be extended to support:
- Different limits for premium users
- Multiple AI features (photo captions, itinerary suggestions, etc.)
- Usage analytics and reporting
- Billing integration

## Testing

After running the migration, test by:
1. Opening the app and clicking "Plan My Trip" in the sidebar
2. Fill out the form and generate 3 trips
3. On the 4th attempt, you should see a limit exceeded message
4. Wait until next month or reset your usage in the database for testing
