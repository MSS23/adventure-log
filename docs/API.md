# API Documentation

Complete API reference for Adventure Log application.

**Base URL:** `https://adventurelog.com/api` (or `http://localhost:3000/api` in development)
**Authentication:** Bearer token via Supabase Auth

---

## Authentication

All API endpoints require authentication unless specified otherwise.

**Authentication Header:**
```http
Authorization: Bearer <supabase_access_token>
```

**Get Token:**
```typescript
const { data: { session } } = await supabase.auth.getSession()
const token = session?.access_token
```

---

## API Endpoints

### Geocoding

#### GET `/api/geocode`

Search for locations using OpenStreetMap Nominatim.

**⚠️ Security Issue:** Currently unauthenticated - needs fix (see SECURITY.md)

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | Yes | Search query (e.g., "Paris, France") |

**Example Request:**
```http
GET /api/geocode?q=Paris,%20France
```

**Example Response:**
```json
[
  {
    "place_id": 259174766,
    "lat": "48.8566969",
    "lon": "2.3514616",
    "display_name": "Paris, Île-de-France, France",
    "type": "city"
  }
]
```

---

### Globe Reactions

#### GET `/api/globe-reactions`

Get reactions for a specific album or user.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `targetUserId` | uuid | Yes | User ID to get reactions for |
| `targetAlbumId` | uuid | No | Filter by specific album |
| `limit` | number | No | Max results (default: 50) |

**Example Request:**
```http
GET /api/globe-reactions?targetUserId=123e4567-e89b-12d3-a456-426614174000&limit=20
```

**Example Response:**
```json
{
  "reactions": [
    {
      "id": "abc123",
      "user_id": "user-id",
      "target_user_id": "target-id",
      "target_album_id": "album-id",
      "reaction_type": "want_to_visit",
      "sticker_emoji": "✈️",
      "latitude": 48.8566,
      "longitude": 2.3522,
      "location_name": "Paris, France",
      "message": "Looks amazing!",
      "is_read": false,
      "created_at": "2025-01-15T10:30:00Z",
      "user": {
        "username": "traveler123",
        "display_name": "John Doe",
        "avatar_url": "https://..."
      }
    }
  ],
  "count": 15
}
```

#### POST `/api/globe-reactions`

Create a new globe reaction.

**Request Body:**
```json
{
  "target_type": "album" | "location" | "globe_point",
  "target_user_id": "uuid",
  "target_album_id": "uuid",  // Optional
  "reaction_type": "want_to_visit" | "been_here" | "recommendation",
  "sticker_emoji": "✈️",
  "latitude": 48.8566,
  "longitude": 2.3522,
  "location_name": "Paris, France",
  "country_code": "FR",
  "message": "Optional message",
  "is_public": true
}
```

**Response:**
```json
{
  "id": "reaction-id",
  "created_at": "2025-01-15T10:30:00Z"
}
```

---

### Playlists

#### GET `/api/playlists`

Get user's playlists.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | uuid | No | User ID (defaults to authenticated user) |
| `visibility` | string | No | Filter by visibility |

**Example Response:**
```json
{
  "playlists": [
    {
      "id": "playlist-id",
      "title": "European Adventures",
      "description": "My favorite European destinations",
      "playlist_type": "curated",
      "visibility": "public",
      "item_count": 12,
      "subscriber_count": 45,
      "cover_image_url": "https://...",
      "created_at": "2025-01-10T00:00:00Z"
    }
  ]
}
```

#### POST `/api/playlists`

Create a new playlist.

**Request Body:**
```json
{
  "title": "My Playlist",
  "description": "Description here",
  "playlist_type": "curated" | "smart" | "travel_route" | "theme",
  "visibility": "private" | "friends" | "followers" | "public",
  "is_collaborative": false,
  "allow_subscriptions": true
}
```

---

### Album Cover Position

#### PATCH `/api/albums/[id]/cover-position`

Update album cover photo positioning.

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | uuid | Album ID |

