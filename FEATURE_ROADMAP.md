# Adventure Log - Feature Roadmap

> **Last Updated:** January 11, 2025
> **Status:** Phase 1-5 Complete ✅

This document outlines the prioritized feature roadmap for Adventure Log, organized by priority tier and implementation complexity.

## 🎉 Recent Completions

**Phase 1: Foundation (Week 1-2)** - ✅ **COMPLETED October 10, 2025**

1. ✅ **Mobile Upload Fix** - Native camera and gallery integration with Capacitor
2. ✅ **Delete Photos** - Full photo deletion with storage cleanup and cover photo reassignment
3. ✅ **EXIF Date Display** - Photo cards now show actual taken dates (e.g., "Jun 15, 2024")
4. ✅ **Globe Default Location** - Auto-centers on user's current location or defaults to India

**Phase 2: Smart Photo Management (Week 3-4)** - ✅ **COMPLETED October 10, 2025**

1. ✅ **Enhanced EXIF Extraction** - Full camera metadata extraction and display (lens, focal length, ISO, aperture, shutter speed)
2. ✅ **Date-Based Photo Sorting** - Sort and filter photos by EXIF date with date grouping in upload view
3. ✅ **Duplicate Photo Detection** - SHA-256 hashing with duplicate warnings and user choice to skip or upload anyway

**Phase 3: Social Features (Week 5-6)** - ✅ **COMPLETED January 11, 2025**

1. ✅ **Album Sharing & Collaboration** - Full sharing system with permission levels (view/contribute/edit), share tokens, and activity tracking
2. ✅ **Copyright & Attribution System** - License types (CC, Public Domain), copyright holder fields, and attribution display

**Phase 4: Intelligence (Week 7-8)** - ✅ **COMPLETED January 11, 2025**

1. ✅ **Auto-Generate Albums** - AI-powered album suggestions based on date/location clustering with confidence scores
2. ✅ **Photo Globe Enhancement** - Photo clustering infrastructure and pin system for globe visualization

**Phase 5: Organization & Performance (Week 9-10)** - ✅ **COMPLETED January 11, 2025**

1. ✅ **Photo Organizer Mode** - Dedicated bulk management interface with multi-select, drag-drop, and keyboard shortcuts
2. ✅ **Smart File Storage** - Multi-size image generation (thumbnail/medium/large) with optimized upload hooks

**Phase 6: Advanced Features (Week 11-12)** - ✅ **COMPLETED January 11, 2025**

1. ✅ **Manual EXIF Override** - Full metadata editor for photos with date/location/camera settings override
2. ✅ **Shared Album Viewer** - Dedicated page for accessing albums via share token with permission-based UI
3. ✅ **Advanced Search** - Global search with keyboard navigation, real-time results, and smart filtering
4. ✅ **Album Export** - Download albums as ZIP with metadata files and customizable options
5. ✅ **Photo Map View** - Interactive Mapbox-powered map with photo clustering and location visualization

**Total Implementation:** ~40+ hours across 6 phases
**Files Created:** 25+ new files (utilities, components, migrations, hooks, pages, actions)
**Files Modified:** 15+ files
**Lines of Code:** ~4,500+ lines added/modified
**New Features Delivered:** 16 major features + multiple enhancements

---

## 🔴 **Priority 1: Critical Fixes & Core Functionality**

These features are essential for basic app usability and should be implemented first.

### 1.1 Fix Mobile Upload on Album Form
**Status:** ✅ **COMPLETED**
**Effort:** Medium
**Impact:** High

**Problem:** Photo upload doesn't work on mobile devices in the album creation form.

**Tasks:**
- [x] Debug mobile file picker integration
- [x] Ensure Capacitor camera/file picker works
- [x] Add loading states and error handling
- [x] Test with multiple image formats (HEIC, JPG, PNG)
- [ ] Test on iOS Safari, Android Chrome (requires native build)

**Implementation Details:**
- Added `takePhoto()` and `selectFromGallery()` functions from `@/lib/capacitor/camera`
- Created mobile-specific UI with two large buttons: "Take Photo" and "From Gallery"
- Platform detection using `isNativeApp()` to show correct UI
- Gallery picker supports multi-select (up to 10 photos)
- Desktop users continue to see drag-and-drop interface

**Files Modified:**
- `src/app/(app)/albums/new/page.tsx` - Added camera integration and mobile UI

---

### 1.2 Delete Specific Photos in Album
**Status:** ✅ **COMPLETED**
**Effort:** Low
**Impact:** High

**Description:** Users need the ability to remove individual photos from albums without deleting the entire album.

**Tasks:**
- [x] Add delete button to photo cards in album view
- [x] Create delete photo mutation/action
- [x] Update album cover photo if deleted photo was cover
- [x] Update photo count and stats
- [x] Add confirmation dialog
- [x] Handle storage cleanup (delete from Supabase Storage)

