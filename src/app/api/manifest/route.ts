import { NextResponse } from 'next/server'

/**
 * Legacy endpoint. The canonical PWA manifest now lives at the static
 * `/manifest.json` (the single source of truth that also survives the
 * mobile `output: 'export'` build, which strips all /api/* route handlers).
 *
 * This route permanently (308) redirects any traffic still hitting
 * `/api/manifest` to `/manifest.json` for backward compatibility. 308
 * preserves the request method and signals callers to update their URL.
 */
export async function GET(request: Request) {
  return NextResponse.redirect(new URL('/manifest.json', request.url), 308)
}
