'use client'

import { useState, useCallback } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { ShieldCheck } from 'lucide-react'
import { apiFetch } from '@/lib/api/client'
import { MIN_AGE } from '@/lib/utils/age'
import { log } from '@/lib/utils/logger'

/**
 * Post-OAuth age gate. Email/password signups collect a DOB (enforced 18+ by
 * the handle_new_user trigger), but OAuth accounts arrive without one — this
 * blocks the app until the user confirms a DOB, and signs out under-18s.
 *
 * Whether a DOB is needed comes straight from the profile AuthProvider
 * already loaded (get_my_profile returns the full own row): no extra network
 * round-trip, and no fail-open when an API call errors. The DOB itself is
 * validated and written server-side (/api/me/age-verification), which also
 * logs underage declarations — so the form always submits rather than
 * short-circuiting client-side.
 */
export function AgeGate() {
  const { user, profile, signOut, refreshProfile } = useAuth()
  const [dob, setDob] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [underage, setUnderage] = useState(false)
  // The profile cache is ~5 min stale; a successful POST dismisses locally.
  const [verifiedNow, setVerifiedNow] = useState(false)

  const required = !!user && !!profile && !profile.date_of_birth && !verifiedNow

  const submit = useCallback(async () => {
    if (submitting) return
    setError(null)

    if (!dob) {
      setError('Please enter your date of birth')
      return
    }
    if (!confirmed) {
      setError(`Please confirm you are ${MIN_AGE} or older`)
      return
    }

    setSubmitting(true)
    try {
      const res = await apiFetch('/api/me/age-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date_of_birth: dob }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 403 && data.underage) {
        setUnderage(true)
        return
      }
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setVerifiedNow(true)
      void refreshProfile()
    } catch (err) {
      log.error('Age gate submit failed', { component: 'AgeGate', action: 'submit' }, err instanceof Error ? err : new Error(String(err)))
      setError('Could not save. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }, [dob, confirmed, submitting, refreshProfile])

  if (!required) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
        {underage ? (
          <div className="text-center space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Adventure Log is {MIN_AGE}+</h2>
            <p className="text-sm text-muted-foreground">
              You must be at least {MIN_AGE} years old to use Adventure Log. Your account will be signed out.
            </p>
            <Button onClick={() => signOut()} className="w-full">
              Sign out
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-6 w-6 text-primary shrink-0" aria-hidden="true" />
              <div>
                <h2 className="text-lg font-semibold text-foreground">Confirm your age</h2>
                <p className="text-sm text-muted-foreground">
                  Adventure Log is an {MIN_AGE}+ service. Please confirm your date of birth to continue.
                </p>
              </div>
            </div>

            <div>
              <label htmlFor="age-gate-dob" className="block text-sm font-medium text-foreground mb-1.5">
                Date of birth
              </label>
              <input
                id="age-gate-dob"
                type="date"
                value={dob}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => { setDob(e.target.value); setError(null) }}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <label className="flex items-start gap-2 text-sm text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => { setConfirmed(e.target.checked); setError(null) }}
                className="mt-0.5 h-4 w-4 rounded border-input cursor-pointer"
              />
              <span>I confirm I am {MIN_AGE} years of age or older.</span>
            </label>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button onClick={submit} disabled={submitting} className="w-full cursor-pointer">
              {submitting ? 'Saving…' : 'Continue'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
