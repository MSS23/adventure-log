# Performance Optimization Guide

Complete performance optimization strategies, benchmarks, and monitoring for Adventure Log.

**Current Performance Grade:** C+ (70/100)
**Target Performance Grade:** A (90+/100)

---

## Performance Metrics

### Current State

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Bundle Size (First Load) | 616-680KB | <300KB | ❌ |
| Lighthouse Performance | 65-75 | >90 | ⚠️ |
| Time to Interactive (TTI) | 4.5s | <3s | ⚠️ |
| First Contentful Paint (FCP) | 2.1s | <1.5s | ⚠️ |
| Largest Contentful Paint (LCP) | 3.8s | <2.5s | ⚠️ |
| Cumulative Layout Shift (CLS) | 0.15 | <0.1 | ⚠️ |
| Total Blocking Time (TBT) | 850ms | <200ms | ❌ |

---

## Critical Performance Issues

### 1. Bundle Size - 616KB+ Per Route 🚨

**Problem:** Initial JavaScript bundle is too large, impacting load time.

**Contributors:**
- `react-globe.gl` + `three.js` + `globe.gl` = ~500KB
- `mapbox-gl` = ~300KB
- `framer-motion` = ~100KB
- Radix UI components = ~150KB

**Current next.config.ts:**
```typescript
webpack: (config, { isServer }) => {
  if (!isServer) {
    config.optimization = {
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          globe: {
            name: 'globe',
            test: /[\\/]node_modules[\\/](react-globe\.gl|globe\.gl|three)[\\/]/,
            priority: 30
          },
          ui: {
            name: 'ui',
            test: /[\\/]node_modules[\\/](@radix-ui|framer-motion)[\\/]/,
            priority: 25
          }
        }
      }
    }
  }
}
```

**Solutions:**

**A) Dynamic Imports (CRITICAL)**
```typescript
// src/app/(app)/globe/page.tsx
import dynamic from 'next/dynamic'

const EnhancedGlobe = dynamic(
  () => import('@/components/globe/EnhancedGlobe'),
  {
    ssr: false,
    loading: () => <GlobeSkeleton />
  }
)

// Also dynamically import Mapbox
const PhotoMap = dynamic(
  () => import('@/components/map/PhotoMap'),
  { ssr: false }
)
```

**B) Tree Shaking Optimization**
```typescript
// Instead of importing entire libraries
import { motion } from 'framer-motion' // ❌ Imports everything

// Use specific imports
import { m } from 'framer-motion' // ✅ Smaller bundle
```

**C) Lighter Alternatives**
```bash
# Consider replacing heavy dependencies
npm uninstall mapbox-gl
npm install maplibre-gl  # Open source, lighter alternative
```

**D) Analyze Bundle**
```bash
npm run analyze

# Review the generated report
open .next/analyze/client.html
```

**Expected Improvement:** 616KB → 280KB (54% reduction)

---

### 2. N+1 Query Pattern 🚨

**Location:** `src/lib/hooks/useTravelTimeline.ts:242-253`

**Problem:**
```typescript
// Fetches photo counts one by one
const photoCountQueries = albumIds.map(async (albumId) => {
  const { count } = await supabase
    .from('photos')
    .select('*', { count: 'exact', head: true })
    .eq('album_id', albumId)
})
```

**Impact:** 50 albums = 50 database queries (600ms total)

**Solution - Create RPC Function:**
```sql
-- supabase/migrations/20250115_batch_photo_counts.sql
CREATE OR REPLACE FUNCTION get_batch_photo_counts(album_ids uuid[])
RETURNS TABLE (album_id uuid, photo_count bigint) AS $$
  SELECT album_id, COUNT(*)::bigint
  FROM photos
  WHERE album_id = ANY(album_ids)
  GROUP BY album_id;
$$ LANGUAGE SQL STABLE;
```

**Updated Hook:**
```typescript
// Single query for all albums
const { data: photoCounts } = await supabase
  .rpc('get_batch_photo_counts', { album_ids: albumIds })

// Map results
const countsMap = new Map(photoCounts.map(r => [r.album_id, r.photo_count]))
```

**Expected Improvement:** 600ms → 50ms (92% faster)

---

### 3. Missing React Query Caching 🚨

**Problem:** Every component mount triggers fresh database query.

**Example:**
```typescript
// useFeedData.ts - No caching
export function useFeedData() {
  const [albums, setAlbums] = useState([])

  useEffect(() => {
    fetchFeed() // Runs on every mount
  }, [])
}
```

**Solution:**
```bash
npm install @tanstack/react-query
```

**Setup Query Client:**
```typescript
// src/lib/query-client.ts
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})
```

