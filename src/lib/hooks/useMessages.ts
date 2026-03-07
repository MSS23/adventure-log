'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { log } from '@/lib/utils/logger'
import type { Conversation, Message, User } from '@/types/database'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConversationWithDetails extends Conversation {
  other_user: Pick<User, 'id' | 'username' | 'display_name' | 'avatar_url'> | null
  last_message: Pick<Message, 'id' | 'sender_id' | 'content' | 'message_type' | 'created_at'> | null
  unread_count: number
  is_muted: boolean
}

export interface MessageWithSender extends Message {
  sender: Pick<User, 'id' | 'username' | 'display_name' | 'avatar_url'> | null
}

interface MessagesPage {
  messages: MessageWithSender[]
  has_more: boolean
  next_cursor: string | null
}

// ---------------------------------------------------------------------------
// useConversations
// ---------------------------------------------------------------------------

export function useConversations() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  const query = useQuery<ConversationWithDetails[]>({
    queryKey: ['conversations'],
    queryFn: async () => {
      const response = await fetch('/api/messages')
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to fetch conversations')
      }
      const data = await response.json()
      return data.conversations
    },
    staleTime: 30 * 1000, // 30 seconds - conversations change frequently
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  })

  // Subscribe to real-time conversation updates (new messages update the list)
  useEffect(() => {
    const channel = supabase
      .channel('conversations-list')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
        },
        () => {
          // Refetch conversations when any conversation is updated
          queryClient.invalidateQueries({ queryKey: ['conversations'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, queryClient])

  return query
}

// ---------------------------------------------------------------------------
// useMessages
// ---------------------------------------------------------------------------

export function useMessages(conversationId: string | null) {
  const queryClient = useQueryClient()
  const supabase = createClient()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const query = useInfiniteQuery<MessagesPage>({
    queryKey: ['messages', conversationId],
    queryFn: async ({ pageParam }) => {
      if (!conversationId) throw new Error('No conversation selected')

      const url = new URL(`/api/messages/${conversationId}`, window.location.origin)
      url.searchParams.set('limit', '50')
      if (pageParam) {
        url.searchParams.set('cursor', pageParam as string)
      }

      const response = await fetch(url.toString())
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to fetch messages')
      }
      return response.json()
    },
    getNextPageParam: (lastPage) => lastPage.next_cursor,
    initialPageParam: null as string | null,
    enabled: !!conversationId,
    staleTime: 10 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  // Real-time subscription for new messages in this conversation
  useEffect(() => {
    if (!conversationId) return

    // Clean up previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const newMessage = payload.new as Message

          // Fetch sender profile for the new message
          const { data: senderProfile } = await supabase
            .from('users')
            .select('id, username, display_name, avatar_url')
            .eq('id', newMessage.sender_id)
            .single()

          const enrichedMessage: MessageWithSender = {
            ...newMessage,
            sender: senderProfile || null,
          }

          // Optimistically add the new message to the cache
          queryClient.setQueryData(
            ['messages', conversationId],
            (old: { pages: MessagesPage[]; pageParams: (string | null)[] } | undefined) => {
              if (!old) return old

              const firstPage = old.pages[0]
              // Prevent duplicates
              if (firstPage.messages.some((m) => m.id === enrichedMessage.id)) {
                return old
              }

              return {
                ...old,
                pages: [
                  {
                    ...firstPage,
                    messages: [enrichedMessage, ...firstPage.messages],
                  },
                  ...old.pages.slice(1),
                ],
              }
            }
          )

          // Also refresh the conversations list to update last_message / unread counts
          queryClient.invalidateQueries({ queryKey: ['conversations'] })
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [conversationId, supabase, queryClient])

  // Flatten pages into a single messages array (reversed so oldest first)
  const messages: MessageWithSender[] = query.data
    ? query.data.pages.flatMap((page) => page.messages).reverse()
    : []

  return {
    ...query,
    messages,
  }
}

// ---------------------------------------------------------------------------
// useSendMessage
// ---------------------------------------------------------------------------

export function useSendMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      conversationId,
      content,
      messageType = 'text',
      replyToId,
    }: {
      conversationId: string
      content: string
      messageType?: string
      replyToId?: string
    }) => {
      const response = await fetch(`/api/messages/${conversationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          message_type: messageType,
          reply_to_id: replyToId,
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to send message')
      }

      const data = await response.json()
      return data.message as MessageWithSender
    },
    onSuccess: (newMessage) => {
      // Add the sent message to the cache immediately
      queryClient.setQueryData(
        ['messages', newMessage.conversation_id],
        (old: { pages: MessagesPage[]; pageParams: (string | null)[] } | undefined) => {
          if (!old) return old

          const firstPage = old.pages[0]
          if (firstPage.messages.some((m) => m.id === newMessage.id)) {
            return old
          }

          return {
            ...old,
            pages: [
              {
                ...firstPage,
                messages: [newMessage, ...firstPage.messages],
              },
              ...old.pages.slice(1),
            ],
          }
        }
      )

      // Refresh conversations list to update last message preview
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
    onError: (error) => {
      log.error('Failed to send message', { component: 'useMessages', action: 'sendMessage' }, error as Error)
    },
  })
}

// ---------------------------------------------------------------------------
// useCreateConversation
// ---------------------------------------------------------------------------

export function useCreateConversation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (participantId: string) => {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participant_id: participantId }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to create conversation')
      }

      const data = await response.json()
      return data.conversation as ConversationWithDetails
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
    onError: (error) => {
      log.error('Failed to create conversation', { component: 'useMessages', action: 'createConversation' }, error as Error)
    },
  })
}

// ---------------------------------------------------------------------------
// useMarkAsRead
// ---------------------------------------------------------------------------

export function useMarkAsRead() {
  const queryClient = useQueryClient()

  return useCallback(
    async (conversationId: string) => {
      // Simply fetch the messages endpoint, which auto-updates last_read_at on the server
      try {
        await fetch(`/api/messages/${conversationId}?limit=1`)
        queryClient.invalidateQueries({ queryKey: ['conversations'] })
      } catch {
        // Silently fail - not critical
      }
    },
    [queryClient]
  )
}
