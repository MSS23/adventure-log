'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Bug, Lightbulb, Heart, MessageSquare, Loader2 } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { apiFetch } from '@/lib/api/client'
import { cn } from '@/lib/utils'

const CATEGORIES = [
  { value: 'bug', label: 'Bug', icon: Bug },
  { value: 'idea', label: 'Idea', icon: Lightbulb },
  { value: 'praise', label: 'Praise', icon: Heart },
  { value: 'other', label: 'Other', icon: MessageSquare },
] as const

type Category = (typeof CATEGORIES)[number]['value']

interface FeedbackDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Controlled feedback dialog. Posts to /api/feedback, which stores the message
 * and fans it out to Linear + Discord. Reusable from any trigger (user menu,
 * settings, contact page) — see {@link FeedbackLauncher} for a self-contained
 * button + dialog.
 */
export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  const { user } = useAuth()
  const [category, setCategory] = useState<Category>('idea')
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const reset = () => {
    setCategory('idea')
    setMessage('')
    setEmail('')
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const submit = async () => {
    if (message.trim().length < 3) {
      toast.error('Please add a bit more detail')
      return
    }
    setSubmitting(true)
    try {
      const res = await apiFetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          message: message.trim(),
          email: email.trim() || undefined,
          pageUrl: typeof window !== 'undefined' ? window.location.href : undefined,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Something went wrong. Please try again.')
      }
      const body = await res.json() as {
        delivery?: { stored?: boolean; discord?: boolean }
      }
      if (body.delivery?.discord) {
        toast.success('Thanks! Your feedback reached the team.')
      } else if (body.delivery?.stored) {
        toast.success('Thanks! Your feedback was saved for the team.')
      } else {
        toast.warning('Feedback received, but delivery could not be confirmed.')
      }
      reset()
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send feedback')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send feedback</DialogTitle>
          <DialogDescription>
            Found a bug or have an idea? Tell us — it goes straight to the team.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Category picker */}
          <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Feedback type">
            {CATEGORIES.map((c) => {
              const Icon = c.icon
              const active = category === c.value
              return (
                <button
                  key={c.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setCategory(c.value)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-medium transition-all cursor-pointer min-h-[60px] justify-center active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    active
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:bg-muted/60'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {c.label}
                </button>
              )
            })}
          </div>

          {/* Message */}
          <div className="space-y-1.5">
            <Label htmlFor="feedback-message" className="text-xs font-medium text-foreground">
              Your feedback
            </Label>
            <Textarea
              id="feedback-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              maxLength={4000}
              placeholder="What's on your mind?"
              className="resize-none text-sm"
            />
          </div>

          {/* Email — only asked of signed-out users (we already know signed-in ones) */}
          {!user && (
            <div className="space-y-1.5">
              <Label htmlFor="feedback-email" className="text-xs font-medium text-foreground">
                Email <span className="text-muted-foreground">(optional, for a reply)</span>
              </Label>
              <Input
                id="feedback-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="text-sm min-h-[44px]"
              />
            </div>
          )}

          <Button
            onClick={submit}
            disabled={submitting || message.trim().length < 3}
            className="w-full min-h-[44px]"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Sending…
              </>
            ) : (
              'Send feedback'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
