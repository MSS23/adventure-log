'use client'

import React, { useState } from 'react'
import { ReactionPicker } from './ReactionPicker'
import { useGlobeReactions } from '@/lib/hooks/useGlobeReactions'
import type { GlobeReactionType } from '@/types/database'
import { instagramStyles } from '@/lib/design-tokens'

interface ReactionButtonProps {
  targetUserId: string
  targetAlbumId?: string
  latitude?: number
  longitude?: number
  locationName?: string
  countryCode?: string
  compact?: boolean
  className?: string
  onReactionCreated?: () => void
}

export function ReactionButton({
  targetUserId,
  targetAlbumId,
  latitude,
  longitude,
  locationName,
  countryCode,
  compact = false,
  className = '',
  onReactionCreated
}: ReactionButtonProps) {
  const [showPicker, setShowPicker] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { reactionTypes, createReaction } = useGlobeReactions()

  const handleReactionSelect = async (type: GlobeReactionType, message?: string) => {
    setIsSubmitting(true)
    try {
      await createReaction({
        target_type: targetAlbumId ? 'album' : 'globe_point',
        target_user_id: targetUserId,
        target_album_id: targetAlbumId,
        reaction_type: type.id,
        sticker_emoji: type.emoji,
        latitude,
        longitude,
        location_name: locationName,
        country_code: countryCode,
        message,
        is_public: true
      })

      setShowPicker(false)
      onReactionCreated?.()
    } catch (error) {
      console.error('Failed to create reaction:', error)
      alert('Failed to create reaction. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (compact) {
    return (
      <>
        <button
          onClick={() => setShowPicker(true)}
          className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${className}`}
          title="Add reaction"
          disabled={isSubmitting}
        >
          <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>

        {showPicker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <ReactionPicker
              reactionTypes={reactionTypes}
              onSelect={handleReactionSelect}
              onClose={() => setShowPicker(false)}
            />
          </div>
        )}
      </>
    )
  }

  return (
    <>
      <button
        onClick={() => setShowPicker(true)}
        className={`${instagramStyles.button.secondary} flex items-center gap-2 ${className}`}
        disabled={isSubmitting}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Add Reaction</span>
      </button>

      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <ReactionPicker
            reactionTypes={reactionTypes}
            onSelect={handleReactionSelect}
            onClose={() => setShowPicker(false)}
          />
        </div>
      )}
    </>
  )
}
