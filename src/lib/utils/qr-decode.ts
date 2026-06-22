/**
 * Pure QR-decoding utilities for the in-app passport scanner.
 *
 * Works on both Android Chrome (native `BarcodeDetector`) and iOS Safari
 * (which has NO `BarcodeDetector`, so a `jsQR` fallback is mandatory).
 */

/**
 * Minimal local shape for the native `BarcodeDetector`. The DOM lib that ships
 * with TypeScript does not declare `BarcodeDetector`, so we describe just the
 * single method we use and access the constructor through a narrow `unknown`
 * cast (no `any`, no `@ts-ignore`).
 */
interface BarcodeDetectorLike {
  detect(src: ImageData): Promise<Array<{ rawValue: string }>>
}

/**
 * Decode a QR code from raw `ImageData`.
 *
 * Prefers the native `BarcodeDetector` when available (Android Chrome). On any
 * failure — unavailable, constructor throws, detect rejects — it falls through
 * to the pure-JS `jsQR` decoder (required for iOS Safari).
 *
 * @returns the decoded string, or `null` if no QR code was found.
 */
export async function decodeQrFromImageData(
  imageData: ImageData
): Promise<string | null> {
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      const BarcodeDetectorCtor = (
        window as unknown as {
          BarcodeDetector?: new (opts: {
            formats: string[]
          }) => BarcodeDetectorLike
        }
      ).BarcodeDetector

      if (BarcodeDetectorCtor) {
        const detector = new BarcodeDetectorCtor({ formats: ['qr_code'] })
        const results = await detector.detect(imageData)
        return results.length > 0 ? results[0].rawValue : null
      }
    } catch {
      // Fall through to the jsQR fallback on ANY native-detector error.
    }
  }

  const { default: jsQR } = await import('jsqr')
  const result = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'dontInvert',
  })
  return result ? result.data : null
}

/**
 * Security-critical: validate UNTRUSTED scanned QR content before using it to
 * navigate the app, preventing open redirects and script-scheme injection.
 *
 * Accepts ONLY an Adventure Log passport URL whose path is exactly
 * `/u/<username>/passport`, where `<username>` matches `^[A-Za-z0-9_]{1,40}$`.
 * The QR may embed any origin (e.g. the production https origin) or be a bare
 * path starting with `/u/`. We parse with a placeholder base so relative paths
 * resolve, then validate the resulting pathname against the exact passport
 * shape.
 *
 * On a match, returns a SAFE, SAME-ORIGIN, RELATIVE path string with the
 * `connect=true` query always forced. Returns `null` for ANYTHING else —
 * other paths, missing/invalid usernames, `javascript:`/`data:`/other schemes,
 * or malformed input. NEVER returns an absolute URL or a different-path
 * redirect.
 */
export function extractPassportConnectPath(raw: string): string | null {
  if (typeof raw !== 'string' || raw.length === 0) {
    return null
  }

  let parsed: URL
  try {
    parsed = new URL(raw, 'https://placeholder.local')
  } catch {
    return null
  }

  // Reject non-http(s) schemes (e.g. javascript:, data:, file:). A bare path
  // input inherits the placeholder's https: protocol, so this is safe.
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return null
  }

  const match = /^\/u\/([A-Za-z0-9_]{1,40})\/passport$/.exec(parsed.pathname)
  if (!match) {
    return null
  }

  const username = match[1]
  return `/u/${username}/passport?connect=true`
}
