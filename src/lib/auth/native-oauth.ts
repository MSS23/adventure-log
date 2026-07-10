// Native (Capacitor) OAuth bridge — shared between the provider buttons that
// START the flow (GoogleSignInButton) and NativeAppShell, which FINISHES it
// when the OS hands us the deep link back.
//
// The scheme must match capacitor.config.ts appId, the Android intent-filter
// (AndroidManifest.xml) and the iOS CFBundleURLTypes. The exact callback URL
// must also be present in Supabase Auth → URL Configuration → Redirect URLs,
// or Supabase refuses the redirect before Google is ever shown.

import { createClient } from '@/lib/supabase/client'
import { safeInternalPath } from '@/lib/utils/safe-redirect'
import { log } from '@/lib/utils/logger'

export const NATIVE_OAUTH_SCHEME = 'com.adventurelog.app'
export const NATIVE_OAUTH_CALLBACK_URL = `${NATIVE_OAUTH_SCHEME}://auth/callback`

// Where to land after sign-in. Stored in localStorage (WebView-local) instead
// of a query param on the redirect URL so the Supabase redirect-allowlist
// entry can stay an exact string match.
export const NATIVE_OAUTH_NEXT_KEY = 'al-native-oauth-next'

export function isNativeOAuthCallback(url: string): boolean {
  return url.startsWith(NATIVE_OAUTH_CALLBACK_URL)
}

/**
 * Complete a native OAuth round-trip from an appUrlOpen deep link.
 * Returns the internal path to navigate to (success → stashed `next`,
 * failure → /login with an error code the login page already knows).
 */
export async function completeNativeOAuth(url: string): Promise<string> {
  const fallback = '/login?error=oauth'
  try {
    // Custom-scheme URLs parse fine with the WHATWG URL class
    // (host "auth", path "/callback", searchParams intact).
    const parsed = new URL(url)
    const code = parsed.searchParams.get('code')
    const providerError = parsed.searchParams.get('error_description') || parsed.searchParams.get('error')

    if (!code) {
      log.error('Native OAuth callback missing code', {
        component: 'native-oauth',
        action: 'complete',
        providerError: providerError ?? 'none',
      })
      return fallback
    }

    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      log.error('Native OAuth code exchange failed', {
        component: 'native-oauth',
        action: 'exchangeCodeForSession',
      }, error)
      return fallback
    }

    const next = safeInternalPath(localStorage.getItem(NATIVE_OAUTH_NEXT_KEY), '/feed')
    localStorage.removeItem(NATIVE_OAUTH_NEXT_KEY)
    return next
  } catch (err) {
    log.error('Native OAuth completion crashed', {
      component: 'native-oauth',
      action: 'complete',
    }, err instanceof Error ? err : new Error(String(err)))
    return fallback
  }
}
