/**
 * Avatar utility functions for generating placeholder avatars
 */

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
 * @param avatarUrl - The user's custom avatar URL (may be null/undefined)
 * @param username - The username to use for generating a fallback avatar
 * @returns The avatar URL to use
 */
export function getAvatarUrl(avatarUrl: string | null | undefined, username: string | undefined): string {
  return avatarUrl || generateAvatarUrl(username || 'user')
}
