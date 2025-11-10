'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { initPostHog, posthog } from '@/lib/analytics/posthog'
import { useAuth } from '@/components/auth/AuthProvider'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user, profile } = useAuth()

  // Initialize PostHog on mount
  useEffect(() => {
    initPostHog()
  }, [])

  // Track pageviews
  useEffect(() => {
    if (pathname && posthog) {
      let url = window.origin + pathname
      if (searchParams && searchParams.toString()) {
        url = url + `?${searchParams.toString()}`
      }
      posthog.capture('$pageview', {
        $current_url: url,
      })
    }
  }, [pathname, searchParams])

  // Identify user when logged in
  useEffect(() => {
    if (user && profile && posthog) {
      posthog.identify(user.id, {
        email: user.email,
        username: profile.username,
        display_name: profile.display_name,
        created_at: user.created_at,
      })
    } else if (posthog) {
      // Reset on logout
      posthog.reset()
    }
  }, [user, profile])

  return <>{children}</>
}
