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
  home_city?: string;
  home_country?: string;
  home_latitude?: number;
  home_longitude?: number;
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
  // Cover photo positioning
  cover_photo_position?: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'custom';
  cover_photo_x_offset?: number; // Horizontal position as percentage (0-100)
  cover_photo_y_offset?: number; // Vertical position as percentage (0-100)
  location_name?: string;
  location_country?: string;
  location_city?: string;
  country_code?: string;
  location_lat?: number;
  location_lng?: number;
  latitude?: number; // Alias for location_lat
  longitude?: number; // Alias for location_lng
  date_start?: string;
  date_end?: string;
  privacy: 'public' | 'private' | 'friends';
  visibility?: 'public' | 'private' | 'friends';
  status?: 'draft' | 'published'; // Draft status - albums without photos are drafts
  caption?: string;
  // Privacy features
  hide_exact_location?: boolean;
  location_precision?: 'exact' | 'neighbourhood' | 'city' | 'country' | 'hidden';
  show_exact_dates?: boolean; // Whether to show exact dates or only month/year
  publish_delay_hours?: number;
  scheduled_publish_at?: string;
  is_delayed_publish?: boolean;
  // Copyright & Attribution
  copyright_holder?: string;
  license_type?: 'all-rights-reserved' | 'cc-by' | 'cc-by-sa' | 'cc-by-nd' | 'cc-by-nc' | 'cc-by-nc-sa' | 'cc-by-nc-nd' | 'cc0' | 'public-domain';
  license_url?: string;
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

export interface ExifCameraData {
  make?: string;
  model?: string;
  lens?: string;
  focalLength?: number;
}

export interface ExifData {
  camera?: ExifCameraData;
  settings?: {
    aperture?: number;
    shutterSpeed?: string;
    iso?: number;
  };
  location?: {
    latitude?: number;
    longitude?: number;
  };
  [key: string]: unknown;
}

