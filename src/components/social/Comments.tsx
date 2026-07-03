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
import { UserActionsMenu } from './UserActionsMenu'
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
  const remaining = Math.max(0, 500 - newComment.length)

  return (
    <div className={className}>
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-3.5 sm:px-6 border-b border-border">
          <MessageCircle className="h-[18px] w-[18px] text-muted-foreground" />
          <h3 className="font-heading text-base font-semibold text-foreground">
            Comments
          </h3>
          {commentsCount > 0 && (
            <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-semibold tabular-nums text-muted-foreground">
              {commentsCount}
            </span>
          )}
        </div>

        {/* Composer — top of the thread, modern flat input */}
        {user ? (
          <motion.form
            onSubmit={handleSubmit}
            className="px-4 py-4 sm:px-6 border-b border-border"
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <div className="flex items-start gap-3">
              <Avatar className="mt-0.5 h-9 w-9 shrink-0">
                <AvatarImage src={getAvatarUrl(profile?.avatar_url, profile?.username)} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                  {getDisplayInitial(profile?.display_name, profile?.username)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <MentionInput
                  value={newComment}
                  onChange={(value, mentioned) => {
                    setNewComment(value.slice(0, 500))
                    if (mentioned) setMentionedUsers(mentioned)
                  }}
                  placeholder="Add a comment…"
                  rows={1}
                  disabled={isSubmitting}
                  className="rounded-2xl bg-muted/40 focus:bg-card transition-colors"
                />
                <div className="mt-2 flex items-center justify-end gap-3">
                  <span
                    className={`text-[11px] tabular-nums transition-colors ${
                      remaining <= 20 ? 'text-destructive' : 'text-muted-foreground/60'
                    }`}
                  >
                    {newComment.length > 0 ? `${remaining} left` : ''}
                  </span>
                  <motion.button
                    type="submit"
                    disabled={!newComment.trim() || isSubmitting}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition-all disabled:bg-muted disabled:text-muted-foreground/60 disabled:shadow-none"
                    whileTap={prefersReducedMotion || !newComment.trim() ? {} : { scale: 0.94 }}
                  >
                    {isSubmitting ? (
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    Post
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.form>
        ) : (
          <div className="px-4 py-4 sm:px-6 border-b border-border">
            <div className="rounded-xl bg-muted/50 px-4 py-3 text-center text-sm text-muted-foreground">
              <Link href="/login" className="text-primary hover:underline font-semibold">
                Sign in
              </Link>{' '}
              to join the conversation
            </div>
          </div>
        )}

        {/* Comments list */}
        <div className="px-4 py-4 sm:px-6">
          {displayedComments.length > 0 ? (
            <div className="space-y-1">
              <AnimatePresence mode="popLayout">
                {displayedComments.map((comment, index) => {
                  const commentUser = comment.users || comment.profiles || comment.user
                  const isOwner = user?.id === comment.user_id
                  return (
                    <motion.div
                      key={comment.id}
                      className="group flex items-start gap-3 rounded-xl -mx-2 px-2 py-2 transition-colors hover:bg-muted/40"
                      initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={prefersReducedMotion ? {} : { opacity: 0, x: -16 }}
                      transition={{
                        type: 'spring',
                        stiffness: 300,
                        damping: 25,
                        delay: prefersReducedMotion ? 0 : index * 0.04
                      }}
                      layout={!prefersReducedMotion}
                    >
                      <UserAvatarLink user={commentUser}>
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarImage src={getAvatarUrl(commentUser?.avatar_url, commentUser?.username)} />
                          <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                            {getDisplayInitial(commentUser?.display_name, commentUser?.username)}
                          </AvatarFallback>
                        </Avatar>
                      </UserAvatarLink>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <UserLink
                            user={commentUser}
                            className="text-sm font-semibold text-foreground hover:underline"
                          />
                          <span className="text-[11px] text-muted-foreground/70 shrink-0">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-foreground/90 mt-0.5 leading-relaxed break-words">
                          {comment.content}
                        </p>
                      </div>

                      {/* Delete — appears on hover for the owner */}
                      {isOwner && (
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label="Delete comment"
                          className="h-7 w-7 shrink-0 p-0 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                          onClick={() => handleDelete(comment.id)}
                          disabled={loading}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}

                      {/* Report / block — for everyone else's comments. The menu
                          hides itself for your own content and logged-out users. */}
                      {!isOwner && (
                        <UserActionsMenu
                          userId={comment.user_id}
                          username={commentUser?.username || 'user'}
                          targetType="comment"
                          targetId={comment.id}
                          className="shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                        />
                      )}
                    </motion.div>
                  )
                })}
              </AnimatePresence>

              {/* Show more / less */}
              {hasMore && (
                <div className="pt-2 pl-12">
                  <button
                    type="button"
                    className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded"
                    onClick={() => setShowAll(!showAll)}
                  >
                    {showAll ? 'Show less' : `View all ${comments.length} comments`}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm font-medium text-foreground">No comments yet</p>
              <p className="text-xs text-muted-foreground mt-0.5">Be the first to share your thoughts.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
