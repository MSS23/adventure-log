/**
 * HTML escape utility to prevent XSS attacks
 *
 * Used by EnhancedGlobe to sanitize user data (city names, photo URLs, counts)
 * before insertion into innerHTML templates.
 */

/**
 * Escapes HTML special characters to prevent XSS (browser version)
 * @param text - Text that may contain HTML special characters
 * @returns Escaped text safe for insertion into HTML
 */
export function escapeHtml(text: string | undefined | null): string {
  if (!text) return ''

  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

/**
 * Escapes HTML special characters to prevent XSS (server-safe version)
 * This version uses string replacement and works in Node.js environments
 * @param text - Text that may contain HTML special characters
 * @returns Escaped text safe for insertion into HTML
 */
export function escapeHtmlServer(text: string | undefined | null): string {
  if (!text) return ''

  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Escapes HTML attributes to prevent XSS in attribute values
 * @param attr - Attribute value that may contain special characters
 * @returns Escaped attribute value
 */
export function escapeAttr(attr: string | undefined | null): string {
  if (!attr) return ''

  return String(attr)
    .replace(/&/g, '&amp;')
    .replace(/'/g, '&#39;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * Returns the URL only if it's a safe image source (http, https, data:image, blob:).
 * Strips javascript:, vbscript:, data:text/html, and any other scheme that
 * could execute when used as `src`/`href`. Always combine with `escapeAttr`
 * before injecting into HTML.
 */
export function safeImageUrl(url: string | undefined | null): string {
  if (!url) return ''
  const trimmed = String(url).trim()
  const lower = trimmed.toLowerCase()
  if (
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower.startsWith('blob:') ||
    lower.startsWith('data:image/') ||
    lower.startsWith('/')
  ) {
    return trimmed
  }
  // Reject anything else (javascript:, vbscript:, file:, data:text/html, …)
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return ''
  // Treat unscoped strings as relative paths.
  return trimmed
}
