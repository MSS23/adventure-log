'use client'

import { useState } from 'react'
import { useReactions, ReactionType } from '@/lib/hooks/useReactions'
import { useAuth } from '@/components/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { log } from '@/lib/utils/logger'

interface ReactionsProps {
  albumId?: string
  photoId?: string
  className?: string
}

const REACTION_EMOJIS: Record<ReactionType, { emoji: string; label: string }> = {
  joy: { emoji: '😄', label: 'Joy' },
  fire: { emoji: '🔥', label: 'Fire' },
  thumbsup: { emoji: '👍', label: 'Like' },
  heart: { emoji: '❤️', label: 'Love' },
  star: { emoji: '⭐', label: 'Star' },
  clap: { emoji: '👏', label: 'Clap' }
}

export function Reactions({ albumId, photoId, className }: ReactionsProps) {
  const { user } = useAuth()
  const {
    reactionCounts,
    userReactions,
    toggleReaction,
    hasUserReacted,
    totalReactions,
    loading,
    error
  } = useReactions({ albumId, photoId })

  const [showAll, setShowAll] = useState(false)

  const handleReactionClick = async (type: ReactionType) => {
    if (!user) {
      log.info('User must be logged in to react', {
        component: 'Reactions',
        action: 'reaction-attempt'
      })
      return
    }

    try {
      await toggleReaction(type)
    } catch (err) {
      log.error('Failed to toggle reaction', {
        component: 'Reactions',
        reactionType: type
      }, err)
    }
  }

  // Determine which reactions to show
  const visibleReactionTypes = showAll
    ? (Object.keys(REACTION_EMOJIS) as ReactionType[])
    : (Object.keys(REACTION_EMOJIS) as ReactionType[]).slice(0, 3)

  if (error) {
    log.error('Reactions error', { component: 'Reactions' }, new Error(error))
  }

  return (
    <div className={className}>
      {/* Reactions Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm font-medium text-gray-700">
          {totalReactions} {totalReactions === 1 ? 'Reaction' : 'Reactions'}
        </span>
      </div>

      {/* Reaction Buttons */}
      <div className="flex flex-wrap gap-2 mb-3">
        {visibleReactionTypes.map((type) => {
          const { emoji, label } = REACTION_EMOJIS[type]
          const count = reactionCounts[type] || 0
          const isActive = hasUserReacted(type)

          return (
            <Button
              key={type}
              variant="outline"
              size="sm"
              className={`
                relative group transition-all duration-200
                ${isActive
                  ? 'bg-blue-50 border-blue-400 hover:bg-blue-100'
                  : 'hover:bg-gray-50 border-gray-300'
                }
                ${!user ? 'cursor-not-allowed opacity-75' : ''}
              `}
              onClick={() => handleReactionClick(type)}
              disabled={loading || !user}
              title={user ? `${isActive ? 'Remove' : 'Add'} ${label}` : 'Sign in to react'}
            >
              <span className="text-xl mr-1.5">{emoji}</span>
              {count > 0 && (
                <span className={`text-sm font-medium ${isActive ? 'text-blue-700' : 'text-gray-700'}`}>
                  {count}
                </span>
              )}
            </Button>
          )
        })}

        {/* Show More/Less Button */}
        {!showAll && Object.keys(REACTION_EMOJIS).length > 3 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-600 hover:text-gray-800"
            onClick={() => setShowAll(true)}
          >
            +{Object.keys(REACTION_EMOJIS).length - 3} more
          </Button>
        )}

        {showAll && (
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-600 hover:text-gray-800"
            onClick={() => setShowAll(false)}
          >
            Show less
          </Button>
        )}
      </div>

      {/* Login Prompt */}
      {!user && (
        <Card className="bg-gray-50 p-3 mt-3">
          <p className="text-sm text-gray-700">
            <a href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
              Sign in
            </a>{' '}
            to add your reaction
          </p>
        </Card>
      )}

      {/* Expanded Reaction List (when showAll is true) */}
      {showAll && totalReactions > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="space-y-2">
            {(Object.keys(REACTION_EMOJIS) as ReactionType[])
              .filter(type => (reactionCounts[type] || 0) > 0)
              .map((type) => {
                const { emoji, label } = REACTION_EMOJIS[type]
                const count = reactionCounts[type] || 0

                return (
                  <div key={type} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{emoji}</span>
                      <span className="text-gray-700">{label}</span>
                    </div>
                    <span className="text-gray-600 font-medium">
                      {count} {count === 1 ? 'person' : 'people'}
                    </span>
                  </div>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}

// Compact version for photo grids
export function CompactReactions({ albumId, photoId, className }: ReactionsProps) {
  const { user } = useAuth()
  const {
    reactionCounts,
    toggleReaction,
    hasUserReacted,
    totalReactions,
    loading
  } = useReactions({ albumId, photoId })

  // Show only top 3 reaction types with counts
  const topReactions = (Object.keys(REACTION_EMOJIS) as ReactionType[])
    .filter(type => (reactionCounts[type] || 0) > 0)
    .sort((a, b) => (reactionCounts[b] || 0) - (reactionCounts[a] || 0))
    .slice(0, 3)

  const handleQuickReact = async () => {
    if (!user || loading) return

    // Default to thumbsup if user hasn't reacted
    const defaultReaction: ReactionType = 'thumbsup'

    try {
      await toggleReaction(defaultReaction)
    } catch (err) {
      log.error('Failed to quick react', {
        component: 'CompactReactions'
      }, err)
    }
  }

  if (totalReactions === 0 && !user) return null

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {/* Quick React Button */}
      <button
        onClick={handleQuickReact}
        disabled={!user || loading}
        className={`
          p-1.5 rounded-full transition-all duration-200
          ${hasUserReacted('thumbsup')
            ? 'bg-blue-100 text-blue-600'
            : 'hover:bg-gray-100 text-gray-600'
          }
          ${!user ? 'cursor-not-allowed opacity-50' : ''}
        `}
        title={user ? 'Quick react' : 'Sign in to react'}
      >
        <span className="text-sm">👍</span>
      </button>

      {/* Top Reactions Display */}
      {topReactions.length > 0 && (
        <div className="flex items-center gap-0.5">
          {topReactions.map(type => (
            <span key={type} className="text-sm" title={REACTION_EMOJIS[type].label}>
              {REACTION_EMOJIS[type].emoji}
            </span>
          ))}
          {totalReactions > 0 && (
            <span className="ml-1 text-xs text-gray-600 font-medium">
              {totalReactions}
            </span>
          )}
        </div>
      )}
    </div>
  )
}