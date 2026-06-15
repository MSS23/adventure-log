'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, Globe, Instagram, Twitter } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useHaptics } from '@/lib/hooks/useHaptics'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'

interface BioEditorProps {
  value: string
  onChange: (value: string) => void
  maxLength?: number
  placeholder?: string
  className?: string
}

const MAX_BIO_LENGTH = 150

export function BioEditor({
  value,
  onChange,
  maxLength = MAX_BIO_LENGTH,
  placeholder = "Tell us about your travel adventures...",
  className,
}: BioEditorProps) {
  const [isFocused, setIsFocused] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const prefersReducedMotion = useReducedMotion()
  const { triggerLight } = useHaptics()

  const charCount = value.length
  const isNearLimit = charCount > maxLength * 0.8
  const isAtLimit = charCount >= maxLength

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    if (newValue.length <= maxLength) {
      onChange(newValue)
    } else {
      triggerLight()
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div
        className={cn(
          'relative rounded-xl border-2 transition-all',
          isFocused
            ? 'border-olive-400 shadow-sm shadow-olive-100'
            : 'border-stone-200 dark:border-white/[0.10] hover:border-stone-300 dark:hover:border-white/[0.12]'
        )}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className={cn(
            'w-full px-4 py-3 bg-transparent resize-none text-stone-800 dark:text-stone-200',
            'placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none',
            'min-h-[80px]'
          )}
          rows={3}
        />

        {/* Character counter */}
        <div className="absolute bottom-2 right-3 flex items-center gap-2">
          <AnimatePresence>
            {isFocused && (
              <motion.span
                initial={prefersReducedMotion ? {} : { opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReducedMotion ? {} : { opacity: 0, y: 5 }}
                className={cn(
                  'text-xs font-medium',
                  isAtLimit
                    ? 'text-red-500'
                    : isNearLimit
                    ? 'text-olive-500'
                    : 'text-stone-400 dark:text-stone-500'
                )}
              >
                {charCount}/{maxLength}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Character limit warning */}
      <AnimatePresence>
        {isAtLimit && (
          <motion.p
            initial={prefersReducedMotion ? {} : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={prefersReducedMotion ? {} : { opacity: 0, height: 0 }}
            className="text-xs text-red-500"
          >
            Bio has reached the maximum length
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

// Social links editor
interface SocialLink {
  platform: 'website' | 'instagram' | 'twitter'
  url: string
}

interface SocialLinksEditorProps {
  links: SocialLink[]
  onChange: (links: SocialLink[]) => void
  className?: string
}

const socialPlatforms = [
  { id: 'website' as const, label: 'Website', icon: Globe, placeholder: 'https://yourwebsite.com' },
  { id: 'instagram' as const, label: 'Instagram', icon: Instagram, placeholder: '@username' },
  { id: 'twitter' as const, label: 'Twitter', icon: Twitter, placeholder: '@username' },
]

export function SocialLinksEditor({
  links,
  onChange,
  className,
}: SocialLinksEditorProps) {
  const [editingPlatform, setEditingPlatform] = useState<string | null>(null)
  const { triggerSelection } = useHaptics()
  const _prefersReducedMotion = useReducedMotion()

  const getLinkValue = (platform: string) => {
    return links.find((l) => l.platform === platform)?.url || ''
  }

  const handleLinkChange = (platform: SocialLink['platform'], url: string) => {
    const existingIndex = links.findIndex((l) => l.platform === platform)

    if (url.trim() === '') {
      // Remove link
      onChange(links.filter((l) => l.platform !== platform))
    } else if (existingIndex >= 0) {
      // Update existing
      const newLinks = [...links]
      newLinks[existingIndex] = { platform, url }
      onChange(newLinks)
    } else {
      // Add new
      onChange([...links, { platform, url }])
    }
  }

  return (
    <div className={cn('space-y-3', className)}>
      <label className="text-sm font-medium text-stone-700 dark:text-stone-300">Social Links</label>

      <div className="space-y-2">
        {socialPlatforms.map((platform) => {
          const Icon = platform.icon
          const currentValue = getLinkValue(platform.id)
          const isEditing = editingPlatform === platform.id
          const hasValue = currentValue.length > 0

          return (
            <motion.div
              key={platform.id}
              className={cn(
                'flex items-center gap-3 p-3 rounded-xl border transition-all',
                isEditing
                  ? 'border-olive-300 bg-olive-50/50 dark:bg-olive-950/20'
                  : hasValue
                  ? 'border-stone-200 dark:border-white/[0.10] bg-stone-50 dark:bg-white/[0.04]'
                  : 'border-stone-200 dark:border-white/[0.10] border-dashed'
              )}
              layout
            >
              <div
                className={cn(
                  'p-2 rounded-lg',
                  hasValue ? 'bg-olive-100 text-olive-600 dark:bg-olive-950/30' : 'bg-stone-100 dark:bg-white/[0.06] text-stone-400 dark:text-stone-500'
                )}
              >
                <Icon className="h-4 w-4" />
              </div>

              {isEditing ? (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                    value={currentValue}
                    onChange={(e) => handleLinkChange(platform.id, e.target.value)}
                    placeholder={platform.placeholder}
                    className="flex-1 bg-transparent text-sm focus:outline-none text-stone-800 dark:text-stone-200 placeholder:text-stone-400 dark:placeholder:text-stone-500"
                    autoFocus
                  />
                  <button
                    type="button"
                    aria-label={`Save ${platform.label} link`}
                    onClick={() => {
                      triggerSelection()
                      setEditingPlatform(null)
                    }}
                    className="p-1.5 rounded-lg bg-olive-500 text-white hover:bg-olive-600 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.97]"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Clear ${platform.label} link`}
                    onClick={() => {
                      handleLinkChange(platform.id, '')
                      setEditingPlatform(null)
                    }}
                    className="p-1.5 rounded-lg bg-stone-200 dark:bg-white/[0.08] text-stone-600 dark:text-stone-400 hover:bg-stone-300 dark:hover:bg-white/[0.06] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.97]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  aria-label={hasValue ? `Edit ${platform.label} link` : `Add ${platform.label} link`}
                  onClick={() => {
                    triggerSelection()
                    setEditingPlatform(platform.id)
                  }}
                  className="flex-1 text-left rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {hasValue ? (
                    <span className="text-sm text-stone-700 dark:text-stone-300">{currentValue}</span>
                  ) : (
                    <span className="text-sm text-stone-400 dark:text-stone-500">Add {platform.label}</span>
                  )}
                </button>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

// Combined profile about section
interface ProfileAboutEditorProps {
  bio: string
  onBioChange: (bio: string) => void
  socialLinks: SocialLink[]
  onSocialLinksChange: (links: SocialLink[]) => void
  travelStyles: string[]
  onTravelStylesChange: (styles: string[]) => void
  className?: string
}

export function ProfileAboutEditor({
  bio,
  onBioChange,
  socialLinks,
  onSocialLinksChange,
  travelStyles: _travelStyles,
  onTravelStylesChange: _onTravelStylesChange,
  className,
}: ProfileAboutEditorProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Bio */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-stone-700 dark:text-stone-300">About You</label>
        <BioEditor value={bio} onChange={onBioChange} />
      </div>

      {/* Social Links */}
      <SocialLinksEditor links={socialLinks} onChange={onSocialLinksChange} />

      {/* Travel Styles - imported from TravelStyleBadges */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-stone-700 dark:text-stone-300">Travel Style</label>
        {/* TravelStyleBadges component should be used here */}
        <p className="text-xs text-stone-500 dark:text-stone-400">
          Select up to 5 travel styles that best describe your adventures
        </p>
      </div>
    </div>
  )
}
