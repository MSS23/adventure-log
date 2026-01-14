# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Adventure Log is a social travel logging platform built with Next.js 15, TypeScript, Supabase, and Tailwind CSS. Users create albums with photos and locations, which appear on an interactive 3D globe visualization. The app supports social features like stories, likes, comments, and user following.

**Tech Stack:**
- **Framework:** Next.js 15.5.3 with App Router
- **Language:** TypeScript (strict mode)
- **Database:** Supabase (PostgreSQL with RLS)
- **Styling:** Tailwind CSS v4
- **State:** React Query + Zustand + Context
- **Mobile:** Capacitor 7.x (iOS/Android)
- **3D Visualization:** react-globe.gl + Three.js

## Commands

### Development
```bash
npm run dev              # Start dev server (localhost:3000)
npm run build            # Production build
npm run start            # Start production server
npm run lint             # Run ESLint with auto-fix
npm run type-check       # TypeScript compilation check (no emit)
npm run analyze          # Analyze bundle size
```

### Testing
```bash
npm test                 # Run Jest tests
npm run test:watch       # Run tests in watch mode
```

### Mobile Development (Capacitor)
```bash
npm run mobile:build     # Build mobile app
npm run mobile:dev       # Build and open Android Studio
npm run mobile:dev:ios   # Build and open Xcode
npm run mobile:sync      # Sync web build with native projects
```

### Docker
```bash
make dev                 # Start development environment
make prod                # Start production environment
make build               # Build production Docker image
make clean               # Clean up Docker resources
```

### Data Scripts
```bash
npm run seed             # Seed demo data
npm run seed:preview     # Preview seed data without applying
npm run seed:clear       # Clear seeded demo data
```

---

## Architecture

### Data Flow Pattern

**Client Components → Supabase Client → Database**
- Use `createClient()` from `@/lib/supabase/client` in client components
- Authentication state managed by `AuthProvider` context
- Profile data cached (5min TTL) to reduce queries

**Server Components → Supabase Server → Database**
- Use `createClient()` from `@/lib/supabase/server` in server components/actions
- Handles cookie-based auth automatically
- Async function returns server client with proper session

**Key distinction**: Two different `createClient()` functions exist - import from the correct path based on component type.

### Authentication Architecture

1. **AuthProvider** (`src/components/auth/AuthProvider.tsx`)
   - Wraps the app, provides `user` and `profile` via context
   - Handles profile creation if missing (with username generation)
   - Caches profile data with 5-minute TTL
   - Auto-refreshes auth state on mount and auth changes

2. **Profile Creation Flow**
   - On first login, checks if profile exists in `users` table
   - If missing, creates profile with auto-generated username: `user_{cleanId}`
   - Handles unique constraint violations with timestamp suffix
   - Database trigger `create_profile_on_signup` provides backup creation

3. **Protected Routes**
   - Use `ProtectedRoute` component to wrap auth-required pages
   - Redirects to `/login` if unauthenticated
   - Shows loading state during auth check

### Database Schema (Supabase PostgreSQL)

**Core Tables:**
- `users` - User profiles (linked to auth.users via id)
- `albums` - Travel albums with location/date metadata
- `photos` - Album photos with EXIF data and GPS coordinates
- `stories` - Ephemeral 24-hour stories (like Instagram)
- `likes` - Generic polymorphic likes (albums, stories, photos)
- `comments` - Polymorphic comments with nested replies
- `follows` - User following relationships

**Important Fields:**
- `albums.date_start` / `albums.start_date` - Travel dates (NOT created_at)
- `albums.latitude` / `albums.longitude` - GPS coordinates for globe visualization
- `albums.location_name` - Human-readable location (e.g., "Paris, France")
- `albums.country_code` - ISO 2-letter country code (e.g., "FR", "ES", "DE")
- `photos.file_path` - Relative storage path (NOT full URL)
- `users.privacy_level` - 'public' | 'private' | 'friends'
- `albums.visibility` - Same as privacy_level

**Location Data Requirements:**
- Albums MUST have `latitude`, `longitude`, AND `country_code` for full functionality
- `latitude`/`longitude` are required for globe visualization and location sections on album pages
- `country_code` is required for Countries tab grouping (if missing, extracted from `location_name`)
- Use `scripts/populate-country-codes.mjs` to populate missing country codes for existing albums

### Photo URL Handling

