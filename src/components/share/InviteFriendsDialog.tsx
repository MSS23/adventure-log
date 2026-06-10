'use client'

import { useState } from 'react'
import { X, Mail, MessageSquare, Copy, Share2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/auth/AuthProvider'
import { log } from '@/lib/utils/logger'

interface InviteFriendsDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function InviteFriendsDialog({ isOpen, onClose }: InviteFriendsDialogProps) {
  const { profile } = useAuth()
  const [copied, setCopied] = useState(false)

  const inviteUrl = typeof window !== 'undefined'
    ? `${window.location.origin}?ref=${profile?.username || 'friend'}`
    : ''

  const inviteMessage = `Join me on Adventure Log! 🌍✈️\n\nI'm using Adventure Log to track my travels and share adventures. Come check it out:\n\n${inviteUrl}\n\nLet's explore the world together!`

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShareEmail = () => {
    const subject = 'Join me on Adventure Log!'
    const body = inviteMessage
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  const handleShareSMS = () => {
    const smsBody = inviteMessage
    window.location.href = `sms:?body=${encodeURIComponent(smsBody)}`
  }

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me on Adventure Log!',
          text: inviteMessage,
          url: inviteUrl
        })
      } catch (err) {
        // User cancelled or error occurred
        log.error('Share failed', { component: 'InviteFriendsDialog', action: 'native-share' }, err as Error)
      }
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Invite friends"
        className="fixed inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center z-50"
      >
        <div className="bg-card rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md sm:mx-4 shadow-lg overflow-hidden border border-border animate-in slide-in-from-bottom sm:zoom-in-95 fade-in duration-300 max-h-[92vh] overflow-y-auto">
          {/* Header */}
          <div className="relative bg-primary px-6 py-8 text-primary-foreground">
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute top-4 right-4 p-2 hover:bg-primary-foreground/15 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/70"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-foreground/15 rounded-full mb-4 ring-1 ring-primary-foreground/25">
                <Share2 className="h-8 w-8" />
              </div>
              <h2 className="font-heading text-2xl font-bold mb-2">Invite Friends</h2>
              <p className="text-primary-foreground/85 text-sm max-w-xs mx-auto">
                Travel is better together. Send a friend your link — they join free in seconds.
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6 space-y-5">
            {/* Copy Link */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Share your invite link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inviteUrl}
                  readOnly
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 min-w-0 px-4 py-3 bg-muted/50 border border-border rounded-xl text-foreground text-sm font-mono truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <Button
                  onClick={handleCopyLink}
                  aria-label={copied ? 'Link copied' : 'Copy invite link'}
                  className="shrink-0 gap-1.5 px-4"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      <span className="text-sm font-medium">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      <span className="text-sm font-medium">Copy</span>
                    </>
                  )}
                </Button>
              </div>
              <div className="h-5 mt-2" aria-live="polite">
                {copied && (
                  <p className="text-xs text-primary flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Link copied to clipboard!
                  </p>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-card text-muted-foreground">Or share via</span>
              </div>
            </div>

            {/* Share Buttons — native share leads (lowest-friction, one tap
                on mobile to WhatsApp/iMessage/etc.), then email + SMS. */}
            <div className="space-y-3">
              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <Button
                  onClick={handleNativeShare}
                  variant="outline"
                  className="w-full justify-start gap-3 py-6 border-primary/30 bg-primary/5 hover:bg-primary/10"
                >
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Share2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-semibold text-foreground">Share</div>
                    <div className="text-xs text-muted-foreground">WhatsApp, Messages, and more</div>
                  </div>
                </Button>
              )}

              <Button
                onClick={handleShareEmail}
                variant="outline"
                className="w-full justify-start gap-3 py-6"
              >
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-semibold text-foreground">Email</div>
                  <div className="text-xs text-muted-foreground">Send via your email app</div>
                </div>
              </Button>

              <Button
                onClick={handleShareSMS}
                variant="outline"
                className="w-full justify-start gap-3 py-6"
              >
                <div className="p-2 bg-primary/10 rounded-lg">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-semibold text-foreground">Text Message</div>
                  <div className="text-xs text-muted-foreground">Share via SMS</div>
                </div>
              </Button>
            </div>

            {/* Benefits */}
            <div className="p-4 rounded-xl bg-muted/50 mt-6">
              <h3 className="text-sm font-semibold text-foreground mb-2">
                Why invite friends?
              </h3>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li className="flex gap-2"><Check className="h-3.5 w-3.5 mt-px shrink-0 text-primary" />Share and discover travel inspiration together</li>
                <li className="flex gap-2"><Check className="h-3.5 w-3.5 mt-px shrink-0 text-primary" />Follow each other&apos;s adventures in real-time</li>
                <li className="flex gap-2"><Check className="h-3.5 w-3.5 mt-px shrink-0 text-primary" />Collaborate on trip planning</li>
                <li className="flex gap-2"><Check className="h-3.5 w-3.5 mt-px shrink-0 text-primary" />Build your travel community</li>
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-muted/40 border-t border-border">
            <Button
              onClick={onClose}
              variant="outline"
              className="w-full"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
