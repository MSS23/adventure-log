# New Features: Privacy, Playlists & Offline Support

This document outlines three major new features added to the Adventure Log Application.

## 🔒 Per-Pin Privacy Controls

Protect your safety while travelling with granular location privacy settings.

### Features

1. **Hide Exact Coordinates**
   - Choose precision level: Exact, Neighbourhood (~1km), City (~10km), Country, or Hidden
   - Prevents exposing your exact location whilst travelling
   - Globe still shows approximate locations

2. **Delayed Publishing**
   - Schedule albums to publish 24h, 48h, 3 days, 1 week, or 2 weeks later
   - Perfect for posting adventures after you've left a location
   - Automatic publishing when delay period expires

### Usage

```typescript
import { AlbumPrivacyControls } from '@/components/privacy/AlbumPrivacyControls'

// In your album creation/edit form:
<AlbumPrivacyControls
  hideExactLocation={album.hide_exact_location}
  locationPrecision={album.location_precision}
  publishDelayHours={album.publish_delay_hours}
  onPrivacyChange={(settings) => {
    // Handle privacy settings change
    updateAlbum(albumId, settings)
  }}
/>
```

### Database Schema

New fields added to `albums` and `photos` tables:

```sql
-- Albums
hide_exact_location BOOLEAN DEFAULT false
location_precision VARCHAR(20) DEFAULT 'exact'
publish_delay_hours INTEGER DEFAULT 0
scheduled_publish_at TIMESTAMP WITH TIME ZONE
is_delayed_publish BOOLEAN DEFAULT false

-- Photos
hide_exact_location BOOLEAN DEFAULT false
location_precision VARCHAR(20) DEFAULT 'exact'
```

## 🎵 Collections & Globe Playlists

Curate collections of locations and share them with the community.

### Features

1. **Create Playlists**
   - Curated collections (e.g., "Best Coffee in Lisbon")
   - Travel routes (journey sequences)
   - Themed collections (architecture, food, nature)

2. **Share & Collaborate**
   - Public, friends-only, or private playlists
   - Collaborative playlists with multiple contributors
   - Subscribe to others' playlists

3. **Playlist Items**
   - Add existing albums
   - Add custom locations you want to visit
   - Notes and ordering

### Usage

```typescript
import { usePlaylists } from '@/lib/hooks/usePlaylists'

function MyComponent() {
  const {
    playlists,
    createPlaylist,
    addItemToPlaylist,
    subscribeToPlaylist,
    getPlaylistItems
  } = usePlaylists()

  // Create a playlist
  const handleCreate = async () => {
    await createPlaylist({
      title: 'Best Coffee in Lisbon',
      description: 'My favourite coffee spots',
      playlist_type: 'curated',
      category: 'food',
      visibility: 'public'
    })
  }

  // Add album to playlist
  const handleAddItem = async (playlistId: string, albumId: string) => {
    await addItemToPlaylist(playlistId, {
      album_id: albumId,
      notes: 'Must try the espresso!'
    })
  }

  // Subscribe to someone's playlist
  const handleSubscribe = async (playlistId: string) => {
    await subscribeToPlaylist(playlistId)
  }

  return (
    <div>
      {playlists.map(playlist => (
        <PlaylistCard key={playlist.id} playlist={playlist} />
      ))}
    </div>
  )
}
```

### Database Schema

New tables:

```sql
-- Playlists
playlists (id, user_id, title, description, playlist_type, category, tags, visibility, ...)

-- Playlist items (albums or custom locations)
playlist_items (id, playlist_id, album_id, custom_location_name, custom_latitude, ...)

-- Subscriptions
playlist_subscriptions (id, playlist_id, user_id, is_favorited, notification_enabled)

-- Collaborators
playlist_collaborators (id, playlist_id, user_id, role, can_add_items, can_remove_items, ...)
```

## 📦 On-Device Packs & Offline Support

Seamless offline content creation with automatic sync.

### Features

1. **Upload Queue**
   - Create albums and upload photos offline
   - Automatic sync when connection restored
   - Progress tracking and retry logic

2. **Offline Map Packs** (Coming Soon)
   - Download lightweight basemap tiles
   - View your travels offline
   - Auto-refresh when online

### Usage

```typescript
import { useOfflineSync } from '@/lib/hooks/useOfflineSync'

function CreateAlbumOffline() {
  const { queueAlbumUpload, isOnline, queueItems, isSyncing } = useOfflineSync()

  const handleCreate = async () => {
    // Works offline - will sync when online
    const localId = await queueAlbumUpload({
      title: 'Mountain Hike',
      description: 'Beautiful views',
      location_name: 'Swiss Alps',
      latitude: 46.8182,
      longitude: 8.2275,
      photos: selectedPhotos.map((photo, index) => ({
        file: photo.file,
        caption: photo.caption,
        order_index: index
      }))
    })

    // Album queued - will upload automatically when online
    toast.success('Album saved. Will sync when online.')
  }

  return (
    <div>
      {!isOnline && <div>Offline - Changes will sync later</div>}
      {isSyncing && <div>Syncing {queueItems.length} items...</div>}
      <button onClick={handleCreate}>Create Album</button>
    </div>
  )
}
```

### Offline Sync Indicator

Add to your navigation:

```typescript
import { OfflineSyncIndicator } from '@/components/offline/OfflineSyncIndicator'

<nav>
  {/* Other nav items */}
  <OfflineSyncIndicator />
</nav>
```

