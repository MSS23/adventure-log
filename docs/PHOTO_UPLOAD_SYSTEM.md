# Adventure Log Photo Upload System

A complete, production-ready photo upload system built with Next.js 15, TypeScript, and Supabase Storage.

## 🏗️ Architecture Overview

### Tech Stack

- **Frontend**: Next.js 15 App Router, TypeScript, Tailwind CSS, shadcn/ui
- **Storage**: Supabase Storage with public bucket + RLS policies
- **Authentication**: NextAuth.js (session-based)
- **Upload Processing**: Client-side optimization + server-side validation
- **Security**: Row Level Security (RLS) + path validation + file type restrictions

### File Organization

```
/<userId>/albums/<albumId>/<epochMs>-<nanoid>.<ext>
```

**Example**: `d7bed83c-44a0-4a4f-925f-efc384ea1e50/albums/my-trip-2024/1703721234567-kX9mP2qR8T.webp`

## 🔧 Components

### Core Files

- **`lib/storage-v2.ts`** - Advanced storage utilities with optimization
- **`components/features/album-photo-uploader.tsx`** - Drag & drop uploader component
- **`components/features/album-photo-gallery.tsx`** - Photo gallery with management
- **`app/api/albums/[albumId]/photos/upload/route.ts`** - Server-side upload API
- **`supabase/storage-policies.sql`** - RLS policies for security

## 🚀 Features

### Upload Features

- ✅ **Drag & Drop** - Intuitive file selection
- ✅ **Multi-file Support** - Up to 100 files per batch
- ✅ **Progress Tracking** - Per-file and batch progress
- ✅ **Image Optimization** - Client-side resize/compress/WebP conversion
- ✅ **Concurrency Control** - Limited concurrent uploads (3-4)
- ✅ **File Validation** - Type, size, and format validation
- ✅ **Cancel/Retry** - Upload control with abort signals
- ✅ **Preview Generation** - Instant thumbnails
- ✅ **Error Recovery** - Detailed error reporting and retry logic

### Gallery Features

- ✅ **Grid/List Views** - Flexible display modes
- ✅ **Sorting Options** - By date, name, size
- ✅ **Photo Actions** - View, download, share, delete
- ✅ **Pagination** - Load more functionality
- ✅ **Storage Usage** - Real-time usage statistics
- ✅ **Responsive Design** - Mobile-first approach

### Security Features

- ✅ **User Isolation** - RLS ensures folder-level security
- ✅ **Path Validation** - Enforced folder structure
- ✅ **File Type Restrictions** - Only image files allowed
- ✅ **Size Limits** - 25MB per file, configurable batch limits
- ✅ **Authentication** - Required for all operations
- ✅ **Public URLs** - Read access via public bucket

## 📋 Setup Instructions

### 1. Environment Variables

Add these to your `.env.local`:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
NEXT_PUBLIC_SUPABASE_BUCKET="adventure-photos"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

### 2. Supabase Bucket Setup

1. **Create Bucket**:

   ```sql
   INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
   VALUES (
     'adventure-photos',
     'adventure-photos',
     true,  -- Public bucket for read access
     26214400,  -- 25MB file size limit
     ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
   );
   ```

2. **Apply RLS Policies**:
   Run the SQL script from `supabase/storage-policies.sql` in your Supabase Dashboard.

### 3. Database Schema

Ensure your `albumPhoto` model includes these fields:

```prisma
model AlbumPhoto {
  id           String   @id @default(cuid())
  url          String   // Public URL
  albumId      String
  originalName String?  // Original filename
  filePath     String?  // Storage path
  fileSize     Int?     // File size in bytes
  mimeType     String?  // MIME type
  width        Int?     // Image width
  height       Int?     // Image height
  metadata     String?  // JSON metadata
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  album        Album    @relation(fields: [albumId], references: [id], onDelete: Cascade)

  @@map("album_photos")
}
```

## 🎯 Usage Examples

### Basic Upload Component

```tsx
import { AlbumPhotoUploader } from "@/components/features/album-photo-uploader";

export function AlbumPage({ albumId }: { albumId: string }) {
  const handleUploadComplete = (photos: UploadedPhoto[]) => {
    console.log(`Uploaded ${photos.length} photos`);
    // Refresh gallery, show success message, etc.
  };

  return (
    <div>
      <AlbumPhotoUploader
        albumId={albumId}
        onUploadComplete={handleUploadComplete}
        onUploadError={(error) => console.error(error)}
        maxFiles={50}
        showOptimizationOption={true}
      />
    </div>
  );
}
```

### Photo Gallery Component

```tsx
import { AlbumPhotoGallery } from "@/components/features/album-photo-gallery";

export function AlbumGalleryPage({
  albumId,
  albumTitle,
}: {
  albumId: string;
  albumTitle: string;
}) {
  return (
    <AlbumPhotoGallery
      albumId={albumId}
      albumTitle={albumTitle}
      viewMode="grid"
      onPhotoDeleted={(photoPath) => console.log("Deleted:", photoPath)}
      maxPhotosToShow={100}
    />
  );
}
```

### Direct API Usage

```tsx
import { uploadPhotos, type UploadOptions } from "@/lib/storage-v2";

async function handleDirectUpload(
  files: File[],
  albumId: string,
  userId: string
) {
  const options: UploadOptions = {
    albumId,
    userId,
    optimizeImages: true,
    onProgress: (fileId, progress) => console.log(`${fileId}: ${progress}%`),
    onBatchProgress: (completed, total) =>
      console.log(`${completed}/${total} complete`),
  };

  try {
    const result = await uploadPhotos(files, options);
    console.log("Success:", result.successful.length);
    console.log("Failed:", result.failed.length);
  } catch (error) {
    console.error("Upload failed:", error);
  }
}
```

