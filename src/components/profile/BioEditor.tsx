'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, Smile, Link as LinkIcon, Globe, Instagram, Twitter } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useHaptics } from '@/lib/hooks/useHaptics'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { Button } from '@/components/ui/button'

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
            ? 'border-teal-400 shadow-sm shadow-teal-100'
            : 'border-gray-200 hover:border-gray-300'
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
            'w-full px-4 py-3 bg-transparent resize-none text-gray-800',
            'placeholder:text-gray-400 focus:outline-none',
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
                    ? 'text-amber-500'
                    : 'text-gray-400'
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
  const prefersReducedMotion = useReducedMotion()

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
      <label className="text-sm font-medium text-gray-700">Social Links</label>

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
                  ? 'border-teal-300 bg-teal-50/50'
                  : hasValue
                  ? 'border-gray-200 bg-gray-50'
                  : 'border-gray-200 border-dashed'
              )}
              layout
            >
              <div
                className={cn(
                  'p-2 rounded-lg',
                  hasValue ? 'bg-teal-100 text-teal-600' : 'bg-gray-100 text-gray-400'
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
                    className="flex-1 bg-transparent text-sm focus:outline-none text-gray-800 placeholder:text-gray-400"
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      triggerSelection()
                      setEditingPlatform(null)
                    }}
                    className="p-1.5 rounded-lg bg-teal-500 text-white hover:bg-teal-600"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      handleLinkChange(platform.id, '')
                      setEditingPlatform(null)
                    }}
                    className="p-1.5 rounded-lg bg-gray-200 text-gray-600 hover:bg-gray-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    triggerSelection()
                    setEditingPlatform(platform.id)
                  }}
                  className="flex-1 text-left"
                >
                  {hasValue ? (
                    <span className="text-sm text-gray-700">{currentValue}</span>
                  ) : (
                    <span className="text-sm text-gray-400">Add {platform.label}</span>
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
  travelStyles,
  onTravelStylesChange,
  className,
}: ProfileAboutEditorProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Bio */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">About You</label>
        <BioEditor value={bio} onChange={onBioChange} />
      </div>

      {/* Social Links */}
      <SocialLinksEditor links={socialLinks} onChange={onSocialLinksChange} />

      {/* Travel Styles - imported from TravelStyleBadges */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Travel Style</label>
        {/* TravelStyleBadges component should be used here */}
        <p className="text-xs text-gray-500">
          Select up to 5 travel styles that best describe your adventures
        </p>
      </div>
    </div>
  )
}
