'use client'

import { use } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { useJournalEntry } from '@/lib/hooks/useJournal'
import {
  ArrowLeft,
  Clock,
  Eye,
  MapPin,
  Tag,
  Heart,
  MessageCircle,
  Calendar,
  Link2,
  Loader2,
  Edit3,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import ReactMarkdown from 'react-markdown'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import type { User } from '@/types/database'

export default function JournalEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user } = useAuth()
  const prefersReducedMotion = useReducedMotion()

  const { data, isLoading, error } = useJournalEntry(id)
  const entry = data?.entry

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-amber-50/30 dark:from-stone-950 dark:via-stone-950 dark:to-stone-900 flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={prefersReducedMotion ? {} : { opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Loader2 className="h-10 w-10 text-amber-500 animate-spin mx-auto mb-4" />
          <p className="text-stone-600 dark:text-stone-400">Loading entry...</p>
        </motion.div>
      </div>
    )
  }

  if (error || !entry) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-amber-50/30 dark:from-stone-950 dark:via-stone-950 dark:to-stone-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-stone-900 dark:text-white mb-2">Entry not found</h2>
          <p className="text-stone-600 dark:text-stone-400 mb-4">This journal entry may have been deleted or is not accessible.</p>
          <Link href="/journal">
            <Button variant="outline" className="gap-2 rounded-xl">
              <ArrowLeft className="h-4 w-4" />
              Back to Journal
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const isOwner = user?.id === entry.user_id
  const author = (entry as unknown as { users: User })?.users

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-amber-50/30 dark:from-stone-950 dark:via-stone-950 dark:to-stone-900">
      {/* Hero / Cover Image */}
      {entry.cover_image_url && (
        <motion.div
          className="relative h-64 sm:h-80 md:h-96 overflow-hidden"
          initial={prefersReducedMotion ? {} : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <Image
            src={entry.cover_image_url}
            alt={entry.title}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
            <div className="max-w-3xl mx-auto">
              <Link href="/journal">
                <Button variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10 gap-2 mb-4 rounded-xl">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Journal
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      )}

      {/* Back button if no cover */}
      {!entry.cover_image_url && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6">
          <Link href="/journal">
            <Button variant="ghost" size="sm" className="gap-2 rounded-xl text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              Back to Journal
            </Button>
          </Link>
        </div>
      )}

      {/* Article */}
      <motion.article
        className="max-w-3xl mx-auto px-4 sm:px-6 py-8"
        initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {/* Title */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-stone-900 dark:text-white leading-tight mb-6">
          {entry.title}
        </h1>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-4 mb-8 pb-6 border-b border-stone-200 dark:border-stone-800">
          {/* Author */}
          {author && (
            <div className="flex items-center gap-2">
              {author.avatar_url ? (
                <Image
                  src={author.avatar_url}
                  alt={author.display_name || author.username || ''}
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-sm font-bold">
                  {(author.display_name || author.username || 'U')[0].toUpperCase()}
                </div>
              )}
              <span className="text-sm font-medium text-stone-700 dark:text-stone-300">
                {author.display_name || author.username}
              </span>
            </div>
          )}

          <span className="text-stone-300 dark:text-stone-600">|</span>

          {/* Date */}
          <span className="flex items-center gap-1.5 text-sm text-stone-500 dark:text-stone-400">
            <Calendar className="h-3.5 w-3.5" />
            {entry.published_at
              ? new Date(entry.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
              : new Date(entry.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
            }
          </span>

          {/* Reading time */}
          <span className="flex items-center gap-1.5 text-sm text-stone-500 dark:text-stone-400">
            <Clock className="h-3.5 w-3.5" />
            {entry.reading_time_minutes} min read
          </span>

          {/* Views */}
          <span className="flex items-center gap-1.5 text-sm text-stone-500 dark:text-stone-400">
            <Eye className="h-3.5 w-3.5" />
            {entry.view_count} views
          </span>

          {/* Edit button for owner */}
          {isOwner && (
            <Link href={`/journal/new?edit=${entry.id}`} className="ml-auto">
              <Button variant="outline" size="sm" className="gap-1.5 rounded-xl text-sm">
                <Edit3 className="h-3.5 w-3.5" />
                Edit
              </Button>
            </Link>
          )}
        </div>

        {/* Location & Country */}
        {entry.location_name && (
          <div className="flex items-center gap-2 mb-6 p-3 rounded-xl bg-amber-50/50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50">
            <MapPin className="h-4 w-4 text-amber-500 shrink-0" />
            <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
              {entry.location_name}
            </span>
            {entry.country_code && (
              <span className="text-xs text-amber-600/70 dark:text-amber-400/70 ml-auto">
                {entry.country_code}
              </span>
            )}
          </div>
        )}

        {/* Content */}
        <div className={cn(
          'prose prose-lg prose-teal dark:prose-invert max-w-none',
          'prose-headings:text-stone-900 dark:prose-headings:text-white',
          'prose-p:text-stone-700 dark:prose-p:text-stone-300',
          'prose-a:text-amber-600 dark:prose-a:text-amber-400',
          'prose-strong:text-stone-900 dark:prose-strong:text-white',
          'prose-img:rounded-xl prose-img:shadow-lg',
        )}>
          <ReactMarkdown>{entry.content}</ReactMarkdown>
        </div>

        {/* Tags */}
        {entry.tags && entry.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-stone-200 dark:border-stone-800">
            {entry.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-100 dark:border-amber-800/50"
              >
                <Tag className="h-3 w-3" />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Linked Album */}
        {entry.album_id && (
          <div className="mt-6 p-4 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700">
            <div className="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-400">
              <Link2 className="h-4 w-4 text-amber-500" />
              <span>Related Album:</span>
              <Link
                href={`/albums/${entry.album_id}`}
                className="text-amber-600 dark:text-amber-400 hover:underline font-medium"
              >
                View Album
              </Link>
            </div>
          </div>
        )}

        {/* Interaction buttons */}
        <div className="flex items-center gap-4 mt-8 pt-6 border-t border-stone-200 dark:border-stone-800">
          <Button variant="outline" className="gap-2 rounded-xl">
            <Heart className="h-4 w-4" />
            <span>{entry.like_count}</span>
          </Button>
          <Button variant="outline" className="gap-2 rounded-xl">
            <MessageCircle className="h-4 w-4" />
            <span>{entry.comment_count}</span>
          </Button>
        </div>
      </motion.article>
    </div>
  )
}
