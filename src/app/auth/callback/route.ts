// REDIRECT — Top-level Supabase OAuth callback. Clerk handles its own
// OAuth callbacks via the URL configured in the Clerk dashboard, so this
// path is only ever reached by stale Supabase links from the pre-Clerk
// OAuth flow. Send them to Clerk sign-in.
import { NextResponse, type NextRequest } from 'next/server'

export function GET(request: NextRequest) {
  return NextResponse.redirect(new URL('/sign-in', request.nextUrl.origin))
}
