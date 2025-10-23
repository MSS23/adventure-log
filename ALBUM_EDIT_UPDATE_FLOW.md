# Album Edit Update Flow - How Updates Propagate

This document explains how album edits update throughout the entire application, ensuring consistency across all pages and components.

## Overview

When you edit an album, the changes must propagate to:
1. ✅ **Database** - Supabase backend
2. ✅ **Album Detail Page** - The page you return to after editing
3. ✅ **Globe Page** - Updated pins and location data
4. ✅ **Feed** - Album cards with updated info
5. ✅ **Profile Page** - User's album list
6. ✅ **Search Results** - Updated album data in search
7. ✅ **Countries Tab** - Correct country grouping

## Update Flow Step-by-Step

### 1. User Edits Album
**Location:** `/albums/[id]/edit`

```typescript
// User submits the edit form
onSubmit(data) {
  // Toast notification shows "Saving..."
  toast.loading('Saving album changes...', { id: 'album-save' })

  // Update album in Supabase
  await supabase.from('albums').update({
    title, description, visibility,
    location_name, latitude, longitude,
    country_code,  // ✅ Critical for globe and countries tab
    // ... other fields
  })
}
```

### 2. Backend Update (Supabase)
**What happens:**
- ✅ Album record updated in PostgreSQL
- ✅ `updated_at` timestamp set to now
- ✅ All fields saved atomically
- ✅ RLS (Row Level Security) policies enforced

**Critical fields for app-wide updates:**
```typescript
{
  country_code: 'IN',           // For Countries tab grouping
  latitude: 20.5937,            // For globe pin placement
  longitude: 78.9629,           // For globe pin placement
  location_name: 'India',       // For display everywhere
  updated_at: '2025-01-24...'   // For cache invalidation
}
```

### 3. Cache Invalidation
**Location:** Album edit page, line 195

```typescript
// Invalidate Next.js cache
router.refresh()

// Small delay ensures cache cleared before navigation
setTimeout(() => {
  router.push(`/albums/${params.id}`)
}, 100)
```

**What `router.refresh()` does:**
- ✅ Invalidates Next.js server-side cache
- ✅ Forces fresh data fetch on next page load
- ✅ Updates all `use client` components that fetch data
- ✅ Triggers re-render with fresh data

### 4. Success Feedback
```typescript
toast.success('Album updated successfully!', {
  description: 'All changes have been saved and will appear across the app.'
})
```

User sees:
- ✅ Loading toast while saving
- ✅ Success toast when complete
- ✅ Error toast if something fails

## How Each Page Updates

### Album Detail Page (`/albums/[id]`)

**Fetch mechanism:**
```typescript
const fetchAlbumData = useCallback(async () => {
  const { data: albumData } = await supabase
    .from('albums')
    .select('*')
    .eq('id', params.id)
    .single()

  setAlbum(albumData)
}, [params.id])

useEffect(() => {
  fetchAlbumData()
}, [fetchAlbumData])
```

**When does it update?**
- ✅ Immediately on page load (after `router.push`)
- ✅ `router.refresh()` clears cache, forces fresh fetch
- ✅ `useEffect` re-runs, fetches updated album

**What updates:**
- Title, description, visibility badge
- Location name and coordinates
- Date range
- Tags
- Mini globe position (if location changed)

---

### Globe Page (`/globe`)

**Fetch mechanism:**
```typescript
useEffect(() => {
  const fetchAlbums = async () => {
    const { data } = await supabase
      .from('albums')
      .select('id, title, latitude, longitude, location_name, country_code')
      .eq('user_id', userId)
      .not('latitude', 'is', null)
      .order('created_at', { ascending: false })

    setAlbums(data)
  }
  fetchAlbums()
}, [userId])
```

**When does it update?**
- ✅ When user navigates to globe page
- ✅ Fresh data fetched from database
- ✅ Globe pins recalculated with new coordinates

**What updates:**
- Pin position on globe (if lat/lng changed)
- Pin label (if title changed)
- Sidebar album list
- Location preview on pin click

---

### Feed Page (`/feed`)

**Fetch mechanism:**
```typescript
const { albums, loading } = useFeedData()

// Inside useFeedData hook:
const { data } = await supabase
  .from('albums')
  .select('*, users(*)')
  .eq('visibility', 'public')
  .order('created_at', { ascending: false })
```

**When does it update?**
- ✅ When user navigates to feed
- ✅ Hook fetches fresh data
- ✅ No stale cache

**What updates:**
- Album card title
- Cover photo
- Location badge
- Visibility icon
- Like count (if it changed)

---

### Profile Page (`/profile/[userId]`)

**Fetch mechanism:**
```typescript
useEffect(() => {
  const fetchUserAlbums = async () => {
    const { data } = await supabase
      .from('albums')
      .select('*')
      .eq('user_id', profileUserId)
      .order('created_at', { ascending: false })

    setAlbums(data)
  }
  fetchUserAlbums()
}, [profileUserId])
```

**When does it update?**
- ✅ When profile page loads
- ✅ Fresh data fetched from database

**What updates:**
- Album count
- Album cards in grid
- Recent albums section

---

### Search Results (`/search`)

