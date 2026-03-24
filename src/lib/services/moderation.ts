import { log } from '@/lib/utils/logger'

export interface ModerationResult {
  safe: boolean
  reason?: string
  confidence: number
  flags: string[]
}

const BLOCKED_MIME_TYPES = [
  'application/x-executable',
  'application/x-sharedlib',
  'application/x-dosexec',
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif']

/**
 * Client-side image moderation before upload.
 *
 * Performs validation checks:
 * 1. File type/extension validation
 * 2. File size limits
 * 3. Image dimensions (prevents oversized images)
 * 4. Basic file header (magic bytes) verification
 *
 * For production NSFW detection, integrate with:
 * - Google Cloud Vision SafeSearch
 * - AWS Rekognition
 * - Azure Content Moderator
 * by adding MODERATION_API_KEY env var and calling the API route.
 */
export async function moderateImage(file: File): Promise<ModerationResult> {
  const flags: string[] = []

  // 1. File type check
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      safe: false,
      reason: `File type "${file.type}" is not allowed. Use JPEG, PNG, WebP, or GIF.`,
      confidence: 1.0,
      flags: ['invalid_type'],
    }
  }

  if (BLOCKED_MIME_TYPES.includes(file.type)) {
    return {
      safe: false,
      reason: 'This file type is not allowed.',
      confidence: 1.0,
      flags: ['blocked_type'],
    }
  }

  // 2. Extension check
  const ext = '.' + file.name.split('.').pop()?.toLowerCase()
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      safe: false,
      reason: `File extension "${ext}" is not allowed.`,
      confidence: 1.0,
      flags: ['invalid_extension'],
    }
  }

  // 3. Size check
  if (file.size > MAX_FILE_SIZE) {
    return {
      safe: false,
      reason: `File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum is 10MB.`,
      confidence: 1.0,
      flags: ['too_large'],
    }
  }

  if (file.size < 100) {
    return {
      safe: false,
      reason: 'File appears to be empty or corrupted.',
      confidence: 1.0,
      flags: ['too_small'],
    }
  }

  // 4. Magic bytes verification
  try {
    const headerValid = await verifyImageHeader(file)
    if (!headerValid) {
      flags.push('suspicious_header')
      return {
        safe: false,
        reason: 'File contents do not match its type. It may be corrupted or disguised.',
        confidence: 0.9,
        flags,
      }
    }
  } catch {
    flags.push('header_check_failed')
  }

  // 5. Dimension check (prevent absurdly large images)
  try {
    const dimensions = await getImageDimensions(file)
    if (dimensions.width > 10000 || dimensions.height > 10000) {
      return {
        safe: false,
        reason: `Image dimensions too large (${dimensions.width}x${dimensions.height}). Maximum is 10000x10000.`,
        confidence: 1.0,
        flags: ['oversized_dimensions'],
      }
    }
    if (dimensions.width < 10 || dimensions.height < 10) {
      flags.push('tiny_image')
    }
  } catch {
    flags.push('dimension_check_failed')
  }

  // 6. Filename sanitization check
  const safeFilename = /^[a-zA-Z0-9._\-\s()]+$/
  if (!safeFilename.test(file.name)) {
    flags.push('suspicious_filename')
  }

  return {
    safe: true,
    confidence: flags.length === 0 ? 1.0 : 0.8,
    flags,
  }
}

/**
 * Server-side moderation via external API (optional).
 * Set MODERATION_API_KEY and MODERATION_PROVIDER env vars to enable.
 */
export async function moderateImageServer(imageUrl: string): Promise<ModerationResult> {
  const apiKey = process.env.MODERATION_API_KEY
  const provider = process.env.MODERATION_PROVIDER || 'none'

  if (!apiKey || provider === 'none') {
    // No server moderation configured - pass through
    return { safe: true, confidence: 0.5, flags: ['no_server_moderation'] }
  }

  try {
    if (provider === 'google-vision') {
      return await moderateWithGoogleVision(imageUrl, apiKey)
    }

    log.warn('Unknown moderation provider', { component: 'Moderation', provider })
    return { safe: true, confidence: 0.5, flags: ['unknown_provider'] }
  } catch (err) {
    log.error('Server moderation failed', { component: 'Moderation', provider }, err as Error)
    // Fail open - don't block uploads if moderation service is down
    return { safe: true, confidence: 0.3, flags: ['moderation_error'] }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function verifyImageHeader(file: File): Promise<boolean> {
  const buffer = await file.slice(0, 12).arrayBuffer()
  const bytes = new Uint8Array(buffer)

  // JPEG: starts with FF D8 FF
  if (file.type === 'image/jpeg') {
    return bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF
  }

  // PNG: starts with 89 50 4E 47
  if (file.type === 'image/png') {
    return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47
  }

  // WebP: starts with RIFF....WEBP
  if (file.type === 'image/webp') {
    return bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
      && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  }

  // GIF: starts with GIF87a or GIF89a
  if (file.type === 'image/gif') {
    return bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46
  }

  return false
}

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }
    img.src = url
  })
}

async function moderateWithGoogleVision(imageUrl: string, apiKey: string): Promise<ModerationResult> {
  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { source: { imageUri: imageUrl } },
          features: [{ type: 'SAFE_SEARCH_DETECTION' }],
        }],
      }),
    }
  )

  if (!response.ok) {
    throw new Error(`Google Vision API error: ${response.status}`)
  }

  const data = await response.json()
  const safeSearch = data.responses?.[0]?.safeSearchAnnotation

  if (!safeSearch) {
    return { safe: true, confidence: 0.5, flags: ['no_safesearch_data'] }
  }

  const flags: string[] = []
  const highRiskLevels = ['LIKELY', 'VERY_LIKELY']

  if (highRiskLevels.includes(safeSearch.adult)) flags.push('adult')
  if (highRiskLevels.includes(safeSearch.violence)) flags.push('violence')
  if (highRiskLevels.includes(safeSearch.racy)) flags.push('racy')

  const safe = flags.length === 0
  return {
    safe,
    reason: safe ? undefined : `Content flagged: ${flags.join(', ')}`,
    confidence: 0.95,
    flags,
  }
}
