'use client'

import { useState } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { useJournalEntries, useDeleteJournalEntry } from '@/lib/hooks/useJournal'
import { Loader2, BookOpen, Plus, Eye, Clock, Trash2, Edit3, MapPin, Tag } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'
import { MeshGradient } from '@/components/ui/animated-gradient'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'

type FilterStatus = 'all' | 'published' | 'draft'

export default function JournalPage() {
  const { user } = useAuth()
  const [filter, setFilter] = useState<FilterStatus>('all')
  const prefersReducedMotion = useReducedMotion()

  const { data, isLoading } = useJournalEntries({ status: filter })
  const deleteEntry = useDeleteJournalEntry()

  const entries = data?.entries || []

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this journal entry?')) return
    deleteEntry.mutate(id)
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.08,
        delayChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 30, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: 'spring' as const, stiffness: 300, damping: 24 }
    },
    exit: prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.9 }
  }

  if (!user) return null

  if (isLoading) {
    return (
      <MeshGradient variant="subtle" className="min-h-screen flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <motion.div
            className="h-12 w-12 rounded-full border-4 border-solid border-teal-200 border-t-teal-600 mx-auto mb-4"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <p className="text-gray-900 dark:text-gray-100 font-medium">Loading journal...</p>
        </motion.div>
      </MeshGradient>
    )
  }

  return (
    <MeshGradient variant="subtle" className="min-h-screen dark:!bg-gray-950 -mx-3 sm:-mx-6 lg:-mx-8 -my-3 sm:-my-6 lg:-my-8 px-3 sm:px-6 lg:px-8 py-3 sm:py-6 lg:py-8">
      {/* Header */}
      <motion.div
        className="bg-gradient-to-br from-white/95 to-white/80 dark:from-gray-900/95 dark:to-gray-900/80 backdrop-blur-xl border-b border-white/50 dark:border-gray-800/50 rounded-xl mb-6"
        initial={prefersReducedMotion ? {} : { opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                Travel Journal
                {!prefersReducedMotion && entries.length > 0 && (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25, delay: 0.3 }}
                  >
                    <BookOpen className="h-6 w-6 text-teal-500" />
                  </motion.div>
                )}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Write and share your travel stories</p>
            </div>
            <motion.div
              whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
            >
              <Link href="/journal/new">
                <Button className="gap-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-lg shadow-teal-500/25">
                  <Plus className="h-4 w-4" />
                  New Entry
                </Button>
              </Link>
            </motion.div>
          </div>

          {/* Filter tabs */}
          <motion.div
            className="flex gap-2 mt-6"
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {(['all', 'published', 'draft'] as const).map((status, index) => (
              <motion.button
                key={status}
                onClick={() => setFilter(status)}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-medium transition-all',
                  filter === status
                    ? 'bg-gradient-to-r from-teal-500/10 to-cyan-500/10 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-700 shadow-sm'
                    : 'bg-white/60 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 border border-transparent hover:border-gray-200 dark:hover:border-gray-700'
                )}
                whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
                whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + index * 0.05 }}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </motion.button>
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* Content */}
      <div className="py-2">
        {entries.length === 0 ? (
          <GlassCard
            animate
            className="p-12 text-center dark:bg-gray-900/80 dark:border-gray-800"
          >
            <motion.div
              className="relative inline-block"
              animate={prefersReducedMotion ? {} : { y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-teal-100 to-cyan-100 dark:from-teal-900/50 dark:to-cyan-900/50 flex items-center justify-center mx-auto mb-6">
                <BookOpen className="h-12 w-12 text-teal-500" />
              </div>
            </motion.div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No journal entries yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              Start writing about your travel experiences and share your stories with the world.
            </p>
            <Link href="/journal/new">
              <Button className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-lg shadow-teal-500/25">
                <BookOpen className="h-4 w-4 mr-2" />
                Write Your First Entry
              </Button>
            </Link>
          </GlassCard>
        ) : (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            <AnimatePresence mode="popLayout">
              {entries.map((entry) => (
                <motion.div
                  key={entry.id}
                  variants={itemVariants}
                  layout={!prefersReducedMotion}
                  className={cn(
                    'rounded-2xl overflow-hidden relative group',
                    'bg-gradient-to-br from-white/95 to-white/80 dark:from-gray-900/95 dark:to-gray-900/80',
                    'backdrop-blur-xl border border-white/50 dark:border-gray-800/50',
                    'shadow-lg shadow-black/5',
                    'hover:shadow-xl hover:shadow-teal-500/10 transition-all duration-300'
                  )}
                  whileHover={prefersReducedMotion ? {} : { y: -6 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  {/* Cover image */}
                  {entry.cover_image_url && (
                    <div className="relative h-48 overflow-hidden">
                      <Image
                        src={entry.cover_image_url}
                        alt={entry.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-lg text-gray-900 dark:text-white line-clamp-2 group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors flex-1">
                        {entry.title}
                      </h3>
                      <span className={cn(
                        'px-2 py-0.5 rounded-full text-xs font-medium ml-2 shrink-0',
                        entry.status === 'published'
                          ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      )}>
                        {entry.status}
                      </span>
                    </div>

                    {entry.excerpt && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-3">
                        {entry.excerpt}
                      </p>
                    )}

                    {/* Location */}
                    {entry.location_name && (
                      <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mb-2">
                        <MapPin className="h-3.5 w-3.5 text-teal-500" />
                        <span className="truncate">{entry.location_name}</span>
                      </div>
                    )}

                    {/* Tags */}
                    {entry.tags && entry.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {entry.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400"
                          >
                            <Tag className="h-2.5 w-2.5" />
                            {tag}
                          </span>
                        ))}
                        {entry.tags.length > 3 && (
                          <span className="text-xs text-gray-400">+{entry.tags.length - 3}</span>
                        )}
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-4">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {entry.reading_time_minutes} min read
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-3.5 w-3.5" />
                        {entry.view_count} views
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Link href={`/journal/${entry.id}`} className="flex-1">
                        <Button variant="outline" className="w-full gap-2 border-gray-200 dark:border-gray-700 hover:border-teal-200 dark:hover:border-teal-700 hover:bg-teal-50/50 dark:hover:bg-teal-900/20 hover:text-teal-700 dark:hover:text-teal-400 transition-all rounded-xl text-sm">
                          <Eye className="h-3.5 w-3.5" />
                          Read
                        </Button>
                      </Link>
                      <Link href={`/journal/new?edit=${entry.id}`}>
                        <Button variant="outline" size="icon" className="border-gray-200 dark:border-gray-700 hover:border-teal-200 dark:hover:border-teal-700 hover:bg-teal-50/50 dark:hover:bg-teal-900/20 hover:text-teal-700 dark:hover:text-teal-400 transition-all rounded-xl">
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDelete(entry.id)}
                        disabled={deleteEntry.isPending}
                        className="text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 dark:hover:border-red-700 transition-all rounded-xl"
                      >
                        {deleteEntry.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-5 py-3 bg-gray-50/50 dark:bg-gray-800/30 border-t border-gray-100/50 dark:border-gray-800/50 text-xs text-gray-500 dark:text-gray-400">
                    {entry.published_at
                      ? `Published ${new Date(entry.published_at).toLocaleDateString()}`
                      : `Created ${new Date(entry.created_at).toLocaleDateString()}`
                    }
                  </div>

                  {/* Hover shine */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </MeshGradient>
  )
}
