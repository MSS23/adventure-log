# Implementation Guide: Privacy, Playlists & Offline Features

Quick guide to implementing the new features in your Adventure Log application.

## 📋 Prerequisites

- Supabase project set up
- Next.js application running
- Database access (Supabase SQL Editor)

## 🚀 Step-by-Step Implementation

### Step 1: Apply Database Migration

1. Open Supabase SQL Editor
2. Copy contents of `database/migrations/09_privacy_playlists_offline.sql`
3. Paste and execute the SQL
4. Verify success message appears

**Expected Output:**
```
✅ Privacy, Playlists, and Offline Support migration completed!
🔒 Added per-pin privacy controls (location hiding, delayed posting)
🎵 Added Collections & Playlists system with sharing and subscriptions
📦 Added offline support with upload queue and map packs
✨ Database ready for new features!
```

### Step 2: Verify Database Schema

Check that new tables exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'playlists', 
  'playlist_items', 
  'playlist_subscriptions',
  'playlist_collaborators',
  'upload_queue',
  'offline_map_packs'
);
```

### Step 3: Add Navigation Link to Playlists

Update your navigation to include playlists link:

```tsx
// In your navigation component
<Link href="/playlists">
  <Button variant="ghost">
    <Music className="h-4 w-4 mr-2" />
    Playlists
  </Button>
</Link>
```

### Step 4: Integrate Privacy Controls in Album Form

Add privacy controls to your album creation/edit form:

```tsx
// In src/app/(app)/albums/new/page.tsx or edit form
import { AlbumPrivacyControls } from '@/components/privacy/AlbumPrivacyControls'

// Inside your form component
<AlbumPrivacyControls
  hideExactLocation={formData.hide_exact_location}
  locationPrecision={formData.location_precision}
  publishDelayHours={formData.publish_delay_hours}
  onPrivacyChange={(settings) => {
    setFormData(prev => ({
      ...prev,
      ...settings
    }))
  }}
/>
```

### Step 5: Test Each Feature

#### Test Privacy Controls

1. Create a new album
2. Toggle "Hide Exact Coordinates"
3. Select different precision levels
4. Set delayed publishing
5. Save and verify in database

```sql
-- Check privacy settings
SELECT 
  title,
  hide_exact_location,
  location_precision,
  publish_delay_hours,
  scheduled_publish_at
FROM albums 
WHERE user_id = 'your-user-id'
ORDER BY created_at DESC 
LIMIT 1;
```

#### Test Playlists

1. Navigate to `/playlists`
2. Click "Create Playlist"
3. Fill in details and submit
4. Add an album to the playlist
5. Subscribe to another user's playlist

```sql
-- Check playlists
SELECT * FROM playlists WHERE user_id = 'your-user-id';

-- Check playlist items
SELECT * FROM playlist_items WHERE playlist_id = 'your-playlist-id';

-- Check subscriptions
SELECT * FROM playlist_subscriptions WHERE user_id = 'your-user-id';
```

#### Test Offline Sync

1. Open DevTools Network tab
2. Set to "Offline"
3. Create an album with photos
4. Verify queued in upload_queue
5. Go back "Online"
6. Watch automatic sync

```sql
-- Check upload queue
SELECT * FROM upload_queue WHERE user_id = 'your-user-id' ORDER BY created_at DESC;
```

### Step 6: Add to Bottom Navigation (Mobile)

For mobile users, add playlists to bottom navigation:

```tsx
// In src/components/layout/BottomNavigation.tsx
import { Music } from 'lucide-react'

// Add to navigation items
{
  href: '/playlists',
  icon: Music,
  label: 'Playlists'
}
```

## 🧪 Testing Checklist

### Privacy Features
- [ ] Can hide exact location
- [ ] Location precision affects displayed coordinates
- [ ] Delayed publishing schedules correctly
- [ ] Scheduled albums publish automatically
- [ ] Privacy settings persist on edit
- [ ] Photos inherit album privacy by default

### Playlists
- [ ] Can create public playlist
- [ ] Can create private playlist
- [ ] Can add existing albums to playlist
- [ ] Can add custom locations (wishlist places)
- [ ] Can reorder playlist items
- [ ] Can subscribe to others' playlists
- [ ] Subscribed playlists appear in "Subscribed" tab
- [ ] Playlist visibility respected (RLS working)
- [ ] Collaborative playlists allow multiple editors
- [ ] Discover tab shows popular playlists

### Offline Sync
- [ ] Can create album offline
- [ ] Upload queued in database
- [ ] Files stored in IndexedDB
- [ ] Sync indicator shows offline status
- [ ] Sync indicator shows pending count
- [ ] Automatic sync when online
- [ ] Failed uploads can be retried
- [ ] Completed uploads marked as done
- [ ] Progress shown during sync

## 🔧 Troubleshooting

### "Function not found" Error

If you see `function get_user_playlists does not exist`:

```sql
-- Re-run the function definition from migration
CREATE OR REPLACE FUNCTION get_user_playlists(user_id_param UUID)
RETURNS TABLE (...) AS $$
BEGIN
  ...
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### RLS Policy Errors