**Critical Pattern:**
```typescript
import { getPhotoUrl } from '@/lib/utils/photo-url'

// In components
const photoUrl = getPhotoUrl(photo.file_path)

// For Next.js Image component
<Image src={getPhotoUrl(photo.file_path) || ''} ... />
```

**Never** pass `file_path` directly to `<Image>` - it's a relative path like `user-id/album-id/photo.jpg`. Always use `getPhotoUrl()` to convert to full Supabase storage URL.

### Type System

**Central Types:** `src/types/database.ts`

Key patterns:
- `User` type (alias: `Profile` for backward compatibility)
- `Album` with optional `cover_photo_url` and `cover_image_url` (aliases)
- `Photo` with `file_path` (storage path) and `storage_path` (legacy alias)
- Multiple relation field names for compatibility:
  - `user` / `users` / `profiles` may all exist
  - `image_url` / `media_url` for stories
  - `text` / `content` for comments

**Why:** Supabase queries return different field names based on relation syntax. Types accommodate all variations.

### Logging System

**Centralized Logger:** `src/lib/utils/logger.ts`

```typescript
import { log } from '@/lib/utils/logger'

// With context
log.info('Action completed', {
  component: 'ComponentName',
  action: 'action-name',
  userId: user.id,
  albumId: album.id
})

// With error
log.error('Failed to fetch', { component: 'Feed', action: 'fetch' }, error)

// Convenience methods
log.userAction('clicked-button', { component: 'Dashboard' })
log.apiCall('/api/albums', 200, { duration: 150 })
log.performance('render', 45, { component: 'Globe' })
```

Always use structured logging with `component` and `action` fields for debugging.

### Design System

**Instagram-inspired tokens:** `src/lib/design-tokens.ts`

```typescript
import { instagramStyles } from '@/lib/design-tokens'

// Usage
<div className={instagramStyles.card}>
<h1 className={instagramStyles.text.heading}>
<Button className={instagramStyles.button.primary}>
```

Provides consistent spacing (4px grid), typography, shadows, and interactive states.

### Globe Visualization

**3D Globe:** `src/components/globe/EnhancedGlobe.tsx`
- Uses `react-globe.gl` with Three.js
- **Must** be dynamically imported with `ssr: false`
- Expects `latitude`, `longitude`, and album data with `visitDate`
- Timeline data from `useTravelTimeline` hook

**Travel Timeline Hook:** `src/lib/hooks/useTravelTimeline.ts`
- Fetches albums grouped by year
- Uses `date_start`/`start_date` for travel dates (NOT `created_at`)
- Generates cover photo URLs from storage paths
- Returns location clusters by city/country

### State Management

- **Auth State:** React Context (`AuthProvider`)
- **Server State:** React Query (`@tanstack/react-query`)
  - 5min staleTime, 10min gcTime
  - Auto-refetch on window focus
  - 2 retry attempts with exponential backoff
- **Client State:** Zustand (minimal usage)
- **Form State:** React Hook Form + Zod validation

---

## Security

### Security Configuration

**Central Config:** `src/lib/config/security.ts`

The security module provides comprehensive configuration for:
- Content Security Policy (CSP)
- Rate limiting thresholds
- Input validation patterns
- File upload restrictions
- Authentication security settings

### Input Validation

**Validation Utility:** `src/lib/utils/input-validation.ts`

```typescript
import { validationSchemas, sanitizeText, sanitizeHtml } from '@/lib/utils/input-validation'

// Pre-defined Zod schemas
validationSchemas.username    // 3-30 chars, alphanumeric + underscore
validationSchemas.displayName // 1-50 chars, sanitized
validationSchemas.albumTitle  // 1-100 chars, sanitized
validationSchemas.location    // 1-200 chars, sanitized
validationSchemas.commentText // 1-500 chars, sanitized

// Sanitization (uses DOMPurify)
const clean = sanitizeText(userInput)           // Strip all HTML
const safeHtml = sanitizeHtml(richText)         // Allow safe tags only
```

**Allowed HTML tags in sanitizeHtml:** `b`, `i`, `em`, `strong`, `a`, `p`, `br`

### File Upload Security

**Restrictions:**
- **Max file size:** 10MB
- **Allowed MIME types:** `image/jpeg`, `image/png`, `image/webp`, `image/gif`
- **Allowed extensions:** `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`
- **Filename validation:** `/^[a-zA-Z0-9._-]+$/` (no path traversal)

```typescript
// File validation pattern
if (file.size > 10 * 1024 * 1024) throw new Error('File too large')
if (!ALLOWED_MIME_TYPES.includes(file.type)) throw new Error('Invalid file type')
```

