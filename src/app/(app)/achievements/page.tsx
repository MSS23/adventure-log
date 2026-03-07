'use client'

import { useAuth } from '@/components/auth/AuthProvider'
import { AchievementsDisplay } from '@/components/achievements/AchievementsDisplay'
import { Trophy, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export default function AchievementsPage() {
  const { user, authLoading, profileLoading } = useAuth()
  const prefersReducedMotion = useReducedMotion()

  const isAuthLoading = authLoading || profileLoading

  // Not authenticated and auth is done loading
  if (!isAuthLoading && !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-amber-50/30 flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <Trophy className="h-8 w-8 text-amber-500" />
          </div>
          <p className="text-gray-600 mb-4">Please log in to view your achievements</p>
          <Link href="/login">
            <Button className="bg-amber-500 hover:bg-amber-600 text-white">Log In</Button>
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-amber-50/30">
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
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center"
              whileHover={prefersReducedMotion ? {} : { scale: 1.1, rotate: 5 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              <Trophy className="h-6 w-6 text-amber-600" />
            </motion.div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              Your Achievements
              {!prefersReducedMotion && (
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25, delay: 0.3 }}
                >
                  <Sparkles className="h-5 w-5 text-amber-400" />
                </motion.div>
              )}
            </h1>
          </div>
          <p className="text-sm text-gray-600">
            Earn badges by exploring the world and sharing your adventures
          </p>
        </motion.div>

        {/* Achievements Content */}
        <motion.div
          className={cn(
            "rounded-2xl p-6",
            "bg-gradient-to-br from-white/95 to-white/80",
            "backdrop-blur-xl border border-white/50",
            "shadow-xl shadow-amber-500/5"
          )}
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.1 }}
        >
          {isAuthLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="aspect-square bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : user ? (
            <AchievementsDisplay />
          ) : null}
        </motion.div>
      </div>
    </div>
  )
}
