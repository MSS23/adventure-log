# API Documentation

## Base URL

Production: `https://yourdomain.com/api`
Development: `http://localhost:3000/api`

## Authentication

Most endpoints require authentication via Supabase session cookie.

```http
Cookie: sb-access-token=xxx; sb-refresh-token=xxx
```

Alternatively, use Authorization header:
```http
Authorization: Bearer <access_token>
```

## Rate Limits

| Endpoint Category | Limit |
|------------------|-------|
| Public endpoints | 60 requests/min |
| Authenticated | 100 requests/15min |
| Upload endpoints | 50 uploads/hour |
| AI endpoints | 10 requests/hour |
| Geocoding | 60 requests/minute |

Rate limit headers:
- `X-RateLimit-Limit`: Maximum requests
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset timestamp (ISO 8601)
- `Retry-After`: Seconds until reset (on 429 only)

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

### Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error
- `503` - Service Unavailable

## Endpoints

### Health Check

**GET** `/api/health`

Returns service health status. No authentication required.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.1.0",
  "platform": "adventure-log",
  "checks": {
    "database": true,
    "redis": true,
    "memory": {
      "total": 536870912,
      "used": 268435456,
      "free": 268435456,
      "percentage": 50
    }
  },
  "uptime": 3600
}
```

**Status Codes:**
- `200` - All systems healthy or degraded
- `503` - Service unavailable

### Geocoding

**GET** `/api/geocode`

Reverse or forward geocoding using OpenStreetMap Nominatim.

**Authentication:** Required

**Query Parameters:**
- `lat` (number, required for reverse) - Latitude
- `lng` (number, required for reverse) - Longitude
- `reverse` (boolean) - Set to `true` for reverse geocoding
- `q` (string, required for forward) - Location query

**Example - Reverse Geocoding:**
```http
GET /api/geocode?lat=40.7128&lng=-74.0060&reverse=true
```

**Example - Forward Geocoding:**
```http
GET /api/geocode?q=New York, NY
```

**Response:**
```json
[
  {
    "display_name": "New York, NY, USA",
    "lat": "40.7128",
    "lon": "-74.0060",
    "address": {
      "city": "New York",
      "state": "New York",
      "country": "United States"
    }
  }
]
```

**Status Codes:**
- `200` - Success
- `400` - Missing required parameters
- `401` - Unauthorized
- `429` - Rate limited
- `500` - Geocoding service error

### Albums

#### List Albums

**GET** `/api/albums`

**Authentication:** Required

**Query Parameters:**
- `limit` (number, default: 20) - Number of albums to return
- `offset` (number, default: 0) - Pagination offset
- `user_id` (string, optional) - Filter by user ID
- `visibility` (string, optional) - Filter by visibility: `public`, `friends`, `private`

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Summer Vacation",
      "location_name": "Barcelona, Spain",
      "latitude": 41.3851,
      "longitude": 2.1734,
      "date_start": "2024-06-01",
      "date_end": "2024-06-10",
      "cover_photo_url": "https://...",
      "photo_count": 25,
      "created_at": "2024-06-01T10:00:00Z"
    }
  ],
  "count": 100
}
```

#### Get Album

**GET** `/api/albums/[id]`

**Authentication:** Required (unless album is public)

**Response:**
```json
{
  "id": "uuid",
  "title": "Summer Vacation",
  "description": "Amazing trip to Barcelona",
  "location_name": "Barcelona, Spain",
  "latitude": 41.3851,
  "longitude": 2.1734,
  "date_start": "2024-06-01",
  "date_end": "2024-06-10",
  "visibility": "public",
  "user_id": "user-uuid",
  "created_at": "2024-06-01T10:00:00Z",
  "updated_at": "2024-06-01T10:00:00Z"
}
```

#### Create Album

**POST** `/api/albums`

**Authentication:** Required

**Request Body:**
```json
{
  "title": "Summer Vacation",
  "description": "Amazing trip",
  "location_name": "Barcelona, Spain",
  "latitude": 41.3851,
  "longitude": 2.1734,
  "date_start": "2024-06-01",
  "date_end": "2024-06-10",
  "visibility": "public"
}
```

**Response:** `201 Created` with album object

#### Update Album

**PATCH** `/api/albums/[id]`

**Authentication:** Required (must be album owner)

**Request Body:** Partial album object

**Response:** Updated album object

#### Delete Album

**DELETE** `/api/albums/[id]`

**Authentication:** Required (must be album owner)

**Response:** `204 No Content`

### Photos

#### Upload Photo

**POST** `/api/photos`

**Authentication:** Required

**Content-Type:** `multipart/form-data`

**Form Data:**
- `file` (File) - Image file (max 10MB)
- `album_id` (string) - Album ID
- `caption` (string, optional) - Photo caption

**Response:**
```json
{
  "id": "photo-uuid",
  "file_path": "user-id/album-id/photo.jpg",
  "album_id": "album-uuid",
  "caption": "Beautiful sunset",
  "latitude": 41.3851,
  "longitude": 2.1734,
  "created_at": "2024-06-01T10:00:00Z"
}
```

**Status Codes:**
- `201` - Created
- `400` - Invalid file or missing album_id
- `413` - File too large
- `429` - Rate limited

### Globe Reactions

#### Get Reactions

**GET** `/api/globe-reactions`

**Authentication:** Required

**Query Parameters:**
- `user_id` (string, optional) - Filter by user
- `album_id` (string, optional) - Filter by album

**Response:**
```json
{
  "data": [
    {
      "id": "reaction-uuid",
      "user_id": "user-uuid",
      "target_user_id": "target-uuid",
      "target_album_id": "album-uuid",
      "reaction_type": "wave",
      "latitude": 41.3851,
      "longitude": 2.1734,
      "message": "Hello!",
      "created_at": "2024-06-01T10:00:00Z"
    }
  ]
}
```

#### Create Reaction

**POST** `/api/globe-reactions`

**Authentication:** Required

**Request Body:**
```json
{
  "target_user_id": "user-uuid",
  "target_album_id": "album-uuid",
  "reaction_type": "wave",
  "latitude": 41.3851,
  "longitude": 2.1734,
  "message": "Hello!"
}
```

**Response:** `201 Created` with reaction object

### Trip Planner

#### Generate Itinerary

**POST** `/api/trip-planner/generate`

**Authentication:** Required

**Rate Limit:** 10 requests/hour

**Request Body:**
```json
{
  "destination": "Barcelona, Spain",
  "start_date": "2024-06-01",
  "end_date": "2024-06-10",
  "budget": 2000,
  "interests": ["culture", "food", "beaches"]
}
```

**Response:**
```json
{
  "itinerary": {
    "days": [
      {
        "date": "2024-06-01",
        "activities": [
          {
            "time": "09:00",
            "name": "Visit Sagrada Familia",
            "description": "...",
            "duration": "2 hours"
          }
        ]
      }
    ]
  }
}
```

## Webhooks (Future)

Webhooks will be available for:
- New album created
- New photo uploaded
- New follower
- New comment
- New like

## SDKs

Official SDKs:
- JavaScript/TypeScript: `@adventure-log/sdk`
- Python: `adventure-log-python`
- Ruby: `adventure-log-ruby`

## Support

For API support:
- Email: api@adventurelog.app
- Documentation: https://docs.adventurelog.app
- Status: https://status.adventurelog.app
