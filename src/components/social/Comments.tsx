'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useComments } from '@/lib/hooks/useSocial'
import { useAuth } from '@/components/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MessageCircle, Trash2, Send } from 'lucide-react'
import { log } from '@/lib/utils/logger'
import { formatDistanceToNow } from 'date-fns'
import { UserLink, UserAvatarLink } from './UserLink'
import { toast } from 'sonner'
import { MentionInput } from '@/components/mentions/MentionInput'
import { useMentions } from '@/lib/hooks/useMentions'
import { motion, AnimatePresence } from 'framer-motion'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { getAvatarUrl } from '@/lib/utils/avatar'
import { getDisplayInitial } from '@/lib/utils/display-name'
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
  const prefersReducedMotion = useReducedMotion()

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
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {/* Comments Header */}
        <div className="px-5 py-3.5 sm:px-6 border-b border-border">
          <h3 className="font-heading text-base md:text-lg font-semibold text-foreground flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Comments
            {commentsCount > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                {commentsCount}
              </span>
            )}
          </h3>
        </div>

        {/* Comments List */}
        <div className="px-5 py-5 sm:px-6">
          {displayedComments.length > 0 ? (
            <div className="space-y-4 mb-6">
              <AnimatePresence mode="popLayout">
                {displayedComments.map((comment, index) => {
                  const commentUser = comment.users || comment.profiles || comment.user
                  return (
                    <motion.div
                      key={comment.id}
                      className="flex items-start gap-3 group"
                      initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={prefersReducedMotion ? {} : { opacity: 0, x: -20 }}
                      transition={{
                        type: 'spring',
                        stiffness: 300,
                        damping: 25,
                        delay: prefersReducedMotion ? 0 : index * 0.05
                      }}
                      layout={!prefersReducedMotion}
                    >
                      <UserAvatarLink user={commentUser}>
                        <Avatar className="h-9 w-9 ring-2 ring-background shrink-0">
                          <AvatarImage src={getAvatarUrl(commentUser?.avatar_url, commentUser?.username)} />
                          <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                            {getDisplayInitial(commentUser?.display_name, commentUser?.username)}
                          </AvatarFallback>
                        </Avatar>
                      </UserAvatarLink>

                      <div className="flex-1 min-w-0">
                        <div className="bg-muted/50 rounded-2xl px-4 py-3 sm:px-5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <UserLink
                                user={commentUser}
                                className="text-sm font-semibold text-foreground hover:underline"
                              />
                              <p className="text-sm text-foreground mt-1 leading-relaxed break-words">
                                {comment.content}
                              </p>
                            </div>

                            {/* Delete button for comment owner */}
                            {user?.id === comment.user_id && (
                              <motion.div
                                whileHover={prefersReducedMotion ? {} : { scale: 1.1 }}
                                whileTap={prefersReducedMotion ? {} : { scale: 0.9 }}
                              >
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  aria-label="Delete comment"
                                  className="-mr-1.5 h-7 w-7 p-0 text-muted-foreground hover:text-destructive opacity-60 group-hover:opacity-100 transition-opacity"
                                  onClick={() => handleDelete(comment.id)}
                                  disabled={loading}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </motion.div>
                            )}
                          </div>
                        </div>
                        <div className="px-4 mt-1 sm:px-5">
                          <span className="text-[11px] text-muted-foreground/70">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>

              {/* Show more/less button */}
              {hasMore && (
                <motion.div
                  className="pt-2"
                  initial={prefersReducedMotion ? {} : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <button
                    type="button"
                    className="text-sm text-primary hover:underline font-semibold px-4 py-1 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    onClick={() => setShowAll(!showAll)}
                  >
                    {showAll
                      ? 'Show less'
                      : `View all ${comments.length} comments`
                    }
                  </button>
                </motion.div>
              )}
            </div>
          ) : (
            <div className="py-7 text-center">
              <div className="mx-auto mb-2.5 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                <MessageCircle className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-foreground">No comments yet</p>
              <p className="text-xs text-muted-foreground mt-0.5">Be the first to comment!</p>
            </div>
          )}

          {/* Add Comment Form */}
          {user ? (
            <motion.div
              className="border-t border-border pt-4 mt-4"
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 25 }}
            >
              <form onSubmit={handleSubmit}>
                <div className="flex items-end gap-2.5 sm:gap-3">
                  <Avatar className="h-9 w-9 ring-2 ring-background shrink-0">
                    <AvatarImage src={getAvatarUrl(profile?.avatar_url, profile?.username)} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                      {getDisplayInitial(profile?.display_name, profile?.username)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <MentionInput
                      value={newComment}
                      onChange={(value, mentioned) => {
                        setNewComment(value)
                        if (mentioned) setMentionedUsers(mentioned)
                      }}
                      placeholder="Add a comment…"
                      maxLength={500}
                      rows={1}
                      disabled={isSubmitting}
                      className="px-4 py-3 bg-muted/50 border border-border rounded-2xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent focus:bg-card transition-all"
                    />
                  </div>

                  {/* Modern circular send button — springs to primary once there's
                      text to post, fades back when empty (Instagram-style). */}
                  <motion.button
                    type="submit"
                    disabled={!newComment.trim() || isSubmitting}
                    aria-label="Post comment"
                    className="mb-[26px] grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm transition-all disabled:scale-90 disabled:bg-muted disabled:text-muted-foreground/60 disabled:shadow-none"
                    whileTap={prefersReducedMotion || !newComment.trim() ? {} : { scale: 0.88 }}
                  >
                    {isSubmitting ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          ) : (
            <div className="mt-4 rounded-xl bg-muted/50 p-4 text-center">
              <p className="text-sm text-muted-foreground">
                <Link href="/login" className="text-primary hover:underline font-semibold">
                  Sign in
                </Link>{' '}
                to join the conversation
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
