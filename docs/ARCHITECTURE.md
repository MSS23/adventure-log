# Architecture Documentation

## Overview

Adventure Log is a **Next.js 15** social travel logging platform with a hybrid server-side and client-side rendering architecture, powered by Supabase for backend services.

**Architecture Type:** Hybrid SSR/CSR with Progressive Enhancement
**Grade:** B+ (85/100)
**Last Updated:** January 2025

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│  ┌──────────────────────┐         ┌─────────────────────────┐  │
│  │ Browser (Web App)    │         │ Mobile (Capacitor)      │  │
│  │                      │         │                         │  │
│  │ - React 19           │         │ - iOS App               │  │
│  │ - Next.js 15 Client  │         │ - Android App           │  │
│  │ - Service Worker     │         │ - Native APIs           │  │
│  └──────────────────────┘         └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                            │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              Next.js 15 App Router                         │ │
│  │                                                            │ │
│  │  Server Components (RSC)      Client Components           │ │
│  │  ├─ Layouts                    ├─ AuthProvider Context    │ │
│  │  ├─ Static Pages               ├─ Interactive Forms       │ │
│  │  ├─ Metadata Generation        ├─ Globe Visualization     │ │
│  │  └─ Initial Data Fetching      └─ Real-time Features      │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                             │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │ Custom Hooks │  │ Utilities    │  │ Server Actions        │ │
│  │              │  │              │  │                       │ │
│  │ - useAuth    │  │ - logger     │  │ - album-sharing.ts    │ │
│  │ - useFeed    │  │ - photo-url  │  │ - photo-metadata.ts   │ │
│  │ - useTimeline│  │ - privacy    │  │                       │ │
│  │ - useSocial  │  │ - validation │  │                       │ │
│  └──────────────┘  └──────────────┘  └───────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATA ACCESS LAYER                             │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    Supabase Clients                         │ │
│  │                                                             │ │
│  │  Client Context              Server Context                │ │
│  │  (@/lib/supabase/client)     (@/lib/supabase/server)       │ │
│  │                                                             │ │
│  │  ├─ Browser-side auth         ├─ Server-side auth          │ │
│  │  ├─ Client components         ├─ Server components         │ │
│  │  ├─ Real-time subscriptions   ├─ Cookie-based sessions     │ │
│  │  └─ localStorage token        └─ Request-scoped client     │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    INFRASTRUCTURE LAYER                          │
│  ┌────────────┐  ┌─────────────┐  ┌──────────┐  ┌───────────┐ │
│  │ Supabase   │  │  External   │  │ Vercel   │  │ Capacitor │ │
│  │ Platform   │  │  Services   │  │   Edge   │  │  Native   │ │
│  │            │  │             │  │          │  │           │ │
│  │ PostgreSQL │  │ Mapbox      │  │ CDN      │  │ Camera    │ │
│  │ Storage    │  │ Geocoding   │  │ Functions│  │ Location  │ │
│  │ Auth       │  │             │  │ Analytics│  │ Share     │ │
│  │ Realtime   │  │             │  │          │  │           │ │
│  └────────────┘  └─────────────┘  └──────────┘  └───────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Architectural Patterns

### 1. Dual Supabase Client Pattern ⭐⭐⭐⭐⭐

**Why This Matters:** Prevents authentication bugs by ensuring the correct client is used in each context.

**Client-Side Client:**
```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Usage:**
```typescript
// In client components (with 'use client')
'use client'
import { createClient } from '@/lib/supabase/client'

export function MyClientComponent() {
  const supabase = createClient() // Browser context
  // ...
}
```

**Server-Side Client:**
```typescript
// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) { /* ... */ }
      }
    }
  )
}
```

**Usage:**
```typescript
// In server components, API routes, server actions
import { createClient } from '@/lib/supabase/server'

export default async function MyServerPage() {
  const supabase = await createClient() // Server context
  // ...
}
```

**Critical Rule:** NEVER mix these imports!

---

### 2. Data Flow Pattern

```
User Action
    │
    ▼
