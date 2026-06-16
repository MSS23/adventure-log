/**
 * prepare-upload — privacy-preserving preprocessing for image uploads.
 *
 * Every user-uploaded image is run through this before it touches storage.
 * Re-encoding the pixels via <canvas> (ImageOptimizer) inherently DROPS all
 * embedded metadata — including GPS/EXIF — and caps the dimensions, so no
 * hidden location data ever reaches our public storage buckets. This is what
 * makes `security.imageProcessing.stripMetadata` actually true.
 *
 * Animated GIFs are passed through untouched (canvas would flatten the
 * animation, and GIF carries no EXIF/GPS to strip). Any non-decodable file
 * throws rather than silently uploading with metadata intact — privacy first.
 */

import { ImageOptimizer } from './imageOptimization'
import { uploadSecurity } from '@/lib/config/security'
import { log } from './logger'

// Formats ImageOptimizer can re-encode. Output format is preserved so we
// don't, e.g., flatten a transparent PNG into a JPEG.
const REENCODABLE: Record<string, 'jpeg' | 'png' | 'webp'> = {
  'image/jpeg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
}

const EXT_FOR_FORMAT: Record<'jpeg' | 'png' | 'webp', string> = {
  jpeg: 'jpg',
  png: 'png',
  webp: 'webp',
}

/** Produce a clean, path-traversal-safe base filename (no extension). */
function safeBaseName(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, '')
  const cleaned = base.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '')
  return cleaned.slice(0, 64) || 'photo'
}

/**
 * Strip metadata (incl. GPS) and resize an image prior to upload.
 * Returns a NEW File with no EXIF. Non-image / GIF files are returned as-is.
 */
export async function prepareImageForUpload(file: File): Promise<File> {
  const format = REENCODABLE[file.type]

  // GIFs (and anything we can't safely re-encode) carry no GPS EXIF — pass through.
  if (!format) {
    return file
  }

  try {
    const { blob } = await ImageOptimizer.optimizeImage(file, {
      maxWidth: uploadSecurity.imageProcessing.maxWidth,
      maxHeight: uploadSecurity.imageProcessing.maxHeight,
      quality: uploadSecurity.imageProcessing.quality / 100,
      format,
    })

    const cleanName = `${safeBaseName(file.name)}.${EXT_FOR_FORMAT[format]}`
    const prepared = new File([blob], cleanName, {
      type: blob.type || file.type,
      lastModified: file.lastModified,
    })

    log.info('Image prepared for upload (metadata stripped)', {
      component: 'prepareImageForUpload',
      action: 'strip-and-resize',
      originalSize: file.size,
      preparedSize: prepared.size,
      format,
    })

    return prepared
  } catch (error) {
    // Do NOT fall back to the original file — that would upload with GPS intact.
    log.error(
      'Failed to strip metadata from image',
      { component: 'prepareImageForUpload', action: 'strip-and-resize', fileName: file.name },
      error as Error,
    )
    throw new Error(
      'We could not process this image. Please try a different photo (JPEG, PNG, or WebP).',
    )
  }
}