### Rate Limiting

**Configured limits** (in `security.ts`, enforcement needed in middleware):
- **API requests:** 100 requests / 15 minutes per IP
- **Auth attempts:** 5 attempts / 15 minutes per IP
- **File uploads:** 50 uploads / hour per IP

**Rate limiter utility:**
```typescript
import { RateLimiter } from '@/lib/utils/input-validation'

const limiter = new RateLimiter(5, 900000) // 5 attempts, 15min window
if (!limiter.isAllowed(userId)) {
  return { error: 'Too many attempts' }
}
```

### Security Headers

**Middleware:** `middleware.ts`

Applied security headers:
- `X-Frame-Options: DENY` - Clickjacking protection
- `X-Content-Type-Options: nosniff` - MIME sniffing protection
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` - Restricts camera/microphone/geolocation
- HSTS enabled in production (1 year, preload ready)

**CSRF Protection:**
- Origin/Host validation for upload endpoints
- SameSite=Lax cookies for session

---

## Error Handling

### Centralized Error Handler

**Utility:** `src/lib/utils/error-handler.ts`

```typescript
import {
  handleError,
  handleDatabaseError,
  handleNetworkError,
  getUserFriendlyMessage
} from '@/lib/utils/error-handler'

// Generic error handling
const result = handleError(error, { component: 'AlbumList', action: 'fetch' })
// Returns: { code, message, details, severity, retryable, timestamp }

// Database-specific
const dbError = handleDatabaseError(supabaseError)

// Network-specific (detects timeouts)
const netError = handleNetworkError(fetchError)

// User-safe messages
const userMessage = getUserFriendlyMessage(error)
```

### Error Severity Levels

| Severity | Use Case | Action |
|----------|----------|--------|
| `low` | Minor UI issues | Log only |
| `medium` | Feature degradation | Log + monitor |
| `high` | Core feature failure | Log + alert |
| `critical` | Security/data issues | Log + alert + notify |

### Retry Logic

Built-in exponential backoff:
- **Max delay:** 10 seconds
- **Max attempts:** 3
- **Skips:** Critical errors, auth failures

```typescript
import { withRetry } from '@/lib/utils/error-handler'

const result = await withRetry(
  () => fetchData(),
  { maxAttempts: 3, component: 'DataLoader' }
)
```

### Database Error Mapping

PostgreSQL error codes are mapped to app errors:
- `PGRST116` → `NO_DATA_FOUND`
- `23505` → `DUPLICATE_ENTRY` (unique constraint)
- `23503` → `FOREIGN_KEY_VIOLATION`
- `42P01` → `TABLE_NOT_FOUND`
- `42501` → `PERMISSION_DENIED`

---

## API Routes

### Route Structure

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/health` | GET | Health check (status, version) |
| `/api/manifest` | GET | PWA manifest |
| `/api/albums/[id]/cover-position` | PATCH | Update album cover position |
| `/api/geocode` | GET | Reverse geocoding |
| `/api/globe-reactions` | GET/POST | Globe reactions |
| `/api/globe-reactions/[id]` | DELETE | Remove reaction |
| `/api/globe-reactions/types` | GET | Available reaction types |
| `/api/itineraries` | GET/POST | Trip itineraries |
| `/api/itineraries/[id]` | GET/PATCH/DELETE | Single itinerary |
| `/api/itineraries/[id]/favorite` | POST | Toggle favorite |
| `/api/playlists` | GET | User playlists |
| `/api/playlists/[id]/items` | POST/DELETE | Playlist items |
| `/api/trip-planner/generate` | POST | AI trip generation |
| `/api/monitoring/errors` | POST | Error collection |
| `/api/monitoring/performance` | POST | Performance metrics |
| `/api/monitoring/web-vitals` | POST | Core Web Vitals |
| `/api/monitoring/security` | POST | Security events |

### Authentication Pattern

All protected routes follow this pattern:

```typescript
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ... route logic
}
```

### Response Format

**Success:**
```json
{ "data": { ... } }
// or direct data object
```

**Error:**
```json
{ "error": "User-friendly message" }
```

**Status codes:**
- `200` - Success
- `201` - Created
- `400` - Bad request (validation)
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not found
- `429` - Rate limited
- `500` - Server error

---

## Custom Hooks Reference

### Data Fetching

