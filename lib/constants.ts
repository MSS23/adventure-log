export const APP_NAME = "Adventure Log";
export const APP_DESCRIPTION = "A comprehensive social travel logging platform";

// File upload constants
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

// Pagination constants
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Globe constants
export const GLOBE_RADIUS = 2;
export const COUNTRY_MARKER_SIZE = 0.02;
export const ALBUM_PREVIEW_HEIGHT = 0.5;

// Badge requirements
export const BADGE_REQUIREMENTS = {
  FIRST_TRIP: 1,
  COUNTRY_EXPLORER_BRONZE: 5,
  COUNTRY_EXPLORER_SILVER: 15,
  COUNTRY_EXPLORER_GOLD: 30,
  COUNTRY_EXPLORER_PLATINUM: 50,
  PHOTO_ENTHUSIAST_BRONZE: 50,
  PHOTO_ENTHUSIAST_SILVER: 200,
  PHOTO_ENTHUSIAST_GOLD: 500,
  SOCIAL_BUTTERFLY_BRONZE: 10,
  SOCIAL_BUTTERFLY_SILVER: 50,
  SOCIAL_BUTTERFLY_GOLD: 100,
};

// Activity types for feed
export const ACTIVITY_DISPLAY_CONFIG = {
  TRIP_CREATED: { icon: "✈️", color: "blue" },
  ALBUM_CREATED: { icon: "📸", color: "green" },
  PHOTO_UPLOADED: { icon: "🎨", color: "purple" },
  USER_FOLLOWED: { icon: "👥", color: "indigo" },
  CONTENT_LIKED: { icon: "❤️", color: "red" },
  BADGE_EARNED: { icon: "🏆", color: "yellow" },
  CHALLENGE_COMPLETED: { icon: "🎯", color: "orange" },
  COUNTRY_VISITED: { icon: "🌍", color: "emerald" },
};