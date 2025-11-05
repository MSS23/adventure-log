'use client'

import { useState } from 'react'
import { X, Mail, MessageSquare, Copy, Share2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/auth/AuthProvider'

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
        console.error('Share failed:', err)
      }
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center z-50">
        <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md sm:mx-4 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="relative bg-gradient-to-br from-teal-500 to-cyan-600 px-6 py-8 text-white">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4">
                <Share2 className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Invite Friends</h2>
              <p className="text-teal-50 text-sm">
                Share your adventures and grow the community together
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6 space-y-5">
            {/* Copy Link */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Share your invite link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inviteUrl}
                  readOnly
                  className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-sm"
                />
                <Button
                  onClick={handleCopyLink}
                  className={`px-4 transition-all duration-200 ${
                    copied
                      ? 'bg-green-500 hover:bg-green-600'
                      : 'bg-teal-500 hover:bg-teal-600'
                  } text-white`}
                >
                  {copied ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Copy className="h-5 w-5" />
                  )}
                </Button>
              </div>
              {copied && (
                <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  Link copied to clipboard!
                </p>
              )}
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-white text-gray-500">Or share via</span>
              </div>
            </div>

            {/* Share Buttons */}
            <div className="space-y-3">
              <Button
                onClick={handleShareEmail}
                variant="outline"
                className="w-full justify-start gap-3 py-6 border-gray-300 hover:bg-gray-50"
              >
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Mail className="h-5 w-5 text-blue-600" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-semibold text-gray-900">Email</div>
                  <div className="text-xs text-gray-500">Send via email client</div>
                </div>
              </Button>

              <Button
                onClick={handleShareSMS}
                variant="outline"
                className="w-full justify-start gap-3 py-6 border-gray-300 hover:bg-gray-50"
              >
                <div className="p-2 bg-green-100 rounded-lg">
                  <MessageSquare className="h-5 w-5 text-green-600" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-semibold text-gray-900">Text Message</div>
                  <div className="text-xs text-gray-500">Share via SMS</div>
                </div>
              </Button>

              {navigator.share && (
                <Button
                  onClick={handleNativeShare}
                  variant="outline"
                  className="w-full justify-start gap-3 py-6 border-gray-300 hover:bg-gray-50"
                >
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Share2 className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-semibold text-gray-900">More Options</div>
                    <div className="text-xs text-gray-500">Share via other apps</div>
                  </div>
                </Button>
              )}
            </div>

            {/* Benefits */}
            <div className="p-4 bg-teal-50 rounded-lg border border-teal-100 mt-6">
              <h3 className="text-sm font-semibold text-teal-900 mb-2">
                Why invite friends?
              </h3>
              <ul className="space-y-1 text-xs text-teal-700">
                <li>• Share and discover travel inspiration together</li>
                <li>• Follow each other's adventures in real-time</li>
                <li>• Collaborate on trip planning</li>
                <li>• Build your travel community</li>
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
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
