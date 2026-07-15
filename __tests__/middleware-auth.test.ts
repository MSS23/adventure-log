import { shouldValidateCookieSession } from '@/lib/auth/middleware-auth'

const baseDecision = {
  pathname: '/',
  isApiRoute: false,
  apiIsPublic: false,
  hasBearerAuth: false,
  hasSessionCookies: true,
  isProtectedPage: false,
}

describe('shouldValidateCookieSession', () => {
  it('skips public pages even when a visitor has a session cookie', () => {
    expect(shouldValidateCookieSession(baseDecision)).toBe(false)
  })

  it('skips public APIs', () => {
    expect(shouldValidateCookieSession({
      ...baseDecision,
      pathname: '/api/health',
      isApiRoute: true,
      apiIsPublic: true,
    })).toBe(false)
  })

  it('validates protected pages when a session cookie exists', () => {
    expect(shouldValidateCookieSession({
      ...baseDecision,
      pathname: '/feed',
      isProtectedPage: true,
    })).toBe(true)
  })

  it('validates auth pages so signed-in users can be redirected', () => {
    for (const pathname of ['/login', '/signup']) {
      expect(shouldValidateCookieSession({
        ...baseDecision,
        pathname,
      })).toBe(true)
    }
  })

  it('validates cookie-authenticated protected APIs', () => {
    expect(shouldValidateCookieSession({
      ...baseDecision,
      pathname: '/api/wishlist',
      isApiRoute: true,
    })).toBe(true)
  })

  it('leaves bearer-authenticated APIs to the route handler', () => {
    expect(shouldValidateCookieSession({
      ...baseDecision,
      pathname: '/api/wishlist',
      isApiRoute: true,
      hasBearerAuth: true,
    })).toBe(false)
  })

  it('rejects missing-cookie traffic without an auth lookup', () => {
    expect(shouldValidateCookieSession({
      ...baseDecision,
      pathname: '/feed',
      hasSessionCookies: false,
      isProtectedPage: true,
    })).toBe(false)
  })
})
