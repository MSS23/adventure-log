export interface CookieAuthDecision {
  pathname: string
  isApiRoute: boolean
  apiIsPublic: boolean
  hasBearerAuth: boolean
  hasSessionCookies: boolean
  isProtectedPage: boolean
}

/**
 * Decide whether middleware must validate a Supabase cookie session.
 *
 * Public traffic should not pay for an auth network request. Protected routes
 * with no cookie can be rejected immediately, and native bearer requests are
 * validated by the route handler's server client.
 */
export function shouldValidateCookieSession({
  pathname,
  isApiRoute,
  apiIsPublic,
  hasBearerAuth,
  hasSessionCookies,
  isProtectedPage,
}: CookieAuthDecision): boolean {
  if (!hasSessionCookies) return false

  if (isApiRoute) {
    return !apiIsPublic && !hasBearerAuth
  }

  return isProtectedPage || pathname === '/login' || pathname === '/signup'
}
