'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search, Loader2, MessageSquarePlus, UserPlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { useCreateConversation } from '@/lib/hooks/useMessages'
import type { ConversationWithDetails } from '@/lib/hooks/useMessages'
import { log } from '@/lib/utils/logger'

interface UserResult {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
}

interface NewConversationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConversationCreated: (conversation: ConversationWithDetails) => void
  currentUserId: string
}

export function NewConversationDialog({
  isOpen,
  onClose,
  onConversationCreated,
  currentUserId,
}: NewConversationDialogProps) {
  const prefersReducedMotion = useReducedMotion()
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<UserResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const supabase = createClient()
  const createConversation = useCreateConversation()

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('')
      setResults([])
      setSelectedUser(null)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Debounced user search
  const searchUsers = useCallback(
    async (query: string) => {
      if (!query.trim() || query.trim().length < 2) {
        setResults([])
        setIsSearching(false)
        return
      }

      setIsSearching(true)

      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, username, display_name, avatar_url')
          .neq('id', currentUserId)
          .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
          .limit(20)

        if (error) {
          log.error('Error searching users', { component: 'NewConversationDialog', action: 'searchUsers' }, error)
          setResults([])
        } else {
          setResults(data || [])
        }
      } catch (err) {
        log.error('Unexpected error searching users', { component: 'NewConversationDialog', action: 'searchUsers' }, err as Error)
        setResults([])
      } finally {
        setIsSearching(false)
      }
    },
    [supabase, currentUserId]
  )

  useEffect(() => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current)
    }

    if (searchQuery.trim().length >= 2) {
      searchTimerRef.current = setTimeout(() => {
        searchUsers(searchQuery)
      }, 300)
    } else {
      setResults([])
    }

    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current)
      }
    }
  }, [searchQuery, searchUsers])

  const handleSelectUser = async (user: UserResult) => {
    setSelectedUser(user)

    try {
      const conversation = await createConversation.mutateAsync(user.id)
      onConversationCreated(conversation)
      onClose()
    } catch {
      setSelectedUser(null)
    }
  }

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={prefersReducedMotion ? {} : { opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className={cn(
              'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
              'w-full max-w-md mx-auto',
              'bg-white dark:bg-[#111111] rounded-2xl shadow-2xl',
              'border border-stone-200 dark:border-white/[0.1]',
              'overflow-hidden'
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 dark:border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <MessageSquarePlus className="w-5 h-5 text-olive-500" />
                <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
                  New Message
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-stone-500" />
              </button>
            </div>

            {/* Search input */}
            <div className="px-5 py-3 border-b border-stone-100 dark:border-white/[0.08]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by username or name..."
                  className={cn(
                    'w-full pl-9 pr-4 py-2.5 rounded-xl text-sm',
                    'bg-stone-100 dark:bg-[#1A1A1A] border-none',
                    'text-stone-900 dark:text-stone-100 placeholder-stone-400',
                    'focus:outline-none focus:ring-2 focus:ring-olive-500/40'
                  )}
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-olive-500" />
                )}
              </div>
            </div>

            {/* Results */}
            <div className="max-h-80 overflow-y-auto">
              {searchQuery.trim().length < 2 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <UserPlus className="w-10 h-10 text-stone-300 dark:text-stone-600 mb-3" />
                  <p className="text-sm text-stone-500 dark:text-stone-400">
                    Type at least 2 characters to search for users
                  </p>
                </div>
              ) : isSearching ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-olive-500" />
                </div>
              ) : results.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <Search className="w-10 h-10 text-stone-300 dark:text-stone-600 mb-3" />
                  <p className="text-sm text-stone-500 dark:text-stone-400">
                    No users found matching &quot;{searchQuery}&quot;
                  </p>
                </div>
              ) : (
                <div className="py-1">
                  {results.map((user) => {
                    const isCreating = selectedUser?.id === user.id && createConversation.isPending

                    return (
                      <button
                        key={user.id}
                        onClick={() => handleSelectUser(user)}
                        disabled={createConversation.isPending}
                        className={cn(
                          'w-full flex items-center gap-3 px-5 py-3 text-left transition-colors',
                          'hover:bg-stone-50 dark:hover:bg-stone-800/60',
                          'disabled:opacity-50 disabled:cursor-not-allowed'
                        )}
                      >
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={user.display_name || user.username}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-olive-400 to-olive-500 flex items-center justify-center text-white font-semibold">
                            {(user.display_name || user.username).charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">
                            {user.display_name || user.username}
                          </p>
                          <p className="text-xs text-stone-400 dark:text-stone-500 truncate">
                            @{user.username}
                          </p>
                        </div>
                        {isCreating && (
                          <Loader2 className="w-4 h-4 animate-spin text-olive-500 shrink-0" />
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Error message */}
            {createConversation.isError && (
              <div className="px-5 py-3 border-t border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10">
                <p className="text-xs text-red-600 dark:text-red-400">
                  Failed to create conversation. Please try again.
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
