'use client'

import { RedirectToSignIn, Show } from '@clerk/nextjs'

interface ProtectedRouteProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

/**
 * Gate around any UI that requires a signed-in Clerk user. While Clerk loads,
 * <Show> renders nothing — Clerk's guidance, since the auth state is unknown
 * until the JS chunk has booted. The (app)/layout spinner covers the empty
 * render.
 *
 * fallback is honoured for the signed-out branch only — useful when a parent
 * wants to show inline marketing copy instead of redirecting.
 */
export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  return (
    <>
      <Show when="signed-in">{children}</Show>
      <Show when="signed-out">{fallback ?? <RedirectToSignIn />}</Show>
    </>
  )
}
