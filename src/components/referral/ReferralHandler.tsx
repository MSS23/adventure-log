'use client'

/**
 * ReferralHandler — the receiving end of the ?ref=<username> invite links
 * (InviteFriendsDialog and share flows attach them via withRef()).
 *
 * Capture: on any page load, stash a valid ?ref= into localStorage. It has to
 * survive the whole signup dance (email confirmation, redirects), which is
 * why it's not passed through in-memory state.
 *
 * Claim: once a session exists AND the account is fresh (<48h — matches the
 * server-side window), call the claim_referral RPC (migrations 68 + 71),
 * which creates an accepted follow in BOTH directions and stamps
 * users.referred_by. One-shot: the stored ref is cleared after the first
 * attempt, success or not.
 *
 * Warm landing: after a successful claim the new user is redirected ONCE to
 * /globe?user=<referrerId> — their first screen is their friend's pinned
 * globe instead of an empty feed. A localStorage flag guarantees it never
 * re-fires.
 *
 * Signup analytics: this is also the single hook point for the 'signup' /
 * 'signup_via_ref' growth events — it sees every completed signup (SPA
 * redirect, email-confirmation round trip, OAuth) via the fresh-account
 * check, one-shot per device via localStorage.
 *
 * Renders nothing. Mounted once in the root layout.
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { log } from '@/lib/utils/logger'
import { trackGrowthEvent } from '@/lib/utils/growth-events'

const REF_KEY = 'al-referrer'
const SIGNUP_TRACKED_KEY = 'al-signup-tracked'
const WARM_LANDING_KEY = 'al-warm-landing-done'
const USERNAME_RE = /^[a-zA-Z0-9_]{3,30}$/
const FRESH_ACCOUNT_MS = 48 * 60 * 60 * 1000

/** Read-check-set a one-shot localStorage flag. True = first time (proceed). */
function consumeOnce(key: string): boolean {
  try {
    if (localStorage.getItem(key) !== null) return false
    localStorage.setItem(key, String(Date.now()))
    return true
  } catch {
    return false
  }
}

export function ReferralHandler() {
  const router = useRouter()

  // Capture ?ref= from the URL (any page — invite links point at `/`).
  useEffect(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get('ref')
      if (ref && USERNAME_RE.test(ref) && !localStorage.getItem(REF_KEY)) {
        localStorage.setItem(REF_KEY, ref)
      }
    } catch {
      // localStorage unavailable — no referral tracking, nothing breaks.
    }
  }, [])

  // Claim once signed in with a fresh account. Two triggers: mount (user
  // arrives already signed in after email confirmation) and SIGNED_IN (the
  // SPA signup flow redirects client-side — no page reload, so the mount
  // pass alone would miss it).
  useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    const attemptClaim = async (user: { id: string; created_at?: string }) => {
      const createdAt = new Date(user.created_at ?? 0).getTime()
      const isFresh = Date.now() - createdAt < FRESH_ACCOUNT_MS

      let ref: string | null = null
      try {
        ref = localStorage.getItem(REF_KEY)
      } catch {
        ref = null
      }
      const hasValidRef = !!ref && USERNAME_RE.test(ref)

      // One-shot either way: a stale account will never become claimable,
      // so drop the stored ref instead of re-checking forever.
      if (ref !== null) {
        try {
          localStorage.removeItem(REF_KEY)
        } catch {
          // ignore
        }
      }
      if (!isFresh) return

      // Every completed signup lands here exactly once per device; the
      // referred variant is emitted additionally below on a successful claim.
      if (consumeOnce(SIGNUP_TRACKED_KEY)) {
        trackGrowthEvent('signup')
      }

      if (!hasValidRef || !ref) return

      try {
        const { data, error } = await supabase.rpc('claim_referral', {
          referrer_username: ref,
        })
        if (error) throw error
        if (data === true) {
          log.info('Referral claimed — mutual follow created', {
            component: 'ReferralHandler',
            action: 'claim',
          })
          trackGrowthEvent('signup_via_ref', { meta: { ref } })

          // Warm landing: first screen is the friend's pinned globe. One-shot
          // (flag persists before navigating) so it can never re-fire.
          if (!cancelled && consumeOnce(WARM_LANDING_KEY)) {
            const { data: referrer } = await supabase
              .from('users')
              .select('id')
              .eq('username', ref)
              .single()
            if (!cancelled && referrer?.id) {
              router.push(`/globe?user=${referrer.id}`)
            }
          }
        }
      } catch (err) {
        // Function may not be provisioned yet (migration 68/71) — non-fatal.
        log.warn('Referral claim failed', {
          component: 'ReferralHandler',
          action: 'claim',
        }, err as Error)
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!cancelled && session?.user) void attemptClaim(session.user)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!cancelled && event === 'SIGNED_IN' && session?.user) {
        void attemptClaim(session.user)
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [router])

  return null
}
