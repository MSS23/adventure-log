import { Prisma } from "@prisma/client";

// User with relations
export type UserWithRelations = Prisma.UserGetPayload<{
  include: {
    albums: true;
    badges: {
      include: {
        badge: true;
      };
    };
    followers: true;
    following: true;
  };
}>;


// Album with relations
export type AlbumWithRelations = Prisma.AlbumGetPayload<{
  include: {
    user: true;
    photos: true;
    coverPhoto: true;
    likes: true;
    comments: {
      include: {
        user: true;
      };
    };
    favorites: true;
  };
}>;

// Photo types
export type AlbumPhotoWithRelations = Prisma.AlbumPhotoGetPayload<{
  include: {
    album: true;
    likes: true;
    comments: {
      include: {
        user: true;
      };
    };
  };
}>;


// Activity with relations
export type ActivityWithRelations = Prisma.ActivityGetPayload<{
  include: {
    user: true;
  };
}>;

// Badge types
export type BadgeWithProgress = Prisma.UserBadgeGetPayload<{
  include: {
    badge: true;
  };
}>;

// Challenge types
export type ChallengeWithProgress = Prisma.UserChallengeGetPayload<{
  include: {
    challenge: true;
  };
}>;

// Globe data types
export interface CountryData {
  code: string;
  name: string;
  coordinates: [number, number];
  albumCount: number;
  lastVisited?: Date;
}

export interface GlobeAlbum {
  id: string;
  title: string;
  country: string;
  coordinates: [number, number];
  coverPhoto?: string;
  photoCount: number;
  createdAt: Date;
}

export interface GlobeProps {
  userId?: string;
  countries: CountryData[];
  albums: GlobeAlbum[];
  selectedCountry?: string;
  onCountrySelect?: (country: string) => void;
  onAlbumSelect?: (albumId: string) => void;
}

// Form types

export interface AlbumFormData {
  title: string;
  description?: string;
  country: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  privacy: "PUBLIC" | "FRIENDS_ONLY" | "PRIVATE";
  tags: string[];
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Upload types
export interface UploadResponse {
  url: string;
  key: string;
  size: number;
  type: string;
}

// Search types
export interface SearchResult {
  users: UserWithRelations[];
  albums: AlbumWithRelations[];
}

// Notification types
export interface NotificationWithData extends Prisma.NotificationGetPayload<{
  include: {
    user: true;
  };
}> {
  actionUser?: {
    id: string;
    name: string;
    image: string;
  };
}