**Fetch mechanism:**
```typescript
const searchAlbums = useCallback(async (filters) => {
  const { data } = await supabase
    .from('albums')
    .select('*')
    .ilike('title', `%${query}%`)
    .eq('visibility', 'public')

  return data
}, [])
```

**When does it update?**
- ✅ When user performs a new search
- ✅ Always fetches fresh data (no cache)

**What updates:**
- Search results show updated title
- Location data updated
- Visibility filters work correctly

---

### Countries Tab (Feed Page)

**Fetch mechanism:**
```typescript
const { countries } = useCountryShowcase()

// Groups albums by country_code
const grouped = albums.reduce((acc, album) => {
  const code = album.country_code || extractCountryCode(album.location_name)
  if (!acc[code]) acc[code] = []
  acc[code].push(album)
  return acc
}, {})
```

**When does it update?**
- ✅ When feed data refreshes
- ✅ Uses updated `country_code` field
- ✅ Recalculates country groupings

**What updates:**
- Album moves to correct country group (if country_code changed)
- Country album count
- Flag emoji display

---

## Ensuring Complete Update Propagation

### Checklist for Album Edits

When editing an album, ensure these fields are saved:

```typescript
✅ title              - Updates everywhere
✅ description        - Album detail page
✅ visibility         - Access control, feed display
✅ location_name      - Display text everywhere
✅ latitude           - Globe pin position
✅ longitude          - Globe pin position
✅ country_code       - CRITICAL for Countries tab
✅ city_id            - Optional, for city-level grouping
✅ country_id         - Optional, for additional metadata
✅ date_start         - Timeline ordering
✅ date_end           - Date range display
✅ tags               - Filtering and categorization
✅ updated_at         - Cache invalidation signal
```

### Common Issues and Solutions

#### Issue: Globe doesn't update after location change
**Cause:** Browser cached the old album data

**Solution:**
```typescript
// Already implemented in edit page
router.refresh()  // Clears Next.js cache
setTimeout(() => router.push(...), 100)  // Ensures fresh fetch
```

**Manual fix:** Hard refresh browser (Ctrl+Shift+R / Cmd+Shift+R)

---

#### Issue: Countries tab shows album in wrong country
**Cause:** `country_code` field not saved during edit

**Solution:**
```typescript
// ✅ Now implemented
country_code: albumLocation?.country_code || null
```

**Verification:**
```bash
# Run this to check country codes
node check-country-codes.mjs
```

---

#### Issue: Album detail page shows old data
**Cause:** Component didn't refetch after navigation

**Solution:**
```typescript
// Album detail page refetches on mount
useEffect(() => {
  if (params.id && user) {
    fetchAlbumData()
  }
}, [params.id, user, fetchAlbumData])
```

**The `router.refresh()` ensures this useEffect runs with fresh data**

---

## Testing Album Edit Propagation

### Step-by-Step Test

1. **Edit an album**
   ```
   - Go to album detail page
   - Click "Edit" button
   - Change title, location, or dates
   - Click "Save"
   ```

2. **Verify album detail page** ✅
   ```
   - Should redirect to album page
   - Title should be updated
   - Location section should show new location
   - Mini globe should point to new coordinates
   ```

3. **Verify globe page** ✅
   ```
   - Navigate to /globe
   - Find the album pin
   - Pin should be at new location
   - Clicking pin shows updated album info
   ```

4. **Verify feed** ✅
   ```
   - Navigate to /feed
   - Find the album card
   - Title should be updated
   - Location badge should show new location
   ```

5. **Verify countries tab** ✅
   ```
   - Go to feed, click "Countries" tab
   - Album should be in correct country group
   - Country code should match location
   ```

6. **Verify search** ✅
   ```
   - Search for the album
   - Results should show updated title
   - Location should be updated
   ```

---

## Backend Data Integrity

### Required Fields for Full Functionality

**Minimal working album:**
```sql
title         NOT NULL
user_id       NOT NULL (foreign key)
visibility    DEFAULT 'public'
status        DEFAULT 'published'
created_at    DEFAULT now()
updated_at    DEFAULT now()
```

**Complete album (recommended):**
```sql
-- Basic info
title, description, visibility, status

-- Location data (all 3 required for globe)
latitude, longitude, country_code

-- Optional location metadata
location_name, city_id, country_id

-- Dates (for timeline)
date_start, date_end, show_exact_dates

-- Media
cover_photo_url, cover_photo_x_offset, cover_photo_y_offset

-- Metadata
tags, likes_count, comments_count

-- Timestamps
created_at, updated_at
```

### Database Triggers

**Auto-update `updated_at`:**
```sql
-- This trigger ensures updated_at is always current
CREATE TRIGGER update_albums_updated_at
  BEFORE UPDATE ON albums
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## Conclusion

Album edits propagate through:
1. ✅ **Direct database update** (Supabase)
2. ✅ **Cache invalidation** (`router.refresh()`)
3. ✅ **Fresh data fetches** (each page refetches on load)
4. ✅ **User feedback** (toast notifications)

**Key insight:** Next.js App Router + Supabase combination means:
- No global state needed
- Each page fetches its own fresh data
- `router.refresh()` ensures cache invalidation
- Updates propagate automatically on next page load

**The update flow is robust and reliable!** ✅
