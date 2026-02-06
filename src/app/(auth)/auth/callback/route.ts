import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { log } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as 'email' | 'recovery' | 'invite' | 'email_change' | null
  const next = searchParams.get('next') ?? '/setup'

  log.info('Auth callback received', { type, hasToken: !!token_hash })

  // Base URL for redirects
  const baseUrl = request.nextUrl.origin

  // Handle missing token
  if (!token_hash) {
    log.warn('Auth callback missing token_hash')
    const redirectUrl = new URL('/login', baseUrl)
    redirectUrl.searchParams.set('error', 'no_code')
    redirectUrl.searchParams.set('message', 'Invalid verification link. Please check your email for the correct link.')
    return NextResponse.redirect(redirectUrl)
  }

  // Handle missing type
  if (!type) {
    log.warn('Auth callback missing type')
    const redirectUrl = new URL('/login', baseUrl)
    redirectUrl.searchParams.set('error', 'no_code')
    redirectUrl.searchParams.set('message', 'Invalid verification link. Please check your email for the correct link.')
    return NextResponse.redirect(redirectUrl)
  }

  try {
    const supabase = await createClient()

    // Exchange the token for a session
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash,
      type,
    })

    if (error) {
      log.error('Auth verification failed', { error: error.message, type })

      const redirectUrl = new URL('/login', baseUrl)
      redirectUrl.searchParams.set('error', 'verification_failed')

      // Provide user-friendly error messages
      if (error.message.includes('expired') || error.message.includes('Token has expired')) {
        redirectUrl.searchParams.set('message', 'Verification link has expired. Please request a new one.')
      } else if (error.message.includes('invalid') || error.message.includes('Invalid')) {
        redirectUrl.searchParams.set('message', 'Invalid verification link. Please request a new one.')
      } else {
        redirectUrl.searchParams.set('message', 'Verification failed. Please try again.')
      }

      return NextResponse.redirect(redirectUrl)
    }

    log.info('Auth verification successful', { type, userId: data.user?.id })

    // Handle different verification types
    switch (type) {
      case 'email':
        // Email verification for new signup
        // Check if user has a profile already
        if (data.user) {
          const { data: profile } = await supabase
            .from('users')
            .select('id, username')
            .eq('id', data.user.id)
            .single()

          if (profile?.username) {
            // User already has a profile, go to feed
            return NextResponse.redirect(new URL('/feed', baseUrl))
          }
        }
        // New user, go to setup
        return NextResponse.redirect(new URL('/setup', baseUrl))

      case 'recovery':
        // Password recovery - redirect to reset password page
        return NextResponse.redirect(new URL('/reset-password', baseUrl))

      case 'email_change':
        // Email change confirmation - redirect to profile with success message
        const profileUrl = new URL('/profile', baseUrl)
        profileUrl.searchParams.set('message', 'email_updated')
        return NextResponse.redirect(profileUrl)

      case 'invite':
        // Invitation - redirect to setup
        return NextResponse.redirect(new URL('/setup', baseUrl))

      default:
        // Default redirect
        return NextResponse.redirect(new URL(next, baseUrl))
    }
  } catch (error) {
    log.error('Auth callback error', { error })

    const redirectUrl = new URL('/login', baseUrl)
    redirectUrl.searchParams.set('error', 'verification_failed')
    redirectUrl.searchParams.set('message', 'An unexpected error occurred. Please try again.')
    return NextResponse.redirect(redirectUrl)
  }
}