### Database Schema

New tables:

```sql
-- Upload queue for offline content
upload_queue (id, user_id, resource_type, payload, files_to_upload, status, ...)

-- Offline map packs
offline_map_packs (id, user_id, pack_name, min_latitude, max_latitude, status, ...)
```

## 🚀 Getting Started

### 1. Run Database Migration

```bash
# Apply the new schema
cd database
# Copy the SQL from migrations/09_privacy_playlists_offline.sql
# Paste into Supabase SQL Editor and run
```

### 2. Update Your Code

All TypeScript types are already updated in `src/types/database.ts`.

### 3. Add UI Components

```typescript
// Privacy controls in album form
import { AlbumPrivacyControls } from '@/components/privacy/AlbumPrivacyControls'

// Playlists page
import PlaylistsPage from '@/app/(app)/playlists/page'

// Offline indicator in navigation
import { OfflineSyncIndicator } from '@/components/offline/OfflineSyncIndicator'
```

## 📱 Mobile Support

All features work seamlessly with the Expo mobile app:

- Privacy controls in mobile album creation
- Playlists accessible from mobile globe view
- Offline sync especially useful for travellers with poor connectivity

## 🔐 Security & Privacy

### Row Level Security (RLS)

All new tables have comprehensive RLS policies:

- Users can only access their own data
- Playlist visibility respected (public/friends/private)
- Upload queue isolated per user
- Collaborator permissions enforced at database level

### Privacy Features

- Location precision calculated server-side
- Scheduled publishing handled automatically
- No exact coordinates exposed when privacy enabled

## 🎯 Use Cases

### Privacy
- 🏖️ **Beach Holiday**: Hide exact location, publish after returning home
- 🏔️ **Remote Hiking**: Show only country until safely back
- 🌃 **City Break**: Neighbourhood-level precision while exploring

### Playlists
- ☕ **Coffee Enthusiast**: "Best Coffee in Europe" curated collection
- 🗾 **Japan Autumn '24**: Travel route playlist with all stops
- 🏛️ **Architecture**: Theme-based collection across multiple cities
- 👥 **Collaboration**: Friends add their recommendations to shared list

### Offline Support
- ✈️ **Long Flight**: Create albums during flight, auto-sync on landing
- 🏕️ **Camping Trip**: Queue uploads in remote areas
- 📱 **Poor Connectivity**: Don't wait for upload, app handles it
- 🔋 **Battery Saving**: Upload later when charging and on WiFi

## 🛠️ Technical Notes

### IndexedDB for Offline Storage

Photos are stored in browser's IndexedDB whilst offline:

```typescript
// Automatically handled by useOfflineSync hook
const storedData = await getFilesFromIndexedDB(localId)
```

### Real-time Sync

Playlists use Supabase real-time subscriptions:

```typescript
// Automatically updates when playlist changes
const channel = supabase
  .channel('playlists_changes')
  .on('postgres_changes', { table: 'playlists' }, () => {
    fetchPlaylists()
  })
  .subscribe()
```

### Background Processing

Upload queue processes automatically:

```typescript
// Auto-syncs when coming online
useEffect(() => {
  if (isOnline) {
    syncPendingUploads()
  }
}, [isOnline])
```

## 📊 Performance Considerations

### Database Indexes

All new tables have appropriate indexes for performance:

```sql
CREATE INDEX idx_playlists_user_id ON playlists(user_id);
CREATE INDEX idx_playlist_items_playlist_id ON playlist_items(playlist_id);
CREATE INDEX idx_upload_queue_status ON upload_queue(status);
CREATE INDEX idx_albums_scheduled_publish ON albums(scheduled_publish_at);
```

### Triggers

Automatic counters for better performance:

```sql
-- Auto-update playlist item count
CREATE TRIGGER update_playlist_item_count_trigger
  AFTER INSERT OR DELETE ON playlist_items
  FOR EACH ROW EXECUTE FUNCTION update_playlist_item_count();

-- Auto-update subscriber count  
CREATE TRIGGER update_playlist_subscriber_count_trigger
  AFTER INSERT OR DELETE ON playlist_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_playlist_subscriber_count();
```

## 🧪 Testing

### Privacy Controls

1. Create album with delayed publishing
2. Verify scheduled_publish_at is set correctly
3. Check location precision is applied to coordinates

### Playlists

1. Create public playlist
2. Add albums and custom locations
3. Subscribe from another account
4. Test collaborative editing

### Offline Sync

1. Disconnect internet
2. Create album with photos
3. Verify queued in upload_queue table
4. Reconnect and verify auto-sync

## 🎨 UI/UX Highlights

- Clean privacy controls with clear explanations
- Visual indicators for privacy settings
- Real-time sync status
- Smooth offline experience
- Playlist discovery and search
- Beautiful playlist cards with metadata

## 🔮 Future Enhancements

- [ ] Smart playlists with auto-filters
- [ ] Playlist templates
- [ ] Offline map tiles downloading
- [ ] Advanced collaboration features
- [ ] Playlist analytics (views, subscriptions over time)
- [ ] Export playlists as GPX/KML
- [ ] Integration with globe timeline view

## 📝 Notes

- All features are free and open-source
- Code follows UK English conventions
- Comprehensive error handling
- Mobile-friendly UI components
- Accessible design (ARIA labels)

---

Built with ❤️ for travellers who value privacy and sharing

