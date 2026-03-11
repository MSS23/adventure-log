'use client'

import { useState } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { useCheckIns, useDeleteCheckIn } from '@/lib/hooks/useCheckIns'
import {
  MapPin,
  Loader2,
  Trash2,
  Clock,
  Filter,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'
import { MeshGradient } from '@/components/ui/animated-gradient'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import QuickCheckIn from '@/components/check-ins/QuickCheckIn'
import type { CheckInMood } from '@/types/database'

const moodConfig: Record<CheckInMood, { emoji: string; label: string; color: string }> = {
  amazing: { emoji: '\uD83E\uDD29', label: 'Amazing', color: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  happy: { emoji: '\uD83D\uDE0A', label: 'Happy', color: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  relaxed: { emoji: '\uD83D\uDE0C', label: 'Relaxed', color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  exploring: { emoji: '\uD83E\uDDD0', label: 'Exploring', color: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  tired: { emoji: '\uD83D\uDE34', label: 'Tired', color: 'bg-stone-50 text-stone-700 dark:bg-stone-800/50 dark:text-stone-400' },
  adventurous: { emoji: '\uD83E\uDD20', label: 'Adventurous', color: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
}

const allMoods: CheckInMood[] = ['amazing', 'happy', 'relaxed', 'exploring', 'tired', 'adventurous']

export default function CheckInsPage() {
  const { user } = useAuth()
  const [moodFilter, setMoodFilter] = useState<CheckInMood | undefined>()
  const [showQuickCheckIn, setShowQuickCheckIn] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  const { data, isLoading } = useCheckIns({ mood: moodFilter })
  const deleteCheckIn = useDeleteCheckIn()

  const checkIns = data?.check_ins || []

  const handleDelete = (id: string) => {
    if (!confirm('Delete this check-in?')) return
    deleteCheckIn.mutate(id)
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: prefersReducedMotion ? 0 : 0.06 }
    }
  }

  const itemVariants = {
    hidden: prefersReducedMotion ? { opacity: 1 } : { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
    exit: prefersReducedMotion ? { opacity: 1 } : { opacity: 0, x: 20 }
  }

  if (!user) return null

  if (isLoading) {
    return (
      <MeshGradient variant="subtle" className="min-h-screen flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={prefersReducedMotion ? {} : { opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Loader2 className="h-10 w-10 text-amber-500 animate-spin mx-auto mb-4" />
          <p className="text-stone-600 dark:text-stone-400">Loading check-ins...</p>
        </motion.div>
      </MeshGradient>
    )
  }

  return (
    <MeshGradient variant="subtle" className="min-h-screen dark:!bg-stone-950">
      {/* Header */}
      <motion.div
        className="bg-gradient-to-br from-white/95 to-white/80 dark:from-stone-900/95 dark:to-stone-900/80 backdrop-blur-xl border-b border-white/50 dark:border-stone-800/50"
        initial={prefersReducedMotion ? {} : { opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-stone-900 dark:text-white flex items-center gap-3">
                Check-ins
                <MapPin className="h-6 w-6 text-amber-500" />
              </h1>
              <p className="text-stone-600 dark:text-stone-400 mt-1">
                {checkIns.length} location{checkIns.length !== 1 ? 's' : ''} checked in
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  'rounded-xl',
                  showFilters && 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700'
                )}
              >
                <Filter className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => setShowQuickCheckIn(true)}
                className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/25"
              >
                <Plus className="h-4 w-4" />
                Check In
              </Button>
            </div>
          </div>

          {/* Mood filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                className="flex flex-wrap gap-2 mt-4"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
              >
                <button
                  onClick={() => setMoodFilter(undefined)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm font-medium transition-all border',
                    !moodFilter
                      ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700'
                      : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-700'
                  )}
                >
                  All
                </button>
                {allMoods.map((mood) => (
                  <button
                    key={mood}
                    onClick={() => setMoodFilter(moodFilter === mood ? undefined : mood)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-sm font-medium transition-all border',
                      moodFilter === mood
                        ? moodConfig[mood].color + ' border-current'
                        : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-700'
                    )}
                  >
                    {moodConfig[mood].emoji} {moodConfig[mood].label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Timeline */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {checkIns.length === 0 ? (
          <GlassCard animate className="p-12 text-center dark:bg-stone-900/80 dark:border-stone-800">
            <motion.div
              className="relative inline-block"
              animate={prefersReducedMotion ? {} : { y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/50 dark:to-orange-900/50 flex items-center justify-center mx-auto mb-6">
                <MapPin className="h-12 w-12 text-amber-500" />
              </div>
            </motion.div>
            <h3 className="text-xl font-semibold text-stone-900 dark:text-white mb-2">
              No check-ins yet
            </h3>
            <p className="text-stone-600 dark:text-stone-400 mb-6 max-w-md mx-auto">
              Drop a pin at your current location to start tracking your journey.
            </p>
            <Button
              onClick={() => setShowQuickCheckIn(true)}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/25"
            >
              <MapPin className="h-4 w-4 mr-2" />
              Check In Now
            </Button>
          </GlassCard>
        ) : (
          <motion.div
            className="relative"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            {/* Timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-amber-500 via-orange-400 to-transparent" />

            <AnimatePresence mode="popLayout">
              {checkIns.map((checkIn, index) => {
                const mood = checkIn.mood ? moodConfig[checkIn.mood] : null
                const date = new Date(checkIn.created_at)
                const isNewDay = index === 0 ||
                  new Date(checkIns[index - 1].created_at).toDateString() !== date.toDateString()

                return (
                  <motion.div key={checkIn.id} variants={itemVariants} layout={!prefersReducedMotion}>
                    {/* Date separator */}
                    {isNewDay && (
                      <div className="flex items-center gap-3 ml-12 mb-4 mt-2">
                        <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                          {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                        </span>
                        <div className="flex-1 h-px bg-stone-200 dark:bg-stone-700" />
                      </div>
                    )}

                    <div className="relative flex items-start gap-4 mb-6 group">
                      {/* Timeline dot */}
                      <div className={cn(
                        'relative z-10 w-12 h-12 rounded-full flex items-center justify-center shrink-0 border-4 border-white dark:border-stone-950 shadow-md text-lg',
                        mood ? 'bg-white dark:bg-stone-800' : 'bg-gradient-to-br from-amber-400 to-orange-500'
                      )}>
                        {mood ? mood.emoji : <MapPin className="h-5 w-5 text-white" />}
                      </div>

                      {/* Card */}
                      <div className={cn(
                        'flex-1 rounded-2xl p-4',
                        'bg-white/90 dark:bg-stone-900/90 backdrop-blur-sm',
                        'border border-stone-200/50 dark:border-stone-800/50',
                        'shadow-sm hover:shadow-md transition-shadow',
                        'group-hover:border-amber-200 dark:group-hover:border-amber-800 transition-colors'
                      )}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-stone-900 dark:text-white">
                                {checkIn.location_name}
                              </h3>
                              {mood && (
                                <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', mood.color)}>
                                  {mood.label}
                                </span>
                              )}
                            </div>

                            {checkIn.location_address && (
                              <p className="text-xs text-stone-500 dark:text-stone-400 mb-1">
                                {checkIn.location_address}
                              </p>
                            )}

                            {checkIn.note && (
                              <p className="text-sm text-stone-700 dark:text-stone-300 mt-2">
                                {checkIn.note}
                              </p>
                            )}

                            {checkIn.photo_url && (
                              <div className="mt-3 rounded-xl overflow-hidden border border-stone-200 dark:border-stone-700 max-w-xs">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={checkIn.photo_url} alt="Check-in photo" className="w-full h-32 object-cover" />
                              </div>
                            )}

                            <div className="flex items-center gap-3 mt-2 text-xs text-stone-400 dark:text-stone-500">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {checkIn.country_code && (
                                <span className="font-medium">{checkIn.country_code}</span>
                              )}
                              <span className="text-stone-300 dark:text-stone-600">
                                {checkIn.latitude.toFixed(4)}, {checkIn.longitude.toFixed(4)}
                              </span>
                            </div>
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(checkIn.id)}
                            disabled={deleteCheckIn.isPending}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-stone-400 hover:text-red-500 rounded-xl h-8 w-8"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Quick Check-in Dialog */}
      <QuickCheckIn
        open={showQuickCheckIn}
        onOpenChange={setShowQuickCheckIn}
      />
    </MeshGradient>
  )
}