| Hook | Purpose |
|------|---------|
| `useSupabaseQuery` | Standardized Supabase queries with caching |
| `useSupabaseTable` | Common table operations (filter, order, limit) |
| `useSupabaseRPC` | RPC function calls |
| `useSupabaseMutation` | Mutations with optimistic updates |
| `usePhotos` | Photo data fetching |
| `usePhotoUpload` | Upload with progress tracking |
| `useTravelTimeline` | Timeline data with privacy filtering |

### State Management

| Hook | Purpose |
|------|---------|
| `useAuth` | Auth context access |
| `useAsyncOperation` | Generic async state (data/loading/error) |
| `useAsyncList` | List operations (add/remove/update) |
| `useAsyncPagination` | Pagination state |
| `useLoadingState` | Multi-state loading |
| `useSimpleLoading` | Boolean loading state |

### PWA & Mobile

| Hook | Purpose |
|------|---------|
| `usePWA` | PWA features detection |
| `useInstallPrompt` | App installation prompt |
| `useOnlineStatus` | Network status |
| `useNotifications` | Browser notifications |
| `useWebShare` | Native share API |
| `useOfflineData` | Offline storage |
| `usePWAUpdate` | Service worker updates |

### Social Features

| Hook | Purpose |
|------|---------|
| `useFollows` | Follow/unfollow operations |
| `useFavorites` | Like/favorite operations |
| `useReactions` | Emoji reactions |
| `useGlobeReactions` | Globe-specific interactions |
| `useRealTime` | Real-time subscriptions |

### Performance

| Hook | Purpose |
|------|---------|
| `useIntersectionObserver` | Viewport detection |
| `useLazyImage` | Image lazy loading |
| `useLazyComponent` | Component lazy loading |
| `useImageOptimization` | Image processing |
| `useDoubleTap` | Double-tap gestures |
| `useKeyboardNavigation` | Arrow/enter navigation |

---

## Testing

### Setup

**Configuration files:**
- `jest.config.mjs` - Jest configuration
- `jest.setup.js` - Browser API mocks

**Test location:** `__tests__/`

### Running Tests

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
```

### Mocked APIs

The test setup mocks browser APIs not available in Node:
- `window.matchMedia`
- `IntersectionObserver`
- `ResizeObserver`
- `requestIdleCallback`

### Writing Tests

```typescript
// Example test structure
import { render, screen } from '@testing-library/react'
import { ComponentName } from '@/components/ComponentName'

