/**
 * Input validation utilities
 * Sanitize and validate user input to prevent XSS and injection attacks
 */

import DOMPurify from 'isomorphic-dompurify'
import { z } from 'zod'

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href'],
  })
}

/**
 * Sanitize plain text (strip all HTML)
 */
export function sanitizeText(text: string): string {
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] })
}

/**
 * Validation schemas for common inputs
 */
export const schemas = {
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be less than 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),

  displayName: z
    .string()
    .min(1, 'Display name is required')
    .max(50, 'Display name must be less than 50 characters')
    .transform(sanitizeText),

  bio: z
    .string()
    .max(500, 'Bio must be less than 500 characters')
    .transform(sanitizeText)
    .optional(),

  albumTitle: z
    .string()
    .min(1, 'Album title is required')
    .max(100, 'Album title must be less than 100 characters')
    .transform(sanitizeText),

  albumDescription: z
    .string()
    .max(1000, 'Description must be less than 1000 characters')
    .transform(sanitizeText)
    .optional(),

  location: z
    .string()
    .min(1, 'Location is required')
    .max(200, 'Location must be less than 200 characters')
    .transform(sanitizeText),

  commentText: z
    .string()
    .min(1, 'Comment cannot be empty')
    .max(500, 'Comment must be less than 500 characters')
    .transform(sanitizeText),

  url: z.string().url('Invalid URL').max(2048, 'URL too long'),

  email: z.string().email('Invalid email address'),

  latitude: z.number().min(-90).max(90),

  longitude: z.number().min(-180).max(180),
}

/**
 * Validate file upload
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic']

  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'File size must be less than 10MB' }
  }

  if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
    return { valid: false, error: 'Only JPEG, PNG, WebP, and HEIC images are allowed' }
  }

  return { valid: true }
}

/**
 * Rate limiting helper
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map()

  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}

  isAllowed(key: string): boolean {
    const now = Date.now()
    const timestamps = this.requests.get(key) || []

    // Remove old timestamps outside the window
    const validTimestamps = timestamps.filter(ts => now - ts < this.windowMs)

    if (validTimestamps.length >= this.maxRequests) {
      return false
    }

    validTimestamps.push(now)
    this.requests.set(key, validTimestamps)
    return true
  }

  reset(key: string): void {
    this.requests.delete(key)
  }
}