If you get "policy violation" errors:

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('playlists', 'playlist_items');

-- Re-apply RLS policies from migration if needed
```

### IndexedDB Not Working

If offline storage fails:

1. Check browser supports IndexedDB (all modern browsers do)
2. Clear browser storage and try again
3. Check browser console for errors
4. Verify user has granted storage permissions

### TypeScript Errors

If you see type errors:

```bash
# Restart TypeScript server
# In VS Code: Cmd+Shift+P > "TypeScript: Restart TS Server"

# Or rebuild types
npm run build
```

## 📱 Mobile-Specific Setup

For Expo/Capacitor mobile app:

### iOS Configuration

No additional configuration needed - features work out of the box.

### Android Configuration

Add permissions to `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

### Test on Mobile

```bash
# Build and run on iOS
cd ios
pod install
npx expo run:ios

# Build and run on Android
npx expo run:android
```

## 🎨 Customisation

### Change Privacy Default

Edit `database/migrations/09_privacy_playlists_offline.sql`:

```sql
-- Change default precision
ALTER TABLE albums 
ALTER COLUMN location_precision 
SET DEFAULT 'neighbourhood';  -- Instead of 'exact'
```

### Add Custom Playlist Categories

```typescript
// In src/app/(app)/playlists/page.tsx
const categories = [
  'food',
  'nature',
  'architecture',
  'adventure',
  'culture',
  'nightlife',
  'shopping',
  'beaches',
  // Add your custom categories
]
```

### Customise Delayed Publishing Options

```typescript
// In src/components/privacy/AlbumPrivacyControls.tsx
<SelectContent>
  <SelectItem value="0">Publish immediately</SelectItem>
  <SelectItem value="12">Publish in 12 hours</SelectItem>
  <SelectItem value="24">Publish in 24 hours</SelectItem>
  <SelectItem value="48">Publish in 48 hours</SelectItem>
  // Add custom delays
  <SelectItem value="120">Publish in 5 days</SelectItem>
</SelectContent>
```

## 🔐 Security Considerations

### API Routes

All API routes check authentication:

```typescript
const { data: { user }, error: authError } = await supabase.auth.getUser()

if (authError || !user) {
  return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
}
```

### RLS Policies

Database access controlled at row level:

- Users can only see their own data
- Public playlists visible to all
- Visibility settings enforced
- Collaborator permissions checked

### Privacy Settings

Location precision calculated server-side to prevent client manipulation.

## 📊 Performance Optimisation

### Database Indexes

Already included in migration:

```sql
CREATE INDEX idx_playlists_user_id ON playlists(user_id);
CREATE INDEX idx_upload_queue_status ON upload_queue(status);
-- etc.
```

### Caching

Consider adding caching for:

- Discovered playlists (cache for 5 minutes)
- User's playlists list (invalidate on mutation)
- Upload queue (real-time updates)

### Image Optimisation

For offline photos:

```typescript
// Compress before storing
const compressedBlob = await compressImage(file, {
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 0.8
})
```

## 🎯 Next Steps

After successful implementation:

1. ✅ Test all features thoroughly
2. ✅ Add analytics tracking (optional)
3. ✅ Create user onboarding for new features
4. ✅ Update app store screenshots
5. ✅ Announce new features to users

## 📚 Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [NEW_FEATURES.md](./NEW_FEATURES.md) - Detailed feature documentation

## 🆘 Getting Help

If you encounter issues:

1. Check browser console for errors
2. Review Supabase logs
3. Verify database migration ran successfully
4. Check RLS policies are enabled
5. Test in incognito mode to rule out cache issues

---

**Happy coding! 🎉**

