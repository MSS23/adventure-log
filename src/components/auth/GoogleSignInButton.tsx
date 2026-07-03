'use client'

// "Continue with Google" button. Starts Supabase's OAuth/PKCE flow and sends
// the browser to Google; Google redirects to Supabase, which redirects back to
// /auth/callback (server route) where the code is exchanged for a session
// cookie before continuing to `next`. New Google users get a profile row from
// the handle_new_user trigger.

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { safeInternalPath } from '@/lib/utils/safe-redirect'
import { Button } from '@/components/ui/button'

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
      />
    </svg>
  )
}

interface GoogleSignInButtonProps {
  /** Safe internal path to land on after sign-in. Defaults to /feed. */
  next?: string | null
  /** Disable the button (e.g. until consent is given on the signup page). */
  disabled?: boolean
}

export function GoogleSignInButton({ next, disabled = false }: GoogleSignInButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = async () => {
    setError(null)
    setLoading(true)
    try {
      const supabase = createClient()
      const safeNext = safeInternalPath(next, '/feed')
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`,
        },
      })
      // On success the browser navigates away to Google, so we only land here
      // again on an error — keep the spinner off in that case.
      if (oauthError) {
        setError(oauthError.message)
        setLoading(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start Google sign-in. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className="w-full gap-2"
        onClick={handleClick}
        disabled={disabled || loading}
        aria-label="Continue with Google"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <GoogleIcon className="h-4 w-4" />
        )}
        {loading ? 'Connecting…' : 'Continue with Google'}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
