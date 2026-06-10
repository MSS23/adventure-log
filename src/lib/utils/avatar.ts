/**
 * Avatar utility functions
 */

import { getPhotoUrl } from '@/lib/utils/photo-url'

/**
 * Gets the avatar URL for a user.
 *
 * Resolves Supabase storage paths (stored in the `avatars` bucket) to full
 * public URLs and passes through existing full URLs. Returns undefined when
 * the user has no picture set, so the surrounding <Avatar> renders its
 * initials <AvatarFallback> immediately — no dependency on external avatar
 * generators that can hang and leave the avatar blank.
 *
 * @param avatarUrl - The user's custom avatar URL or storage path (may be null/undefined)
 * @returns The avatar URL to use, or undefined to show the initials fallback
 */
export function getAvatarUrl(avatarUrl: string | null | undefined, _username?: string | undefined): string | undefined {
  return getPhotoUrl(avatarUrl, 'avatars') || undefined
}
