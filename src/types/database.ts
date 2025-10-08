// Users table (auth.users linked)
export interface User {
  id: string;
  email: string;
  name?: string;
  username?: string;
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  location?: string;
  website?: string;
  is_private: boolean;
  privacy_level?: 'public' | 'private' | 'friends';
  created_at: string;
  updated_at: string;
}

// Legacy alias for backward compatibility
export type Profile = User;

export interface Album {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  cover_photo_id?: string; // References photos table
  cover_photo?: Photo;
  cover_photo_url?: string;
  cover_image_url?: string;  // Alias for cover_photo_url
  location_name?: string;
  location_country?: string;
  location_city?: string;
  country_code?: string;
  location_lat?: number;
  location_lng?: number;
  date_start?: string;
  date_end?: string;
  privacy: 'public' | 'private' | 'friends';
  visibility?: 'public' | 'private' | 'friends';
  status?: 'draft' | 'published'; // Draft status - albums without photos are drafts
  caption?: string;
  // Privacy features
  hide_exact_location?: boolean;
  location_precision?: 'exact' | 'neighbourhood' | 'city' | 'country' | 'hidden';
  publish_delay_hours?: number;
  scheduled_publish_at?: string;
  is_delayed_publish?: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  photos?: Photo[];
  user?: User;
}

// Supabase response type for albums with nested user data
export interface AlbumWithUser extends Omit<Album, 'user'> {
  users: User | User[] | null;
  photos?: Photo[];
}

// Legacy alias
export type AlbumWithProfile = AlbumWithUser;

export interface Photo {
  id: string;
  user_id: string;
  album_id: string;
  file_path: string;
  storage_path?: string; // Legacy field
  caption?: string;
  taken_at?: string;
  location_name?: string;
  location_lat?: number;
  location_lng?: number;
  latitude?: number;
  longitude?: number;
  exif_data?: Record<string, unknown>;
  camera_make?: string;
  camera_model?: string;
  iso?: number;
  aperture?: string;
  shutter_speed?: string;
  file_size?: number;
  processing_status?: string;
  order_index: number;
  is_favorite: boolean;
  // Privacy features
  hide_exact_location?: boolean;
  location_precision?: 'exact' | 'neighbourhood' | 'city' | 'country' | 'hidden';
  created_at: string;
  updated_at: string;
  // Relations
  user?: User;
  album?: Album;
}

// Legacy type alias
export type AlbumPhoto = Photo;

// Album request/response types
export interface CreateAlbumRequest {
  title: string;
  description?: string;
  location_country?: string;
  location_city?: string;
  location_lat?: number;
  location_lng?: number;
  date_start?: string;
  date_end?: string;
  privacy?: 'public' | 'private' | 'friends';
}

export interface UpdateAlbumRequest extends Partial<CreateAlbumRequest> {
  id: string;
  cover_photo_id?: string;
}

export interface AddPhotosRequest {
  album_id: string;
  photos: Array<{
    file_path: string;
    caption?: string;
    taken_at?: string;
    location_lat?: number;
    location_lng?: number;
    order_index: number;
  }>;
}

export interface AlbumListResponse {
  albums: Album[];
  total?: number;
  page?: number;
  limit?: number;
  cursor?: string | null;
  has_more?: boolean;
}

export interface Country {
  id: number;
  code: string;
  name: string;
  latitude?: number;
  longitude?: number;
}

// Follows table
export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  status: 'pending' | 'approved';
  created_at: string;
  // Relations
  follower?: User;
  following?: User;
}

// Legacy alias
export type Follower = Follow;

// Likes table (polymorphic)
export interface Like {
  id: string;
  user_id: string;
  target_type: 'photo' | 'album' | 'comment';
  target_id: string;
  created_at: string;
  // Relations
  user?: User;
}

// Comments table (polymorphic)
export interface Comment {
  id: string;
  user_id: string;
  target_type: 'photo' | 'album';
  target_id: string;
  text?: string;         // Legacy field
  content?: string;      // New field
  parent_id?: string;
  created_at: string;
  updated_at: string;
  // Relations - multiple possible relation names for compatibility
  user?: User;
  users?: User;
  profiles?: User;
  parent?: Comment;
  replies?: Comment[];
}

// Stories table
export interface Story {
  id: string;
  user_id: string;
  album_id?: string;
  media_url: string;
  image_url?: string;  // Alias for media_url
  media_type: 'photo' | 'video';
  country_code?: string;
  caption?: string;
  posted_at: string;
  expires_at: string;
  view_count: number;
  created_at: string;
  // Relations
  user?: User;
  album?: Album;
}

// Wishlist table
export interface WishlistItem {
  id: string;
  user_id: string;
  location_name: string;
  location_country?: string;
  location_lat?: number;
  location_lng?: number;
  notes?: string;
  priority: number;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  user?: User;
}

// User Levels table
export interface UserLevel {
  user_id: string;
  current_xp: number;
  current_level: number;
  created_at: string;
  updated_at: string;
  // Relations
  user?: User;
}