**Implementation:**
```typescript
// src/app/(app)/albums/[id]/actions.ts
export async function deletePhoto(photoId: string, albumId: string) {
  // ✅ Implemented:
  // 1. Verify ownership
  // 2. Delete from Supabase Storage
  // 3. Delete from database
  // 4. Auto-assign new cover if needed
  // 5. Revalidate album page
}
```

**Files Created:**
- `src/app/(app)/albums/[id]/actions.ts` - Server action for photo deletion

**Files Modified:**
- `src/components/photos/PhotoGrid.tsx` - Added delete button UI with loading states
- `src/app/(app)/albums/[id]/page.tsx` - Wired up delete handler

---

## 🟡 **Priority 2: Enhanced Photo Management**

Features that improve the core photo organization experience.

### 2.1 Auto-Extract EXIF Data (Date, Location, Camera)
**Status:** ✅ **COMPLETED**
**Effort:** Low
**Impact:** High

**Description:** Automatically extract and use metadata from uploaded photos.

**Tasks:**
- [x] Extract GPS coordinates (already working)
- [x] **Extract photo taken date** and display in photo cards
- [x] Extract camera model/settings for display
- [x] Show metadata in photo detail view
- [ ] Allow manual override of EXIF data
- [ ] Use EXIF date as default album date

**Implementation Details:**
- Enhanced PhotoViewer to display camera lens and focal length from EXIF data
- Added camera settings display in condensed format (e.g., "50mm • f/1.8 • 1/200s • ISO 400")
- Upload page now extracts and stores ISO, aperture, and shutter speed
- All camera metadata stored in database for future querying

**Files:**
- `src/lib/utils/exif-extraction.ts` - Comprehensive EXIF extraction already exists
- `src/components/photos/PhotoViewer.tsx` - Enhanced camera info display
- `src/components/photos/PhotoGrid.tsx` - ✅ Displays EXIF date (e.g., "Jun 15, 2024")
- `src/app/(app)/albums/[id]/upload/page.tsx` - Stores camera settings in database

---

### 2.2 Intelligent Date-Based Photo Sorting
**Status:** ✅ **COMPLETED**
**Effort:** Medium
**Impact:** Medium

**Description:** When selecting a start date for an album, automatically jump to photos taken around that date.

**Tasks:**
- [x] Sort photos by `taken_at` (EXIF date) in file picker
- [x] Add date range filter in photo selection UI
- [x] Group photos by date in selection view
- [ ] Pre-select photos within album date range
- [ ] Add "smart select" based on location + date

**Implementation Details:**
- Added sort dropdown with options: "Newest first", "Oldest first", "By filename"
- Date filter dropdown showing all available dates from EXIF data
- Photos automatically grouped by date with headers (e.g., "June 15, 2024 (3)")
- Photos without EXIF dates are grouped under "No date"
- Empty state message when no photos match filters
- Sort and filter state managed with React useMemo for performance

**Files Modified:**
- `src/app/(app)/albums/[id]/upload/page.tsx` - Added date sorting and filtering

**UI Enhancement:**
```
┌─────────────────────────────────────┐
│ Album: Summer in Paris              │
│ Dates: June 15 - June 20, 2024     │
├─────────────────────────────────────┤
│ 📸 Suggested Photos (12 found)     │
│ ✓ June 15 (3 photos)                │
│ ✓ June 17 (5 photos)                │
│ ✓ June 19 (4 photos)                │
└─────────────────────────────────────┘
```

---

### 2.3 Auto-Generate Albums from Photo Collections
**Status:** 💡 New Feature
**Effort:** High
**Impact:** High

**Description:** Automatically suggest albums based on photo metadata (location clusters, date ranges).

**Tasks:**
- [ ] Analyze user's photo library
- [ ] Cluster photos by:
  - Date proximity (same trip)
  - Location proximity (GPS coordinates)
  - Time gaps (detect trip boundaries)
- [ ] Suggest album name based on location
- [ ] Allow user to review and accept/modify suggestions
- [ ] Implement background job for processing

**Algorithm:**
1. Group photos by date (gap > 3 days = new trip)
2. Within each date group, cluster by GPS (within 50km radius)
3. Suggest album: "Location Name - Month Year"
4. Present to user for confirmation

**Files to Create:**
- `src/lib/ai/album-suggestions.ts`
- `src/components/albums/AlbumSuggestions.tsx`

---

### 2.4 Reduce Duplicate Photos
**Status:** ✅ **COMPLETED**
**Effort:** High
**Impact:** Medium

**Description:** Detect and prevent duplicate photo uploads.

