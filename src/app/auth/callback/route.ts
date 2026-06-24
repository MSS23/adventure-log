// Supabase auth callback. Email-confirmation and OAuth/PKCE links land here
// with a `code` in the URL; we exchange it for a session cookie and then
// continue to a safe internal `next` path (default /dashboard). On any failure
// we bounce to /login so the user always has a recoverable entry point.
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { safeInternalPath } from '@/lib/utils/safe-redirect'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Guard against open-redirect: "//evil.com" / "/\evil.com" pass a naive
  // startsWith('/') check but resolve to an external origin.
  const next = safeInternalPath(searchParams.get('next'), '/dashboard')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(new URL(next, origin))
    }
  }

  return NextResponse.redirect(new URL('/login?error=auth', origin))
}