┌─────────────────┐
│ React Component │
└─────────────────┘
    │
    ▼
┌─────────────────┐
│  Custom Hook    │ ← useAuth, useFeedData, useTimeline
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ Supabase Query  │ ← Database or RPC call
└─────────────────┘
    │
    ▼
┌─────────────────┐
│   RLS Policy    │ ← Row-Level Security filter
└─────────────────┘
    │
    ▼
┌─────────────────┐
│   PostgreSQL    │ ← Actual database query
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ Hook State      │ ← useState, React Query cache
└─────────────────┘
    │
    ▼
┌─────────────────┐
│  Component      │ ← Re-render with new data
│  Re-render      │
└─────────────────┘
```

**Example Implementation:**
```typescript
// src/lib/hooks/useFeedData.ts
export function useFeedData() {
  const [albums, setAlbums] = useState<FeedAlbum[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchFeed = useCallback(async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from('albums')
      .select(`
        *,
        users!albums_user_id_fkey(username, display_name, avatar_url)
      `)
      .or('visibility.eq.public,visibility.is.null')
      .neq('status', 'draft')
      .order('created_at', { ascending: false })
      .limit(30)

    if (error) {
      log.error('Failed to fetch feed', { component: 'useFeedData' }, error)
      setLoading(false)
      return
    }

    setAlbums(data as FeedAlbum[])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchFeed()
  }, [fetchFeed])

  return { albums, loading, refreshFeed: fetchFeed }
}
```

---

### 3. Authentication Architecture

```
┌────────────────────────────────────────────────────────┐
│                   AuthProvider                          │
│  (Context wrapping entire app)                         │
│                                                         │
│  ┌──────────────────────────────────────────────────┐ │
│  │  State Management                                 │ │
│  │  - user: User | null                              │ │
│  │  - profile: Profile | null                        │ │
│  │  - authLoading: boolean                           │ │
│  │  - profileLoading: boolean                        │ │
│  └──────────────────────────────────────────────────┘ │
│                                                         │
│  ┌──────────────────────────────────────────────────┐ │
│  │  Profile Cache (5min TTL)                         │ │
│  │  Map<userId, { data, timestamp, ttl }>            │ │
│  └──────────────────────────────────────────────────┘ │
│                                                         │
│  ┌──────────────────────────────────────────────────┐ │
│  │  Methods                                          │ │
│  │  - fetchProfile(userId)                           │ │
│  │  - createProfile(userId)                          │ │
│  │  - refreshProfile()                               │ │
│  │  - signOut()                                      │ │
│  └──────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────┐
│               Supabase Auth Flow                        │
│                                                         │
│  1. getSession() → Get initial session                 │
│  2. onAuthStateChange() → Listen for changes           │
│  3. If session.user exists → fetchProfile()            │
│  4. If no profile → createProfile() with username      │
│  5. Cache profile in Map with 5min TTL                 │
│  6. Broadcast auth state to all components             │
└────────────────────────────────────────────────────────┘
```

**Profile Creation Logic:**
```typescript
// src/components/auth/AuthProvider.tsx
const createProfile = useCallback(async (userId: string): Promise<Profile | null> => {
  // Generate username: user_{cleanId}
  const cleanId = userId.replace(/-/g, '').substring(0, 8)
  const username = `user_${cleanId}`

  const { data, error } = await supabase
    .from('users')
    .insert({
      id: userId,
      username,
      display_name: 'New User',
      privacy_level: 'public'
    })
    .select()
    .single()

  // Handle unique constraint violations
  if (error && error.code === '23505') {
    // Retry with timestamp suffix
    const fallbackUsername = `user_${cleanId}_${Date.now().toString().slice(-4)}`
    // ...retry logic
  }

  return data as Profile
}, [supabase])
```

---

### 4. Component Organization

```
src/components/
├── albums/              # Album-related components
│   ├── AlbumCard.tsx
│   ├── AlbumGrid.tsx
│   └── AlbumForm.tsx
├── auth/                # Authentication
│   ├── AuthProvider.tsx      ← Global auth context
│   ├── ProtectedRoute.tsx    ← Route wrapper
│   └── ConditionalAuthProvider.tsx
├── dashboard/           # Dashboard widgets
│   ├── QuickActions.tsx
│   ├── TravelAchievements.tsx
│   └── TravelInsights.tsx
├── feed/                # Social feed
│   ├── FeedItem.tsx
│   ├── MiniGlobe.tsx
│   └── StoryTray.tsx
├── globe/               # 3D Globe visualization
│   ├── EnhancedGlobe.tsx     ← Main component (2280 lines - needs refactor)
│   ├── TimelineControls.tsx
│   ├── CityPinSystem.tsx
│   └── FlightAnimation.tsx
├── photos/              # Photo management
│   ├── PhotoGrid.tsx
│   ├── PhotoUpload.tsx
│   └── EnhancedLightbox.tsx
├── social/              # Social features
│   ├── Comments.tsx
│   ├── LikeButton.tsx
│   ├── FollowButton.tsx
│   └── FollowLists.tsx
├── stories/             # Instagram-style stories
│   ├── StoryTray.tsx
│   ├── StoryViewer.tsx
│   └── CreateStoryModal.tsx
├── ui/                  # Reusable UI components (Radix UI)
│   ├── button.tsx
│   ├── dialog.tsx
│   ├── input.tsx
│   └── ... (25+ components)
└── common/              # Shared components
    ├── CountrySearch.tsx
    ├── PrivacySelector.tsx
    └── LocationSearch.tsx