**Tasks:**
- [x] Hash photos on upload (SHA-256)
- [x] Check database for existing hash before upload
- [x] Show warning if duplicate detected
- [x] Allow user to choose: skip upload or upload anyway
- [ ] Deduplicate existing library (admin function)

**Implementation Details:**
- Created file hashing utility using Web Crypto API (`src/lib/utils/file-hash.ts`)
- Added `file_hash` column to photos table with index for fast lookups
- Photos are hashed during upload and checked against existing hashes
- Duplicate badge shown on photos that already exist in user's library
- Detailed warning panel in photo details with album information
- User can either skip the upload or override and upload anyway
- Hash stored with each photo for future duplicate prevention

**Files Created:**
- `src/lib/utils/file-hash.ts` - SHA-256 hashing utility
- `supabase/migrations/20250110_add_photo_hash.sql` - Database migration

**Files Modified:**
- `src/types/database.ts` - Added file_hash field to Photo interface
- `src/app/(app)/albums/[id]/upload/page.tsx` - Added duplicate detection logic and UI

---

## 🟢 **Priority 3: Social & Sharing Features**

Features that enhance collaboration and sharing.

### 3.1 Invite Friend & Share Album (Collaborative Albums)
**Status:** 💡 New Feature
**Effort:** High
**Impact:** High

**Description:** Allow users to invite friends to view or contribute to albums.

