# Adventure Log - API Design

## API Routes Structure

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/reset-password` - Password reset

### Users/Profiles
- `GET /api/users/me` - Current user profile
- `PUT /api/users/me` - Update current user profile
- `GET /api/users/[id]` - Get user profile by ID
- `POST /api/users/[id]/follow` - Follow/unfollow user
- `GET /api/users/[id]/followers` - Get user followers
- `GET /api/users/[id]/following` - Get users being followed

### Albums
- `GET /api/albums` - List albums (with filters)
- `POST /api/albums` - Create new album
- `GET /api/albums/[id]` - Get album details
- `PUT /api/albums/[id]` - Update album
- `DELETE /api/albums/[id]` - Delete album
- `POST /api/albums/[id]/photos` - Upload photos to album

### Photos
- `GET /api/photos/[id]` - Get photo details
- `PUT /api/photos/[id]` - Update photo (caption, location)
- `DELETE /api/photos/[id]` - Delete photo
- `POST /api/photos/[id]/like` - Like/unlike photo

### Social
- `POST /api/like` - Like album or photo
- `DELETE /api/like` - Remove like
- `POST /api/comments` - Add comment
- `GET /api/comments` - Get comments for target
- `DELETE /api/comments/[id]` - Delete comment
- `GET /api/feed` - Get activity feed

### Globe/Travel
- `GET /api/travel/stats` - User travel statistics
- `GET /api/travel/countries` - Countries visited by user
- `GET /api/countries` - List all countries

## Request/Response Formats

### Create Album
```typescript
// POST /api/albums
{
  title: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  visibility: 'private' | 'friends' | 'public';
  location_name?: string;
  tags?: string[];
}

// Response
{
  id: string;
  user_id: string;
  title: string;
  // ... other fields
  created_at: string;
}
```

## Upload Photos
```typescript
// POST /api/albums/[id]/photos
// FormData with:
{
  files: File[];
  captions?: string[];
  coordinates?: { lat: number; lng: number }[];
}

// Response
{
  photos: Array<{
    id: string;
    file_path: string;
    caption?: string;
    latitude?: number;
    longitude?: number;
    // ... other fields
  }>;
}
```

## Error Handling
- `400` Bad Request (validation errors)
- `401` Unauthorized (not logged in)
- `403` Forbidden (insufficient permissions)
- `404` Not Found
- `429` Too Many Requests (rate limiting)
- `500` Internal Server Error

## Error Response Format
```typescript
{
  error: {
    code: string;
    message: string;
    details?: any;
  };
}
```

## Rate Limiting
- Authentication: 5 attempts per minute per IP
- File uploads: 10 per minute per user
- API calls: 100 per minute per user
- Comments: 20 per minute per user