```

---

### 5. Database Schema Overview

```sql
-- Core Tables
users                    # User profiles (linked to auth.users)
  ├── id (uuid, PK)
  ├── username (unique)
  ├── email
  ├── privacy_level ('public' | 'private' | 'friends')
  └── avatar_url

albums                   # Travel albums
  ├── id (uuid, PK)
  ├── user_id (FK → users.id)
  ├── title
  ├── location_lat, location_lng
  ├── date_start, date_end
  ├── visibility ('public' | 'private' | 'friends')
  ├── status ('draft' | 'published')
  └── cover_photo_id (FK → photos.id)

photos                   # Album photos
  ├── id (uuid, PK)
  ├── album_id (FK → albums.id)
  ├── user_id (FK → users.id)
  ├── file_path (storage path)
  ├── file_hash (SHA-256 for duplicates)
  ├── latitude, longitude
  ├── exif_data (jsonb)
  └── order_index

-- Social Tables
follows                  # User relationships
  ├── follower_id (FK → users.id)
  ├── following_id (FK → users.id)
  └── status ('pending' | 'approved')

likes                    # Polymorphic likes
  ├── user_id (FK → users.id)
  ├── target_type ('photo' | 'album' | 'comment')
  └── target_id (uuid)

comments                 # Nested comments
  ├── user_id (FK → users.id)
  ├── target_type ('photo' | 'album')
  ├── target_id (uuid)
  ├── parent_id (FK → comments.id, nullable)
  └── content

stories                  # 24-hour ephemeral stories
  ├── user_id (FK → users.id)
  ├── media_url
  ├── country_code
  ├── posted_at
  └── expires_at (posted_at + 24 hours)

-- Advanced Features
album_shares            # Collaborative albums
  ├── album_id (FK → albums.id)
  ├── shared_with_user_id (FK → users.id)
  ├── share_token (unique)
  ├── permission_level ('view' | 'contribute' | 'edit')
  └── expires_at

globe_reactions         # Interactive globe reactions
  ├── user_id (FK → users.id)
  ├── target_user_id (FK → users.id)
  ├── target_album_id (FK → albums.id)
  ├── reaction_type (FK → globe_reaction_types.id)
  ├── latitude, longitude
  └── message

