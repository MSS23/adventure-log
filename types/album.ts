export interface AlbumPhoto {
  id: string;
  url: string;
  caption?: string;
  metadata?: string;
  createdAt: string;
}

export interface AlbumData {
  id: string;
  title: string;
  description?: string;
  country: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  date?: string; // Trip date - when the visit actually occurred (optional in DB)
  createdAt: string; // When added to the app (always present)
  updatedAt?: string;
  privacy: "PUBLIC" | "FRIENDS_ONLY" | "PRIVATE";
  tags: string[];
  coverPhotoUrl?: string;
  coverPhotoId?: string;
  userId?: string;
<<<<<<< HEAD
  
=======

>>>>>>> oauth-upload-fixes
  // Count relationships
  _count?: { photos: number };
  photosCount?: number;
  favoritesCount?: number;
  tripsCount?: number;
<<<<<<< HEAD
  
=======

>>>>>>> oauth-upload-fixes
  // Additional optional fields for detailed views
  viewCount?: number;
  shareCount?: number;
  visitDuration?: string;
  weather?: string;
  companions?: string;
  photos?: AlbumPhoto[];
}

// Helper type for globe components that require date and coordinates
<<<<<<< HEAD
export interface AlbumDataWithDate extends Omit<AlbumData, 'date' | 'latitude' | 'longitude'> {
=======
export interface AlbumDataWithDate
  extends Omit<AlbumData, "date" | "latitude" | "longitude"> {
>>>>>>> oauth-upload-fixes
  date: string; // Required for globe components
  latitude: number; // Required for globe positioning
  longitude: number; // Required for globe positioning
}

// Utility function to ensure date and coordinates are present for globe components
export function ensureAlbumDate(album: AlbumData): AlbumDataWithDate {
  if (album.latitude === undefined || album.longitude === undefined) {
<<<<<<< HEAD
    throw new Error(`Album ${album.id} missing required coordinates for globe display`);
=======
    throw new Error(
      `Album ${album.id} missing required coordinates for globe display`
    );
>>>>>>> oauth-upload-fixes
  }
  return {
    ...album,
    date: album.date || album.createdAt,
    latitude: album.latitude,
<<<<<<< HEAD
    longitude: album.longitude
  };
}
=======
    longitude: album.longitude,
  };
}
>>>>>>> oauth-upload-fixes
