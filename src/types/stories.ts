/**
 * TypeScript interfaces for Stories and related entities
 * Compatible with database schema in 2025-09-28_stories_albums_privacy.sql
 *
 * NOTE: For Album and AlbumPhoto types, use @/types/database as the canonical source.
 * This file re-exports those types for backward compatibility.
 */

import type { Album as DatabaseAlbum, AlbumPhoto as DatabaseAlbumPhoto } from './database';

export type PrivacyLevel = 'public' | 'friends' | 'private';
export type FriendshipStatus = 'accepted' | 'pending' | 'blocked';

// Re-export Album types from canonical source (database.ts)
// These are type aliases, not duplicate interfaces
export type Album = DatabaseAlbum;
export type AlbumPhoto = DatabaseAlbumPhoto;

// Friendship relationships
export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
  updated_at: string;
  // Relations
  requester?: {
    id: string;
    username?: string;
    display_name?: string;
    avatar_url?: string;
  };
  addressee?: {
    id: string;
    username?: string;
    display_name?: string;
    avatar_url?: string;
  };
}

// Stories with 24h expiry and country guessing
export interface Story {
  id: string;
  user_id: string;
  album_id: string;
  image_url: string;
  country_code: string; // ISO-3166-1 alpha-2
  privacy_snapshot: PrivacyLevel; // Frozen privacy level at creation
  expires_at: string;
  created_at: string;
  // Relations
  album?: Pick<Album, 'id' | 'title' | 'location_country'>;
  user?: {
    id: string;
    username?: string;
    display_name?: string;
    avatar_url?: string;
  };
}

// Story guesses (one per user per story)
export interface StoryGuess {
  story_id: string;
  user_id: string;
  guess_code: string; // ISO-3166-1 alpha-2
  created_at: string;
  // Relations
  user?: {
    id: string;
    username?: string;
    display_name?: string;
    avatar_url?: string;
  };
}

// Story statistics aggregated view
export interface StoryStats {
  story_id: string;
  story_owner_id: string;
  correct_answer: string;
  total_guesses: number;
  correct_guesses: number;
  correct_percentage: number;
  top_guesses: Array<{
    country_code: string;
    count: number;
  }>;
  has_guessed: boolean; // For current user
}

// Story with extended information for display
export interface StoryWithStats extends Story {
  stats?: StoryStats;
  user_guess?: StoryGuess;
  is_expired: boolean;
  is_owner: boolean;
  can_view: boolean;
  can_guess: boolean;
  media_type: 'photo' | 'video';
  posted_at: string;
  view_count: number;
  total_guesses?: number;
  correct_percentage?: number;
  top_guesses?: Array<{
    country_code: string;
    count: number;
  }>;
}

// Story feed item for the story tray
export interface StoryFeedItem {
  id: string;
  user_id: string;
  album_id: string;
  image_url: string;
  media_url: string;
  country_code: string;
  expires_at: string;
  created_at: string;
  stats: StoryStats;
  user: {
    id: string;
    username?: string;
    display_name?: string;
    avatar_url?: string;
  };
  has_viewed?: boolean;
  is_owner: boolean;
  can_guess: boolean;
  is_expired: boolean;
  user_guess?: StoryGuess;
  album?: Pick<Album, 'id' | 'title' | 'location_country'>;
}

// DTO interfaces for API requests/responses

export interface CreateAlbumRequest {
  title: string;
  caption?: string;
  privacy: PrivacyLevel;
  country_code?: string;
}

export interface UpdateAlbumRequest {
  id: string;
  title?: string;
  caption?: string;
  privacy?: PrivacyLevel;
  country_code?: string;
  cover_image_url?: string;
}

export interface AddPhotosRequest {
  album_id: string;
  files: File[];
}

export interface CreateStoryRequest {
  album_id: string;
  image_url?: string; // If not provided, uses album cover
  media_url?: string; // Alias for image_url
}

export interface GuessStoryRequest {
  story_id: string;
  guess_code: string;
  guessed_country?: string; // Legacy alias
}

export interface StoryFeedResponse {
  stories: StoryFeedItem[];
  cursor?: string;
  has_more: boolean;
}

export interface AlbumListResponse {
  albums: Album[];
  cursor?: string;
  has_more: boolean;
}

// Friend-related interfaces
export interface SendFriendRequestRequest {
  addressee_id: string;
}

export interface UpdateFriendshipRequest {
  friendship_id: string;
  status: FriendshipStatus;
}

export interface FriendshipListResponse {
  friendships: Friendship[];
  cursor?: string;
  has_more: boolean;
}

// Story viewer state management
export interface StoryViewerState {
  currentStoryIndex: number;
  stories: StoryWithStats[];
  isLoading: boolean;
  hasSubmittedGuess: boolean;
  selectedCountryCode?: string;
  showResults: boolean;
  error?: string;
}

export type StoryViewerAction =
  | { type: 'LOAD_STORIES'; payload: StoryWithStats[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'NEXT_STORY' }
  | { type: 'PREVIOUS_STORY' }
  | { type: 'SET_STORY_INDEX'; payload: number }
  | { type: 'SET_COUNTRY_GUESS'; payload: string }
  | { type: 'SUBMIT_GUESS_START' }
  | { type: 'SUBMIT_GUESS_SUCCESS' }
  | { type: 'SUBMIT_GUESS_ERROR'; payload: string }
  | { type: 'SHOW_RESULTS' }
  | { type: 'RESET' };

// Helper types for component props
export interface CountrySearchProps {
  value?: string;
  onChange: (countryCode: string | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
}

export interface PrivacySelectorProps {
  value: PrivacyLevel;
  onChange: (privacy: PrivacyLevel) => void;
  disabled?: boolean;
  showTooltips?: boolean;
}

export interface StoryViewerProps {
  stories: StoryWithStats[];
  initialIndex?: number;
  onClose: () => void;
  onStoryGuess?: (storyId: string, guess: string) => Promise<void>;
}

// Error types for better error handling
export interface StoriesError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export class StoriesApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'StoriesApiError';
  }
}

// Utility types
export type StoryId = string;
export type AlbumId = string;
export type UserId = string;
export type CountryCode = string;

// Validation schemas would be defined separately using Zod
// but these interfaces provide the TypeScript contract