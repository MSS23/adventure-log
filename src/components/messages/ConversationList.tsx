'use client'

import { formatDistanceToNow } from 'date-fns'
import { motion } from 'framer-motion'
import { MessageSquare, Search } from 'lucide-react'
import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import type { ConversationWithDetails } from '@/lib/hooks/useMessages'

interface ConversationListProps {
  conversations: ConversationWithDetails[]
  activeConversationId: string | null
  currentUserId: string
  onSelect: (conversation: ConversationWithDetails) => void
  isLoading: boolean
}

export function ConversationList({
  conversations,
  activeConversationId,
  currentUserId,
  onSelect,
  isLoading,
}: ConversationListProps) {
  const prefersReducedMotion = useReducedMotion()
  const [searchQuery, setSearchQuery] = useState('')

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return conversations
    const q = searchQuery.toLowerCase()
    return conversations.filter((c) => {
      const name = c.other_user?.display_name || c.other_user?.username || ''
      return name.toLowerCase().includes(q)
    })
  }, [conversations, searchQuery])

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 animate-pulse">
            <div className="w-12 h-12 rounded-full bg-stone-200 dark:bg-stone-700 shrink-0" />
            <div className="flex-1 min-w-0 space-y-2">
              <div className="h-4 w-28 bg-stone-200 dark:bg-stone-700 rounded" />
              <div className="h-3 w-40 bg-stone-100 dark:bg-[#1A1A1A] rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="p-3 border-b border-stone-100 dark:border-white/[0.08]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              'w-full pl-9 pr-4 py-2 rounded-xl text-base sm:text-sm',
              'bg-stone-100 dark:bg-[#1A1A1A] border-none',
              'text-stone-900 dark:text-stone-100 placeholder-stone-400',
              'focus:outline-none focus:ring-2 focus:ring-olive-500/40'
            )}
          />
        </div>
      </div>

      {/* Conversation items */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <MessageSquare className="w-12 h-12 text-stone-300 dark:text-stone-600 mb-3" />
            <p className="text-sm text-stone-500 dark:text-stone-400">
              {searchQuery ? 'No conversations match your search' : 'No conversations yet'}
            </p>
          </div>
        ) : (
          filtered.map((conversation, index) => {
            const isActive = conversation.id === activeConversationId
            const otherUser = conversation.other_user
            const lastMessage = conversation.last_message
            const hasUnread = conversation.unread_count > 0

            const displayName = otherUser?.display_name || otherUser?.username || 'Unknown'
            const avatarInitial = displayName.charAt(0).toUpperCase()

            let lastMessagePreview = ''
            if (lastMessage) {
              const isOwnMessage = lastMessage.sender_id === currentUserId
              const prefix = isOwnMessage ? 'You: ' : ''
              lastMessagePreview =
                lastMessage.message_type === 'text'
                  ? `${prefix}${lastMessage.content || ''}`
                  : `${prefix}Sent ${lastMessage.message_type === 'image' ? 'an image' : 'a message'}`
            }

            const timeLabel = lastMessage
              ? formatDistanceToNow(new Date(lastMessage.created_at), { addSuffix: true })
              : ''

            const MotionOrDiv = prefersReducedMotion ? 'div' : motion.div

            return (
              <MotionOrDiv
                key={conversation.id}
                {...(!prefersReducedMotion && {
                  initial: { opacity: 0, x: -10 },
                  animate: { opacity: 1, x: 0 },
                  transition: { delay: index * 0.03, duration: 0.2 },
                })}
              >
                <button
                  onClick={() => onSelect(conversation)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 sm:px-4 sm:py-3 text-left transition-colors',
                    'hover:bg-stone-50 dark:hover:bg-stone-800/60',
                    isActive && 'bg-olive-50/80 dark:bg-olive-900/20 border-l-2 border-olive-500',
                    !isActive && 'border-l-2 border-transparent'
                  )}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    {otherUser?.avatar_url ? (
                      <img
                        src={otherUser.avatar_url}
                        alt={displayName}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-olive-400 to-olive-500 flex items-center justify-center text-white font-semibold text-lg">
                        {avatarInitial}
                      </div>
                    )}
                    {hasUnread && (
                      <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-olive-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                        {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          'text-sm truncate',
                          hasUnread
                            ? 'font-semibold text-stone-900 dark:text-stone-100'
                            : 'font-medium text-stone-700 dark:text-stone-300'
                        )}
                      >
                        {displayName}
                      </span>
                      {timeLabel && (
                        <span className="text-[11px] text-stone-400 dark:text-stone-500 shrink-0">
                          {timeLabel}
                        </span>
                      )}
                    </div>
                    {lastMessagePreview && (
                      <p
                        className={cn(
                          'text-xs truncate mt-0.5',
                          hasUnread
                            ? 'text-stone-700 dark:text-stone-300 font-medium'
                            : 'text-stone-400 dark:text-stone-500'
                        )}
                      >
                        {lastMessagePreview}
                      </p>
                    )}
                  </div>
                </button>
              </MotionOrDiv>
            )
          })
        )}
      </div>
    </div>
  )
}
