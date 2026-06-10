'use client'

import { useAuth } from '@/components/auth/AuthProvider'
import { AchievementsDisplay } from '@/components/achievements/AchievementsDisplay'
import { Trophy } from 'lucide-react'
import { motion } from 'framer-motion'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useRouter } from 'next/navigation'

export default function AchievementsPage() {
  const router = useRouter()
  const { user, authLoading, profileLoading } = useAuth()
  const prefersReducedMotion = useReducedMotion()
  const isAuthLoading = authLoading || profileLoading

  if (!isAuthLoading && !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
            <Trophy className="h-7 w-7" />
          </div>
          <p className="text-muted-foreground mb-4">Log in to view your achievements</p>
          <Button onClick={() => router.push('/login')} className="cursor-pointer">Log In</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-24 md:pb-8 pt-4 sm:pt-6">
      {/* Editorial header */}
      <motion.header
        className="mb-8 space-y-1"
        initial={prefersReducedMotion ? {} : { opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      >
        <p className="al-eyebrow">Level · Wanderer</p>
        <h1 className="al-display text-3xl md:text-4xl">Achievements</h1>
        <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
          Earn badges by exploring the world and sharing your adventures.
        </p>
      </motion.header>

      {/* Achievements Content */}
      {isAuthLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-2xl" />
          ))}
        </div>
      ) : user ? (
        <AchievementsDisplay />
      ) : null}
    </div>
  )
}