export interface Photo {
  id: string;
  user_id: string;
  album_id: string;
  file_path: string;
  storage_path?: string; // Legacy field
  file_hash?: string; // SHA-256 hash for duplicate detection
  // Multi-size storage
  thumbnail_path?: string;
  medium_path?: string;
  large_path?: string;
  original_size?: number;
  caption?: string;
  taken_at?: string;
  location_name?: string;
  location_lat?: number;
  location_lng?: number;
  latitude?: number;
  longitude?: number;
  exif_data?: ExifData;
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
  // Copyright & Attribution
  photographer_credit?: string;
  copyright_holder?: string;
  license_type?: 'all-rights-reserved' | 'cc-by' | 'cc-by-sa' | 'cc-by-nd' | 'cc-by-nc' | 'cc-by-nc-sa' | 'cc-by-nc-nd' | 'cc0' | 'public-domain';
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
  copyright_holder?: string;
  license_type?: 'all-rights-reserved' | 'cc-by' | 'cc-by-sa' | 'cc-by-nd' | 'cc-by-nc' | 'cc-by-nc-sa' | 'cc-by-nc-nd' | 'cc0' | 'public-domain';
  license_url?: string;
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
  target_type: 'photo' | 'album' | 'comment' | 'story' | 'location';
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

// License type for copyright system
export type LicenseType =
  | 'all-rights-reserved'
  | 'cc-by'
  | 'cc-by-sa'
  | 'cc-by-nd'
  | 'cc-by-nc'
  | 'cc-by-nc-sa'
  | 'cc-by-nc-nd'
  | 'cc0'
  | 'public-domain';

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

// =============================================================================
// GLOBE REACTIONS
// =============================================================================

export type GlobeReactionTargetType = 'album' | 'location' | 'globe_point';
export type GlobeReactionCategory = 'suggestion' | 'memory' | 'emotion' | 'action';
export type AllowReactionsFrom = 'everyone' | 'followers' | 'friends' | 'nobody';

export interface GlobeReaction {
  id: string;
  user_id: string;
  target_type: GlobeReactionTargetType;
  target_album_id?: string;
  target_user_id: string;
  reaction_type: string;
  sticker_emoji?: string;
  latitude?: number;
  longitude?: number;
  location_name?: string;
  country_code?: string;
  message?: string;
  is_read: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  user?: User;
  target_user?: User;
  target_album?: Album;
  reaction_type_info?: GlobeReactionType;
}

export interface GlobeReactionType {
  id: string;
  label: string;
  emoji: string;
  description?: string;
  category?: GlobeReactionCategory;
  color?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface GlobeReactionSettings {
  user_id: string;
  notify_on_reaction: boolean;
  notify_on_suggestion: boolean;
  notify_on_message: boolean;
  allow_reactions_from: AllowReactionsFrom;
  auto_approve_suggestions: boolean;
  show_reactions_on_globe: boolean;
  show_reaction_count: boolean;
  created_at: string;
  updated_at: string;
}

export interface GlobeReactionWithDetails extends GlobeReaction {
  username?: string;
  display_name?: string;
  avatar_url?: string;
  reaction_label?: string;
  reaction_color?: string;
  album_title?: string;
}

export interface GlobeReactionStats {
  total_reactions_received: number;
  total_reactions_given: number;
  unread_count: number;
  top_reaction_type?: string;
  top_reaction_count?: number;
}

export interface CreateGlobeReactionRequest {
  target_type: GlobeReactionTargetType;
  target_album_id?: string;
  target_user_id: string;
  reaction_type: string;
  sticker_emoji?: string;
  latitude?: number;
  longitude?: number;
  location_name?: string;
  country_code?: string;
  message?: string;
  is_public?: boolean;
}

export interface UpdateGlobeReactionRequest {
  message?: string;
  is_read?: boolean;
}

// =============================================================================
// ALBUM SHARING & COLLABORATION
// =============================================================================

export type SharePermissionLevel = 'view' | 'contribute' | 'edit';

export interface AlbumShare {
  id: string;
  album_id: string;
  shared_by_user_id: string;
  shared_with_user_id?: string;
  share_token: string;
  permission_level: SharePermissionLevel;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  album?: Album;
  shared_by?: User;
  shared_with?: User;
}

export interface AlbumShareActivity {
  id: string;
  album_share_id: string;
  user_id: string;
  activity_type: 'photo_added' | 'photo_deleted' | 'comment_added' | 'like_added' | 'album_edited';
  activity_data?: Record<string, unknown>;
  created_at: string;
  // Relations
  user?: User;
  album_share?: AlbumShare;
}

export interface CreateAlbumShareRequest {
  album_id: string;
  shared_with_user_id?: string;
  shared_with_email?: string;
  permission_level: SharePermissionLevel;
  expires_at?: string;
}

export interface AlbumWithShares extends Album {
  shares?: AlbumShare[];
  share_count?: number;
  user_permission?: SharePermissionLevel;
  is_shared_with_user?: boolean;
}

export interface ShareStats {
  total_shares: number;
  active_shares: number;
  view_only: number;
  contributors: number;
  editors: number;
}

// =============================================================================
// SOCIAL FEATURES (Mentions, Hashtags, Activity Feed, Search History, 2FA)
// =============================================================================

// Mentions table - Track @username mentions in comments
export interface Mention {
  id: string;
  user_id: string;
  mentioned_user_id: string;
  comment_id: string;
  created_at: string;
  // Relations
  user?: User;
  mentioned_user?: User;
  comment?: Comment;
}

// Hashtags table - Store unique hashtags with usage tracking
export interface Hashtag {
  id: string;
  tag: string;
  usage_count: number;
  trending_rank: number | null;
  created_at: string;
  updated_at: string;
}

// Album Hashtags table - Many-to-many relationship between albums and hashtags
export interface AlbumHashtag {
  id: string;
  album_id: string;
  hashtag_id: string;
  added_by_user_id: string;
  created_at: string;
  // Relations
  album?: Album;
  hashtag?: Hashtag;
  added_by?: User;
}

// Album with hashtags
export interface AlbumWithHashtags extends Album {
  hashtags?: Hashtag[];
  album_hashtags?: AlbumHashtag[];
}

// Search History table - Track user search queries
export type SearchType = 'album' | 'hashtag' | 'user' | 'location';

export interface SearchHistory {
  id: string;
  user_id: string;
  query: string;
  search_type: SearchType;
  result_id: string | null;
  result_clicked: boolean;
  searched_at: string;
}

// Activity Feed table - Social activity stream
export type ActivityType =
  | 'album_created'
  | 'album_liked'
  | 'album_commented'
  | 'user_followed'
  | 'user_mentioned'
  | 'country_visited';

export interface ActivityFeedItem {
  id: string;
  user_id: string;
  activity_type: ActivityType;
  target_user_id: string | null;
  target_album_id: string | null;
  target_comment_id: string | null;
  metadata: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
  // Relations
  user?: User;
  target_user?: User;
  target_album?: Album;
  target_comment?: Comment;
}

// Activity feed with additional display information
export interface ActivityFeedItemWithDetails extends ActivityFeedItem {
  username?: string;
  display_name?: string;
  avatar_url?: string;
  album_title?: string;
  album_cover_photo_url?: string;
  comment_content?: string;
  country_code?: string;
  country_name?: string;
}

// Two-Factor Authentication table
export interface TwoFactorAuth {
  id: string;
  user_id: string;
  secret: string;
  is_enabled: boolean;
  backup_codes: string[];
  created_at: string;
  updated_at: string;
  last_used_at: string | null;
}

// Request/Response types for social features

export interface CreateMentionRequest {
  comment_id: string;
  mentioned_user_id: string;
}

export interface CreateHashtagRequest {
  tag: string;
}

export interface AddHashtagToAlbumRequest {
  album_id: string;
  tag: string;
}

export interface SearchHistoryRequest {
  query: string;
  search_type: SearchType;
  result_id?: string;
  result_clicked?: boolean;
}

export interface ActivityFeedResponse {
  activities: ActivityFeedItemWithDetails[];
  has_more: boolean;
  cursor?: string;
  unread_count: number;
}

export interface TwoFactorSetupRequest {
  secret: string;
  verification_code: string;
}

export interface TwoFactorVerifyRequest {
  code: string;
}

export interface TwoFactorDisableRequest {
  code?: string;
  backup_code?: string;
}

// Itineraries - User-created travel plans with AI-generated content
export interface Itinerary {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  country: string;
  region: string;
  date_start?: string;
  date_end?: string;
  travel_style?: string; // adventure, relaxation, culture, food, nature, luxury, backpacking, family
  budget?: string; // budget-friendly, moderate, luxury, ultra-luxury
  additional_details?: string;
  itinerary_content: string; // The full generated itinerary (markdown formatted)
  related_album_ids?: string[]; // Optional array of album IDs
  is_favorite: boolean;
  status: 'draft' | 'published' | 'archived';
  ai_generated: boolean;
  cache_key?: string;
  created_at: string;
  updated_at: string;
  // Relations
  user?: User;
}

export interface CreateItineraryRequest {
  title: string;
  description?: string;
  country: string;
  region: string;
  date_start?: string;
  date_end?: string;
  travel_style?: string;
  budget?: string;
  additional_details?: string;
  itinerary_content: string;
  related_album_ids?: string[];
  cache_key?: string;
}

export interface UpdateItineraryRequest {
  id: string;
  title?: string;
  description?: string;
  date_start?: string;
  date_end?: string;
  is_favorite?: boolean;
  status?: 'draft' | 'published' | 'archived';
  related_album_ids?: string[];
}