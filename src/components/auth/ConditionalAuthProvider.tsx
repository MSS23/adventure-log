'use client'

import { AuthProvider } from './AuthProvider'

// AuthProvider ALWAYS mounts so `useAuth()` is available on every route —
// including public/marketing pages (`/`, `/contact`, ...) that render shared
// components depending on auth state, and during static prerendering where
// usePathname() is unreliable. AuthProvider tolerates a signed-out Supabase
// session and resolves with `user: null`, so it's cheap and fires no profile
// queries until someone is signed in.
//
// Achievement notifications are mounted by the authenticated app layout, so
// marketing, auth, public-share, and embed routes never initialize that logic.
export function ConditionalAuthProvider({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}
