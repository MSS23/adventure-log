/**
 * Client-side upload helper.
 *
 * Uploads go through a server gatekeeper: we POST to /api/photos/upload-url to
 * get a short-lived signed URL (auth + rate limit + album-ownership checks),
 * then upload the bytes straight to Supabase Storage with that token. If the
 * gatekeeper is unreachable (offline/native misconfig), we fall back to a
 * direct authenticated upload so the feature still works.
 *
 * Returns the storage `path` (= photo.file_path) on success.
 */

import { createClient } from '@/lib/supabase/client'
import { apiFetch } from '@/lib/api/client'
import { log } from '@/lib/utils/logger'

interface SignedUpload {
  path: string
  token: string
  moderationEnabled: boolean
}

async function requestSignedUpload(albumId: string, contentType: string): Promise<SignedUpload | null> {
  try {
    const res = await apiFetch('/api/photos/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ albumId, contentType }),
    })
    if (!res.ok) {
      // 401/404/429/400 are real rejections — surface them, don't silently fall back.
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || `Upload not permitted (${res.status})`)
    }
    return (await res.json()) as SignedUpload
  } catch (err) {
    // Network/route-unreachable → allow caller to fall back to direct upload.
    log.warn('Signed upload URL unavailable, will try direct upload', {
      component: 'api/upload',
      action: 'request-signed',
      error: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

/**
 * Upload a prepared image to the `photos` bucket.
 * @param albumId   target album (ownership enforced server-side)
 * @param file      the already-stripped/resized File (see prepareImageForUpload)
 * @param fallbackPath  storage key to use if the gatekeeper is unreachable
 */
export async function uploadPhotoFile(
  albumId: string,
  file: File,
  fallbackPath: string,
): Promise<string> {
  const supabase = createClient()
  const signed = await requestSignedUpload(albumId, file.type)

  if (signed) {
    const { error } = await supabase.storage
      .from('photos')
      .uploadToSignedUrl(signed.path, signed.token, file)
    if (error) throw error

    if (signed.moderationEnabled) {
      const res = await apiFetch('/api/photos/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: signed.path }),
      })
      if (res.status === 422) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.reason || 'This image was flagged by content moderation.')
      }
    }
    return signed.path
  }

  // Fallback: direct authenticated upload (RLS still applies).
  const { error } = await supabase.storage
    .from('photos')
    .upload(fallbackPath, file, { cacheControl: '3600', upsert: false })
  if (error) throw error
  return fallbackPath
}
