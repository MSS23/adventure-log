'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Share2,
  Link2,
  Check,
  Twitter,
  Facebook,
  MessageCircle,
  Mail,
  QrCode,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Toast } from '@capacitor/toast'
import QRCode from 'qrcode'

interface AlbumSocialShareProps {
  url: string
  title: string
  description?: string
  className?: string
  variant?: 'horizontal' | 'vertical' | 'floating'
}

export function AlbumSocialShare({
  url,
  title,
  description,
  className,
  variant = 'horizontal'
}: AlbumSocialShareProps) {
  const [copied, setCopied] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  useEffect(() => {
    if (showQR && !qrDataUrl) {
      QRCode.toDataURL(url, {
        width: 200,
        margin: 2,
        color: {
          dark: '#0d9488',
          light: '#ffffff'
        }
      }).then(setQrDataUrl)
    }
  }, [showQR, url, qrDataUrl])

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url)
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
          title,
          text: description || `Check out "${title}" on Adventure Log!`,
          url
        })
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          handleCopyLink()
        }
      }
    } else {
      handleCopyLink()
    }
  }

  const shareLinks = [
    {
      name: 'Twitter',
      icon: Twitter,
      color: 'hover:bg-sky-500 hover:text-white',
      bgColor: 'bg-sky-100 text-sky-600',
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out "${title}" on Adventure Log!`)}&url=${encodeURIComponent(url)}`
    },
    {
      name: 'Facebook',
      icon: Facebook,
      color: 'hover:bg-blue-600 hover:text-white',
      bgColor: 'bg-blue-100 text-blue-600',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
    },
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      color: 'hover:bg-green-500 hover:text-white',
      bgColor: 'bg-green-100 text-green-600',
      url: `https://wa.me/?text=${encodeURIComponent(`Check out "${title}" on Adventure Log! ${url}`)}`
    },
    {
      name: 'Email',
      icon: Mail,
      color: 'hover:bg-gray-700 hover:text-white',
      bgColor: 'bg-gray-100 text-gray-600',
      url: `mailto:?subject=${encodeURIComponent(`Check out "${title}"`)}&body=${encodeURIComponent(`I thought you might enjoy this travel album: ${url}`)}`
    }
  ]

  if (variant === 'floating') {
    return (
      <motion.div
        className={cn(
          "fixed bottom-24 right-4 md:bottom-8 md:right-8 z-40",
          className
        )}
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <motion.button
          onClick={handleNativeShare}
          className="w-14 h-14 rounded-full bg-teal-500 text-white shadow-lg flex items-center justify-center"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <Share2 className="h-6 w-6" />
        </motion.button>
      </motion.div>
    )
  }

  if (variant === 'vertical') {
    return (
      <div className={cn("space-y-3", className)}>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Share this journey</h3>

        <div className="grid grid-cols-2 gap-2">
          {shareLinks.map((link) => (
            <motion.a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "flex items-center gap-2 p-3 rounded-xl transition-all",
                link.bgColor,
                link.color
              )}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <link.icon className="h-4 w-4" />
              <span className="text-sm font-medium">{link.name}</span>
            </motion.a>
          ))}
        </div>

        <div className="flex gap-2 mt-4">
          <motion.button
            onClick={handleCopyLink}
            className="flex-1 flex items-center justify-center gap-2 p-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Copied!</span>
              </>
            ) : (
              <>
                <Link2 className="h-4 w-4" />
                <span className="text-sm font-medium">Copy Link</span>
              </>
            )}
          </motion.button>

          <motion.button
            onClick={() => setShowQR(true)}
            className="p-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <QrCode className="h-4 w-4" />
          </motion.button>
        </div>

        {/* QR Code Modal */}
        <AnimatePresence>
          {showQR && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowQR(false)}
            >
              <motion.div
                className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Scan QR Code</h3>
                  <button
                    onClick={() => setShowQR(false)}
                    className="p-1 rounded-full hover:bg-gray-100"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex justify-center p-4 bg-gray-50 rounded-xl">
                  {qrDataUrl ? (
                    <img src={qrDataUrl} alt="QR Code" className="w-48 h-48" />
                  ) : (
                    <div className="w-48 h-48 bg-gray-200 animate-pulse rounded-lg" />
                  )}
                </div>

                <p className="text-center text-sm text-gray-500 mt-4">
                  Scan to open this album on your phone
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // Horizontal variant (default)
  return (
    <div className={cn("flex items-center gap-3 flex-wrap", className)}>
      <span className="text-sm font-medium text-gray-500">Share:</span>

      <div className="flex items-center gap-2">
        {shareLinks.map((link) => (
          <motion.a
            key={link.name}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "p-2 rounded-full transition-all",
              link.bgColor,
              link.color
            )}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.95 }}
            title={`Share on ${link.name}`}
          >
            <link.icon className="h-4 w-4" />
          </motion.a>
        ))}

        <motion.button
          onClick={handleCopyLink}
          className={cn(
            "p-2 rounded-full transition-all",
            copied
              ? "bg-green-100 text-green-600"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          )}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.95 }}
          title="Copy Link"
        >
          {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
        </motion.button>

        <motion.button
          onClick={() => setShowQR(true)}
          className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.95 }}
          title="Show QR Code"
        >
          <QrCode className="h-4 w-4" />
        </motion.button>
      </div>

      {/* QR Code Modal */}
      <AnimatePresence>
        {showQR && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowQR(false)}
          >
            <motion.div
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Scan QR Code</h3>
                <button
                  onClick={() => setShowQR(false)}
                  className="p-1 rounded-full hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex justify-center p-4 bg-gray-50 rounded-xl">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="QR Code" className="w-48 h-48" />
                ) : (
                  <div className="w-48 h-48 bg-gray-200 animate-pulse rounded-lg" />
                )}
              </div>

              <p className="text-center text-sm text-gray-500 mt-4">
                Scan to open this album on your phone
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
