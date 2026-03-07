'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Send, ArrowLeft, Loader2, ChevronUp, ImageIcon } from 'lucide-react'
import { formatDistanceToNow, format, isToday, isYesterday, isSameDay } from 'date-fns'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { useSendMessage } from '@/lib/hooks/useMessages'
import type { MessageWithSender, ConversationWithDetails } from '@/lib/hooks/useMessages'

interface MessageThreadProps {
  conversation: ConversationWithDetails
  messages: MessageWithSender[]
  currentUserId: string
  isLoading: boolean
  hasNextPage: boolean | undefined
  isFetchingNextPage: boolean
  fetchNextPage: () => void
  onBack: () => void
}

function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr)
  if (isToday(date)) {
    return format(date, 'h:mm a')
  }
  if (isYesterday(date)) {
    return `Yesterday ${format(date, 'h:mm a')}`
  }
  return format(date, 'MMM d, h:mm a')
}

function formatDateDivider(dateStr: string): string {
  const date = new Date(dateStr)
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'EEEE, MMMM d, yyyy')
}

export function MessageThread({
  conversation,
  messages,
  currentUserId,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  onBack,
}: MessageThreadProps) {
  const prefersReducedMotion = useReducedMotion()
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const prevMessageCountRef = useRef(0)
  const sendMessage = useSendMessage()

  const otherUser = conversation.other_user
  const displayName = otherUser?.display_name || otherUser?.username || 'Unknown'

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    const currentCount = messages.length
    if (currentCount > prevMessageCountRef.current) {
      // Only auto-scroll if user is near the bottom
      const container = scrollContainerRef.current
      if (container) {
        const isNearBottom =
          container.scrollHeight - container.scrollTop - container.clientHeight < 150
        if (isNearBottom || prevMessageCountRef.current === 0) {
          messagesEndRef.current?.scrollIntoView({ behavior: prevMessageCountRef.current === 0 ? 'instant' : 'smooth' })
        }
      }
    }
    prevMessageCountRef.current = currentCount
  }, [messages.length])

  const handleSend = useCallback(async () => {
    const content = inputValue.trim()
    if (!content || sendMessage.isPending) return

    setInputValue('')
    sendMessage.mutate({
      conversationId: conversation.id,
      content,
    })
  }, [inputValue, sendMessage, conversation.id])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  // Render date dividers between messages from different days
  const renderMessages = () => {
    const elements: React.ReactNode[] = []

    messages.forEach((msg, index) => {
      const prevMsg = index > 0 ? messages[index - 1] : null
      const showDateDivider =
        !prevMsg || !isSameDay(new Date(prevMsg.created_at), new Date(msg.created_at))

      if (showDateDivider) {
        elements.push(
          <div key={`date-${msg.created_at}`} className="flex items-center justify-center my-4">
            <span className="px-3 py-1 text-[11px] font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-full">
              {formatDateDivider(msg.created_at)}
            </span>
          </div>
        )
      }

      const isOwn = msg.sender_id === currentUserId
      const showAvatar =
        !isOwn &&
        (index === messages.length - 1 ||
          messages[index + 1]?.sender_id !== msg.sender_id ||
          !isSameDay(new Date(msg.created_at), new Date(messages[index + 1]?.created_at || '')))

      const MotionOrDiv = prefersReducedMotion ? 'div' : motion.div

      elements.push(
        <MotionOrDiv
          key={msg.id}
          {...(!prefersReducedMotion && {
            initial: { opacity: 0, y: 8, scale: 0.97 },
            animate: { opacity: 1, y: 0, scale: 1 },
            transition: { duration: 0.15 },
          })}
          className={cn('flex gap-2 px-4', isOwn ? 'justify-end' : 'justify-start')}
        >
          {/* Avatar for other user */}
          {!isOwn && (
            <div className="w-8 shrink-0 self-end">
              {showAvatar ? (
                otherUser?.avatar_url ? (
                  <img
                    src={otherUser.avatar_url}
                    alt={displayName}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white text-xs font-semibold">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )
              ) : null}
            </div>
          )}

          {/* Bubble */}
          <div
            className={cn(
              'max-w-[85%] sm:max-w-[75%] rounded-2xl px-3 sm:px-4 py-2 sm:py-2.5 text-sm leading-relaxed',
              isOwn
                ? 'bg-gradient-to-br from-teal-500 to-cyan-600 text-white rounded-br-md'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-md'
            )}
          >
            {msg.message_type === 'image' && msg.metadata && (
              <div className="mb-1">
                <ImageIcon className="w-4 h-4 opacity-60" />
              </div>
            )}
            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
            <span
              className={cn(
                'block text-[10px] mt-1',
                isOwn ? 'text-white/60 text-right' : 'text-gray-400 dark:text-gray-500'
              )}
            >
              {formatMessageTime(msg.created_at)}
            </span>
          </div>
        </MotionOrDiv>
      )
    })

    return elements
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shrink-0">
        <button
          onClick={onBack}
          className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Back to conversations"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>

        {otherUser?.avatar_url ? (
          <img
            src={otherUser.avatar_url}
            alt={displayName}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white font-semibold">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
            {displayName}
          </h2>
          {otherUser?.username && (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              @{otherUser.username}
            </p>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto py-2 space-y-1">
        {/* Load more button */}
        {hasNextPage && (
          <div className="flex justify-center py-2">
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className={cn(
                'flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-colors',
                'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20',
                'hover:bg-teal-100 dark:hover:bg-teal-900/40',
                'disabled:opacity-50'
              )}
            >
              {isFetchingNextPage ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ChevronUp className="w-3.5 h-3.5" />
              )}
              {isFetchingNextPage ? 'Loading...' : 'Load older messages'}
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center mb-4">
              <Send className="w-7 h-7 text-teal-500" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Send a message to start the conversation
            </p>
          </div>
        ) : (
          renderMessages()
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="shrink-0 px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md">
        <div className="flex items-end gap-2">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className={cn(
              'flex-1 resize-none px-4 py-2.5 rounded-2xl text-sm',
              'bg-gray-100 dark:bg-gray-800 border-none',
              'text-gray-900 dark:text-gray-100 placeholder-gray-400',
              'focus:outline-none focus:ring-2 focus:ring-teal-500/40',
              'max-h-32'
            )}
            style={{ minHeight: '42px' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement
              target.style.height = 'auto'
              target.style.height = `${Math.min(target.scrollHeight, 128)}px`
            }}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || sendMessage.isPending}
            className={cn(
              'p-2.5 rounded-full transition-all shrink-0',
              inputValue.trim()
                ? 'bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md hover:shadow-lg hover:scale-105'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
            )}
            aria-label="Send message"
          >
            {sendMessage.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
