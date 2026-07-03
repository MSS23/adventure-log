'use client'

/**
 * ReferralHandler — the receiving end of the ?ref=<username> invite links
 * (InviteFriendsDialog and share flows have attached them for a while; until
 * now nothing consumed them).
 *
 * Capture: on any page load, stash a valid ?ref= into localStorage. It has to
 * survive the whole signup dance (email confirmation, redirects), which is
 * why it's not passed through in-memory state.
 *
 * Claim: once a session exists AND the account is fresh (<48h — matches the
 * server-side window), call the claim_referral RPC (migration 68), which
 * creates an accepted follow in BOTH directions. One-shot: the stored ref is
 * cleared after the first attempt, success or not.
 *
 * Renders nothing. Mounted once in the root layout.
 */

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { log } from '@/lib/utils/logger'

const REF_KEY = 'al-referrer'
const USERNAME_RE = /^[a-zA-Z0-9_]{3,30}$/
const FRESH_ACCOUNT_MS = 48 * 60 * 60 * 1000

export function ReferralHandler() {
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
      let ref: string | null = null
      try {
        ref = localStorage.getItem(REF_KEY)
      } catch {
        return
      }
      if (!ref || !USERNAME_RE.test(ref)) return

      const createdAt = new Date(user.created_at ?? 0).getTime()
      const isFresh = Date.now() - createdAt < FRESH_ACCOUNT_MS
      // One-shot either way: a stale account will never become claimable,
      // so drop the stored ref instead of re-checking forever.
      try {
        localStorage.removeItem(REF_KEY)
      } catch {
        // ignore
      }
      if (!isFresh) return

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
        }
      } catch (err) {
        // Function may not be provisioned yet (migration 68) — non-fatal.
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
  }, [])

  return null
}
