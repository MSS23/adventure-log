import { z } from "zod";

// User validation schemas
export const userUpdateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  bio: z.string().max(500).optional(),
  location: z.string().max(100).optional(),
  website: z.string().url().optional().or(z.literal("")),
  isPublic: z.boolean().default(true),
});


// Album validation schemas
export const albumCreateSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(1000).optional(),
  country: z.string().min(1, "Country is required"),
  city: z.string().max(100).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  privacy: z.enum(["PUBLIC", "FRIENDS_ONLY", "PRIVATE"]).default("PUBLIC"),
  tags: z.array(z.string().max(50)).max(20).default([]),
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
  category: z.enum(["COUNTRIES", "ALBUMS", "PHOTOS", "SOCIAL", "STREAKS", "SPECIAL"]),
  requirement: z.number().min(1),
  requirementType: z.enum([
    "COUNTRIES_VISITED",
    "ALBUMS_CREATED", 
    "PHOTOS_UPLOADED",
    "FOLLOWERS_COUNT",
    "LIKES_RECEIVED",
    "CONSECUTIVE_MONTHS"
  ]),
  rarity: z.enum(["COMMON", "RARE", "EPIC", "LEGENDARY"]).default("COMMON"),
  points: z.number().min(1).default(10),
});

export const challengeCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(1000),
  type: z.enum([
    "COUNTRIES_IN_YEAR",
    "ALBUMS_IN_MONTH", 
    "PHOTOS_IN_ALBUM",
    "STREAK_MAINTAIN",
    "SOCIAL_ENGAGEMENT"
  ]),
  target: z.number().min(1),
  startDate: z.date(),
  endDate: z.date(),
  rewards: z.record(z.string(), z.unknown()).optional(),
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