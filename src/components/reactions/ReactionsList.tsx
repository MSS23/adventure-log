'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import type { GlobeReactionWithDetails } from '@/types/database'
import { instagramStyles } from '@/lib/design-tokens'
import { formatDistanceToNow } from 'date-fns'

interface ReactionsListProps {
  reactions: GlobeReactionWithDetails[]
  onDelete?: (reactionId: string) => void
  onMarkAsRead?: (reactionId: string) => void
  showActions?: boolean
  isOwner?: boolean
}

export function ReactionsList({
  reactions,
  onDelete,
  onMarkAsRead,
  showActions = true,
  isOwner = false
}: ReactionsListProps) {
  const [expandedReactions, setExpandedReactions] = useState<Set<string>>(new Set())

  const toggleExpanded = (reactionId: string) => {
    const newExpanded = new Set(expandedReactions)
    if (newExpanded.has(reactionId)) {
      newExpanded.delete(reactionId)
    } else {
      newExpanded.add(reactionId)
    }
    setExpandedReactions(newExpanded)
  }

  if (reactions.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <div className="text-6xl mb-4">📍</div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No reactions yet
        </h3>
        <p className="text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
          {isOwner
            ? "Friends can drop reactions and suggestions on your globe to share places you should visit!"
            : "Be the first to drop a reaction on this globe!"}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {reactions.map((reaction) => {
        const isExpanded = expandedReactions.has(reaction.id)

        return (
          <div
            key={reaction.id}
            className={`${instagramStyles.card} p-4 ${
              !reaction.is_read && isOwner ? 'ring-2 ring-blue-500' : ''
            }`}
          >
            <div className="flex items-start gap-3">
              {/* User avatar */}
              <Link
                href={`/profile/${reaction.user_id}`}
                className="flex-shrink-0"
              >
                {reaction.avatar_url ? (
                  <img
                    src={reaction.avatar_url}
                    alt={reaction.display_name || reaction.username || 'User'}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                    {(reaction.display_name || reaction.username || 'U')[0].toUpperCase()}
                  </div>
                )}
              </Link>

              <div className="flex-1 min-w-0">
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/profile/${reaction.user_id}`}
                      className="font-semibold text-gray-900 dark:text-white hover:underline"
                    >
                      {reaction.display_name || reaction.username || 'Unknown User'}
                    </Link>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formatDistanceToNow(new Date(reaction.created_at), { addSuffix: true })}
                    </p>
                  </div>

                  {/* Reaction emoji */}
                  <div
                    className="flex-shrink-0 text-3xl"
                    title={reaction.reaction_label}
                  >
                    {reaction.sticker_emoji}
                  </div>
                </div>

                {/* Reaction type label */}
                <div
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold mb-2"
                  style={{
                    backgroundColor: reaction.reaction_color ? `${reaction.reaction_color}20` : '#E5E7EB',
                    color: reaction.reaction_color || '#4B5563'
                  }}
                >
                  {reaction.reaction_label || reaction.reaction_type}
                </div>

                {/* Location info */}
                {reaction.album_title && (
                  <Link
                    href={`/albums/${reaction.target_album_id}`}
                    className="block text-sm text-blue-600 dark:text-blue-400 hover:underline mb-2"
                  >
                    📷 {reaction.album_title}
                  </Link>
                )}

                {reaction.location_name && !reaction.album_title && (
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                    📍 {reaction.location_name}
                  </p>
                )}

                {/* Message */}
                {reaction.message && (
                  <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-sm text-gray-800 dark:text-gray-200">
                      {isExpanded || reaction.message.length <= 150
                        ? reaction.message
                        : `${reaction.message.substring(0, 150)}...`}
                    </p>
                    {reaction.message.length > 150 && (
                      <button
                        onClick={() => toggleExpanded(reaction.id)}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-1"
                      >
                        {isExpanded ? 'Show less' : 'Show more'}
                      </button>
                    )}
                  </div>
                )}

                {/* Actions */}
                {showActions && (
                  <div className="flex gap-3 mt-3">
                    {isOwner && !reaction.is_read && onMarkAsRead && (
                      <button
                        onClick={() => onMarkAsRead(reaction.id)}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
                      >
                        Mark as read
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(reaction.id)}
                        className="text-sm text-red-600 dark:text-red-400 hover:underline font-medium"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
