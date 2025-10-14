import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Auth callback route for handling email verification
 * This route is called when users click the verification link in their email
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/setup'

  if (code) {
    const supabase = await createClient()

    // Exchange the code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Successful verification - redirect to setup page
      return NextResponse.redirect(new URL(next, request.url))
    }

    // If there's an error, redirect to login with error message
    return NextResponse.redirect(
      new URL(`/login?error=verification_failed&message=${encodeURIComponent(error.message)}`, request.url)
    )
  }

  // No code provided - redirect to login
  return NextResponse.redirect(new URL('/login?error=no_code', request.url))
}
