'use client'

import { useAuth } from '@/components/auth/AuthProvider'
import { Loader2, Bookmark, Compass, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { cn } from '@/lib/utils'

export default function SavedPage() {
  const { user, authLoading, profileLoading } = useAuth()
  const prefersReducedMotion = useReducedMotion()

  const isAuthLoading = authLoading || profileLoading

  // Not authenticated and auth is done loading
  if (!isAuthLoading && !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/30 flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
            <Bookmark className="h-8 w-8 text-purple-500" />
          </div>
          <p className="text-gray-600 mb-4">Please log in to view your saved albums</p>
          <Link href="/login">
            <Button className="bg-purple-500 hover:bg-purple-600 text-white">Log In</Button>
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Page Header */}
        <motion.div
          className="mb-6"
          initial={prefersReducedMotion ? {} : { opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <motion.div
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center"
              whileHover={prefersReducedMotion ? {} : { scale: 1.1, rotate: 5 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              <Bookmark className="h-6 w-6 text-purple-600" />
            </motion.div>
            <h1 className="text-2xl font-bold text-gray-900">Saved Albums</h1>
          </div>
          <p className="text-sm text-gray-600">
            Albums you&apos;ve saved for later
          </p>
        </motion.div>

        {/* Empty State */}
        <motion.div
          className={cn(
            "rounded-2xl text-center py-16 px-6",
            "bg-gradient-to-br from-white/95 to-white/80",
            "backdrop-blur-xl border border-white/50",
            "shadow-xl shadow-purple-500/5"
          )}
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.1 }}
        >
          <motion.div
            className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center mx-auto mb-4"
            initial={prefersReducedMotion ? {} : { scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.2 }}
          >
            <Bookmark className="h-10 w-10 text-purple-400" />
          </motion.div>
          <motion.p
            className="text-gray-700 text-lg font-medium mb-2"
            initial={prefersReducedMotion ? {} : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            No saved albums yet
          </motion.p>
          <motion.p
            className="text-sm text-gray-500 mb-6 max-w-sm mx-auto"
            initial={prefersReducedMotion ? {} : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Discover amazing travel albums from other adventurers and save them here for inspiration
          </motion.p>
          <motion.div
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Link href="/explore">
              <motion.div
                whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
                whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
              >
                <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg shadow-purple-500/25 gap-2">
                  <Compass className="h-4 w-4" />
                  Explore Albums
                </Button>
              </motion.div>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