// Privacy level type
export type PrivacyLevel = 'public' | 'private' | 'friends';

// Story-related types
export interface StoryStats {
  view_count: number;
  guess_count: number;
  correct_guess_count: number;
  total_guesses?: number;
  correct_percentage?: number;
  top_guesses?: Array<{
    country_code: string;
    count: number;
  }>;
}

export interface StoryGuess {
  id: string;
  story_id: string;
  user_id: string;
  guessed_country: string;
  guess_code: string;  // Two-letter country code
  is_correct: boolean;
  created_at: string;
  user?: User;
}

export interface StoryWithStats extends Story {
  stats?: StoryStats;
  user_has_guessed?: boolean;
  user_guess_correct?: boolean;
  user_guess?: StoryGuess;
  is_expired?: boolean;
  is_owner?: boolean;
  can_view?: boolean;
  can_guess?: boolean;
}

export interface StoryFeedItem {
  id: string;
  user_id: string;
  album_id: string;
  media_url: string;
  image_url?: string;  // Alias for media_url
  country_code: string;
  created_at: string;
  expires_at: string;
  stats?: StoryStats;
  is_owner?: boolean;
  has_viewed?: boolean;
  user?: User;
}

export interface CreateStoryRequest {
  album_id: string;
  media_url?: string;
  image_url?: string;  // Alias for media_url
  country_code?: string;  // Optional - fetched from album if not provided
}

export interface GuessStoryRequest {
  story_id: string;
  guessed_country?: string;  // Legacy field
  guess_code?: string;  // New field
}

export interface StoryFeedResponse {
  stories: StoryFeedItem[];
  has_more: boolean;
  cursor?: string;
}

// Album with story eligibility
export interface AlbumWithStoryEligibility extends Album {
  has_active_story: boolean;
  cover_image_url?: string;
}

// =============================================================================
// PLAYLISTS & COLLECTIONS
// =============================================================================

export type LocationPrecision = 'exact' | 'neighbourhood' | 'city' | 'country' | 'hidden';

export interface Playlist {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  cover_image_url?: string;
  playlist_type: 'curated' | 'smart' | 'travel_route' | 'theme';
  category?: string;
  tags?: string[];
  visibility: 'private' | 'friends' | 'followers' | 'public';
  is_collaborative: boolean;
  allow_subscriptions: boolean;
  item_count: number;
  subscriber_count: number;
  view_count: number;
  created_at: string;
  updated_at: string;
  // Relations
  user?: User;
  items?: PlaylistItem[];
  subscriptions?: PlaylistSubscription[];
  collaborators?: PlaylistCollaborator[];
}

export interface PlaylistItem {
  id: string;
  playlist_id: string;
  album_id?: string;
  custom_location_name?: string;
  custom_latitude?: number;
  custom_longitude?: number;
  custom_notes?: string;
  order_index: number;
  added_by_user_id?: string;
  notes?: string;
  created_at: string;
  // Relations
  album?: Album;
  added_by?: User;
  playlist?: Playlist;
}

export interface PlaylistSubscription {
  id: string;
  playlist_id: string;
  user_id: string;
  is_favorited: boolean;
  notification_enabled: boolean;
  created_at: string;
  // Relations
  playlist?: Playlist;
  user?: User;
}

export interface PlaylistCollaborator {
  id: string;
  playlist_id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'contributor' | 'viewer';
  can_add_items: boolean;
  can_remove_items: boolean;
  can_invite_others: boolean;
  created_at: string;
  // Relations
  playlist?: Playlist;
  user?: User;
}

export interface PlaylistWithDetails extends Playlist {
  is_owner: boolean;
  is_collaborator: boolean;
  is_subscribed: boolean;
}

// =============================================================================
// OFFLINE SUPPORT
// =============================================================================

export interface UploadQueueItem {
  id: string;
  user_id: string;
  resource_type: 'album' | 'photo' | 'story' | 'comment' | 'like';
  local_id?: string;
  payload: Record<string, unknown>;
  files_to_upload?: Array<{
    path: string;
    type: string;
    size: number;
  }>;
  status: 'pending' | 'uploading' | 'completed' | 'failed' | 'cancelled';
  upload_started_at?: string;
  upload_completed_at?: string;
  error_message?: string;
  retry_count: number;
  max_retries: number;
  remote_album_id?: string;
  remote_photo_ids?: string[];
  created_at: string;
  updated_at: string;
}

export interface OfflineMapPack {
  id: string;
  user_id: string;
  pack_name: string;
  description?: string;
  min_latitude: number;
  max_latitude: number;
  min_longitude: number;
  max_longitude: number;
  min_zoom: number;
  max_zoom: number;
  status: 'pending' | 'downloading' | 'ready' | 'expired' | 'error';
  download_progress: number;
  estimated_size_mb?: number;
  actual_size_mb?: number;
  tile_count?: number;
  expires_at?: string;
  last_used_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SafeLocation {
  display_lat?: number;
  display_lng?: number;
  display_name?: string;
}