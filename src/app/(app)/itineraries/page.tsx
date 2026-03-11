'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Calendar, Globe, Heart, Trash2, Eye, Sparkles, ArrowRight, Clock } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { log } from '@/lib/utils/logger'
import { motion, AnimatePresence } from 'framer-motion'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import type { Itinerary } from '@/types/database'

export default function ItinerariesPage() {
  const { user } = useAuth()
  const [itineraries, setItineraries] = useState<Itinerary[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'draft' | 'published' | 'archived'>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const prefersReducedMotion = useReducedMotion()
  createClient() // Initialize client for session

  useEffect(() => {
    fetchItineraries()
  // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchItineraries is defined below and depends on filter and user?.id already listed
  }, [filter, user?.id])

  async function fetchItineraries() {
    if (!user?.id) return

    setLoading(true)
    try {
      const url = filter === 'all'
        ? `/api/itineraries`
        : `/api/itineraries?status=${filter}`

      const response = await fetch(url)
      const data = await response.json()

      if (response.ok) {
        setItineraries(data.itineraries || [])
      }
    } catch (error) {
      log.error('Error fetching itineraries', { component: 'ItinerariesPage', action: 'fetch-itineraries' }, error as Error)
    } finally {
      setLoading(false)
    }
  }

  async function toggleFavorite(id: string, currentValue: boolean) {
    try {
      const response = await fetch(`/api/itineraries/${id}/favorite`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: !currentValue })
      })

      if (response.ok) {
        setItineraries(prev => prev.map(itinerary =>
          itinerary.id === id
            ? { ...itinerary, is_favorite: !currentValue }
            : itinerary
        ))
      }
    } catch (error) {
      log.error('Error toggling favorite', { component: 'ItinerariesPage', action: 'toggle-favorite' }, error as Error)
    }
  }

  async function deleteItinerary(id: string) {
    if (!confirm('Are you sure you want to delete this itinerary?')) return

    setDeletingId(id)
    try {
      const response = await fetch(`/api/itineraries/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setItineraries(prev => prev.filter(itinerary => itinerary.id !== id))
      }
    } catch (error) {
      log.error('Error deleting itinerary', { component: 'ItinerariesPage', action: 'delete-itinerary' }, error as Error)
    } finally {
      setDeletingId(null)
    }
  }

  const filterCounts = {
    all: itineraries.length,
    draft: itineraries.filter(i => i.status === 'draft').length,
    published: itineraries.filter(i => i.status === 'published').length,
    archived: itineraries.filter(i => i.status === 'archived').length
  }

  // Animation variants
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

  const headerVariants = {
    hidden: prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring' as const, stiffness: 300, damping: 25 }
    }
  }

  // Extract destination highlights from itinerary content (simplified)
  const getDestinationPreviews = (content: string): string[] => {
    const lines = content.split('\n').filter(line =>
      line.includes('Day') || line.includes('Morning') || line.includes('Visit')
    )
    return lines.slice(0, 3).map(line =>
      line.replace(/^[#\-*\d.\s]+/, '').substring(0, 50)
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-olive-50/30 flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <motion.div
            className="h-12 w-12 rounded-full border-4 border-solid border-olive-200 border-t-olive-600 mx-auto mb-4"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <p className="text-stone-900 font-medium">Loading itineraries...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-olive-50/30">
      {/* Header */}
      <motion.div
        className={cn(
          "bg-gradient-to-br from-white/95 to-white/80",
          "backdrop-blur-xl border-b border-white/50"
        )}
        initial="hidden"
        animate="visible"
        variants={headerVariants}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-stone-900 flex items-center gap-3">
                My Itineraries
                {!prefersReducedMotion && itineraries.length > 0 && (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25, delay: 0.3 }}
                  >
                    <Sparkles className="h-6 w-6 text-olive-400" />
                  </motion.div>
                )}
              </h1>
              <p className="text-stone-600 mt-1">AI-generated travel plans saved for your adventures</p>
            </div>
            <motion.div
              whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
            >
              <Link href="/trip-planner">
                <Button
                  className="gap-2 bg-gradient-to-r from-olive-500 to-olive-500 hover:from-olive-600 hover:to-olive-600 text-white shadow-lg shadow-olive-500/25"
                >
                  <Sparkles className="h-4 w-4" />
                  Plan New Trip
                </Button>
              </Link>
            </motion.div>
          </div>

          {/* Filters */}
          <motion.div
            className="flex gap-2 mt-6"
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {(['all', 'draft', 'published', 'archived'] as const).map((status, index) => (
              <motion.button
                key={status}
                onClick={() => setFilter(status)}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                  filter === status
                    ? "bg-gradient-to-r from-olive-500/10 to-olive-500/10 text-olive-700 border border-olive-200 shadow-sm"
                    : "bg-white/60 text-stone-600 hover:bg-white border border-transparent hover:border-stone-200"
                )}
                whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
                whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + index * 0.05 }}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
                <span className="ml-1.5 text-xs opacity-75">({filterCounts[status]})</span>
              </motion.button>
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {itineraries.length === 0 ? (
          <motion.div
            className={cn(
              "rounded-2xl p-12 text-center",
              "bg-gradient-to-br from-white/95 to-white/80",
              "backdrop-blur-xl border border-white/50",
              "shadow-xl shadow-black/5"
            )}
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <motion.div
              className="relative inline-block"
              animate={prefersReducedMotion ? {} : { y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-olive-100 to-olive-100 flex items-center justify-center mx-auto mb-6">
                <Sparkles className="h-12 w-12 text-olive-500" />
              </div>
            </motion.div>
            <h3 className="text-xl font-semibold text-stone-900 mb-2">
              No itineraries yet
            </h3>
            <p className="text-stone-600 mb-6 max-w-md mx-auto">
              Use the AI Trip Planner to generate your first travel itinerary
            </p>
            <motion.div
              whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
            >
              <Link href="/trip-planner">
                <Button
                  className="bg-gradient-to-r from-olive-500 to-olive-500 hover:from-olive-600 hover:to-olive-600 text-white shadow-lg shadow-olive-500/25"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Plan Your First Trip
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            <AnimatePresence mode="popLayout">
              {itineraries.map((itinerary) => {
                const destinationPreviews = getDestinationPreviews(itinerary.itinerary_content)

                return (
                  <motion.div
                    key={itinerary.id}
                    variants={itemVariants}
                    layout={!prefersReducedMotion}
                    className={cn(
                      "rounded-2xl overflow-hidden relative group",
                      "bg-gradient-to-br from-white/95 to-white/80",
                      "backdrop-blur-xl border border-white/50",
                      "shadow-lg shadow-black/5",
                      "hover:shadow-xl hover:shadow-olive-500/10 transition-all duration-300"
                    )}
                    whileHover={prefersReducedMotion ? {} : { y: -6 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  >
                    {/* Timeline decoration */}
                    <div className="absolute left-6 top-24 bottom-32 w-0.5 bg-gradient-to-b from-olive-500 via-olive-400 to-transparent opacity-30 group-hover:opacity-60 transition-opacity" />

                    {/* Header */}
                    <div className="p-5 border-b border-stone-100/50">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-bold text-lg text-stone-900 line-clamp-2 group-hover:text-olive-700 transition-colors">
                          {itinerary.title}
                        </h3>
                        <motion.button
                          onClick={(e) => {
                            e.preventDefault()
                            toggleFavorite(itinerary.id, itinerary.is_favorite)
                          }}
                          className="ml-2 text-stone-400 hover:text-red-500 transition-colors"
                          whileHover={prefersReducedMotion ? {} : { scale: 1.2 }}
                          whileTap={prefersReducedMotion ? {} : { scale: 0.9 }}
                        >
                          <Heart
                            className={cn(
                              "h-5 w-5 transition-all",
                              itinerary.is_favorite && "fill-red-500 text-red-500"
                            )}
                          />
                        </motion.button>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-stone-600">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-olive-100 to-olive-100 flex items-center justify-center">
                          <Globe className="h-4 w-4 text-olive-600" />
                        </div>
                        <span className="font-medium">{itinerary.country}</span>
                        {itinerary.region && (
                          <>
                            <span className="text-stone-300">•</span>
                            <span>{itinerary.region}</span>
                          </>
                        )}
                      </div>

                      {(itinerary.date_start || itinerary.date_end) && (
                        <div className="flex items-center gap-2 text-sm text-stone-500 mt-2">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {itinerary.date_start && new Date(itinerary.date_start).toLocaleDateString()}
                            {itinerary.date_end && ` - ${new Date(itinerary.date_end).toLocaleDateString()}`}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Timeline Preview */}
                    <div className="p-5 relative">
                      {destinationPreviews.length > 0 && (
                        <div className="space-y-3 mb-4">
                          {destinationPreviews.map((preview, i) => (
                            <motion.div
                              key={i}
                              className="flex items-start gap-3 pl-1"
                              initial={prefersReducedMotion ? {} : { opacity: 0, x: -10 }}
                              whileInView={{ opacity: 1, x: 0 }}
                              viewport={{ once: true }}
                              transition={{ delay: i * 0.1 }}
                            >
                              <div className="relative">
                                <div className={cn(
                                  "w-3 h-3 rounded-full mt-1",
                                  i === 0 ? "bg-olive-500" : i === 1 ? "bg-olive-400" : "bg-olive-300"
                                )} />
                                {i < destinationPreviews.length - 1 && (
                                  <div className="absolute top-3 left-1/2 -translate-x-1/2 w-px h-6 bg-stone-200" />
                                )}
                              </div>
                              <span className="text-sm text-stone-600 flex-1 truncate">{preview || 'Explore the area'}</span>
                            </motion.div>
                          ))}
                        </div>
                      )}

                      {destinationPreviews.length === 0 && (
                        <div className="text-sm text-stone-500 line-clamp-3 mb-4">
                          {itinerary.description || itinerary.itinerary_content.substring(0, 120) + '...'}
                        </div>
                      )}

                      {/* Metadata Tags */}
                      <div className="flex flex-wrap items-center gap-2 text-xs mb-4">
                        {itinerary.travel_style && (
                          <span className="px-2.5 py-1 bg-olive-50 text-olive-700 rounded-full font-medium">
                            {itinerary.travel_style}
                          </span>
                        )}
                        {itinerary.budget && (
                          <span className="px-2.5 py-1 bg-olive-50 text-olive-700 rounded-full font-medium">
                            {itinerary.budget}
                          </span>
                        )}
                        <span className={cn(
                          "px-2.5 py-1 rounded-full font-medium",
                          itinerary.status === 'published' && "bg-green-50 text-green-700",
                          itinerary.status === 'draft' && "bg-olive-50 text-olive-700",
                          itinerary.status === 'archived' && "bg-stone-100 text-stone-600"
                        )}>
                          {itinerary.status}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Link href={`/itineraries/${itinerary.id}`} className="flex-1">
                          <motion.div
                            whileHover={prefersReducedMotion ? {} : { scale: 1.01 }}
                            whileTap={prefersReducedMotion ? {} : { scale: 0.99 }}
                          >
                            <Button variant="outline" className="w-full gap-2 border-stone-200 hover:border-olive-200 hover:bg-olive-50/50 hover:text-olive-700 transition-all rounded-xl">
                              <Eye className="h-4 w-4" />
                              View Details
                              <ArrowRight className="h-3.5 w-3.5 ml-auto opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                            </Button>
                          </motion.div>
                        </Link>
                        <motion.div
                          whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
                          whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
                        >
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => deleteItinerary(itinerary.id)}
                            disabled={deletingId === itinerary.id}
                            className="text-stone-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-all rounded-xl"
                          >
                            {deletingId === itinerary.id ? (
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                              >
                                <Loader2 className="h-4 w-4" />
                              </motion.div>
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </motion.div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="px-5 py-3 bg-stone-50/50 border-t border-stone-100/50 flex items-center gap-2 text-xs text-stone-500">
                      <Clock className="h-3.5 w-3.5" />
                      Created {new Date(itinerary.created_at).toLocaleDateString()}
                    </div>

                    {/* Hover shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  )
}
