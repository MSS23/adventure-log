/**
 * Avatar utility functions for generating placeholder avatars
 */

import { getPhotoUrl } from '@/lib/utils/photo-url'

/**
 * Generates a DiceBear avatar URL based on username
 * Uses the "avataaars" style which provides diverse, friendly cartoon avatars
 *
 * @param username - The username to generate an avatar for
 * @param style - The DiceBear style to use (default: "avataaars")
 * @returns A URL to a DiceBear avatar image
 */
export function generateAvatarUrl(
  username: string,
  style: 'avataaars' | 'bottts' | 'personas' | 'lorelei' = 'avataaars'
): string {
  // DiceBear API v7 endpoint
  // The seed parameter ensures consistent avatars for the same username
  const seed = encodeURIComponent(username)
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}`
}

/**
 * Gets the avatar URL for a user, falling back to DiceBear if no avatar is set
 *
 * Resolves Supabase storage paths (stored in the `avatars` bucket) to full
 * public URLs, passes through existing full URLs, and falls back to a generated
 * DiceBear avatar when the user has no picture set.
 *
 * @param avatarUrl - The user's custom avatar URL or storage path (may be null/undefined)
 * @param username - The username to use for generating a fallback avatar
 * @returns The avatar URL to use
 */
export function getAvatarUrl(avatarUrl: string | null | undefined, username: string | undefined): string {
  // getPhotoUrl returns full http(s) URLs unchanged and resolves bucket-relative
  // storage paths to public URLs; returns undefined for empty/invalid input.
  const resolved = getPhotoUrl(avatarUrl, 'avatars')
  return resolved || generateAvatarUrl(username || 'user')
}
