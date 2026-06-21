'use client'

// Canonical Supabase sign-up route (`/signup`).
// Email + password form calling supabase.auth.signUp. If Supabase returns a
// session immediately (email confirmation disabled) we push to `/dashboard`;
// otherwise we show a "check your email" confirmation message.

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, MailCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [ageConfirmed, setAgeConfirmed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [checkEmail, setCheckEmail] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!ageConfirmed) {
      setError('Please confirm you meet the minimum age and accept the Terms and Privacy Policy.')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (authError) {
        setError(authError.message)
        return
      }

      // If a session was returned, email confirmation is disabled and the user
      // is signed in immediately — send them straight into the app.
      if (data.session) {
        const redirectTo = searchParams.get('redirectTo')
        const target =
          redirectTo && redirectTo.startsWith('/') ? redirectTo : '/dashboard'
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
    <div className="w-full max-w-sm">
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <header className="space-y-1">
          <p className="al-eyebrow">Adventure Log</p>
          <h1 className="al-display text-3xl">Create your account</h1>
          <p className="text-sm text-muted-foreground">
            Start logging your adventures
          </p>
        </header>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
            />
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
              I am at least 16 years old (or the minimum age required in my country) and I agree to the{' '}
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
            disabled={loading || !ageConfirmed}
            className="w-full"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? 'Creating account…' : 'Sign up'}
          </Button>
        </form>

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

        <GoogleSignInButton next={searchParams.get('redirectTo')} disabled={!ageConfirmed} />
        {!ageConfirmed && (
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Confirm the age &amp; terms checkbox above to continue with Google.
          </p>
        )}

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
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <Suspense
        fallback={
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        }
      >
        <SignupForm />
      </Suspense>
    </div>
  )
}
