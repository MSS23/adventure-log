# Photo and Album Deletion Setup

## Overview
Your application already has photo and album deletion functionality built-in. You just need to run the SQL functions in your Supabase database.

## Features

### ✅ Delete Individual Photos
- Users can delete any photo they own
- **Cannot delete the last photo** in an album
- When the last photo is deleted, the entire album is automatically deleted

### ✅ Delete Entire Albums
- Users can delete albums they own
- All photos in the album are deleted (cascade)
- All related likes, comments, and stories are also deleted (cascade)

### ✅ Auto-Cleanup
- Orphaned albums (albums with no photos) can be cleaned up
- Admin function to maintain database integrity

## Setup Instructions

### Step 1: Run the SQL Functions

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/jtdkbjvqujgpwcqjydma
2. Navigate to **SQL Editor**
3. Open the file `database/functions/photo_deletion.sql`
4. Copy and paste the entire contents into the SQL Editor
5. Click **Run** to create all the functions

### Step 2: Test the Functionality

The functions are now available in your application:

#### Delete a Photo
```typescript
import { deletePhoto } from '@/app/(app)/albums/actions'

const result = await deletePhoto(photoId)
// Returns: { success: true, message: string, remainingPhotos: number }
```

#### Delete an Album
```typescript
import { deleteAlbum } from '@/app/(app)/albums/actions'

const result = await deleteAlbum(albumId)
// Redirects to /albums after successful deletion
```

#### Cleanup Orphaned Albums
```typescript
import { cleanupOrphanedAlbums } from '@/app/(app)/albums/actions'

const result = await cleanupOrphanedAlbums()
// Returns: { success: true, deletedCount: number }
```

## How It Works

### Photo Deletion Logic
1. Check if user owns the photo
2. Count photos in the album
3. If **more than 1 photo**: Delete the photo only
4. If **last photo**: Delete the entire album (and photo via cascade)

### Album Deletion Logic
1. Check if user owns the album
2. Delete the album record
3. Database cascades and deletes:
   - All photos in the album
   - All likes on the album/photos
   - All comments on the album/photos
   - All stories linked to the album

## Database Schema Requirements

Make sure your schema has these cascade delete rules:

```sql
-- Photos table
ALTER TABLE photos
  ADD CONSTRAINT photos_album_id_fkey
  FOREIGN KEY (album_id)
  REFERENCES albums(id)
  ON DELETE CASCADE;

-- Likes table
ALTER TABLE likes
  DROP CONSTRAINT IF EXISTS likes_album_id_fkey,
  DROP CONSTRAINT IF EXISTS likes_photo_id_fkey;
  -- Note: Your schema uses target_type/target_id pattern
  -- Make sure to handle cascades in application logic or triggers

-- Comments table
-- Same as likes - handle via application logic

-- Stories table (if referencing albums)
ALTER TABLE stories
  ADD CONSTRAINT stories_album_id_fkey
  FOREIGN KEY (album_id)
  REFERENCES albums(id)
  ON DELETE CASCADE;
```

## UI Integration

The delete buttons are already integrated in:

1. **Album Detail Page**: Delete album button in header
2. **Photo Grid**: Delete photo button on each photo (when owner)
3. **Photo Viewer/Lightbox**: Delete button in full-screen view

## Testing Checklist

- [ ] Create an album with multiple photos
- [ ] Delete one photo - album should remain with other photos
- [ ] Delete all photos one by one - album should be deleted with last photo
- [ ] Create an album and delete it directly - all photos should be deleted
- [ ] Verify cascade deletes work for likes and comments
- [ ] Test that non-owners cannot delete photos/albums (403 error)

## Notes

- All deletions are **permanent** and cannot be undone
- File storage cleanup should be handled separately (photos in Supabase Storage)
- Consider adding a confirmation modal before deleting albums
- The cleanup function should be run periodically (e.g., via cron job)