## 🔒 Security Model

### RLS Policies

The system uses Row Level Security to ensure users can only access their own folders:

```sql
-- Users can only upload to their own folder
CREATE POLICY "Users can upload to their own folder in adventure-photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'adventure-photos'
  AND auth.uid() IS NOT NULL
  AND storage.user_owns_folder(name, auth.uid())
);
```

### Path Validation

All uploads must follow the pattern:

- `{userId}/albums/{albumId}/{timestamp}-{nanoid}.{ext}`
- Invalid paths are rejected at both client and server level

### File Restrictions

- **Types**: JPEG, PNG, WebP, HEIC, HEIF only
- **Size**: 25MB per file (configurable)
- **Batch**: 100 files maximum (configurable)
- **Naming**: Sanitized filenames, safe characters only

## ⚡ Performance Optimizations

### Client-Side Optimizations

- **Image Compression**: Reduces file sizes by 20-80%
- **Format Conversion**: Auto-convert to WebP when beneficial
- **Dimension Scaling**: Resize large images to max 3000px
- **EXIF Orientation**: Automatic rotation correction
- **Concurrency Control**: Prevents browser overload

### Server-Side Optimizations

- **Streaming Uploads**: Efficient memory usage
- **Batch Processing**: Process multiple files efficiently
- **Database Transactions**: Atomic operations
- **Background Jobs**: Badge awards and stats updates
- **Caching**: Public URLs with cache busters

### Network Optimizations

- **Progress Tracking**: Real-time upload progress
- **Error Recovery**: Exponential backoff for retries
- **Abort Signals**: Cancellable uploads
- **Connection Pooling**: Efficient HTTP requests

## 🧪 Testing

### Manual Testing Checklist

- [ ] **Authentication**: Upload requires valid session
- [ ] **File Types**: Only image types accepted
- [ ] **File Sizes**: 25MB+ files rejected
- [ ] **Folder Security**: Cannot upload to other users' folders
- [ ] **Path Structure**: Enforced naming convention
- [ ] **Public URLs**: Images accessible via public URLs
- [ ] **Optimization**: Images compressed when beneficial
- [ ] **Progress**: Real-time upload progress works
- [ ] **Error Handling**: Clear error messages
- [ ] **Batch Uploads**: Multiple files upload correctly

### API Testing

```bash
# Test upload endpoint
curl -X GET http://localhost:3000/api/albums/[albumId]/photos/upload

# Test with authentication
curl -X POST http://localhost:3000/api/albums/[albumId]/photos/upload \
  -H "Content-Type: multipart/form-data" \
  -F "photos=@test-image.jpg" \
  -F "optimize=true"
```

## 🚨 Troubleshooting

### Common Issues

**Upload Fails with 401 Unauthorized**

- Ensure user is authenticated via NextAuth
- Check session cookie is being sent
- Verify NEXTAUTH_URL is correct

**Images Not Displaying**

- Check bucket is set to public
- Verify RLS policies allow SELECT
- Ensure public URLs are generated correctly

**RLS Policy Violations**

- Check folder structure matches `{userId}/albums/{albumId}/`
- Ensure userId matches authenticated user
- Verify path format is correct

**Large File Upload Timeouts**

- Increase `maxDuration` in API route
- Check network stability
- Consider breaking into smaller batches

### Debug Mode

Enable detailed logging:

```tsx
// Add to storage operations
const options: UploadOptions = {
  // ... other options
  onStatusChange: (fileId, status, error) => {
    console.log(`File ${fileId}: ${status}`, error);
  },
  onProgress: (fileId, progress) => {
    console.log(`File ${fileId}: ${progress}%`);
  },
};
```

## 📈 Monitoring & Analytics

### Storage Usage Tracking

```tsx
import { getUserStorageUsage } from "@/lib/storage-v2";

const usage = await getUserStorageUsage(userId);
console.log(`${usage.formattedSize} used across ${usage.totalFiles} files`);
```

### Upload Performance Metrics

```tsx
const result = await uploadPhotos(files, options);
console.log(`Upload completed in ${result.totalTimeMs}ms`);
console.log(`Total size: ${result.totalSizeBytes} bytes`);
```

## 🔄 Migration Guide

### From Existing Upload System

1. Backup existing photos
2. Update database schema to include new fields
3. Apply RLS policies to Supabase
4. Replace upload components with new ones
5. Test thoroughly before going live

### Folder Structure Migration

If you have existing photos in a different structure, create a migration script:

```tsx
// Example migration for old structure -> new structure
async function migratePhotoStructure(userId: string) {
  // Move files from old paths to new paths
  // Update database records
  // Generate new public URLs
}
```

## 🛠️ Customization

### Styling

Components use Tailwind CSS and shadcn/ui. Customize via:

- CSS variables in your theme
- Component prop overrides
- Custom className props

### File Type Support

Add new MIME types in:

- `ALLOWED_TYPES` constant
- Supabase bucket configuration
- RLS policies

### Upload Limits

Modify constants in `lib/storage-v2.ts`:

```tsx
export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
export const MAX_FILES_PER_BATCH = 100;
export const MAX_CONCURRENT_UPLOADS = 4;
```

## 📚 Additional Resources

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Next.js App Router](https://nextjs.org/docs/app)
- [shadcn/ui Components](https://ui.shadcn.com/)

## 🤝 Contributing

When contributing to the photo upload system:

1. Test all security constraints
2. Maintain TypeScript strict types
3. Follow existing component patterns
4. Update documentation for new features
5. Test across different file types and sizes

---

Built with ❤️ for Adventure Log - Track your travels, share your memories.
