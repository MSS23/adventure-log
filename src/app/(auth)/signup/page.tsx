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

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [checkEmail, setCheckEmail] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
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
        <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-[#111] shadow-sm p-6 sm:p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-olive-100 dark:bg-olive-900/30">
            <MailCheck className="h-6 w-6 text-olive-600 dark:text-olive-400" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-gray-900 dark:text-white">
            Check your email
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            We&apos;ve sent a confirmation link to{' '}
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {email}
            </span>
            . Click the link to activate your account.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block text-sm font-medium text-olive-600 hover:text-olive-700 dark:text-olive-400"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm">
      <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-[#111] shadow-sm p-6 sm:p-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Create your account
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Start logging your adventures
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-white/15 bg-white dark:bg-[#1a1a1a] px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-olive-500 focus:outline-none focus:ring-1 focus:ring-olive-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-white/15 bg-white dark:bg-[#1a1a1a] px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-olive-500 focus:outline-none focus:ring-1 focus:ring-olive-500"
              placeholder="At least 6 characters"
            />
          </div>

          {error && (
            <p
              role="alert"
              className="text-sm text-red-600 dark:text-red-400"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-olive-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-olive-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? 'Creating account…' : 'Sign up'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-medium text-olive-600 hover:text-olive-700 dark:text-olive-400"
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
    <div className="min-h-screen flex items-center justify-center bg-[#FAF7F1] dark:bg-[#0a0a0a] px-4 py-12">
      <Suspense
        fallback={
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-olive-600" />
          </div>
        }
      >
        <SignupForm />
      </Suspense>
    </div>
  )
}