playlists               # Curated location collections
  ├── user_id (FK → users.id)
  ├── playlist_type ('curated' | 'smart' | 'travel_route')
  ├── visibility
  └── is_collaborative

-- Offline Support
upload_queue            # Pending uploads when offline
  ├── user_id
  ├── resource_type ('album' | 'photo')
  ├── payload (jsonb)
  └── status ('pending' | 'uploading' | 'completed')
```

**Key RLS Policies:**
```sql
-- Albums: Users can view public/own/friends' albums
CREATE POLICY "View visible albums" ON albums FOR SELECT
  USING (
    status != 'draft'
    AND (
      visibility = 'public'
      OR user_id = auth.uid()
      OR (visibility = 'friends' AND EXISTS (
        SELECT 1 FROM follows WHERE ...
      ))
    )
  );

-- Photos: Inherit visibility from parent album
CREATE POLICY "View photos from visible albums" ON photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM albums WHERE albums.id = photos.album_id
      -- ... album visibility logic
    )
  );
```

---

## Technology Stack

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 15.5.3 | React framework with App Router |
| React | 19.1.0 | UI library |
| TypeScript | 5.9.2 | Type safety |
| Tailwind CSS | 4.1.13 | Styling |
| Framer Motion | 12.23.16 | Animations |
| React Globe.gl | 2.36.0 | 3D globe visualization |
| Three.js | 0.180.0 | 3D graphics (globe dependency) |
| Radix UI | Various | Headless UI components |

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Supabase | 2.57.4 | BaaS (Database, Auth, Storage) |
| PostgreSQL | 15+ | Database |
| Zod | 4.1.11 | Schema validation |

### Mobile
| Technology | Version | Purpose |
|-----------|---------|---------|
| Capacitor | 7.4.3 | Native mobile wrapper |
| Capacitor Camera | 7.0.2 | Camera access |
| Capacitor Geolocation | 7.1.5 | GPS location |

### Tools & Services
| Technology | Purpose |
|-----------|---------|
| Vercel | Hosting & deployment |
| Mapbox | Geocoding API |
| EXIFR | EXIF data extraction |
| Sharp | Image optimization |

---

## Scalability Roadmap

### Phase 1: Current State (0-10K users) ✅
- Database with basic indexes
- Next.js SSR/CSR hybrid
- Supabase free tier
- Vercel hobby plan

### Phase 2: Optimization (10K-100K users) 🔄
- **React Query caching** (reduces DB load by 70%)
- **Composite database indexes**
- **CDN for static assets**
- **Redis caching layer** (Upstash/Vercel KV)
- **Supabase Pro tier** with read replicas

### Phase 3: Horizontal Scaling (100K-1M users) 📋
- **Separate photo processing service**
- **Message queue** (for async jobs)
- **Multi-region Supabase**
- **Edge Functions** for complex queries
- **Search service** (Algolia/Meilisearch)

### Phase 4: Enterprise (1M+ users) 🎯
- **Kubernetes orchestration**
- **Microservices architecture**
- **Custom CDN configuration**
- **Dedicated infrastructure**
- **99.9% SLA guarantees**

---

## Critical Architectural Decisions

### 1. Why Dual Supabase Clients?
**Decision:** Maintain separate client/server Supabase instances.

**Rationale:**
- Server components need cookie-based auth
- Client components need localStorage tokens
- Prevents auth bugs from using wrong client
- Follows Next.js 15 best practices

**Trade-off:** Slightly more verbose imports, but prevents major bugs.

---

### 2. Why No Service Layer?
**Current State:** Direct Supabase calls in hooks.

**Decision:** Initially skipped for rapid development.

**Status:** ⚠️ **Technical Debt** - Should add service layer.

**Recommendation:**
```typescript
// Future: src/services/albums/album-service.ts
export class AlbumService {
  constructor(private supabase: SupabaseClient) {}

