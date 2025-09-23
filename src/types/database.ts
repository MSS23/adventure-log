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
  start_date?: string;
  end_date?: string;
  visibility: 'private' | 'friends' | 'public';
  tags?: string[];
  location_name?: string;
  country_id?: number;
  city_id?: number;
  created_at: string;
  updated_at: string;
  photos?: Photo[];
  user?: Profile;
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