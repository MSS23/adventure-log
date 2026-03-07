'use client'

/**
 * Activity Feed Page
 *
 * Display social activity feed for the current user
 * Enhanced with animations and glassmorphism
 */

import { useEffect } from 'react'
import { useActivityFeed } from '@/lib/hooks/useActivityFeed'
import { ActivityFeedItem } from '@/components/activity/ActivityFeedItem'
import { ArrowLeft, Bell, BellOff, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { cn } from '@/lib/utils'

export default function ActivityPage() {
  const {
    activities,
    isLoading,
    fetchActivityFeed,
    markAsRead,
    markAllAsRead
  } = useActivityFeed()
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    fetchActivityFeed()
  }, [fetchActivityFeed])

  const handleMarkAllAsRead = async () => {
    await markAllAsRead()
  }

  const unreadCount = activities.filter(a => !a.is_read).length

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.06,
        delayChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: prefersReducedMotion ? { opacity: 1 } : { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { type: 'spring' as const, stiffness: 300, damping: 24 }
    },
    exit: prefersReducedMotion ? { opacity: 1 } : { opacity: 0, x: 20 }
  }

  const headerVariants = {
    hidden: prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring' as const, stiffness: 300, damping: 25 }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-teal-50/30">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header with animation */}
        <motion.div
          className="flex items-center justify-between mb-6"
          initial="hidden"
          animate="visible"
          variants={headerVariants}
        >
          <div className="flex items-center gap-4">
            <motion.div
              whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
            >
              <Link
                href="/feed"
                className="hover:bg-white/80 p-2 rounded-xl transition-all backdrop-blur-sm border border-transparent hover:border-gray-200 hover:shadow-sm"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                Activity
                {unreadCount > 0 && (
                  <motion.span
                    className="relative"
                    initial={prefersReducedMotion ? {} : { scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25, delay: 0.2 }}
                  >
                    <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full">
                      {unreadCount}
                    </span>
                    {!prefersReducedMotion && (
                      <motion.span
                        className="absolute inset-0 rounded-full bg-teal-400"
                        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}
                  </motion.span>
                )}
              </h1>
              {unreadCount > 0 && (
                <motion.p
                  className="text-sm text-gray-600 mt-1"
                  initial={prefersReducedMotion ? {} : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  {unreadCount} unread {unreadCount === 1 ? 'notification' : 'notifications'}
                </motion.p>
              )}
            </div>
          </div>

          {/* Mark all as read button */}
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.div
                initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={prefersReducedMotion ? {} : { opacity: 0, scale: 0.8 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                <Button
                  onClick={handleMarkAllAsRead}
                  variant="outline"
                  size="sm"
                  className="text-sm bg-white/80 backdrop-blur-sm hover:bg-white border-gray-200 hover:border-teal-200 hover:text-teal-700 transition-all"
                >
                  <BellOff className="w-4 h-4 mr-2" />
                  Mark all read
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Activity Feed with glassmorphism */}
        <motion.div
          className={cn(
            "rounded-2xl overflow-hidden",
            "bg-gradient-to-br from-white/95 to-white/80",
            "backdrop-blur-xl border border-white/50",
            "shadow-xl shadow-black/5"
          )}
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.1 }}
        >
          {isLoading && activities.length === 0 ? (
            <motion.div
              className="p-12 text-center"
              initial={prefersReducedMotion ? {} : { opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.div
                className="inline-block h-10 w-10 rounded-full border-4 border-solid border-teal-200 border-t-teal-600"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
              <p className="text-sm text-gray-500 mt-4">Loading activities...</p>
            </motion.div>
          ) : activities.length === 0 ? (
            <motion.div
              className="p-12 text-center"
              initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
              <motion.div
                className="relative inline-block"
                animate={prefersReducedMotion ? {} : { y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              >
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-100 to-cyan-100 flex items-center justify-center mx-auto mb-4">
                  <Bell className="h-10 w-10 text-teal-400" />
                </div>
                {!prefersReducedMotion && (
                  <motion.div
                    className="absolute -top-1 -right-1"
                    animate={{ rotate: [0, 15, -15, 0] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                  >
                    <Sparkles className="h-5 w-5 text-amber-400" />
                  </motion.div>
                )}
              </motion.div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No activity yet
              </h3>
              <p className="text-sm text-gray-500 max-w-sm mx-auto">
                When people you follow create albums, like your content, or mention you,
                you&apos;ll see it here.
              </p>
              <Link href="/explore">
                <motion.div
                  whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
                  whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                >
                  <Button className="mt-6 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-lg shadow-teal-500/25">
                    Discover People
                  </Button>
                </motion.div>
              </Link>
            </motion.div>
          ) : (
            <motion.div
              className="divide-y divide-gray-100/80"
              initial="hidden"
              animate="visible"
              variants={containerVariants}
            >
              <AnimatePresence mode="popLayout">
                {activities.map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    variants={itemVariants}
                    layout={!prefersReducedMotion}
                    className="relative"
                  >
                    {/* New activity pulse indicator */}
                    {!activity.is_read && !prefersReducedMotion && (
                      <motion.div
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-teal-500 to-cyan-500 rounded-r-full"
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: 1 }}
                        transition={{ delay: index * 0.06 + 0.2 }}
                      />
                    )}
                    <ActivityFeedItem
                      activity={activity}
                      onMarkAsRead={markAsRead}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </motion.div>

        {/* Load More with animation */}
        {activities.length > 0 && activities.length % 30 === 0 && (
          <motion.div
            className="mt-6 text-center"
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <motion.div
              whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
            >
              <Button
                onClick={() => fetchActivityFeed(30, activities.length)}
                variant="outline"
                disabled={isLoading}
                className="bg-white/80 backdrop-blur-sm hover:bg-white border-gray-200"
              >
                {isLoading ? (
                  <>
                    <motion.span
                      className="inline-block w-4 h-4 mr-2 rounded-full border-2 border-gray-300 border-t-teal-600"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                    Loading...
                  </>
                ) : (
                  'Load More'
                )}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
