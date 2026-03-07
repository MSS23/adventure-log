'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Share2, Link2, Check, Twitter, Facebook, MessageCircle, QrCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ShareAlbumDialog } from './ShareAlbumDialog'
import { cn } from '@/lib/utils'
import { Toast } from '@capacitor/toast'

interface ShareButtonProps {
  albumId: string
  albumTitle: string
  shareUrl?: string
  variant?: 'default' | 'minimal' | 'icon'
  className?: string
}

export function ShareButton({
  albumId,
  albumTitle,
  shareUrl,
  variant = 'default',
  className
}: ShareButtonProps) {
  const [showQuickShare, setShowQuickShare] = useState(false)
  const [copied, setCopied] = useState(false)

  const currentUrl = shareUrl || (typeof window !== 'undefined' ? window.location.href : '')

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl)
      setCopied(true)
      await Toast.show({ text: 'Link copied!', duration: 'short' })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      await Toast.show({ text: 'Failed to copy link', duration: 'short' })
    }
  }

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: albumTitle,
          text: `Check out "${albumTitle}" on Adventure Log!`,
          url: currentUrl
        })
      } catch (err) {
        // User cancelled or error
        if ((err as Error).name !== 'AbortError') {
          setShowQuickShare(true)
        }
      }
    } else {
      setShowQuickShare(true)
    }
  }

  const shareLinks = [
    {
      name: 'Twitter',
      icon: Twitter,
      color: 'hover:bg-sky-50 hover:text-sky-600',
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out "${albumTitle}" on Adventure Log!`)}&url=${encodeURIComponent(currentUrl)}`
    },
    {
      name: 'Facebook',
      icon: Facebook,
      color: 'hover:bg-blue-50 hover:text-blue-600',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`
    },
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      color: 'hover:bg-green-50 hover:text-green-600',
      url: `https://wa.me/?text=${encodeURIComponent(`Check out "${albumTitle}" on Adventure Log! ${currentUrl}`)}`
    }
  ]

  if (variant === 'icon') {
    return (
      <div className={cn("relative", className)}>
        <motion.button
          onClick={handleNativeShare}
          className="p-2 rounded-full text-gray-600 hover:text-teal-600 hover:bg-teal-50 transition-colors"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <Share2 className="h-5 w-5" />
        </motion.button>

        <AnimatePresence>
          {showQuickShare && (
            <>
              <motion.div
                className="fixed inset-0 bg-black/20 z-40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowQuickShare(false)}
              />
              <motion.div
                className="absolute right-0 top-full mt-2 z-50 bg-white rounded-xl shadow-xl border border-gray-100 p-3 min-w-[200px]"
                initial={{ opacity: 0, scale: 0.9, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                <div className="space-y-1">
                  <motion.button
                    onClick={handleCopyLink}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    whileTap={{ scale: 0.98 }}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Link2 className="h-4 w-4" />
                    )}
                    <span className="text-sm font-medium">
                      {copied ? 'Copied!' : 'Copy Link'}
                    </span>
                  </motion.button>

                  {shareLinks.map((link) => (
                    <motion.a
                      key={link.name}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 transition-colors",
                        link.color
                      )}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowQuickShare(false)}
                    >
                      <link.icon className="h-4 w-4" />
                      <span className="text-sm font-medium">{link.name}</span>
                    </motion.a>
                  ))}

                  <ShareAlbumDialog
                    albumId={albumId}
                    albumTitle={albumTitle}
                    trigger={
                      <motion.button
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition-colors"
                        whileTap={{ scale: 0.98 }}
                      >
                        <QrCode className="h-4 w-4" />
                        <span className="text-sm font-medium">More Options</span>
                      </motion.button>
                    }
                  />
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    )
  }

  if (variant === 'minimal') {
    return (
      <ShareAlbumDialog
        albumId={albumId}
        albumTitle={albumTitle}
        trigger={
          <motion.button
            className={cn(
              "flex items-center gap-2 text-gray-600 hover:text-teal-600 transition-colors",
              className
            )}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Share2 className="h-5 w-5" />
            <span className="text-sm font-medium">Share</span>
          </motion.button>
        }
      />
    )
  }

  // Default variant
  return (
    <ShareAlbumDialog
      albumId={albumId}
      albumTitle={albumTitle}
      trigger={
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button
            variant="outline"
            className={cn(
              "border-teal-300 text-teal-700 hover:bg-teal-50 hover:border-teal-400",
              className
            )}
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share Album
          </Button>
        </motion.div>
      }
    />
  )
}
