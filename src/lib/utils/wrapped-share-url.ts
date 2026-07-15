import { getWebOrigin, withRef } from '@/lib/utils/native-routes'

/**
 * Fallback public origin for contexts where getWebOrigin() is empty:
 * SSR/prerender, or a native build missing NEXT_PUBLIC_API_BASE_URL.
 * A share URL must never be relative or capacitor://localhost.
 */
const FALLBACK_ORIGIN = 'https://roamkeep.net'

/**
 * Canonical URL for sharing someone's Travel Wrapped. Lands recipients on
 * the PUBLIC, anonymously-watchable /wrapped/share page (globe + stats +
 * signup CTA) instead of the auth-gated /wrapped route. The ref param makes
 * anyone who signs up from the link auto-follow the sharer (ReferralHandler
 * + claim_referral).
 */
export function buildWrappedShareUrl(
  username: string | null | undefined,
  year: number | 'all'
): string {
  const origin = getWebOrigin() || FALLBACK_ORIGIN
  if (!username) return origin
  return withRef(
    `${origin}/wrapped/share?u=${encodeURIComponent(username)}&year=${year}`,
    username
  )
}
