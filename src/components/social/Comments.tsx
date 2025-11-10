'use client'

import { useState } from 'react'
import { useComments } from '@/lib/hooks/useSocial'
import { useAuth } from '@/components/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MessageCircle, Send, Trash2 } from 'lucide-react'
import { log } from '@/lib/utils/logger'
import { formatDistanceToNow } from 'date-fns'
import { UserLink, UserAvatarLink } from './UserLink'
import { toast } from 'sonner'
import { MentionInput } from '@/components/mentions/MentionInput'
import { useMentions } from '@/lib/hooks/useMentions'
import type { User } from '@/types/database'

interface CommentsProps {
  albumId?: string
  photoId?: string
  className?: string
}

export function Comments({ albumId, photoId, className }: CommentsProps) {
  const { comments, loading, addComment, deleteComment, commentsCount } = useComments(albumId, photoId)
  const { user, profile } = useAuth()
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [mentionedUsers, setMentionedUsers] = useState<User[]>([])
  const { createMention } = useMentions()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const createdComment = await addComment(newComment)

      // Create mention records for all mentioned users
      if (mentionedUsers.length > 0 && createdComment?.id) {
        for (const user of mentionedUsers) {
          await createMention(createdComment.id, user.id)
        }
      }

      setNewComment('')
      setMentionedUsers([])
      log.info('Comment posted successfully', {
        component: 'Comments',
        action: 'post-comment',
        albumId,
        photoId,
        mentionsCount: mentionedUsers.length
      })
      toast.success('Comment posted!')
    } catch (error) {
      log.error('Error submitting comment', {
        component: 'Comments',
        action: 'post-comment',
        albumId,
        photoId
      }, error as Error)
      toast.error('Failed to post comment. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (commentId: string) => {
    if (loading) return
    await deleteComment(commentId)
  }

  const displayedComments = showAll ? comments : comments.slice(0, 5)
  const hasMore = comments.length > 5

  return (
    <div className={className}>
      {/* Comments Section with Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Comments Header */}
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-teal-500" />
            Comments
            {commentsCount > 0 && (
              <span className="text-sm font-normal text-gray-500">
                ({commentsCount})
              </span>
            )}
          </h3>
        </div>

        {/* Comments List */}
        <div className="px-6 py-4">
          {displayedComments.length > 0 ? (
            <div className="space-y-5 mb-6">
              {displayedComments.map((comment) => {
                const commentUser = comment.users || comment.profiles || comment.user
                return (
                  <div key={comment.id} className="flex gap-3 group">
                    <UserAvatarLink user={commentUser}>
                      <Avatar className="h-10 w-10 ring-2 ring-gray-50">
                        <AvatarImage src={commentUser?.avatar_url} />
                        <AvatarFallback className="bg-gradient-to-br from-teal-100 to-cyan-100 text-teal-700 text-sm font-semibold">
                          {commentUser?.display_name?.[0] ||
                           commentUser?.username?.[0] ||
                           'U'}
                        </AvatarFallback>
                      </Avatar>
                    </UserAvatarLink>

                    <div className="flex-1 min-w-0">
                      <div className="bg-gray-50 rounded-2xl px-4 py-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <UserLink
                              user={commentUser}
                              className="text-sm font-bold text-gray-900 hover:underline"
                            />
                            <p className="text-sm text-gray-800 mt-1 leading-relaxed break-words">
                              {comment.content}
                            </p>
                          </div>

                          {/* Delete button for comment owner */}
                          {user?.id === comment.user_id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleDelete(comment.id)}
                              disabled={loading}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="px-4 mt-1.5">
                        <span className="text-xs text-gray-500 font-medium">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Show more/less button */}
              {hasMore && (
                <div className="pt-2">
                  <button
                    className="text-sm text-teal-600 hover:text-teal-700 font-semibold px-4"
                    onClick={() => setShowAll(!showAll)}
                  >
                    {showAll
                      ? 'Show less'
                      : `View all ${comments.length} comments`
                    }
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center">
              <MessageCircle className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No comments yet</p>
              <p className="text-xs text-gray-400 mt-1">Be the first to comment!</p>
            </div>
          )}

          {/* Add Comment Form */}
          {user ? (
            <div className="border-t border-gray-100 pt-4 mt-4">
              <form onSubmit={handleSubmit}>
                <div className="flex gap-3">
                  <Avatar className="h-10 w-10 ring-2 ring-gray-50">
                    <AvatarImage src={profile?.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-teal-100 to-cyan-100 text-teal-700 text-sm font-semibold">
                      {profile?.display_name?.[0] || profile?.username?.[0] || 'Y'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <MentionInput
                          value={newComment}
                          onChange={(value, mentioned) => {
                            setNewComment(value)
                            if (mentioned) setMentionedUsers(mentioned)
                          }}
                          placeholder="Write a comment... (use @ to mention users)"
                          maxLength={500}
                          rows={1}
                          disabled={isSubmitting}
                          className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent focus:bg-white transition-all"
                        />
                      </div>
                      <Button
                        type="submit"
                        disabled={!newComment.trim() || isSubmitting}
                        size="sm"
                        className="bg-teal-500 hover:bg-teal-600 text-white px-5 rounded-full font-semibold shadow-sm disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        ) : (
                          'Post'
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          ) : (
            <div className="border-t border-gray-100 pt-4 mt-4 bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">
                <a href="/login" className="text-teal-600 hover:text-teal-700 font-semibold">
                  Sign in
                </a>{' '}
                to join the conversation
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
