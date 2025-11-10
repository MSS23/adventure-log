# PostHog Analytics Setup Guide

PostHog is integrated into Adventure Log to provide product analytics, session recordings, and feature flags.

## Free Tier Limits
- **1 million events/month** free
- Unlimited feature flags
- Session recordings included
- Surveys and A/B testing included

## Setup Instructions

### 1. Create a PostHog Account
1. Go to [posthog.com](https://posthog.com) and sign up for free
2. Create a new project for Adventure Log
3. You'll be redirected to your project dashboard

### 2. Get Your API Keys
1. Go to **Project Settings** (gear icon in the bottom left)
2. Click on **Project API Key**
3. Copy your **Project API Key**
4. Note your **Host** (usually `https://us.i.posthog.com` for US cloud or `https://eu.i.posthog.com` for EU)

### 3. Add to Environment Variables

**Local Development (`.env.local`):**
```bash
NEXT_PUBLIC_POSTHOG_KEY=phc_your_actual_project_api_key_here
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

**Vercel Production:**
1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add:
   - `NEXT_PUBLIC_POSTHOG_KEY` = your PostHog project API key
   - `NEXT_PUBLIC_POSTHOG_HOST` = `https://us.i.posthog.com` (or your host)
4. Redeploy your application

### 4. Verify Integration
1. Start your local development server: `npm run dev`
2. Open the app in your browser
3. Navigate to a few pages
4. Go to PostHog dashboard → **Live Events**
5. You should see pageview events appearing in real-time

## What's Being Tracked

### Automatic Tracking
- **Pageviews**: Every page navigation
- **User identification**: When users log in/out
- **Session recordings**: Visual replay of user sessions (with privacy protections)

### Custom Events Tracked
All custom events are defined in `src/lib/analytics/events.ts`:

#### Album Events
- `album_created` - When user creates an album
- `album_viewed` - When any album is viewed
- `album_shared` - When album is shared

#### Photo Events
- `photo_uploaded` - When photos are uploaded

#### Social Events
- `user_followed` - When user follows someone
- `like_added` - When user likes content
- `comment_added` - When user comments

#### Story Events
- `story_created` - When 24h story is created
- `story_viewed` - When story is viewed

#### Globe Events
- `globe_viewed` - When globe visualization is opened
- `globe_location_clicked` - When location marker is clicked

#### Trip Planner Events
- `trip_plan_generated` - When AI generates trip plan
- `trip_plan_saved` - When user saves a trip plan

#### Search Events
- `search_performed` - When user searches

#### Profile Events
- `profile_updated` - When user updates profile
- `profile_viewed` - When profile page is viewed

#### Onboarding Events
- `signup_completed` - When user completes signup
- `onboarding_completed` - When onboarding flow finishes

## Using Events in Your Code

Import the tracking functions from `@/lib/analytics/events`:

```typescript
import { trackAlbumCreated, trackPhotoUploaded } from '@/lib/analytics/events'

// After creating an album
trackAlbumCreated(album.id, photoCount)

// After uploading a photo
trackPhotoUploaded(albumId, hasExifData)
```

## Privacy & Compliance

### What's Protected
- **Input masking**: All input fields are masked by default in session recordings
- **Selective capture**: Only specific user actions are captured
- **No PII**: Email addresses and sensitive data are not sent in events
- **User identification**: Only user ID is tracked, not personal details

### GDPR Compliance
PostHog is GDPR compliant:
- Data stored in EU (if using EU host)
- Users can be deleted
- Data export available
- Privacy policy compliant

### Opt-out (Future Feature)
You can implement user opt-out by calling:
```typescript
posthog.opt_out_capturing()
```

## Useful PostHog Features

### 1. Insights Dashboard
Create custom dashboards to track:
- Daily Active Users (DAU)
- Album creation rate
- Feature adoption
- User retention cohorts

### 2. Funnels
Track conversion funnels:
- Signup → First Album → Share
- Visit → Create Story → View Story

### 3. Session Recordings
Watch real user sessions to:
- Identify UX issues
- See where users get stuck
- Understand feature usage

### 4. Feature Flags
Roll out features gradually:
```typescript
if (posthog.isFeatureEnabled('new-globe-feature')) {
  // Show new feature
}
```

### 5. A/B Testing
Test different variations:
- Button colors
- Feature placement
- Onboarding flows

## Monitoring

### Check Event Volume
Go to **Project Settings → Usage** to monitor:
- Events this month
- Session recordings
- Remaining free tier allowance

### Set Up Alerts
Create alerts for:
- Error rate spikes
- Drop in DAU
- Feature usage anomalies

## Cost Management

### Staying Within Free Tier
- 1M events/month is generous
- Typical usage: 50-100 events per active user/month
- ~10,000-20,000 active users can fit in free tier

### If You Exceed
- PostHog will notify you
- Events beyond limit won't be dropped immediately
- You can upgrade or reduce tracking

## Troubleshooting

### Events Not Showing Up
1. Check browser console for errors
2. Verify `NEXT_PUBLIC_POSTHOG_KEY` is set
3. Check PostHog host URL is correct
4. Ensure you're not blocking analytics in browser

### Session Recordings Not Working
1. Verify session recording is enabled in PostHog settings
2. Check if recording is disabled in PostHog init (dev mode)

### Need Help?
- PostHog docs: https://posthog.com/docs
- PostHog community: https://posthog.com/questions
- Support: support@posthog.com

## Next Steps

After setup, consider:
1. Create a custom dashboard for key metrics
2. Set up funnels for user journeys
3. Enable feature flags for gradual rollouts
4. Watch session recordings to improve UX
5. Set up weekly reports

## Resources
- [PostHog Documentation](https://posthog.com/docs)
- [Next.js Integration Guide](https://posthog.com/docs/libraries/next-js)
- [Privacy & GDPR](https://posthog.com/docs/privacy)
- [Pricing](https://posthog.com/pricing)