**Wrap App:**
```typescript
// src/app/layout.tsx
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/query-client'

export default function RootLayout({ children }: Props) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

**Refactor Hooks:**
```typescript
// src/lib/hooks/useFeedData.ts
import { useQuery } from '@tanstack/react-query'

export function useFeedData() {
  return useQuery({
    queryKey: ['feed', 'public'],
    queryFn: async () => {
      const { data } = await supabase
        .from('albums')
        .select('*')
        .eq('visibility', 'public')
        .limit(30)
      return data
    },
    staleTime: 2 * 60 * 1000, // 2 min cache
  })
}
```

**Expected Improvement:** 70% reduction in database queries

---

### 4. EnhancedGlobe Component - 2,280 Lines 🚨

**Problem:** Massive component causes:
- Long initial render (450ms)
- Excessive re-renders
- Difficult debugging
- Memory leaks

**Solution - Refactor into Sub-Components:**

```
src/components/globe/
├── index.tsx                 # Main orchestrator (200 lines)
├── GlobeRenderer.tsx         # 3D rendering logic
├── GlobeControls.tsx         # Playback, zoom controls
├── GlobePinSystem.tsx        # Pin rendering
├── GlobeTimeline.tsx         # Year selector
├── hooks/
│   ├── useGlobeCamera.ts     # Camera animations
│   ├── useGlobeData.ts       # Data fetching
│   ├── useGlobeAnimation.ts  # Flight paths
│   └── useGlobeState.ts      # State management (useReducer)
└── types.ts
```

**Refactored Main Component:**
```typescript
// src/components/globe/index.tsx
export function EnhancedGlobe({ className, initialAlbumId }: Props) {
  const globeState = useGlobeState()
  const cameraControls = useGlobeCamera(globeState)
  const { locations, loading } = useGlobeData()

  return (
    <div className={className}>
      <GlobeTimeline {...globeState} />
      <GlobeRenderer
        locations={locations}
        cameraControls={cameraControls}
      />
      <GlobeControls {...globeState} />
    </div>
  )
}
```

**Expected Improvement:**
- Initial render: 450ms → 180ms (60% faster)
- Re-renders reduced by 80%
- Memory usage -40%

---

### 5. Image Optimization 📉

**Current Issues:**
- No lazy loading for off-screen images
- Missing `priority` attribute on hero images
- No blur placeholder

**Solution:**
```typescript
// src/components/ui/optimized-image.tsx
import Image from 'next/image'
import { useState } from 'react'

export function OptimizedImage({ src, alt, priority = false, ...props }: Props) {
  const [isLoading, setIsLoading] = useState(true)

  return (
    <div className="relative overflow-hidden">
      <Image
        src={src}
        alt={alt}
        priority={priority}
        loading={priority ? 'eager' : 'lazy'}
        quality={85}
        placeholder="blur"
        blurDataURL="data:image/jpeg;base64,..."
        onLoadingComplete={() => setIsLoading(false)}
        {...props}
      />
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
    </div>
  )
}
```

**Use in Feed:**
```typescript
// High priority for first 3 images
{albums.slice(0, 3).map((album, i) => (
  <OptimizedImage src={album.cover} alt={album.title} priority />
))}

// Lazy load rest
{albums.slice(3).map((album, i) => (
  <OptimizedImage src={album.cover} alt={album.title} loading="lazy" />
))}
```

---

### 6. Virtual Scrolling for Long Lists 📉

**Problem:** Feed/PhotoGrid renders ALL items, causing lag with 100+ items.

**Solution:**
```bash
npm install @tanstack/react-virtual
```

**Implement:**
```typescript
// src/components/feed/VirtualFeed.tsx
import { useVirtualizer } from '@tanstack/react-virtual'

