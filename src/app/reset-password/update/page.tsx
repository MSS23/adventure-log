'use client'

// Password reset — update step. Reached from the recovery link in the email.
// The Supabase browser client has detectSessionInUrl: true, so it exchanges the
// recovery code in the URL for a session automatically on load (and emits a
// PASSWORD_RECOVERY auth event). Once that session exists, the user can set a
// new password via supabase.auth.updateUser.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function ResetPasswordUpdatePage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [sessionError, setSessionError] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    // The recovery session may land slightly after mount (the client exchanges
    // the URL code asynchronously). Listen for the auth event and also check
    // the current session as a fallback.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) setReady(true)
    })

    let cancelled = false
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      if (data.session) setReady(true)
      else {
        // Give the URL exchange a moment, then surface an error if still no session.
        setTimeout(() => {
          if (!cancelled) {
            supabase.auth.getSession().then(({ data: d2 }) => {
              if (cancelled) return
              if (d2.session) setReady(true)
              else setSessionError(true)
            })
          }
        }, 1500)
      }
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        setError(updateError.message)
        return
      }
      setDone(true)
      setTimeout(() => router.push('/dashboard'), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          {done ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h1 className="al-display text-2xl">Password updated</h1>
              <p className="mt-2 text-sm text-muted-foreground">Taking you to your dashboard…</p>
            </div>
          ) : sessionError ? (
            <div className="text-center">
              <h1 className="al-display text-2xl">Link expired</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                This reset link is invalid or has expired. Request a new one to continue.
              </p>
              <Button asChild className="mt-6 w-full">
                <Link href="/reset-password">Request a new link</Link>
              </Button>
            </div>
          ) : (
            <>
              <header className="space-y-1">
                <p className="al-eyebrow">Adventure Log</p>
                <h1 className="al-display text-3xl">Set a new password</h1>
                <p className="text-sm text-muted-foreground">
                  Choose a new password for your account.
                </p>
              </header>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="password" className="block text-sm font-medium text-foreground">
                    New password
                  </label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={!ready}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="confirm" className="block text-sm font-medium text-foreground">
                    Confirm password
                  </label>
                  <Input
                    id="confirm"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    disabled={!ready}
                  />
                </div>

                {error && (
                  <p role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                )}

                <Button type="submit" disabled={loading || !ready} className="w-full">
                  {(loading || !ready) && <Loader2 className="h-4 w-4 animate-spin" />}
                  {!ready ? 'Verifying link…' : loading ? 'Updating…' : 'Update password'}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
