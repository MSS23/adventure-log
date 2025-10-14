'use client'

import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  MessageCircle,
  Send,
  Search,
  MoreVertical,
  Trash2,
  X,
  Check,
  UserPlus
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { log } from '@/lib/utils/logger'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  sender_id: string
  recipient_id: string
  message: string
  is_read: boolean
  created_at: string
  sender?: {
    id: string
    username: string
    display_name: string
    avatar_url?: string
  }
  recipient?: {
    id: string
    username: string
    display_name: string
    avatar_url?: string
  }
}

interface Conversation {
  userId: string
  username: string
  displayName: string
  avatarUrl?: string
  lastMessage: string
  lastMessageTime: string
  unreadCount: number
  isFollowing: boolean
  isRequest: boolean
}

export function MessageCenter() {
  const [open, setOpen] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [totalUnread, setTotalUnread] = useState(0)
  const [activeTab, setActiveTab] = useState<'primary' | 'requests'>('primary')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { user } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    if (user && open) {
      fetchConversations()
      subscribeToMessages()
    }
  }, [user, open])

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation)
      markConversationAsRead(selectedConversation)
    }
  }, [selectedConversation])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchConversations = async () => {
    try {
      setLoading(true)

      // Fetch all messages where user is sender or recipient
      const { data: allMessages, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id(id, username, display_name, avatar_url),
          recipient:recipient_id(id, username, display_name, avatar_url)
        `)
        .or(`sender_id.eq.${user?.id},recipient_id.eq.${user?.id}`)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Fetch user's following list
      const { data: followingData } = await supabase
        .from('follows')
        .select('followed_id')
        .eq('follower_id', user?.id)

      const followingIds = new Set(followingData?.map(f => f.followed_id) || [])

      // Group by conversation partner
      const conversationMap = new Map<string, Conversation>()
      let unreadTotal = 0

      allMessages?.forEach((msg) => {
        const partnerId = msg.sender_id === user?.id ? msg.recipient_id : msg.sender_id
        const partner = msg.sender_id === user?.id ? msg.recipient : msg.sender

        if (!conversationMap.has(partnerId) && partner) {
          const unreadCount = allMessages.filter(
            m => m.sender_id === partnerId && m.recipient_id === user?.id && !m.is_read
          ).length

          unreadTotal += unreadCount

          // Check if this is someone the user follows
          const isFollowing = followingIds.has(partnerId)
          // Check if this is an incoming message from someone user doesn't follow
          const firstMessage = allMessages
            .filter(m =>
              (m.sender_id === partnerId && m.recipient_id === user?.id) ||
              (m.sender_id === user?.id && m.recipient_id === partnerId)
            )
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0]

          const isRequest = !isFollowing && firstMessage?.sender_id === partnerId

          conversationMap.set(partnerId, {
            userId: partnerId,
            username: partner.username,
            displayName: partner.display_name,
            avatarUrl: partner.avatar_url,
            lastMessage: msg.message,
            lastMessageTime: msg.created_at,
            unreadCount,
            isFollowing,
            isRequest
          })
        }
      })

      setConversations(Array.from(conversationMap.values()))
      setTotalUnread(unreadTotal)
    } catch (error) {
      log.error('Failed to fetch conversations', {
        component: 'MessageCenter'
      }, error instanceof Error ? error : new Error(String(error)))
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async (partnerId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id(id, username, display_name, avatar_url),
          recipient:recipient_id(id, username, display_name, avatar_url)
        `)
        .or(`and(sender_id.eq.${user?.id},recipient_id.eq.${partnerId}),and(sender_id.eq.${partnerId},recipient_id.eq.${user?.id})`)
        .order('created_at', { ascending: true })

      if (error) throw error

      setMessages(data || [])
    } catch (error) {
      log.error('Failed to fetch messages', {
        component: 'MessageCenter'
      }, error instanceof Error ? error : new Error(String(error)))
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user?.id,
          recipient_id: selectedConversation,
          message: newMessage.trim()
        })

      if (error) throw error

      setNewMessage('')
      await fetchMessages(selectedConversation)
      await fetchConversations()

      // Send notification to recipient
      await supabase.from('notifications').insert({
        user_id: selectedConversation,
        sender_id: user?.id,
        type: 'message',
        title: 'New message',
        message: `${user?.email} sent you a message`,
        link: '/messages'
      })
    } catch (error) {
      log.error('Failed to send message', {
        component: 'MessageCenter'
      }, error instanceof Error ? error : new Error(String(error)))
    }
  }

  const markConversationAsRead = async (partnerId: string) => {
    try {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('sender_id', partnerId)
        .eq('recipient_id', user?.id)
        .eq('is_read', false)

      // Update local state
      setConversations(prev =>
        prev.map(c =>
          c.userId === partnerId ? { ...c, unreadCount: 0 } : c
        )
      )
      setTotalUnread(prev => {
        const conv = conversations.find(c => c.userId === partnerId)
        return Math.max(0, prev - (conv?.unreadCount || 0))
      })
    } catch (error) {
      log.error('Failed to mark messages as read', {
        component: 'MessageCenter'
      }, error instanceof Error ? error : new Error(String(error)))
    }
  }

  const subscribeToMessages = () => {
    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${user?.id}`
        },
        () => {
          fetchConversations()
          if (selectedConversation) {
            fetchMessages(selectedConversation)
          }
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const acceptMessageRequest = async (userId: string) => {
    try {
      // Follow the user to accept the request
      const { error } = await supabase
        .from('follows')
        .insert({
          follower_id: user?.id,
          followed_id: userId
        })

      if (error) throw error

      // Refresh conversations to update request status
      await fetchConversations()

      log.info('Message request accepted', {
        component: 'MessageCenter',
        action: 'accept-request',
        userId
      })
    } catch (error) {
      log.error('Failed to accept message request', {
        component: 'MessageCenter'
      }, error instanceof Error ? error : new Error(String(error)))
    }
  }

  const deleteMessageRequest = async (userId: string) => {
    try {
      // Delete all messages from this conversation
      await supabase
        .from('messages')
        .delete()
        .or(`and(sender_id.eq.${userId},recipient_id.eq.${user?.id}),and(sender_id.eq.${user?.id},recipient_id.eq.${userId})`)

      // Refresh conversations
      await fetchConversations()

      // Clear selection if it was the deleted conversation
      if (selectedConversation === userId) {
        setSelectedConversation(null)
      }

      log.info('Message request deleted', {
        component: 'MessageCenter',
        action: 'delete-request',
        userId
      })
    } catch (error) {
      log.error('Failed to delete message request', {
        component: 'MessageCenter'
      }, error instanceof Error ? error : new Error(String(error)))
    }
  }

  // Split conversations into primary and requests
  const primaryConversations = conversations.filter(conv => !conv.isRequest)
  const requestConversations = conversations.filter(conv => conv.isRequest)

  // Filter based on active tab and search query
  const activeConversations = activeTab === 'primary' ? primaryConversations : requestConversations
  const filteredConversations = activeConversations.filter(conv =>
    conv.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.username.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Count unread for each tab
  const primaryUnread = primaryConversations.reduce((sum, conv) => sum + conv.unreadCount, 0)
  const requestsUnread = requestConversations.reduce((sum, conv) => sum + conv.unreadCount, 0)

  const selectedConv = conversations.find(c => c.userId === selectedConversation)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="relative h-9 w-9 p-0">
          <MessageCircle className="h-5 w-5" />
          {totalUnread > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {totalUnread > 9 ? '9+' : totalUnread}
            </Badge>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl h-[600px] p-0">
        <div className="flex h-full">
          {/* Conversations List */}
          <div className="w-80 border-r flex flex-col">
            <DialogHeader className="p-4 border-b">
              <DialogTitle>Messages</DialogTitle>
            </DialogHeader>

            {/* Tabs */}
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab('primary')}
                className={cn(
                  "flex-1 py-3 text-sm font-medium transition-colors relative",
                  activeTab === 'primary'
                    ? "text-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                Primary
                {primaryUnread > 0 && (
                  <Badge
                    variant="destructive"
                    className="ml-1.5 h-5 min-w-[20px] px-1.5"
                  >
                    {primaryUnread > 9 ? '9+' : primaryUnread}
                  </Badge>
                )}
                {activeTab === 'primary' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('requests')}
                className={cn(
                  "flex-1 py-3 text-sm font-medium transition-colors relative",
                  activeTab === 'requests'
                    ? "text-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                Requests
                {requestsUnread > 0 && (
                  <Badge
                    variant="destructive"
                    className="ml-1.5 h-5 min-w-[20px] px-1.5"
                  >
                    {requestsUnread > 9 ? '9+' : requestsUnread}
                  </Badge>
                )}
                {activeTab === 'requests' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                )}
              </button>
            </div>

            {/* Search */}
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </div>

            {/* Conversations */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-gray-500">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 animate-pulse" />
                  <p className="text-sm">Loading messages...</p>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <MessageCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium mb-1">
                    {activeTab === 'primary' ? 'No messages' : 'No message requests'}
                  </p>
                  <p className="text-sm text-gray-400">
                    {activeTab === 'primary'
                      ? 'Messages from people you follow will appear here'
                      : 'Messages from people you don\'t follow will appear here'}
                  </p>
                </div>
              ) : (
                filteredConversations.map((conv) => (
                  <button
                    key={conv.userId}
                    onClick={() => setSelectedConversation(conv.userId)}
                    className={cn(
                      "w-full p-3 flex items-start gap-3 hover:bg-gray-50 transition-colors",
                      selectedConversation === conv.userId && "bg-blue-50"
                    )}
                  >
                    <Avatar className="h-12 w-12 flex-shrink-0">
                      <AvatarImage src={conv.avatarUrl} />
                      <AvatarFallback>
                        {conv.displayName[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">
                            {conv.displayName}
                          </p>
                          {conv.isRequest && (
                            <Badge variant="secondary" className="text-xs">
                              Request
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                          {formatDistanceToNow(new Date(conv.lastMessageTime), { addSuffix: true })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-gray-600 truncate flex-1">
                          {conv.lastMessage}
                        </p>
                        {conv.unreadCount > 0 && (
                          <Badge variant="default" className="flex-shrink-0 h-5 min-w-[20px] flex items-center justify-center px-1.5">
                            {conv.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 flex flex-col">
            {selectedConversation && selectedConv ? (
              <>
                {/* Message Request Banner */}
                {selectedConv.isRequest && (
                  <div className="p-4 bg-blue-50 border-b border-blue-200">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-medium text-sm text-blue-900 mb-1">
                          Message Request
                        </p>
                        <p className="text-xs text-blue-700">
                          Do you want to let {selectedConv.displayName} send you messages?
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteMessageRequest(selectedConv.userId)}
                          className="h-8"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => acceptMessageRequest(selectedConv.userId)}
                          className="h-8 bg-blue-600 hover:bg-blue-700"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Accept
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Chat Header */}
                <div className="p-4 border-b flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={selectedConv.avatarUrl} />
                      <AvatarFallback>
                        {selectedConv.displayName[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{selectedConv.displayName}</p>
                      <p className="text-sm text-gray-500">@{selectedConv.username}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((msg) => {
                    const isOwn = msg.sender_id === user?.id
                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex gap-2 max-w-[70%]",
                          isOwn ? "ml-auto flex-row-reverse" : ""
                        )}
                      >
                        {!isOwn && (
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarImage src={msg.sender?.avatar_url} />
                            <AvatarFallback>
                              {msg.sender?.display_name[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div
                          className={cn(
                            "rounded-2xl px-4 py-2",
                            isOwn
                              ? "bg-blue-600 text-white"
                              : "bg-gray-100 text-gray-900"
                          )}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {msg.message}
                          </p>
                          <p
                            className={cn(
                              "text-xs mt-1",
                              isOwn ? "text-blue-100" : "text-gray-500"
                            )}
                          >
                            {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="p-4 border-t">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      sendMessage()
                    }}
                    className="flex gap-2"
                  >
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="flex-1"
                    />
                    <Button type="submit" size="sm" disabled={!newMessage.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <MessageCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="font-medium">Select a conversation</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Choose a conversation from the list to start messaging
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
