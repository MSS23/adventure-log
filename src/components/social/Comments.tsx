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
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle className="h-4 w-4 text-gray-800" />
        <span className="text-sm font-medium text-gray-700">
          {commentsCount} {commentsCount === 1 ? 'Comment' : 'Comments'}
        </span>
      </div>

      {/* Comments List */}
      {displayedComments.length > 0 && (
        <div className="space-y-3 mb-4">
          {displayedComments.map((comment) => (
            <Card key={comment.id} className="bg-gray-50">
              <CardContent className="p-3">
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={comment.profiles?.avatar_url} />
                    <AvatarFallback className="text-sm">
                      {comment.profiles?.display_name?.[0] ||
                       comment.profiles?.username?.[0] ||
                       'U'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {comment.profiles?.display_name || comment.profiles?.username || 'Anonymous'}
                        </span>
                        <span className="text-sm text-gray-800">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>
                      </div>

                      {/* Delete button for comment owner */}
                      {user?.id === comment.user_id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-gray-700 hover:text-red-600"
                          onClick={() => handleDelete(comment.id)}
                          disabled={loading}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>

                    <p className="text-sm text-gray-700 mt-1 break-words">
                      {comment.content}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Show more/less button */}
          {hasMore && (
            <Button
              variant="ghost"
              size="sm"
              className="text-blue-600 hover:text-blue-700 p-0 h-auto"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll
                ? `Show less`
                : `Show ${comments.length - 3} more ${comments.length - 3 === 1 ? 'comment' : 'comments'}`
              }
            </Button>
          )}
        </div>
      )}

      {/* Add Comment Form */}
      {user && (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback className="text-sm">
                {profile?.display_name?.[0] || profile?.username?.[0] || 'Y'}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <Textarea
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="resize-none min-h-[60px]"
                maxLength={500}
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm text-gray-800">
                  {newComment.length}/500
                </span>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!newComment.trim() || isSubmitting}
                  className="min-w-[80px]"
                >
                  {isSubmitting ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <Send className="h-3 w-3 mr-1" />
                      Post
                    </>
                  )}
                </Button>
              </div>
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