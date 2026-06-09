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
        <div className="bg-white dark:bg-[#1B170E] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md sm:mx-4 shadow-2xl overflow-hidden border border-stone-200/60 dark:border-white/[0.08] animate-in slide-in-from-bottom sm:zoom-in-95 fade-in duration-300 max-h-[92vh] overflow-y-auto">
          {/* Header */}
          <div className="relative bg-gradient-to-br from-olive-500 via-olive-600 to-olive-700 px-6 py-8 text-white">
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute top-4 right-4 p-2 hover:bg-white/15 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4 ring-1 ring-white/25 shadow-lg shadow-black/10">
                <Share2 className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Invite Friends</h2>
              <p className="text-white/85 text-sm max-w-xs mx-auto">
                Share your adventures and grow the community together
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6 space-y-5">
            {/* Copy Link */}
            <div>
              <label className="block text-sm font-semibold text-stone-700 dark:text-stone-300 mb-2">
                Share your invite link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inviteUrl}
                  readOnly
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 min-w-0 px-4 py-3 bg-stone-50 dark:bg-white/[0.04] border border-stone-200 dark:border-white/[0.10] rounded-lg text-stone-700 dark:text-stone-300 text-sm font-mono truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive-500/60"
                />
                <Button
                  onClick={handleCopyLink}
                  aria-label={copied ? 'Link copied' : 'Copy invite link'}
                  className={`shrink-0 gap-1.5 px-4 transition-all duration-200 active:scale-[0.97] ${
                    copied
                      ? 'bg-green-500 hover:bg-green-600'
                      : 'bg-olive-500 hover:bg-olive-600'
                  } text-white`}
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
                  <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Link copied to clipboard!
                  </p>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-stone-200 dark:border-white/[0.10]" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-white dark:bg-[#1B170E] text-stone-500 dark:text-stone-400">Or share via</span>
              </div>
            </div>

            {/* Share Buttons */}
            <div className="space-y-3">
              <Button
                onClick={handleShareEmail}
                variant="outline"
                className="w-full justify-start gap-3 py-6 border-stone-300 dark:border-white/[0.14] hover:bg-stone-50 dark:hover:bg-white/[0.06]"
              >
                <div className="p-2 bg-olive-100 dark:bg-olive-500/20 rounded-lg">
                  <Mail className="h-5 w-5 text-olive-600 dark:text-olive-300" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-semibold text-stone-900 dark:text-stone-100">Email</div>
                  <div className="text-xs text-stone-500 dark:text-stone-400">Send via email client</div>
                </div>
              </Button>

              <Button
                onClick={handleShareSMS}
                variant="outline"
                className="w-full justify-start gap-3 py-6 border-stone-300 dark:border-white/[0.14] hover:bg-stone-50 dark:hover:bg-white/[0.06]"
              >
                <div className="p-2 bg-green-100 dark:bg-green-500/20 rounded-lg">
                  <MessageSquare className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-semibold text-stone-900 dark:text-stone-100">Text Message</div>
                  <div className="text-xs text-stone-500 dark:text-stone-400">Share via SMS</div>
                </div>
              </Button>

              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <Button
                  onClick={handleNativeShare}
                  variant="outline"
                  className="w-full justify-start gap-3 py-6 border-stone-300 dark:border-white/[0.14] hover:bg-stone-50 dark:hover:bg-white/[0.06]"
                >
                  <div className="p-2 bg-olive-100 dark:bg-olive-500/20 rounded-lg">
                    <Share2 className="h-5 w-5 text-olive-600 dark:text-olive-300" />
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-semibold text-stone-900 dark:text-stone-100">More Options</div>
                    <div className="text-xs text-stone-500 dark:text-stone-400">Share via other apps</div>
                  </div>
                </Button>
              )}
            </div>

            {/* Benefits */}
            <div className="p-4 bg-olive-50 dark:bg-olive-950/20 rounded-lg border border-olive-100 dark:border-white/[0.08] mt-6">
              <h3 className="text-sm font-semibold text-olive-900 dark:text-olive-200 mb-2">
                Why invite friends?
              </h3>
              <ul className="space-y-1.5 text-xs text-olive-700 dark:text-olive-300/90">
                <li className="flex gap-2"><Check className="h-3.5 w-3.5 mt-px shrink-0 text-olive-500 dark:text-olive-400" />Share and discover travel inspiration together</li>
                <li className="flex gap-2"><Check className="h-3.5 w-3.5 mt-px shrink-0 text-olive-500 dark:text-olive-400" />Follow each other&apos;s adventures in real-time</li>
                <li className="flex gap-2"><Check className="h-3.5 w-3.5 mt-px shrink-0 text-olive-500 dark:text-olive-400" />Collaborate on trip planning</li>
                <li className="flex gap-2"><Check className="h-3.5 w-3.5 mt-px shrink-0 text-olive-500 dark:text-olive-400" />Build your travel community</li>
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-stone-50 dark:bg-white/[0.04] border-t border-stone-200 dark:border-white/[0.10]">
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
