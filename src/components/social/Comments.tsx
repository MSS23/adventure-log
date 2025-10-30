'use client'

import { useState } from 'react'
import { useComments } from '@/lib/hooks/useSocial'
import { useAuth } from '@/components/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MessageCircle, Send, Trash2 } from 'lucide-react'
import { log } from '@/lib/utils/logger'
import { formatDistanceToNow } from 'date-fns'
import { UserLink, UserAvatarLink } from './UserLink'

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      await addComment(newComment)
      setNewComment('')
    } catch (error) {
      log.error('Error submitting comment', { error })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (commentId: string) => {
    if (loading) return
    await deleteComment(commentId)
  }

  const displayedComments = showAll ? comments : comments.slice(0, 3)
  const hasMore = comments.length > 3

  return (
    <div className={className}>
      {/* Comments Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Comments ({commentsCount})
        </h3>
      </div>

      {/* Comments List */}
      {displayedComments.length > 0 && (
        <div className="space-y-4 mb-6">
          {displayedComments.map((comment) => {
            const commentUser = comment.users || comment.profiles || comment.user
            return (
              <div key={comment.id} className="flex gap-3">
                <UserAvatarLink user={commentUser}>
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={commentUser?.avatar_url} />
                    <AvatarFallback className="bg-gray-200 text-gray-700 text-xs">
                      {commentUser?.display_name?.[0] ||
                       commentUser?.username?.[0] ||
                       'U'}
                    </AvatarFallback>
                  </Avatar>
                </UserAvatarLink>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <UserLink
                          user={commentUser}
                          className="text-sm font-semibold text-gray-900 hover:underline"
                        />
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mt-1 leading-relaxed">
                        {comment.content}
                      </p>
                    </div>

                    {/* Delete button for comment owner */}
                    {user?.id === comment.user_id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
                        onClick={() => handleDelete(comment.id)}
                        disabled={loading}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {/* Show more/less button */}
          {hasMore && (
            <button
              className="text-sm text-teal-600 hover:text-teal-700 font-medium"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll
                ? 'Show less'
                : `View all ${comments.length} comments`
              }
            </button>
          )}
        </div>
      )}

      {/* Add Comment Form */}
      {user && (
        <form onSubmit={handleSubmit}>
          <div className="flex gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback className="bg-gray-200 text-gray-700 text-xs">
                {profile?.display_name?.[0] || profile?.username?.[0] || 'Y'}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 flex gap-2">
              <input
                type="text"
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                maxLength={500}
              />
              <Button
                type="submit"
                disabled={!newComment.trim() || isSubmitting}
                className="bg-teal-500 hover:bg-teal-600 text-white px-6"
              >
                {isSubmitting ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  'Post'
                )}
              </Button>
            </div>
          </div>
        </form>
      )}

      {!user && (
        <Card className="bg-gray-50">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-gray-800">
              <a href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                Sign in
              </a>{' '}
              to join the conversation
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}