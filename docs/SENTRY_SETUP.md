# Sentry Error Monitoring Setup

This guide explains how to set up Sentry for error monitoring in Adventure Log.

## Prerequisites

1. Create a Sentry account at https://sentry.io
2. Create a new project (select Next.js as the platform)
3. Get your DSN from the project settings

## Installation

```bash
npm install @sentry/nextjs
```

## Initialization

Run the Sentry wizard to set up configuration files:

```bash
npx @sentry/wizard@latest -i nextjs
```

This will create:
- `sentry.client.config.ts`
- `sentry.server.config.ts`
- `sentry.edge.config.ts`

## Environment Variables

Add to `.env.local`:

```bash
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn_here
SENTRY_AUTH_TOKEN=your_sentry_auth_token_here
SENTRY_ORG=your_sentry_org
SENTRY_PROJECT=adventure-log
```

## Configuration

The logger (`src/lib/utils/logger.ts`) automatically integrates with Sentry when `NEXT_PUBLIC_SENTRY_DSN` is set. Errors and warnings are automatically sent to Sentry in production.

## Source Maps Upload

To get readable stack traces in production, upload source maps during build.

### GitHub Actions

Add to `.github/workflows/ci.yml`:

```yaml
- name: Upload source maps to Sentry
  if: github.ref == 'refs/heads/main'
  env:
    SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
    SENTRY_ORG: your-org
    SENTRY_PROJECT: adventure-log
  run: |
    npm run build
    npx @sentry/cli sourcemaps upload --org=$SENTRY_ORG --project=$SENTRY_PROJECT .next
```

### Vercel

Add environment variables in Vercel dashboard:
- `SENTRY_AUTH_TOKEN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`

Then add to `vercel.json`:

```json
{
  "buildCommand": "npm run build && npx @sentry/cli sourcemaps upload --org=$SENTRY_ORG --project=$SENTRY_PROJECT .next"
}
```

## Testing

To test Sentry integration:

1. Add a test error in development:
```typescript
import { log } from '@/lib/utils/logger'
log.error('Test error', { component: 'test' }, new Error('Test error message'))
```

2. Check your Sentry dashboard - the error should appear within a few seconds

## Alert Configuration

Set up alerts in Sentry dashboard:
- Error rate > 5% over 15 minutes → Email + Slack
- New issues → Email notification
- Critical errors → Immediate alert

## Free Tier Limits

Sentry free tier includes:
- 5,000 errors/month
- 10,000 transactions/month
- 30-day retention
- Unlimited projects

This is sufficient for most small to medium applications.
