/**
 * Open-redirect guard for user-supplied post-auth `next` / `redirectTo` values.
 *
 * The naive check `next.startsWith('/')` is NOT sufficient: `"//evil.com"` and
 * `"/\evil.com"` both start with "/", yet `new URL(next, origin)` resolves them
 * to the EXTERNAL origin `https://evil.com` (scheme-relative URLs). A phishing
 * link like `/auth/callback?next=//evil.com` would then bounce a freshly
 * authenticated user to an attacker page that mimics the app.
 *
 * `safeInternalPath` returns the candidate only when it is a genuine in-app
 * path (single leading slash, no scheme-relative or backslash authority,
 * no embedded control chars); otherwise it returns `fallback`. Use it at every
 * site that turns a query param into a redirect.
 */
export function safeInternalPath(
  candidate: string | null | undefined,
  fallback = '/dashboard'
): string {
  if (!candidate) return fallback
  // Must be rooted at the app.
  if (!candidate.startsWith('/')) return fallback
  // Reject scheme-relative ("//host") and backslash-authority ("/\host" /
  // "/\\host") forms — browsers and `new URL()` treat these as external.
  if (candidate.startsWith('//') || candidate.startsWith('/\\') || candidate.startsWith('/%2F')) {
    return fallback
  }
  // Reject anything with a backslash or control/whitespace char that could be
  // normalized into an authority by a downstream parser.
  if (/[\\\x00-\x1f\x7f]/.test(candidate)) return fallback
  return candidate
}
