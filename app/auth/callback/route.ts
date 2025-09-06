import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * OAuth Callback Handler for Supabase Authentication
 * 
 * This route handles the OAuth callback from Supabase after users
 * complete authentication with providers like Google.
 * 
 * Flow:
 * 1. User initiates OAuth login
 * 2. Redirected to provider (Google)  
 * 3. Provider redirects back here with authorization code
 * 4. Exchange code for session
 * 5. Set session cookies
 * 6. Redirect to dashboard or requested URL
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')
  const state = requestUrl.searchParams.get('state')
  
  // Log the callback for debugging
  console.log('OAuth callback received:', {
    hasCode: !!code,
    hasError: !!error,
    error,
    errorDescription,
    state,
    origin: requestUrl.origin
  })

  // Handle OAuth errors (user cancellation, etc.)
  if (error) {
    console.error('OAuth error:', error, errorDescription)
    
    let redirectUrl = new URL('/auth/signin', requestUrl.origin)
    
    // Add error information to redirect URL
    switch (error) {
      case 'access_denied':
        redirectUrl.searchParams.set('error', 'cancelled')
        redirectUrl.searchParams.set('message', 'Sign-in was cancelled')
        break
      case 'server_error':
        redirectUrl.searchParams.set('error', 'server_error')
        redirectUrl.searchParams.set('message', 'Authentication server error. Please try again.')
        break
      default:
        redirectUrl.searchParams.set('error', 'auth_error')
        redirectUrl.searchParams.set('message', errorDescription || 'Authentication failed. Please try again.')
    }
    
    return NextResponse.redirect(redirectUrl)
  }

  // Handle missing authorization code
  if (!code) {
    console.error('No authorization code received in callback')
    
    const redirectUrl = new URL('/auth/signin', requestUrl.origin)
    redirectUrl.searchParams.set('error', 'no_code')
    redirectUrl.searchParams.set('message', 'No authorization code received. Please try signing in again.')
    
    return NextResponse.redirect(redirectUrl)
  }

  try {
    // Create Supabase client
    const supabase = await createClient()
    
    // Exchange the authorization code for a session
    const { data: { session }, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (sessionError) {
      console.error('Error exchanging code for session:', sessionError)
      
      const redirectUrl = new URL('/auth/signin', requestUrl.origin)
      redirectUrl.searchParams.set('error', 'session_error')
      redirectUrl.searchParams.set('message', 'Failed to create session. Please try again.')
      
      return NextResponse.redirect(redirectUrl)
    }

    if (!session) {
      console.error('No session created despite successful code exchange')
      
      const redirectUrl = new URL('/auth/signin', requestUrl.origin)
      redirectUrl.searchParams.set('error', 'no_session')
      redirectUrl.searchParams.set('message', 'Session creation failed. Please try again.')
      
      return NextResponse.redirect(redirectUrl)
    }

    // Log successful authentication
    console.log('OAuth session created successfully:', {
      userId: session.user?.id,
      email: session.user?.email,
      provider: session.user?.app_metadata?.provider
    })

    // Determine redirect URL
    // Priority: state parameter > default dashboard
    let redirectTo = '/dashboard'
    
    if (state) {
      try {
        // State might contain encoded redirect URL
        const decodedState = decodeURIComponent(state)
        if (decodedState.startsWith('/')) {
          redirectTo = decodedState
        }
      } catch (e) {
        console.warn('Failed to decode state parameter:', e)
      }
    }

    // Ensure redirect URL is safe (same origin)
    const finalRedirectUrl = new URL(redirectTo, requestUrl.origin)
    
    // Verify it's the same origin for security
    if (finalRedirectUrl.origin !== requestUrl.origin) {
      console.warn('Redirect URL origin mismatch, using default dashboard')
      finalRedirectUrl.pathname = '/dashboard'
      finalRedirectUrl.search = ''
    }

    console.log('Redirecting to:', finalRedirectUrl.toString())

    // Create response with redirect
    const response = NextResponse.redirect(finalRedirectUrl)
    
    // Add cache control headers to prevent caching of callback
    response.headers.set('Cache-Control', 'no-cache, no-store, max-age=0, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    
    return response

  } catch (error) {
    console.error('Unexpected error in OAuth callback:', error)
    
    const redirectUrl = new URL('/auth/signin', requestUrl.origin)
    redirectUrl.searchParams.set('error', 'unexpected_error')
    redirectUrl.searchParams.set('message', 'An unexpected error occurred during sign-in. Please try again.')
    
    return NextResponse.redirect(redirectUrl)
  }
}

/**
 * Handle POST requests (though OAuth typically uses GET)
 * This provides compatibility in case POST is used
 */
export async function POST(request: NextRequest) {
  console.log('POST request received at OAuth callback - redirecting to GET handler')
  return GET(request)
}