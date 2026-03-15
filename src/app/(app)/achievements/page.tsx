'use client'

import { useAuth } from '@/components/auth/AuthProvider'
import { AchievementsDisplay } from '@/components/achievements/AchievementsDisplay'
import { Trophy } from 'lucide-react'
import { motion } from 'framer-motion'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function AchievementsPage() {
  const { user, authLoading, profileLoading } = useAuth()
  const prefersReducedMotion = useReducedMotion()
  const isAuthLoading = authLoading || profileLoading

  if (!isAuthLoading && !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center mx-auto mb-4">
            <Trophy className="h-7 w-7 text-stone-400" />
          </div>
          <p className="text-stone-500 dark:text-stone-400 mb-4">Log in to view your achievements</p>
          <Link href="/login">
            <Button className="bg-olive-600 hover:bg-olive-700 text-white">Log In</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-24 md:pb-8 pt-4 sm:pt-6">
      {/* Page Header */}
      <motion.div
        className="mb-6"
        initial={prefersReducedMotion ? {} : { opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      >
        <div className="flex items-center gap-3 mb-1">
          <Trophy className="h-6 w-6 text-olive-500" />
          <h1 className="text-2xl font-bold text-stone-900 dark:text-white">Achievements</h1>
        </div>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Earn badges by exploring the world and sharing your adventures
        </p>
      </motion.div>

      {/* Achievements Content */}
      {isAuthLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-square bg-stone-100 dark:bg-stone-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : user ? (
        <AchievementsDisplay />
      ) : null}
    </div>
  )
}
