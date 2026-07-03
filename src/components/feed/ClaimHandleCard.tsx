'use client'

/**
 * ClaimHandleCard — new email signups get a machine handle (user_1a2b3c4d)
 * from the DB trigger, which then poisons every social surface: "Travelers to
 * follow", share links, referral URLs. One dismissible card on the Feed asks
 * them to claim a real handle in-place. Disappears forever once claimed or
 * dismissed.
 */

import { useState } from 'react'
import { AtSign, X, Loader2, Check } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const DISMISS_KEY = 'al-claim-handle-dismissed'
const MACHINE_HANDLE_RE = /^user_[a-z0-9]{6,}$/i
const VALID_HANDLE_RE = /^[a-zA-Z0-9_]{3,30}$/

export function ClaimHandleCard() {
  const { user, profile, refreshProfile } = useAuth()
  const [handle, setHandle] = useState('')
  const [saving, setSaving] = useState(false)
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1'
    } catch {
      return false
    }
  })

  // Only for signed-in users still carrying the trigger-generated handle.
  if (!user || !profile?.username || !MACHINE_HANDLE_RE.test(profile.username) || dismissed) {
    return null
  }

  const dismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // ignore
    }
  }

  const save = async () => {
    const next = handle.trim().toLowerCase()
    if (!VALID_HANDLE_RE.test(next)) {
      toast.error('3–30 characters — letters, numbers, and underscores only')
      return
    }
    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('users')
        .update({ username: next })
        .eq('id', user.id)
      if (error) {
        if (error.code === '23505') {
          toast.error(`@${next} is taken — try another`)
        } else {
          toast.error('Could not save your handle. Try again.')
        }
        return
      }
      await refreshProfile()
      toast.success(`You're @${next}!`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <AtSign className="h-4 w-4 text-primary shrink-0" />
          <h3 className="font-heading text-base font-semibold text-foreground">
            Claim your handle
          </h3>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="text-muted-foreground hover:text-foreground cursor-pointer p-1 rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="text-sm text-muted-foreground mt-1 mb-3">
        You&apos;re currently @{profile.username} — pick a name friends will recognize on your
        shares and globe.
      </p>
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-xs">
          <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                save()
              }
            }}
            placeholder="yourname"
            className="pl-9"
            maxLength={30}
          />
        </div>
        <Button onClick={save} disabled={saving || !handle.trim()} className="gap-1.5 shrink-0">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Claim
        </Button>
      </div>
    </div>
  )
}
