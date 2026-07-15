/**
 * Feature flags for functionality that depends on server-side services not
 * yet configured in production. Flip a flag to true once its dependency is
 * live — the UI shows a disabled "Coming soon" state while false.
 *
 * These are build-time constants (not env-driven) because the mobile bundle
 * is a static export that can't ask the server which keys it has.
 */
export const features = {
  /**
   * AI place extraction from pasted links (wishlist "Save a place from a
   * link" → /api/wishlist/extract). Requires ANTHROPIC_API_KEY in Vercel.
   * Manual place search does not depend on this and stays enabled.
   */
  // The endpoint already degrades safely: Google Maps works without AI and
  // TikTok opens the review/search fallback when ANTHROPIC_API_KEY is absent.
  aiLinkExtract: true,
} as const
