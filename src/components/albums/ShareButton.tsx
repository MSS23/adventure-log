'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Share2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Toast } from '@capacitor/toast'
import { useAuth } from '@/components/auth/AuthProvider'
import { getWebOrigin, withRef } from '@/lib/utils/native-routes'
import { trackGrowthEvent } from '@/lib/utils/growth-events'

interface ShareButtonProps {
  albumId: string
  albumTitle: string
  shareUrl?: string
  variant?: 'default' | 'minimal' | 'icon'
  className?: string
}

/**
 * Share affordance. Uses the native OS share sheet (Web Share API) when
 * available — which on mobile/PWA is the system share UI — and falls back to
 * copying the link with a toast on platforms without it. The previous
 * white drop-down ("quick share") popup was removed in favour of this.
 *
 * The link is always the PUBLIC album viewer on the web origin (never
 * window.location.href, which is capacitor://localhost inside the APK and an
 * auth-walled /albums/{id} on web) and carries the sharer's ?ref= handle so
 * signups from the link auto-follow them.
 */
export function ShareButton({
  albumId,
  albumTitle,
  shareUrl,
  variant = 'default',
  className,
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false)
  const { profile } = useAuth()

  const currentUrl = withRef(
    shareUrl || `${getWebOrigin()}/albums/${albumId}/public`,
    profile?.username
  )

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl)
      setCopied(true)
      await Toast.show({ text: 'Link copied!', duration: 'short' })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      await Toast.show({ text: 'Failed to copy link', duration: 'short' })
    }
  }

  const handleShare = async () => {
    trackGrowthEvent('share_link_created', { meta: { surface: 'album_share_button' } })
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: albumTitle,
          text: `Check out "${albumTitle}" on Roamkeep!`,
          url: currentUrl,
        })
        return
      } catch (err) {
        // User cancelled — do nothing. Any other error falls through to copy.
        if ((err as Error).name === 'AbortError') return
      }
    }
    await copyLink()
  }

  if (variant === 'icon') {
    return (
      <motion.button
        type="button"
        onClick={handleShare}
        aria-label="Share album"
        className={cn(
          'p-2 rounded-full text-stone-600 dark:text-stone-400 hover:text-olive-600 hover:bg-olive-50 dark:hover:bg-white/[0.06] transition-colors',
          className,
        )}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        {copied ? <Check className="h-5 w-5 text-green-500" /> : <Share2 className="h-5 w-5" />}
      </motion.button>
    )
  }

  if (variant === 'minimal') {
    return (
      <motion.button
        type="button"
        onClick={handleShare}
        className={cn(
          'flex items-center gap-2 text-stone-600 dark:text-stone-400 hover:text-olive-600 transition-colors',
          className,
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {copied ? <Check className="h-5 w-5 text-green-500" /> : <Share2 className="h-5 w-5" />}
        <span className="text-sm font-medium">{copied ? 'Copied!' : 'Share'}</span>
      </motion.button>
    )
  }

  // Default variant
  return (
    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
      <Button
        variant="outline"
        onClick={handleShare}
        className={cn(
          'border-olive-300 text-olive-700 hover:bg-olive-50 hover:border-olive-400 dark:border-white/[0.1] dark:text-stone-300 dark:hover:bg-white/[0.06]',
          className,
        )}
      >
        {copied ? <Check className="h-4 w-4 mr-2 text-green-500" /> : <Share2 className="h-4 w-4 mr-2" />}
        {copied ? 'Copied!' : 'Share Album'}
      </Button>
    </motion.div>
  )
}
