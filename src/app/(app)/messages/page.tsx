'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { MessageSquarePlus, MessageCircle, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/components/auth/AuthProvider'
import { GlassCard } from '@/components/ui/glass-card'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { useConversations, useMessages, useMarkAsRead } from '@/lib/hooks/useMessages'
import { ConversationList } from '@/components/messages/ConversationList'
import { MessageThread } from '@/components/messages/MessageThread'
import { NewConversationDialog } from '@/components/messages/NewConversationDialog'
import type { ConversationWithDetails } from '@/lib/hooks/useMessages'

export default function MessagesPage() {
  const { user } = useAuth()
  const prefersReducedMotion = useReducedMotion()
  const [activeConversation, setActiveConversation] = useState<ConversationWithDetails | null>(null)
  const [isNewConversationOpen, setIsNewConversationOpen] = useState(false)

  const {
    data: conversations,
    isLoading: conversationsLoading,
    isError: conversationsError,
  } = useConversations()

  const {
    messages,
    isLoading: messagesLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useMessages(activeConversation?.id || null)

  const markAsRead = useMarkAsRead()

  const handleSelectConversation = useCallback(
    (conversation: ConversationWithDetails) => {
      setActiveConversation(conversation)
      if (conversation.unread_count > 0) {
        markAsRead(conversation.id)
      }
    },
    [markAsRead]
  )

  const handleBack = useCallback(() => {
    setActiveConversation(null)
  }, [])

  const handleConversationCreated = useCallback(
    (conversation: ConversationWithDetails) => {
      setActiveConversation(conversation)
    },
    []
  )

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500 dark:text-gray-400">Please sign in to view messages.</p>
      </div>
    )
  }

  const totalUnread = (conversations || []).reduce((sum, c) => sum + c.unread_count, 0)

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <motion.div
        initial={prefersReducedMotion ? {} : { opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex items-center justify-between mb-6"
      >
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Messages</h1>
          {totalUnread > 0 && (
            <span className="px-2.5 py-0.5 text-xs font-bold text-white bg-teal-500 rounded-full">
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          )}
        </div>
        <button
          onClick={() => setIsNewConversationOpen(true)}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
            'bg-gradient-to-r from-teal-500 to-cyan-600 text-white',
            'hover:shadow-lg hover:shadow-teal-500/25 hover:scale-[1.02]',
            'active:scale-[0.98]'
          )}
        >
          <MessageSquarePlus className="w-4 h-4" />
          <span className="hidden sm:inline">New Message</span>
        </button>
      </motion.div>

      {/* Main content */}
      <GlassCard padding="none" className="overflow-hidden">
        <div className="flex h-[calc(100dvh-200px)] min-h-[400px] md:min-h-[500px]">
          {/* Left panel: conversation list */}
          <div
            className={cn(
              'w-full md:w-[320px] lg:w-[360px] md:border-r border-gray-100 dark:border-gray-800 shrink-0',
              'flex flex-col',
              // On mobile, hide list when a conversation is active
              activeConversation ? 'hidden md:flex' : 'flex'
            )}
          >
            {/* List header */}
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Conversations
              </h2>
            </div>

            {conversationsError ? (
              <div className="flex flex-col items-center justify-center flex-1 px-4 text-center">
                <p className="text-sm text-red-500">Failed to load conversations.</p>
                <p className="text-xs text-gray-400 mt-1">Please try refreshing the page.</p>
              </div>
            ) : (
              <ConversationList
                conversations={conversations || []}
                activeConversationId={activeConversation?.id || null}
                currentUserId={user.id}
                onSelect={handleSelectConversation}
                isLoading={conversationsLoading}
              />
            )}
          </div>

          {/* Right panel: message thread or empty state */}
          <div
            className={cn(
              'flex-1 flex flex-col min-w-0',
              // On mobile, hide thread when no conversation is active
              !activeConversation ? 'hidden md:flex' : 'flex'
            )}
          >
            {activeConversation ? (
              <MessageThread
                conversation={activeConversation}
                messages={messages}
                currentUserId={user.id}
                isLoading={messagesLoading}
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
                fetchNextPage={fetchNextPage}
                onBack={handleBack}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
                <motion.div
                  initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  className="flex flex-col items-center"
                >
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 flex items-center justify-center mb-5">
                    <MessageCircle className="w-10 h-10 text-teal-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Your Messages
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mb-6">
                    Send private messages to other travelers. Share adventures, ask for tips, or plan trips together.
                  </p>
                  <button
                    onClick={() => setIsNewConversationOpen(true)}
                    className={cn(
                      'flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium transition-all',
                      'bg-gradient-to-r from-teal-500 to-cyan-600 text-white',
                      'hover:shadow-lg hover:shadow-teal-500/25 hover:scale-[1.02]',
                      'active:scale-[0.98]'
                    )}
                  >
                    <Send className="w-4 h-4" />
                    Start a Conversation
                  </button>
                </motion.div>
              </div>
            )}
          </div>
        </div>
      </GlassCard>

      {/* New conversation dialog */}
      <NewConversationDialog
        isOpen={isNewConversationOpen}
        onClose={() => setIsNewConversationOpen(false)}
        onConversationCreated={handleConversationCreated}
        currentUserId={user.id}
      />
    </div>
  )
}
