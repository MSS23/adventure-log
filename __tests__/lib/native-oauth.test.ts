/**
 * Native OAuth deep-link bridge (July 2026 "Google sign-in fails on APK" fix).
 * completeNativeOAuth touches the Supabase client, so these tests mock it and
 * exercise the URL handling + next-path stash logic.
 */

const exchangeCodeForSession = jest.fn()

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { exchangeCodeForSession } }),
}))

import {
  NATIVE_OAUTH_CALLBACK_URL,
  NATIVE_OAUTH_NEXT_KEY,
  isNativeOAuthCallback,
  completeNativeOAuth,
} from '@/lib/auth/native-oauth'

describe('isNativeOAuthCallback', () => {
  it('accepts the callback deep link with and without params', () => {
    expect(isNativeOAuthCallback(NATIVE_OAUTH_CALLBACK_URL)).toBe(true)
    expect(isNativeOAuthCallback(`${NATIVE_OAUTH_CALLBACK_URL}?code=abc`)).toBe(true)
  })

  it('rejects unrelated deep links and web URLs', () => {
    expect(isNativeOAuthCallback('com.adventurelog.app://something/else')).toBe(false)
    expect(isNativeOAuthCallback('https://adventurelog.com/auth/callback?code=x')).toBe(false)
    expect(isNativeOAuthCallback('')).toBe(false)
  })
})

describe('completeNativeOAuth', () => {
  beforeEach(() => {
    exchangeCodeForSession.mockReset()
    localStorage.clear()
  })

  it('exchanges the code and returns the stashed next path', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null })
    localStorage.setItem(NATIVE_OAUTH_NEXT_KEY, '/wishlist')

    const target = await completeNativeOAuth(`${NATIVE_OAUTH_CALLBACK_URL}?code=abc123`)

    expect(exchangeCodeForSession).toHaveBeenCalledWith('abc123')
    expect(target).toBe('/wishlist')
    // One-shot: the stash is consumed.
    expect(localStorage.getItem(NATIVE_OAUTH_NEXT_KEY)).toBeNull()
  })

  it('defaults to /feed when no next was stashed', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null })
    const target = await completeNativeOAuth(`${NATIVE_OAUTH_CALLBACK_URL}?code=abc123`)
    expect(target).toBe('/feed')
  })

  it('never returns an external next path', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null })
    localStorage.setItem(NATIVE_OAUTH_NEXT_KEY, '//evil.com')
    const target = await completeNativeOAuth(`${NATIVE_OAUTH_CALLBACK_URL}?code=abc123`)
    expect(target).toBe('/feed')
  })

  it('routes to the login error state when the provider sent no code', async () => {
    const target = await completeNativeOAuth(
      `${NATIVE_OAUTH_CALLBACK_URL}?error=access_denied&error_description=denied`,
    )
    expect(exchangeCodeForSession).not.toHaveBeenCalled()
    expect(target).toBe('/login?error=oauth')
  })

  it('routes to the login error state when the exchange fails', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: new Error('bad code') })
    const target = await completeNativeOAuth(`${NATIVE_OAUTH_CALLBACK_URL}?code=expired`)
    expect(target).toBe('/login?error=oauth')
  })
})
