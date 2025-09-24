export interface Profile {
  id: string;
  username: string;
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  website?: string;
  location?: string;
  privacy_level: 'private' | 'friends' | 'public';
  created_at: string;
  updated_at: string;
}

export interface Album {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  cover_photo_url?: string;
  favorite_photo_urls?: string[]; // Up to 3 favorite photos for globe pin tooltips
  start_date?: string;
  end_date?: string;
  visibility: 'private' | 'friends' | 'followers' | 'public';
  tags?: string[];
  location_name?: string;
  country_id?: number;
  country_code?: string;
  city_id?: number;
  island_id?: number;
  latitude?: number;
  longitude?: number;
  created_at: string;
  updated_at: string;
  photos?: Photo[];
  user?: Profile;
}

// Supabase response type for albums with nested profile data
export interface AlbumWithProfile extends Omit<Album, 'user'> {
  profiles: Profile | Profile[] | null;
  photos?: Photo[];
}

// Type for partial profile data from Supabase queries
type PartialProfile = {
  privacy_level?: string;
};

// Helper function to safely extract privacy level from nested profile data
export function getProfilePrivacyLevel(profiles: PartialProfile | PartialProfile[] | null | undefined): string | undefined {
  if (!profiles) return undefined;
  if (Array.isArray(profiles)) {
    return profiles[0]?.privacy_level;
  }
  return profiles.privacy_level;
}

export interface Photo {
  id: string;
  album_id: string;
  user_id: string;
  file_path: string;
  file_size?: number;
  width?: number;
  height?: number;
  caption?: string;
  taken_at?: string;
  latitude?: number;
  longitude?: number;
  location_name?: string;
  country?: string;
  city?: string;
  camera_make?: string;
  camera_model?: string;
  iso?: number;
  aperture?: number;
  shutter_speed?: number;
  exif_data?: Record<string, unknown>;
  processing_status: string;
  order_index: number;
  created_at: string;
  mime_type?: string;
}

export interface Country {
  id: number;
  code: string;
  name: string;
  latitude?: number;
  longitude?: number;
}

export interface Follower {
  id: string;
  follower_id: string;
  following_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
  follower?: Profile; // Profile of the person following
  following?: Profile; // Profile of the person being followed
}