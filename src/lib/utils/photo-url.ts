import { createClient } from '@/lib/supabase/client'
import { log } from '@/lib/utils/logger'
import { isNativePlatform, getApiBaseUrl } from '@/lib/api/client'

/**
 * Widths the deployed `/_next/image` optimizer accepts (next.config.ts
 * deviceSizes + imageSizes). Requesting any other width is a 400, so native
 * requests are snapped up to the nearest allowed size.
 */
const OPTIMIZER_WIDTHS = [16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200]

/**
 * On the Capacitor app, `next/image` runs with `unoptimized: true` (static
 * export has no optimizer), so every photo would otherwise download as the
 * full stored original (up to 4096px). Route Supabase storage URLs through
 * the deployed web app's `/_next/image` endpoint instead, which serves a
 * cached, resized WebP derivative. Web builds return the URL unchanged —
 * `next/image` already optimizes there.
 */
function toNativeOptimizedUrl(url: string, displayWidth: number): string {
  if (!isNativePlatform()) return url
  const base = getApiBaseUrl()
  if (!base) return url
  // Only storage objects are guaranteed to pass the optimizer's remotePatterns
  // allowlist; leave other absolute URLs (external avatars, etc.) untouched.
  if (!url.includes('/storage/v1/object/public/')) return url
  const width = OPTIMIZER_WIDTHS.find((w) => w >= displayWidth) ?? 1200
  return `${base}/_next/image?url=${encodeURIComponent(url)}&w=${width}&q=75`
}

/**
 * Converts a file path to a full Supabase storage URL
 * @param filePath - The file path stored in the database (e.g., "user-id/album-id/photo.jpg")
 * @param bucket - The storage bucket name (default: "photos")
 * @param displayWidth - Largest CSS-pixel width the image renders at; on the
 *   native app this picks the optimized derivative size (ignored on web)
 * @returns The full public URL for the photo
 */
export function getPhotoUrl(filePath: string | null | undefined, bucket: string = 'photos', displayWidth: number = 1200): string | undefined {
  // Early returns for invalid inputs
  if (!filePath) return undefined
  if (typeof filePath !== 'string') return undefined
  if (filePath.trim() === '') return undefined

  // Check if filePath is already a full URL
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    try {
      new URL(filePath)
      return toNativeOptimizedUrl(filePath, displayWidth)
    } catch {
      log.warn('[getPhotoUrl] Invalid full URL provided', { component: 'PhotoUrl', action: 'validate-url', filePath })
      return undefined
    }
  }

  try {
    const supabase = createClient()
    if (!supabase) {
      log.warn('Supabase client not initialized', { component: 'PhotoUrl', action: 'get-photo-url' })
      return undefined
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath)

    // Validate that we got a proper URL
    if (!data?.publicUrl) {
      log.warn('[getPhotoUrl] No public URL returned for file path', { component: 'PhotoUrl', action: 'get-public-url', filePath })
      return undefined
    }

    // Ensure the URL is valid before returning
    try {
      new URL(data.publicUrl)

      // Double-check the URL starts with http/https
      if (!data.publicUrl.startsWith('http://') && !data.publicUrl.startsWith('https://')) {
        log.warn('[getPhotoUrl] Public URL does not start with http(s)', { component: 'PhotoUrl', action: 'validate-public-url', publicUrl: data.publicUrl })
        return undefined
      }

      // Final safety check: ensure we're not returning a relative path
      if (data.publicUrl === filePath || !data.publicUrl.includes('://')) {
        log.warn('[getPhotoUrl] Refusing to return relative path', { component: 'PhotoUrl', action: 'validate-public-url', publicUrl: data.publicUrl })
        return undefined
      }

      return toNativeOptimizedUrl(data.publicUrl, displayWidth)
    } catch {
      // If URL construction fails, return undefined
      log.warn('[getPhotoUrl] Invalid URL generated', { component: 'PhotoUrl', action: 'validate-generated-url', publicUrl: data.publicUrl })
      return undefined
    }
  } catch (error) {
    log.error('Error getting photo URL for path', { component: 'PhotoUrl', action: 'get-photo-url', filePath }, error as Error)
    return undefined
  }
}

/**
 * Converts multiple file paths to full Supabase storage URLs
 * @param filePaths - Array of file paths
 * @param bucket - The storage bucket name (default: "photos")
 * @returns Array of full public URLs
 */
export function getPhotoUrls(filePaths: (string | null | undefined)[], bucket: string = 'photos'): string[] {
  return filePaths.map(path => getPhotoUrl(path, bucket)).filter(Boolean) as string[]
}
