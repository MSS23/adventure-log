import { z } from "zod";

// User validation schemas
export const userUpdateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  bio: z.string().max(500).optional(),
  location: z.string().max(100).optional(),
  website: z.string().url().optional().or(z.literal("")),
  isPublic: z.boolean().default(true),
});

export const userSignupSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(100),
    email: z.string().email("Invalid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one lowercase letter, one uppercase letter, and one number"
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const userSigninSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// Album validation schemas
export const albumCreateSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(1000).optional(),
  country: z.string().min(1, "Country is required"),
  city: z.string().max(100).optional(),
  latitude: z.number().min(-90).max(90).default(0),
  longitude: z.number().min(-180).max(180).default(0),
  date: z.string().datetime().or(z.date()).optional(),
  privacy: z.enum(["PUBLIC", "FRIENDS_ONLY", "PRIVATE"]).default("PUBLIC"),
  shareLocation: z.boolean().default(false),
  tags: z.array(z.string().max(50)).max(20).default([]),
  visitDuration: z.string().max(100).optional(),
  weather: z.string().max(200).optional(),
  companions: z.string().max(300).optional(),
});

export const albumUpdateSchema = albumCreateSchema.partial();

// Photo validation schemas
export const photoUploadSchema = z.object({
  caption: z.string().max(500).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

// Comment validation schemas
export const commentCreateSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty").max(1000),
  targetType: z.enum(["Album", "AlbumPhoto"]),
  targetId: z.string().cuid(),
  parentId: z.string().cuid().optional(),
});

// Search validation schema
export const searchSchema = z.object({
  query: z.string().min(1).max(100),
  type: z.enum(["all", "users", "albums"]).default("all"),
  limit: z.number().min(1).max(50).default(20),
  page: z.number().min(1).default(1),
});

// Badge and challenge schemas
export const badgeCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  icon: z.string().min(1).max(100),
  category: z.enum([
    "COUNTRIES",
    "ALBUMS",
    "PHOTOS",
    "SOCIAL",
    "STREAKS",
    "SPECIAL",
  ]),
  requirement: z.number().min(1),
  requirementType: z.enum([
    "COUNTRIES_VISITED",
    "ALBUMS_CREATED",
    "PHOTOS_UPLOADED",
    "FOLLOWERS_COUNT",
    "LIKES_RECEIVED",
    "CONSECUTIVE_MONTHS",
  ]),
  rarity: z.enum(["COMMON", "RARE", "EPIC", "LEGENDARY"]).default("COMMON"),
  points: z.number().min(1).default(10),
});

export const challengeCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(1000),
  type: z.enum([
    "COUNTRIES_IN_YEAR",
    "TRIPS_IN_MONTH",
    "PHOTOS_IN_TRIP",
    "STREAK_MAINTAIN",
    "SOCIAL_ENGAGEMENT",
  ]),
  target: z.number().min(1),
  startDate: z.date(),
  endDate: z.date(),
  rewards: z.record(z.string(), z.unknown()).optional(),
});

export const challengeJoinSchema = z.object({
  challengeId: z.string().cuid(),
  action: z.enum(["join_active", "join_specific"]).optional(),
});

// Pagination schema
export const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

// File upload schema
export const fileUploadSchema = z.object({
  file: z.instanceof(File),
  type: z.enum(["avatar", "banner", "album"]),
});

// Social interaction schemas
export const likeToggleSchema = z.object({
  targetType: z.enum(["Album", "AlbumPhoto"]),
  targetId: z.string().cuid(),
});

export const followToggleSchema = z.object({
  targetUserId: z.string().cuid(),
});

export const friendRequestSchema = z.object({
  receiverId: z.string().cuid(),
  action: z.enum(["send", "accept", "decline", "cancel"]),
});

// Notification schemas
export const notificationUpdateSchema = z.object({
  notificationIds: z.array(z.string().cuid()),
  markAsRead: z.boolean().default(true),
});

// Admin schemas (for Phase 9.2)
export const imageModerateSchema = z.object({
  photoId: z.string().cuid(),
  action: z.enum(["approve", "reject", "flag"]),
  reason: z.string().max(500).optional(),
});

// Activity feed schemas
export const activityFeedSchema = z.object({
  type: z.enum(["personal", "following", "discover"]).default("following"),
  limit: z.number().min(1).max(50).default(20),
  cursor: z.string().optional(), // For cursor-based pagination
});

// Export data schemas (for Phase 12.3 - GDPR)
export const exportRequestSchema = z.object({
  format: z.enum(["json", "csv"]).default("json"),
  includePhotos: z.boolean().default(false),
});

export const accountDeletionSchema = z.object({
  password: z.string().min(1, "Password confirmation required"),
  reason: z.string().max(500).optional(),
  confirmDeletion: z.boolean().refine((val) => val === true, {
    message: "You must confirm account deletion",
  }),
});

// Rate limiting schemas
export const rateLimitSchema = z.object({
  identifier: z.string().min(1),
  limit: z.number().min(1).max(1000),
  windowMs: z.number().min(1000).max(3600000), // 1 second to 1 hour
});

// Import/export type inference helpers
export type UserUpdate = z.infer<typeof userUpdateSchema>;
export type UserSignup = z.infer<typeof userSignupSchema>;
export type UserSignin = z.infer<typeof userSigninSchema>;
export type AlbumCreate = z.infer<typeof albumCreateSchema>;
export type AlbumUpdate = z.infer<typeof albumUpdateSchema>;
export type PhotoUpload = z.infer<typeof photoUploadSchema>;
export type CommentCreate = z.infer<typeof commentCreateSchema>;
export type LikeToggle = z.infer<typeof likeToggleSchema>;
export type FollowToggle = z.infer<typeof followToggleSchema>;
export type FriendRequest = z.infer<typeof friendRequestSchema>;
export type Search = z.infer<typeof searchSchema>;
export type Pagination = z.infer<typeof paginationSchema>;
export type BadgeCreate = z.infer<typeof badgeCreateSchema>;
export type ChallengeCreate = z.infer<typeof challengeCreateSchema>;
export type ChallengeJoin = z.infer<typeof challengeJoinSchema>;
export type ActivityFeed = z.infer<typeof activityFeedSchema>;
export type ExportRequest = z.infer<typeof exportRequestSchema>;
export type AccountDeletion = z.infer<typeof accountDeletionSchema>;