describe('ComponentName', () => {
  it('renders correctly', () => {
    render(<ComponentName />)
    expect(screen.getByText('Expected text')).toBeInTheDocument()
  })
})
```

### Coverage Recommendations

Priority areas for test coverage:
1. **Error handlers** - `src/lib/utils/error-handler.ts`
2. **Input validation** - `src/lib/utils/input-validation.ts`
3. **Server actions** - `src/app/(app)/*/actions.ts`
4. **Custom hooks** - `src/lib/hooks/`
5. **Auth flows** - `src/components/auth/`

---

## CI/CD

### Recommended GitHub Actions

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint

  type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run type-check

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm test

  build:
    runs-on: ubuntu-latest
    needs: [lint, type-check, test]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
```

### Security Scanning

Add `.github/workflows/security.yml`:

```yaml
name: Security

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 0 * * 1'  # Weekly on Monday

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm audit --audit-level=high
```

### Branch Protection

Recommended settings for `main` branch:
- Require pull request reviews
- Require status checks: `lint`, `type-check`, `test`, `build`
- Require branches to be up to date
- Do not allow bypassing settings

---

## Performance

### Code Splitting

**Webpack configuration** (`next.config.ts`):
- **Vendor chunk:** Large dependencies (>20KB)
- **Globe chunk:** react-globe.gl, Three.js (largest)
- **UI chunk:** Radix UI, Framer Motion
- **Common chunk:** Shared code

### Image Optimization

**Multi-size generation on upload:**
- Original image
- Thumbnail (`-thumbnail` suffix)
- Medium (`-medium` suffix)
- Large (`-large` suffix)

**Next.js Image config:**
- WebP/AVIF format support
- 60-second minimum cache TTL
- Allowed domains: Supabase storage, Unsplash, OSM, Mapbox

**Lazy loading pattern:**
```typescript
import { useIntersectionObserver } from '@/lib/hooks/useIntersectionObserver'

const { ref, isIntersecting } = useIntersectionObserver({
  threshold: 0.1,
  rootMargin: '50px'
})

return (
  <div ref={ref}>
    {isIntersecting && <Image ... />}
  </div>
)
```

### Caching Strategies

| Data | TTL | Location |
|------|-----|----------|
| Profile data | 5 min | AuthProvider |
| React Query | 5 min stale, 10 min GC | Client |
| Trip planner results | Permanent (SHA-256 key) | Database |
| Static assets | 1 year immutable | CDN |
| Service worker | No cache | Browser |

### Performance Utilities

```typescript
import { debounce, throttle, yieldToMain } from '@/lib/utils/performance'

// Debounce search input
const debouncedSearch = debounce(handleSearch, 300)

// Throttle scroll handler
const throttledScroll = throttle(handleScroll, 100)

// Break up long tasks
async function processItems(items) {
  for (const item of items) {
    await processItem(item)
    await yieldToMain() // Prevent blocking
  }
}
```

### INP Monitoring

```typescript
import { observeINP } from '@/lib/utils/performance'

// Monitors interactions > 200ms
observeINP((entry) => {
  log.performance('slow-interaction', entry.duration, {
    name: entry.name
  })
})
```

---

## Environment Variables

### Required

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
```

### Server-Only (Never expose to client)

```bash
SUPABASE_SERVICE_ROLE_KEY=xxx    # Admin access, bypasses RLS
```

### Optional

```bash
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=xxx   # Location search
NEXT_PUBLIC_APP_URL=http://localhost:3000  # SEO/OG tags
GROQ_API_KEY=xxx                      # Trip planning AI
OPENWEATHER_API_KEY=xxx               # Weather features
```

### Environment Validation

**Utility:** `src/lib/utils/environment-validator.ts`

```typescript
import { validateEnvironment, initializeEnvironment } from '@/lib/utils/environment-validator'

// Check all variables
const { isValid, errors, warnings } = validateEnvironment()

// Initialize (exits on production errors)
initializeEnvironment()
```

The validator checks:
- Required variables are present
- URL formats are valid
- Key formats match expected patterns
- Node.js version is 18+
- Production-specific requirements

---

## File Organization

```
src/
├── app/
│   ├── (app)/           # Protected routes (requires auth)
│   ├── (auth)/          # Auth routes (login, signup)
│   ├── (public)/        # Public routes
│   ├── actions/         # Server actions
│   └── api/             # API routes
├── components/          # React components by feature
│   ├── albums/
│   ├── auth/
│   ├── globe/
│   ├── ui/              # Radix-based primitives
│   └── ...
├── lib/
│   ├── config/          # Configuration (security, etc.)
│   ├── hooks/           # Custom React hooks
│   ├── supabase/        # Database clients
│   ├── utils/           # Utility functions
│   ├── validations/     # Zod schemas
│   └── services/        # External API integrations
└── types/               # TypeScript definitions

supabase/
└── migrations/          # Database migration SQL files

scripts/                 # Utility scripts
__tests__/              # Test files
```

---

## Mobile App (Capacitor)

- Build outputs to `dist/` directory
- Uses static export when `MOBILE_BUILD=true`
- Native projects in `android/` and `ios/`
- Capacitor plugins: Camera, Geolocation, Filesystem, Network, Preferences, Share, Toast
- After code changes, run `npm run mobile:build` then `npm run mobile:sync` to update PWA

---

## Deployment

### Pre-deployment Checklist

1. **Environment variables** set in deployment platform
2. **Database migrations** applied: `supabase/migrations/`
3. **Type check passes:** `npm run type-check`
4. **Lint passes:** `npm run lint`
5. **Build succeeds:** `npm run build`
6. **Tests pass:** `npm test`
7. **Security headers** verified in production
8. **Health endpoint** responds: `GET /api/health`
9. **RLS policies** verified on all tables
10. **Supabase storage** buckets configured
11. **Error tracking** service connected (Sentry recommended)
12. **Monitoring** dashboards configured

### Vercel

**Configuration:** `vercel.json`
- Clean URLs enabled
- Trailing slashes disabled
- Proper cache headers for assets

**Deploy:**
```bash
vercel --prod
```

**Environment:** Set via Vercel Dashboard > Settings > Environment Variables

**Note:** `vercel-build-ignore.sh` currently checks "master" branch but repo uses "main". Update if using this feature.

### Docker

**Production build:**
```bash
make build              # Build image
make prod               # Run production
make prod-logs          # View logs
```

**Multi-platform:**
```bash
make build-multi        # Build for linux/amd64,linux/arm64
```

### Database Migrations

**Run migrations:**
```bash
# Via Supabase CLI
supabase db push

# Or manually apply files in order:
# supabase/migrations/01_*.sql
# supabase/migrations/02_*.sql
# ...
```

**Migration files:** 9 total covering schema, AI features, social features, security hardening, and performance optimizations.

### Health Checks

**Endpoint:** `GET /api/health`

**Response:**
```json
{
  "status": "ok",
  "platform": "adventure-log",
  "version": "1.1.0"
}
```

### Monitoring Setup

1. **Error tracking:** Configure Sentry or similar
   - Integration points in `src/lib/utils/error-handler.ts`
   - Critical errors automatically flagged

2. **Performance monitoring:**
   - Web Vitals tracked via `/api/monitoring/web-vitals`
   - INP monitoring built-in

3. **Logging:**
   - Structured logs via `src/lib/utils/logger.ts`
   - Production logs: INFO level and above

---

## Troubleshooting

### Globe Not Rendering

**Symptoms:** 3D globe shows blank or partial sphere

**Solutions:**
1. Ensure dynamic import with `ssr: false`:
   ```typescript
   const Globe = dynamic(() => import('./EnhancedGlobe'), { ssr: false })
   ```
2. Check height inheritance chain - parent containers need explicit heights
3. Verify `latitude`/`longitude` data exists on albums
4. Check browser console for Three.js errors

### Auth Issues

**Token expiration:**
- AuthProvider auto-refreshes, but manual refresh may be needed
- Check Supabase dashboard for auth settings

**Profile not created:**
- Database trigger `create_profile_on_signup` should handle this
- Manual check: `SELECT * FROM users WHERE id = 'user-uuid'`

### Image Loading Failures

**Checklist:**
1. Using `getPhotoUrl()` wrapper? (required)
2. File exists in Supabase storage?
3. Storage bucket is public or proper RLS?
4. Image domain in `next.config.ts` remotePatterns?

### Build Failures

**Type errors:**
```bash
npm run type-check  # See detailed errors
```

**Common fixes:**
- Multiple relation field names (user/users/profiles)
- Optional chaining for nullable relations
- Import path errors (client vs server Supabase)

### Supabase Connection Issues

**Check:**
1. Environment variables set correctly
2. Supabase project is active (not paused)
3. Network allows connections to Supabase
4. RLS policies not blocking queries

### Mobile Build Problems

**Steps:**
```bash
npm run mobile:build    # Build web assets
npm run mobile:sync     # Sync to native
```

**If sync fails:**
- Check Capacitor config: `capacitor.config.ts`
- Ensure `dist/` directory exists
- Update native plugins: `npx cap update`

---

## Known Patterns to Follow

1. **Always validate photo URLs** with `getPhotoUrl()` before rendering
2. **Use travel dates** (`date_start`/`start_date`) for timeline, not `created_at`
3. **Import Supabase client** from correct path (client vs server)
4. **Log with context** using centralized logger
5. **Handle multiple field names** in types (user/users/profiles)
6. **Dynamic import globe** components to avoid SSR errors
7. **Cache profile data** when possible (5min TTL in AuthProvider)
8. **Ensure complete location data** - albums need `latitude`, `longitude`, AND `country_code`
9. **Countries tab fallback** - if `country_code` missing, extracts from last part of `location_name`
10. **Sanitize user input** with `sanitizeText()` or `sanitizeHtml()`
11. **Use error handler** for consistent error processing
12. **Handle async cleanup** with AbortController in useEffect
13. **Rate limit sensitive operations** using RateLimiter utility
14. **Never expose internal errors** - use `getUserFriendlyMessage()`

---

## Utility Scripts

**Data Management Scripts** (in `scripts/` directory):

```bash
# Check current state of album location data
NEXT_PUBLIC_SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/check-album-data.mjs

# Populate missing country codes (dry run first)
NEXT_PUBLIC_SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/populate-country-codes.mjs
NEXT_PUBLIC_SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/populate-country-codes.mjs --apply

# Populate missing coordinates (if needed)
NEXT_PUBLIC_SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/populate-album-coordinates.mjs
NEXT_PUBLIC_SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/populate-album-coordinates.mjs --apply

# Demo data
npm run seed:preview    # Preview what will be seeded
npm run seed            # Apply demo data
npm run seed:clear      # Remove demo data
```

**When to use:**
- After importing old data that lacks country codes or coordinates
- When albums show empty in Countries tab but have location_name
- When location section doesn't appear on album detail pages despite having location_name
