# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Adventure Log is a social travel logging platform built with Next.js 15, TypeScript, Supabase, and Tailwind CSS. Users create albums with photos and locations, which appear on an interactive 3D globe visualization. The app supports social features like stories, likes, comments, and user following.

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
- `photos.file_path` - Relative storage path (NOT full URL)
- `users.privacy_level` - 'public' | 'private' | 'friends'
- `albums.visibility` - Same as privacy_level

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
- **Client State:** Zustand (minimal usage)
- **Form State:** React Hook Form + Zod validation

### Common Patterns

**Conditional Supabase Relations:**
```typescript
// Query with nested user data
const { data } = await supabase
  .from('albums')
  .select(`
    *,
    users!albums_user_id_fkey(username, display_name, avatar_url)
  `)

// Access in component (handle both formats)
const username = album.user?.username || album.users?.username
```

**EXIF Extraction on Upload:**
- Use `exifr` library to extract GPS, camera data, timestamps
- Store in `photos.exif_data` (JSON), with top fields denormalized
- Location extraction: `latitude`, `longitude`, `taken_at`

**Empty States:**
- Check `stats.totalAlbums === 0` for new users
- `FirstAlbumPrompt` component auto-hides when user has albums
- Conditional rendering: `{!loading && items.length === 0 && <EmptyState />}`

## Environment Variables

**Required:**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
```

**Optional:**
```bash
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=xxx  # For location search
NEXT_PUBLIC_APP_URL=http://localhost:3000  # For SEO/OG tags
```

## File Organization

- `src/app/(app)/` - Protected routes (requires auth)
- `src/app/(auth)/` - Auth routes (login, signup)
- `src/components/` - React components grouped by feature
- `src/lib/hooks/` - Custom React hooks
- `src/lib/utils/` - Utility functions (logger, photo-url, etc)
- `src/types/` - TypeScript type definitions
- `supabase/migrations/` - Database migration SQL files

## Mobile App (Capacitor)

- Build outputs to `dist/` directory
- Uses static export when `MOBILE_BUILD=true`
- Native projects in `android/` and `ios/`
- Capacitor plugins: Camera, Geolocation, Filesystem, Share

## Security Notes

- Row-level security (RLS) enabled on all tables
- Users can only modify their own data
- Public data accessible to all (based on visibility field)
- `users` table has `deleted_at` for soft deletes (30-day recovery)
- RPC functions: `soft_delete_user`, `restore_user_account`

## Known Patterns to Follow

1. **Always validate photo URLs** with `getPhotoUrl()` before rendering
2. **Use travel dates** (`date_start`/`start_date`) for timeline, not `created_at`
3. **Import Supabase client** from correct path (client vs server)
4. **Log with context** using centralized logger
5. **Handle multiple field names** in types (user/users/profiles)
6. **Dynamic import globe** components to avoid SSR errors
7. **Cache profile data** when possible (5min TTL in AuthProvider)

## Deployment

- **Vercel:** Zero-config deployment from repository root
- **Docker:** Multi-stage builds with production optimizations
- **Environment:** Set Supabase vars in deployment platform
- **Database:** Run migrations from `supabase/migrations/` before deployment