**Request Body:**
```json
{
  "position": "center" | "top" | "bottom" | "left" | "right" | "custom",
  "xOffset": -100 to 100,  // Percentage
  "yOffset": -100 to 100   // Percentage
}
```

**Example:**
```json
{
  "position": "custom",
  "xOffset": 25,
  "yOffset": -15
}
```

**Response:**
```json
{
  "success": true,
  "album": {
    "id": "album-id",
    "cover_photo_position": "custom",
    "cover_photo_x_offset": 25,
    "cover_photo_y_offset": -15
  }
}
```

---

### Monitoring Endpoints

#### POST `/api/monitoring/errors`

Log application errors.

**⚠️ Security Issue:** Uses wrong Supabase client (see SECURITY.md)

**Request Body:**
```json
{
  "message": "Error message",
  "stack": "Stack trace",
  "component": "ComponentName",
  "action": "action-name",
  "metadata": {}
}
```

#### POST `/api/monitoring/performance`

Log performance metrics.

#### POST `/api/monitoring/security`

Log security events.

#### POST `/api/monitoring/web-vitals`

Log Core Web Vitals.

---

### Health Check

#### GET `/api/health`

Health check endpoint for monitoring.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-15T10:30:00Z",
  "uptime": 123456,
  "version": "1.0.1"
}
```

---

## Server Actions

Server actions are called directly from client components using Next.js 15.

### Album Sharing

Located in `src/app/actions/album-sharing.ts`

#### `createAlbumShare()`

```typescript
import { createAlbumShare } from '@/app/actions/album-sharing'

const result = await createAlbumShare({
  album_id: 'uuid',
  shared_with_user_id: 'uuid',  // Optional
  shared_with_email: 'user@example.com',  // Optional
  permission_level: 'view' | 'contribute' | 'edit',
  expires_at: '2025-12-31T23:59:59Z'  // Optional
})
```

**Returns:**
```typescript
{
  success: boolean
  share?: AlbumShare
  error?: string
}
```

---

### Photo Metadata

Located in `src/app/actions/photo-metadata.ts`

#### `updatePhotoMetadata()`

```typescript
import { updatePhotoMetadata } from '@/app/actions/photo-metadata'

await updatePhotoMetadata({
  photoId: 'uuid',
  caption: 'New caption',
  taken_at: '2025-01-15T10:00:00Z',
  location_lat: 48.8566,
  location_lng: 2.3522,
  location_name: 'Paris, France'
})
```

---

## Error Responses

All API endpoints follow a consistent error format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

**Common HTTP Status Codes:**
| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (not authenticated) |
| 403 | Forbidden (no permission) |
| 404 | Not Found |
| 429 | Rate Limit Exceeded |
| 500 | Internal Server Error |

---

## Rate Limiting

**Status:** ⚠️ Not yet implemented (see PERFORMANCE.md)

**Planned Limits:**
- Geocoding: 10 requests/minute per user
- Globe Reactions: 30 requests/minute per user
- General API: 100 requests/minute per user

---

## Best Practices

### Use TypeScript Types
```typescript
import type { AlbumShare, CreateAlbumShareRequest } from '@/types/database'

const shareData: CreateAlbumShareRequest = {
  album_id: albumId,
  permission_level: 'view'
}
```

### Error Handling
```typescript
try {
  const response = await fetch('/api/geocode?q=Paris')
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`)
  }
  const data = await response.json()
} catch (error) {
  log.error('API call failed', { endpoint: '/api/geocode' }, error)
}
```

### Authentication
```typescript
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()
const { data: { session } } = await supabase.auth.getSession()

const response = await fetch('/api/endpoint', {
  headers: {
    'Authorization': `Bearer ${session?.access_token}`,
    'Content-Type': 'application/json'
  }
})
```

---

## Webhooks (Future)

Planned webhook support for:
- Album created
- Photo uploaded
- New follower
- Comment added
- Share created

Configuration will be in user settings.

---

## OpenAPI Specification

Full OpenAPI 3.0 spec available at `/api/openapi.json` (coming soon).

For now, use this documentation and TypeScript types for integration.