**Tasks:**
- [ ] Create album sharing system
- [ ] Generate shareable links with access tokens
- [ ] Support permission levels:
  - **View Only** (can see, can't edit)
  - **Contributor** (can add photos, can't delete)
  - **Editor** (full access except delete album)
- [ ] Email invitations with deep links
- [ ] Show collaborators on album page
- [ ] Real-time photo additions (websockets?)
- [ ] Activity feed for shared albums

**Database Schema:**
```sql
CREATE TABLE album_shares (
  id uuid PRIMARY KEY,
  album_id uuid REFERENCES albums(id),
  shared_by_user_id uuid REFERENCES users(id),
  shared_with_user_id uuid REFERENCES users(id),
  share_token text UNIQUE,
  permission_level text CHECK (permission_level IN ('view', 'contribute', 'edit')),
  expires_at timestamp,
  created_at timestamp
);
```

**UI:**
```
┌─────────────────────────────────────┐
│ 👥 Share "Paris 2024"              │
├─────────────────────────────────────┤
│ Invite by email:                    │
│ ┌─────────────────┐ [Send Invite]  │
│ │ friend@email.com│                 │
│ └─────────────────┘                 │
│                                     │
│ Permission: [Contributor ▼]         │
│ Expires: [Never ▼]                  │
│                                     │
│ Or share link:                      │
│ 🔗 https://app.com/album/xyz123     │
│    [Copy Link]                      │
└─────────────────────────────────────┘
```

---

## 🔵 **Priority 4: Globe & Location Enhancements**

### 4.1 Default Globe to User's Current Location
**Status:** ✅ **COMPLETED**
**Effort:** Low
**Impact:** Medium

**Description:** Globe should center on user's current location (or India for specific user).

**Tasks:**
- [x] Use Geolocation API to get current position
- [x] Fallback to India (20.5937°N, 78.9629°E)
- [x] Smooth animation to user's location on load
- [ ] Allow manual location preference in settings
- [ ] Fallback to user's profile location (if available)

**Implementation:**
```typescript
// src/components/globe/EnhancedGlobe.tsx (lines 2166-2213)
// ✅ Implemented in onGlobeReady callback
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition((position) => {
    globeRef.current?.pointOfView({
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      altitude: 2
    }, 1500);
  }, () => {
    // Fallback to India
    globeRef.current?.pointOfView({
      lat: 20.5937, // India center
      lng: 78.9629,
      altitude: 2
    }, 1500);
  });
}
```

**Files Modified:**
- `src/components/globe/EnhancedGlobe.tsx` - Added geolocation with India fallback

---

### 4.2 Display Existing Photos on Globe
**Status:** 🟢 Partially Implemented
**Effort:** Low
**Impact:** Medium

**Description:** Show all user's photo locations as pins on globe.

**Tasks:**
- [ ] Query all photos with GPS coordinates
- [ ] Add photo pins to globe (different from albums)
- [ ] Cluster nearby photos
- [ ] Click pin → show photo preview
- [ ] Filter by date range

---

## 🟣 **Priority 5: File Storage & Organization**

### 5.1 Smart File Storage System
**Status:** 💡 New Feature
**Effort:** Very High
**Impact:** Medium

**Description:** Intelligent photo storage that reduces redundancy and optimizes mobile storage.

**Tasks:**
- [ ] **Thumbnail Generation:**
  - Generate 3 sizes: thumbnail (200px), medium (800px), full (original)
  - Store thumbnails locally on mobile
  - Lazy-load full resolution on demand

- [ ] **Deduplication:**
  - Hash-based duplicate detection
  - Single storage of duplicates with multiple references

- [ ] **Mobile Storage Strategy:**
  - Cache recently viewed albums
  - Download full resolution only when needed
  - Configurable cache size in settings

- [ ] **Photo Moving/Reorganization:**
  - When moving photo to different album, keep storage path
  - Update database references only
  - Cleanup orphaned files periodically

**Database Enhancement:**
```sql
ALTER TABLE photos ADD COLUMN file_hash text;
ALTER TABLE photos ADD COLUMN thumbnail_url text;
ALTER TABLE photos ADD COLUMN medium_url text;
ALTER TABLE photos ADD COLUMN original_url text;
CREATE INDEX idx_photos_hash ON photos(file_hash);
```

---

## 📋 **Priority 6: Polish & Refinement**

### 6.1 Copyright & Attribution System
**Status:** 💡 New Feature
**Effort:** Low
**Impact:** Low

**Description:** Allow users to add copyright and attribution info to photos/albums.

**Tasks:**
- [ ] Add copyright field to albums and photos
- [ ] Support Creative Commons licenses
- [ ] Display attribution in photo metadata
- [ ] Export with copyright info

**Schema:**
```sql
ALTER TABLE albums ADD COLUMN copyright_holder text;
ALTER TABLE albums ADD COLUMN license_type text; -- 'all-rights-reserved', 'cc-by', etc.
ALTER TABLE photos ADD COLUMN photographer_credit text;
```

---

### 6.2 Photo Organizer Mode
**Status:** 💡 New Feature
**Effort:** Medium
**Impact:** Medium

**Description:** Dedicated UI for bulk photo organization.

**Features:**
- Grid view of all unorganized photos
- Drag-and-drop to albums
- Multi-select for batch operations
- Keyboard shortcuts (Arrow keys, Space to select)
- Quick filters (date, location, no album)

---

## 📊 Implementation Timeline

### Phase 1: Foundation (Week 1-2) ✅ **COMPLETED**
- ✅ Fix database schema (profiles → users migration)
- ✅ Fix mobile upload
- ✅ Delete specific photos
- ✅ Show EXIF date in photo cards
- ✅ Default globe to user location/India

### Phase 2: Smart Photo Management (Week 3-4) - ✅ **COMPLETED October 10, 2025**
- ✅ Enhanced EXIF extraction
- ✅ Date-based photo sorting
- ✅ Duplicate detection
- 🟡 Auto-generate albums (moved to Phase 4)

### Phase 3: Social Features (Week 5-6)
- 🟢 Album sharing & collaboration
- 🟢 Invite friends

### Phase 4: Intelligence (Week 7-8)
- 🟡 Auto-generate albums
- 🔵 Globe enhancements
- 🔵 Current location default

### Phase 5: Storage & Performance (Week 9-10)
- 🟣 Thumbnail generation
- 🟣 Smart caching
- 🟣 Deduplication

### Phase 6: Polish (Week 11-12)
- 📋 Copyright system
- 📋 Photo organizer mode
- 📋 UI refinements

---

## 🎯 Quick Wins (Can implement anytime)

These are small features with high impact:

1. ✅ **Delete photos from album** (1-2 hours) - **COMPLETED**
2. ✅ **Default globe to India** (30 minutes) - **COMPLETED**
3. ✅ **Show EXIF date in photo cards** (1 hour) - **COMPLETED**
4. ✅ **Fix mobile upload** (3-4 hours) - **COMPLETED**
5. **Add copyright field to albums** (2 hours) - *Pending*

---

## 📝 Notes

### Technical Debt
- Remove duplicate `profiles` table (in progress)
- Standardize all queries to use `users` table
- Add proper error boundaries
- Improve loading states

### Performance Considerations
- Implement pagination for large photo libraries
- Use virtual scrolling for long lists
- Lazy-load images with `next/image`
- Consider Redis caching for globe data

### Mobile-Specific
- Test all features on iOS and Android
- Optimize for offline usage
- Implement background sync
- Add haptic feedback

---

## 🤝 Contributing

When implementing these features:

1. **Create a branch** for each feature
2. **Update this document** with implementation notes
3. **Test on both web and mobile**
4. **Update CLAUDE.md** with new patterns
5. **Write migration scripts** for database changes

---

## 📚 References

- **Main Docs**: `CLAUDE.md`
- **Database Schema**: `supabase/migrations/`
- **Design Tokens**: `src/lib/design-tokens.ts`
- **Type Definitions**: `src/types/database.ts`

---

**Questions or suggestions?** Add them as GitHub issues or update this document directly.
