'use client'

import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog'
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
        .select('following_id')
        .eq('follower_id', user?.id)

      const followingIds = new Set(followingData?.map(f => f.following_id) || [])

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
          following_id: userId
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

      <DialogContent className="max-w-5xl h-[700px] p-0 gap-0 overflow-hidden bg-white">
        <DialogDescription className="sr-only">
          View and manage your messages and conversations
        </DialogDescription>
        <div className="flex h-full">
          {/* Conversations List */}
          <div className="w-[360px] border-r flex flex-col bg-gray-50">
            <DialogHeader className="px-6 py-5 border-b bg-white shadow-sm">
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Messages</DialogTitle>
            </DialogHeader>

            {/* Tabs */}
            <div className="flex border-b bg-white">
              <button
                onClick={() => setActiveTab('primary')}
                className={cn(
                  "flex-1 py-4 text-sm font-semibold transition-all duration-200 relative",
                  activeTab === 'primary'
                    ? "text-blue-600 bg-blue-50/50"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                )}
              >
                <span className="flex items-center justify-center gap-2">
                  Primary
                  {primaryUnread > 0 && (
                    <Badge
                      variant="destructive"
                      className="ml-0.5 h-5 min-w-[20px] px-1.5 text-xs font-bold"
                    >
                      {primaryUnread > 9 ? '9+' : primaryUnread}
                    </Badge>
                  )}
                </span>
                {activeTab === 'primary' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-indigo-600" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('requests')}
                className={cn(
                  "flex-1 py-4 text-sm font-semibold transition-all duration-200 relative",
                  activeTab === 'requests'
                    ? "text-blue-600 bg-blue-50/50"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                )}
              >
                <span className="flex items-center justify-center gap-2">
                  Requests
                  {requestsUnread > 0 && (
                    <Badge
                      variant="destructive"
                      className="ml-0.5 h-5 min-w-[20px] px-1.5 text-xs font-bold"
                    >
                      {requestsUnread > 9 ? '9+' : requestsUnread}
                    </Badge>
                  )}
                </span>
                {activeTab === 'requests' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-indigo-600" />
                )}
              </button>
            </div>

            {/* Search */}
            <div className="p-3 border-b bg-white">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 h-10 border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-full transition-all"
                />
              </div>
            </div>

            {/* Conversations */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-full bg-white">
                  <div className="text-center">
                    <div className="relative inline-block mb-4">
                      <MessageCircle className="h-14 w-14 mx-auto text-blue-500 animate-pulse" />
                      <div className="absolute inset-0 bg-blue-400 rounded-full blur-xl opacity-30 animate-pulse" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">Loading messages...</p>
                  </div>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="flex items-center justify-center h-full bg-white">
                  <div className="text-center px-6 py-12">
                    <div className="relative inline-block mb-6">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-200 to-indigo-200 rounded-full blur-3xl opacity-40" />
                      <MessageCircle className="relative h-20 w-20 mx-auto text-gray-300" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      {activeTab === 'primary' ? 'No messages yet' : 'No message requests'}
                    </h3>
                    <p className="text-sm text-gray-500 max-w-[260px] mx-auto leading-relaxed">
                      {activeTab === 'primary'
                        ? 'Start a conversation by sending a message to someone you follow'
                        : 'Message requests from people you don\'t follow will appear here'}
                    </p>
                  </div>
                </div>
              ) : (
                filteredConversations.map((conv, idx) => (
                  <button
                    key={conv.userId}
                    onClick={() => setSelectedConversation(conv.userId)}
                    className={cn(
                      "w-full p-4 flex items-start gap-3 transition-all duration-200 bg-white",
                      "hover:bg-gray-50",
                      selectedConversation === conv.userId && "bg-blue-50 border-l-4 border-l-blue-600"
                    )}
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div className="relative">
                      <Avatar className="h-12 w-12 flex-shrink-0 ring-2 ring-white shadow-sm">
                        <AvatarImage src={conv.avatarUrl} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-400 to-indigo-500 text-white font-semibold">
                          {conv.displayName[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {conv.unreadCount > 0 && (
                        <div className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full border-2 border-white flex items-center justify-center">
                          <span className="text-white text-xs font-bold">{conv.unreadCount > 9 ? '9+' : conv.unreadCount}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <p className={cn(
                            "text-sm truncate",
                            conv.unreadCount > 0 ? "font-bold text-gray-900" : "font-semibold text-gray-700"
                          )}>
                            {conv.displayName}
                          </p>
                          {conv.isRequest && (
                            <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800 border-yellow-200">
                              New
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-gray-400 flex-shrink-0 ml-2 font-medium">
                          {formatDistanceToNow(new Date(conv.lastMessageTime), { addSuffix: true }).replace('about ', '')}
                        </span>
                      </div>
                      <p className={cn(
                        "text-sm truncate",
                        conv.unreadCount > 0 ? "text-gray-900 font-medium" : "text-gray-500"
                      )}>
                        {conv.lastMessage}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 flex flex-col bg-white">
            {selectedConversation && selectedConv ? (
              <>
                {/* Message Request Banner */}
                {selectedConv.isRequest && (
                  <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-b border-yellow-200">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-bold text-sm text-yellow-900 mb-1 flex items-center gap-2">
                          <UserPlus className="h-4 w-4" />
                          Message Request
                        </p>
                        <p className="text-xs text-yellow-800">
                          Do you want to let <span className="font-semibold">{selectedConv.displayName}</span> send you messages?
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteMessageRequest(selectedConv.userId)}
                          className="h-9 border-red-200 hover:bg-red-50 hover:border-red-300 text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                          Delete
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => acceptMessageRequest(selectedConv.userId)}
                          className="h-9 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md"
                        >
                          <Check className="h-3.5 w-3.5 mr-1.5" />
                          Accept
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Chat Header */}
                <div className="px-5 py-4 border-b flex items-center justify-between bg-gradient-to-r from-gray-50 to-white shadow-sm">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-11 w-11 ring-2 ring-blue-100">
                      <AvatarImage src={selectedConv.avatarUrl} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-400 to-indigo-500 text-white font-semibold">
                        {selectedConv.displayName[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-bold text-gray-900">{selectedConv.displayName}</p>
                      <p className="text-xs text-gray-500 font-medium">@{selectedConv.username}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="h-9 w-9 p-0 hover:bg-gray-100 rounded-full">
                    <MoreVertical className="h-4 w-4 text-gray-600" />
                  </Button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-gradient-to-b from-gray-50/30 to-white">
                  {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="relative inline-block mb-3">
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full blur-xl opacity-50" />
                          <MessageCircle className="relative h-12 w-12 text-gray-300" />
                        </div>
                        <p className="text-sm text-gray-500">No messages yet</p>
                        <p className="text-xs text-gray-400 mt-1">Start the conversation!</p>
                      </div>
                    </div>
                  ) : (
                    messages.map((msg, idx) => {
                      const isOwn = msg.sender_id === user?.id
                      return (
                        <div
                          key={msg.id}
                          className={cn(
                            "flex gap-2.5 max-w-[75%] animate-in fade-in-0 slide-in-from-bottom-2",
                            isOwn ? "ml-auto flex-row-reverse" : ""
                          )}
                          style={{ animationDelay: `${idx * 50}ms` }}
                        >
                          {!isOwn && (
                            <Avatar className="h-8 w-8 flex-shrink-0 ring-2 ring-white shadow-sm">
                              <AvatarImage src={msg.sender?.avatar_url} />
                              <AvatarFallback className="bg-gradient-to-br from-gray-400 to-gray-500 text-white text-xs font-semibold">
                                {msg.sender?.display_name[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div className="flex flex-col gap-1">
                            <div
                              className={cn(
                                "rounded-2xl px-4 py-2.5 shadow-sm",
                                isOwn
                                  ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-tr-sm"
                                  : "bg-white text-gray-900 border border-gray-200 rounded-tl-sm"
                              )}
                            >
                              <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                                {msg.message}
                              </p>
                            </div>
                            <p
                              className={cn(
                                "text-xs px-1",
                                isOwn ? "text-gray-400 text-right" : "text-gray-400"
                              )}
                            >
                              {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true }).replace('about ', '')}
                            </p>
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="p-4 border-t bg-white shadow-lg">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      sendMessage()
                    }}
                    className="flex gap-3"
                  >
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="flex-1 h-11 rounded-full px-5 border-gray-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      disabled={!newMessage.trim()}
                      className="h-11 w-11 rounded-full p-0 bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-white">
                <div className="text-center px-8 py-16">
                  <div className="relative inline-block mb-6">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-200 to-indigo-200 rounded-full blur-3xl opacity-40" />
                    <MessageCircle className="relative h-24 w-24 mx-auto text-gray-300" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-xl mb-3">Select a conversation</h3>
                  <p className="text-sm text-gray-500 max-w-[300px] mx-auto leading-relaxed">
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
