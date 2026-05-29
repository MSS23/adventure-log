'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from './AuthProvider'
import { MotionReveal } from '@/components/animations/MotionList'

interface ProtectedRouteProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

/**
 * Gate around any UI that requires a signed-in Supabase user. While the session
 * is being established (`authLoading`) we render nothing — the (app)/layout
 * spinner covers the empty render.
 *
 * fallback is honoured for the signed-out branch only — useful when a parent
 * wants to show inline marketing copy instead of redirecting. When no fallback
 * is given, signed-out users are redirected to /login.
 *
 * Profile provisioning errors (trigger race / Supabase fetch failures) are
 * surfaced inline with a retry affordance so users aren't stuck on a blank
 * page when AuthProvider's retry budget runs out.
 */
export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { user, authLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!authLoading && !user && !fallback) {
      const redirectTo = encodeURIComponent(pathname || '/')
      router.replace(`/login?redirectTo=${redirectTo}`)
    }
  }, [authLoading, user, fallback, pathname, router])

  // Session still resolving — let the layout spinner cover this.
  if (authLoading) return null

  if (!user) {
    // Either show the caller's inline fallback, or render nothing while the
    // redirect effect above navigates to /login.
    return <>{fallback ?? null}</>
  }

  return <ProvisionGate>{children}</ProvisionGate>
}

/**
 * Inner gate that intercepts AuthProvider's profile-error states with an
 * editorial recovery panel. Children render normally otherwise — including
 * during the in-flight provisioning window — so existing per-page skeletons
 * keep working. We only take over the screen when AuthProvider has given up
 * (`provisioning_timeout`) or hit a hard error (`fetch_failed`); otherwise
 * users would be stuck on a blank page.
 */
function ProvisionGate({ children }: { children: React.ReactNode }) {
  const { profileError, retryProfileLoad } = useAuth()

  if (profileError === 'provisioning_timeout') {
    return (
      <ProvisionPanel
        eyebrow="Almost there"
        title="Setting up your account"
        body="We're finishing the last steps of provisioning your profile. This usually takes a few seconds — try again in a moment."
        onRetry={retryProfileLoad}
      />
    )
  }

  if (profileError === 'fetch_failed') {
    return (
      <ProvisionPanel
        eyebrow="Something went wrong"
        title="Couldn't load your profile"
        body="We hit a snag fetching your profile. Check your connection and try again."
        onRetry={retryProfileLoad}
      />
    )
  }

  return <>{children}</>
}

interface ProvisionPanelProps {
  eyebrow: string
  title: string
  body: string
  onRetry: () => void | Promise<void>
}

function ProvisionPanel({ eyebrow, title, body, onRetry }: ProvisionPanelProps) {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: 'var(--color-ivory)', color: 'var(--color-ink)' }}
    >
      <MotionReveal>
        <div className="max-w-md w-full text-center space-y-5">
          <p className="al-eyebrow">{eyebrow}</p>
          <h1 className="font-heading al-display text-3xl md:text-4xl leading-[1.05]">
            {title}
          </h1>
          <p className="al-body" style={{ color: 'var(--color-muted-warm)' }}>
            {body}
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                void onRetry()
              }}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-semibold transition-shadow active:scale-[0.98] hover:shadow-[0_10px_28px_rgba(226,85,58,0.45)]"
              style={{
                background: 'var(--color-coral)',
                color: '#fff',
                boxShadow: '0 6px 18px rgba(226,85,58,0.35)',
              }}
            >
              Try again
            </button>
          </div>
          <p className="al-caption pt-1" style={{ color: 'var(--color-muted-warm)' }}>
            If this keeps happening, please contact support.
          </p>
        </div>
      </MotionReveal>
    </div>
  )
}