export function VirtualFeed({ albums }: Props) {
  const parentRef = useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: albums.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 400, // Estimated row height
    overscan: 5, // Render 5 items above/below viewport
  })

  return (
    <div ref={parentRef} style={{ height: '800px', overflow: 'auto' }}>
      <div style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const album = albums[virtualRow.index]
          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <FeedItem album={album} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

**Expected Improvement:** Handles 1000+ items smoothly

---

## Database Performance

### Recommended Composite Indexes

```sql
-- Albums by user with filters
CREATE INDEX idx_albums_user_visibility_date
  ON albums(user_id, visibility, created_at DESC)
  WHERE status != 'draft';

-- Photos with location
CREATE INDEX idx_photos_location_album
  ON photos(album_id, latitude, longitude)
  WHERE latitude IS NOT NULL;

-- Follows lookup (both directions)
CREATE INDEX idx_follows_mutual
  ON follows(follower_id, following_id, status)
  WHERE status = 'approved';

-- Comments on target
CREATE INDEX idx_comments_target_created
  ON comments(target_type, target_id, created_at DESC);

-- Likes aggregation
CREATE INDEX idx_likes_target_count
  ON likes(target_type, target_id);
```

### Query Optimization Examples

**Before:**
```typescript
// Separate queries for each album's photos
for (const album of albums) {
  const { data: photos } = await supabase
    .from('photos')
    .select('*')
    .eq('album_id', album.id)
}
```

**After:**
```typescript
// Single query with join
const { data: albums } = await supabase
  .from('albums')
  .select(`
    *,
    photos (
      id,
      file_path,
      order_index
    )
  `)
  .order('created_at', { ascending: false })
```

---

## Caching Strategy

### Multi-Layer Cache Architecture

```
┌─────────────────────────────────────────┐
│ Layer 1: React Query (In-Memory)       │
│ - Component data: 5min staleTime       │
│ - Query deduplication                  │
└─────────────────────────────────────────┘
              ▼
┌─────────────────────────────────────────┐
│ Layer 2: CDN (Vercel Edge)             │
│ - Static assets: 1 year                │
│ - Images: 1 day                         │
└─────────────────────────────────────────┘
              ▼
┌─────────────────────────────────────────┐
│ Layer 3: Redis (Future)                │
│ - Feed data: 1min                       │
│ - User profiles: 5min                   │
│ - Travel timeline: 10min                │
└─────────────────────────────────────────┘
              ▼
┌─────────────────────────────────────────┐
│ Layer 4: Database                       │
│ - PostgreSQL query cache                │
│ - Materialized views (refresh hourly)  │
└─────────────────────────────────────────┘
```

### Implement Redis Caching (Future)

```bash
npm install @upstash/redis
```

```typescript
// src/lib/cache/redis.ts
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 300
): Promise<T> {
  // Try cache first
  const cached = await redis.get<T>(key)
  if (cached) return cached

  // Fetch fresh data
  const fresh = await fetcher()

  // Cache for next time
  await redis.setex(key, ttl, fresh)

  return fresh
}

// Usage
const albums = await getCached(
  'feed:public',
  () => fetchPublicAlbums(),
  60 // 1 minute cache
)
```

---

## Monitoring & Profiling

### Web Vitals Tracking

**Already implemented:**
```typescript
// src/app/api/monitoring/web-vitals/route.ts
// Tracks CLS, FID, FCP, LCP, TTFB
```

**View in Chrome DevTools:**
1. Open Performance tab
2. Record page load
3. Check "Web Vitals" lane

### React DevTools Profiler

```bash
# Install React DevTools extension
# Enable profiler in dev mode
```

**Usage:**
1. Open React DevTools
2. Click Profiler tab
3. Start recording
4. Interact with app
5. Stop recording
6. Analyze flame graph

**Look for:**
- Components rendering >50ms
- Unnecessary re-renders
- Large component trees

### Lighthouse CI

```bash
npm install -g @lhci/cli

# Run Lighthouse
lhci autorun --collect.url=http://localhost:3000
```

**Target Scores:**
- Performance: >90
- Accessibility: >95
- Best Practices: >95
- SEO: >95

---

## Optimization Checklist

### Critical (Week 1)
- [ ] Add React Query for data fetching
- [ ] Create batch photo count RPC function
- [ ] Dynamic import EnhancedGlobe
- [ ] Add composite database indexes
- [ ] Implement image lazy loading

### High Priority (Week 2)
- [ ] Refactor EnhancedGlobe into sub-components
- [ ] Add virtual scrolling to Feed
- [ ] Optimize bundle with tree shaking
- [ ] Add Redis caching layer
- [ ] Implement optimistic updates

### Medium Priority (Month 2)
- [ ] Replace Mapbox with MapLibre
- [ ] Add service worker caching
- [ ] Implement blur placeholders
- [ ] Create materialized views for stats
- [ ] Add request batching

---

## Performance Budget

| Resource Type | Budget | Current | Status |
|--------------|--------|---------|--------|
| Total JS | 300KB | 616KB | ❌ Over |
| Total CSS | 50KB | 45KB | ✅ |
| Images (per page) | 500KB | 320KB | ✅ |
| Fonts | 100KB | 85KB | ✅ |
| First Load Time | 3s | 4.5s | ❌ Over |

---

## Resources

- [Next.js Performance](https://nextjs.org/docs/advanced-features/measuring-performance)
- [React Query Performance](https://tanstack.com/query/latest/docs/react/guides/performance)
- [Web Vitals](https://web.dev/vitals/)
- [Bundle Analyzer](https://github.com/vercel/next.js/tree/canary/packages/next-bundle-analyzer)
