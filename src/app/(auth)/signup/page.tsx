'use client'

// Canonical Supabase sign-up route (`/signup`).
// Email + password form calling supabase.auth.signUp. If Supabase returns a
// session immediately (email confirmation disabled) we push to `/dashboard`;
// otherwise we show a "check your email" confirmation message.

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { safeInternalPath } from '@/lib/utils/safe-redirect'
import { Loader2, MailCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { Button } from '@/components/ui/button'
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'
import { AuthStoryPanel } from '@/components/auth/AuthStoryPanel'
import { calculateAge, MIN_AGE } from '@/lib/utils/age'
import { markFirstPinStart } from '@/lib/utils/growth-events'

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [dob, setDob] = useState('')
  const [ageConfirmed, setAgeConfirmed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [checkEmail, setCheckEmail] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendMessage, setResendMessage] = useState<string | null>(null)
  const [resendError, setResendError] = useState<string | null>(null)

  // Adventure Log is 18+. Derive age from the self-declared DOB to drive the
  // under-18 block; the value is also stored server-side for an audit record.
  const age = dob ? calculateAge(dob) : null
  const isUnderAge = age !== null && age < MIN_AGE

  // Tick the resend cooldown down once per second while it's active.
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => setResendCooldown((s) => s - 1), 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  const handleResend = async () => {
    setResendMessage(null)
    setResendError(null)
    setResending(true)

    try {
      const supabase = createClient()
      const { error: resendAuthError } = await supabase.auth.resend({
        type: 'signup',
        email,
      })

      if (resendAuthError) {
        setResendError(resendAuthError.message)
        return
      }

      setResendMessage('Confirmation email sent — it may take a minute to arrive.')
      setResendCooldown(60)
    } catch (err) {
      setResendError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setResending(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!dob || age === null) {
      setError('Please enter a valid date of birth.')
      return
    }

    if (isUnderAge) {
      setError(`You must be at least ${MIN_AGE} to use Adventure Log.`)
      return
    }

    if (!ageConfirmed) {
      setError('Please confirm your age and accept the Terms and Privacy Policy.')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Account visibility defaults to 'public' server-side (the
          // create_profile_on_signup trigger falls back to it) and is
          // editable in Settings — no picker at signup.
          //
          // We record the self-declared DOB and age/terms acceptance for an
          // auditable record that the user attested to being 18+ (GDPR Art. 7).
          data: {
            date_of_birth: dob,
            age_confirmed: true,
            terms_accepted_at: new Date().toISOString(),
          },
        },
      })

      if (authError) {
        setError(authError.message)
        return
      }

      // Start the time-to-first-pin clock at signup completion. localStorage
      // survives the email-confirmation round trip on this device, and the
      // pending key is consumed by trackFirstPinIfPending() when the first
      // geolocated album is created.
      markFirstPinStart()

      // If a session was returned, email confirmation is disabled and the user
      // is signed in immediately — send them straight into the app.
      if (data.session) {
        const target = safeInternalPath(searchParams.get('redirectTo'), '/feed')
        router.push(target)
        return
      }

      // No session: Supabase sent a confirmation email.
      setCheckEmail(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (checkEmail) {
    return (
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MailCheck className="h-6 w-6" />
          </div>
          <h1 className="al-display text-3xl mt-4">
            Check your email
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We&apos;ve sent a confirmation link to{' '}
            <span className="font-medium text-foreground">
              {email}
            </span>
            . Click the link to activate your account.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Don&apos;t see it? Check your spam folder.
          </p>

          <Button
            type="button"
            variant="outline"
            onClick={handleResend}
            disabled={resending || resendCooldown > 0}
            className="mt-5 w-full"
          >
            {resending && <Loader2 className="h-4 w-4 animate-spin" />}
            {resendCooldown > 0
              ? `Resend available in ${resendCooldown}s`
              : resending
                ? 'Resending…'
                : 'Resend confirmation email'}
          </Button>

          {resendMessage && (
            <p role="status" className="mt-3 text-sm text-primary">
              {resendMessage}
            </p>
          )}
          {resendError && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {resendError}
            </p>
          )}

          <Link
            href="/login"
            className="mt-6 inline-block text-sm font-medium text-primary hover:underline"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md">
      <div className="rounded-[24px] border border-border bg-card p-6 shadow-sm sm:p-8">
        <header className="space-y-1">
          <p className="al-eyebrow">Adventure Log</p>
          <h1 className="al-display text-3xl">Create your account</h1>
          <p className="text-sm text-muted-foreground">
            Build your globe and compare it with people you know.
          </p>
        </header>

        <div className="mt-6">
          <GoogleSignInButton next={searchParams.get('redirectTo')} />
        </div>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-card px-2 text-xs uppercase tracking-wide text-muted-foreground">
              or
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-foreground"
            >
              Email
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-foreground"
            >
              Password
            </label>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="dob"
              className="block text-sm font-medium text-foreground"
            >
              Date of birth
            </label>
            <Input
              id="dob"
              type="date"
              required
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
            {isUnderAge ? (
              <p className="text-xs text-destructive">
                You must be at least {MIN_AGE} to use Adventure Log.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Adventure Log is for adults aged {MIN_AGE} and over.
              </p>
            )}
          </div>

          <div className="flex items-start gap-2.5">
            <input
              id="age-consent"
              type="checkbox"
              required
              checked={ageConfirmed}
              onChange={(e) => setAgeConfirmed(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-border text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <label htmlFor="age-consent" className="text-xs leading-relaxed text-muted-foreground">
              The date of birth above is accurate, and I agree to the{' '}
              <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>{' '}and{' '}
              <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
            </label>
          </div>

          {error && (
            <p
              role="alert"
              className="text-sm text-destructive"
            >
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={loading || !ageConfirmed || isUnderAge}
            className="w-full"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? 'Creating account…' : 'Sign up'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-medium text-primary hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <div className="min-h-[100dvh] bg-background px-4 py-6 sm:px-6 lg:py-8">
      <div className="mx-auto grid min-h-[calc(100dvh-3rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.08fr_0.92fr]">
        <AuthStoryPanel />
        <div className="flex items-center justify-center py-4">
          <Suspense
            fallback={
              <div className="flex min-h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            }
          >
            <SignupForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
