'use client'

import { useState, useCallback } from 'react'
import { Link, MessageCircle, Twitter, Send, Mail, Check } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface SocialShareButtonsProps {
  albumId: string
  albumTitle: string
  albumCoverUrl?: string
  locationName?: string
  className?: string
}

interface ShareOption {
  name: string
  icon: typeof Link
  ariaLabel: string
  hoverColor: string
  action: () => void
}

export function SocialShareButtons({
  albumId,
  albumTitle,
  albumCoverUrl,
  locationName,
  className,
}: SocialShareButtonsProps) {
  const [copied, setCopied] = useState(false)

  const getShareUrl = useCallback(() => {
    if (typeof window === 'undefined') return ''
    return `${window.location.origin}/albums/${albumId}`
  }, [albumId])

  const shareText = `Check out "${albumTitle}" on Adventure Log`

  const handleCopyLink = useCallback(async () => {
    const url = getShareUrl()
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('Link copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy link')
    }
  }, [getShareUrl])

  const openShareWindow = useCallback((url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=400')
  }, [])

  const handleWhatsApp = useCallback(() => {
    const url = getShareUrl()
    const text = `Check out "${albumTitle}" on Adventure Log: ${url}`
    openShareWindow(`https://wa.me/?text=${encodeURIComponent(text)}`)
  }, [albumTitle, getShareUrl, openShareWindow])

  const handleTwitter = useCallback(() => {
    const url = getShareUrl()
    openShareWindow(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`
    )
  }, [shareText, getShareUrl, openShareWindow])

  const handleTelegram = useCallback(() => {
    const url = getShareUrl()
    openShareWindow(
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText)}`
    )
  }, [shareText, getShareUrl, openShareWindow])

  const handleEmail = useCallback(() => {
    const url = getShareUrl()
    const subject = `${albumTitle} on Adventure Log`
    const body = `Check out this travel album: ${url}`
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }, [albumTitle, getShareUrl])

  const shareOptions: ShareOption[] = [
    {
      name: 'Copy Link',
      icon: copied ? Check : Link,
      ariaLabel: copied ? 'Link copied' : 'Copy link to clipboard',
      hoverColor: copied
        ? 'bg-olive-100 text-olive-700 dark:bg-olive-800/40 dark:text-olive-300'
        : 'hover:bg-olive-50 hover:text-olive-700 dark:hover:bg-olive-900/30 dark:hover:text-olive-300',
      action: handleCopyLink,
    },
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      ariaLabel: 'Share on WhatsApp',
      hoverColor: 'hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-900/20 dark:hover:text-green-400',
      action: handleWhatsApp,
    },
    {
      name: 'Twitter',
      icon: Twitter,
      ariaLabel: 'Share on Twitter',
      hoverColor: 'hover:bg-sky-50 hover:text-sky-600 dark:hover:bg-sky-900/20 dark:hover:text-sky-400',
      action: handleTwitter,
    },
    {
      name: 'Telegram',
      icon: Send,
      ariaLabel: 'Share on Telegram',
      hoverColor: 'hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20 dark:hover:text-blue-400',
      action: handleTelegram,
    },
    {
      name: 'Email',
      icon: Mail,
      ariaLabel: 'Share via email',
      hoverColor: 'hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-300',
      action: handleEmail,
    },
  ]

  return (
    <div className={cn('flex items-center gap-2', className)} role="group" aria-label="Share album">
      {shareOptions.map((option) => {
        const Icon = option.icon
        return (
          <button
            key={option.name}
            onClick={option.action}
            className={cn(
              'flex items-center justify-center w-10 h-10 rounded-full',
              'border border-stone-200 dark:border-stone-700',
              'text-stone-500 dark:text-stone-400',
              'transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-olive-500/50 focus:ring-offset-1',
              option.hoverColor
            )}
            aria-label={option.ariaLabel}
            title={option.name}
          >
            <Icon className="h-[18px] w-[18px]" />
          </button>
        )
      })}
    </div>
  )
}
