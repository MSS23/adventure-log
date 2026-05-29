'use client'

import { usePathname } from 'next/navigation'
import { AuthProvider } from './AuthProvider'
import { AchievementProvider } from '@/components/achievements/AchievementProvider'

// AuthProvider ALWAYS mounts so `useAuth()` is available on every route —
// including public/marketing pages (`/`, `/contact`, ...) that render shared
// components depending on auth state, and during static prerendering where
// usePathname() is unreliable. AuthProvider tolerates a signed-out Supabase
// session and resolves with `user: null`, so it's cheap and fires no profile
// queries until someone is signed in.
//
// Only the heavier AchievementProvider is gated off the routes that never need
// it, to avoid its queries firing on:
//   * the marketing landing (`/`) — rendered fully unauthenticated.
//   * embed routes — rendered inside iframes, need no app surface.
const NO_ACHIEVEMENTS_ROUTES = ['/']
const NO_ACHIEVEMENTS_PREFIXES = ['/embed/']

export function ConditionalAuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? ''

  const skipAchievements =
    NO_ACHIEVEMENTS_ROUTES.includes(pathname) ||
    NO_ACHIEVEMENTS_PREFIXES.some((prefix) => pathname.startsWith(prefix))

  return (
    <AuthProvider>
      {skipAchievements ? children : <AchievementProvider>{children}</AchievementProvider>}
    </AuthProvider>
  )
}