  async getAlbums(userId: string, filters: AlbumFilters) {
    // Centralized query logic
    // Validation
    // Error handling
    // Logging
  }
}
```

---

### 3. Why React 19 Without React Query?
**Current State:** Manual state management in hooks.

**Decision:** Started before React Query integration.

**Status:** ⚠️ **High Priority Refactor**

**Impact:**
- Every component mount = fresh DB query
- No automatic cache invalidation
- No request deduplication

**Fix:** Install @tanstack/react-query (Week 2 priority).

---

### 4. Why EnhancedGlobe is 2,280 Lines?
**Current State:** Monolithic globe component.

**Decision:** Rapid prototyping led to complexity.

**Status:** 🚨 **Critical Refactor Needed**

**Recommendation:** Split into 8-10 sub-components (detailed in refactoring guide).

---

## Anti-Patterns to Avoid

### ❌ Anti-Pattern #1: Mixing Supabase Clients
```typescript
// WRONG
import { createClient } from '@/lib/supabase/client' // In API route!
```

### ❌ Anti-Pattern #2: Direct State Management
```typescript
// CURRENT (not ideal)
const [data, setData] = useState()
useEffect(() => { fetchData() }, [])

// BETTER (React Query)
const { data } = useQuery(['albums'], fetchAlbums)
```

### ❌ Anti-Pattern #3: No Error Boundaries
```typescript
// MISSING: Route-level error boundaries
// Should wrap each route group
```

---

## Performance Considerations

### Bundle Size
**Current:** 616KB - 680KB per route
**Target:** < 300KB per route

**Large Dependencies:**
- `react-globe.gl` + `three.js` = ~500KB
- `mapbox-gl` = ~300KB
- `framer-motion` = ~100KB

**Optimization Strategy:**
1. Dynamic imports for Globe
2. Lighter 3D library alternatives
3. Remove unused Framer Motion features

### Database Query Patterns
**Good:**
```typescript
// Single query with joins
const { data } = await supabase
  .from('albums')
  .select('*, users(*), photos(count)')
```

**Bad (N+1):**
```typescript
// Current issue in useTravelTimeline
for (const album of albums) {
  const { count } = await supabase.from('photos').select('count')
}
```

---

## Security Architecture

### Defense in Depth Layers

1. **Network Layer** - HTTPS, security headers
2. **API Layer** - Authentication, rate limiting
3. **Application Layer** - Input validation, sanitization
4. **Database Layer** - RLS policies, constraints
5. **Monitoring Layer** - Error tracking, audit logs

**Current Gaps:**
- ❌ No rate limiting integrated
- ❌ XSS vulnerabilities (innerHTML usage)
- ❌ Permissive RLS policy (album_shares)

See `SECURITY.md` for full details.

---

## Future Architecture Vision

### Domain-Driven Design Structure
```
src/
├── domains/
│   ├── albums/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types/
│   │   └── validations/
│   ├── social/
│   ├── globe/
│   └── auth/
├── shared/
│   ├── components/
│   ├── utils/
│   └── types/
└── infrastructure/
    ├── supabase/
    ├── cache/
    └── monitoring/
```

### Event-Driven Architecture
```typescript
// Future: Domain events
type AlbumEvent =
  | { type: 'ALBUM_CREATED'; payload: Album }
  | { type: 'PHOTO_UPLOADED'; payload: Photo }
  | { type: 'ALBUM_SHARED'; payload: Share }

// Event bus
eventBus.publish('ALBUM_CREATED', album)

// Subscribers
eventBus.subscribe('ALBUM_CREATED', notificationService.send)
eventBus.subscribe('PHOTO_UPLOADED', thumbnailService.generate)
```

---

## References

- [Next.js 15 Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [React 19 Release Notes](https://react.dev/blog/2024/12/05/react-19)
- [Vercel Edge Functions](https://vercel.com/docs/functions/edge-functions)
- [Capacitor Documentation](https://capacitorjs.com/docs)
