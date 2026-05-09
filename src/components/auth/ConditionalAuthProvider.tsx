'use client'

import { usePathname } from 'next/navigation'
import { AuthProvider } from './AuthProvider'
import { AchievementProvider } from '@/components/achievements/AchievementProvider'

// Routes that don't need profile/achievement context.
//
// Clerk now wraps the entire tree at the root, so we no longer need to
// gate AuthProvider for "auth pages" — those live entirely inside Clerk
// (`/sign-in`, `/sign-up`). What we DO still want to skip is:
//
//   * the marketing landing (`/`) — rendered fully unauthenticated, the
//     achievement provider's queries would fire and waste a render before
//     bouncing.
//   * embed routes — rendered inside iframes, need no app auth surface.
//
// Everything else gets the AuthProvider + AchievementProvider stack.
// Server-rendered public routes (e.g. `/u/[username]`) still mount this
// provider, which is fine: AuthProvider tolerates a signed-out Clerk
// session and just resolves with `user: null`.
const PUBLIC_ROUTES = ['/']
const SKIP_AUTH_PREFIXES = ['/embed/']

export function ConditionalAuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (SKIP_AUTH_PREFIXES.some(prefix => pathname.startsWith(prefix))) {
    return <>{children}</>
  }

  if (PUBLIC_ROUTES.includes(pathname)) {
    return <>{children}</>
  }

  return (
    <AuthProvider>
      <AchievementProvider>
        {children}
      </AchievementProvider>
    </AuthProvider>
  )
}