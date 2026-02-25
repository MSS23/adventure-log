'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { Flame, Calendar, Trophy, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GlassCard } from '@/components/ui/glass-card'
import { AnimatedCounter } from '@/components/ui/animated-count'

interface StreakData {
  current_streak: number
  longest_streak: number
  last_activity_date: string | null
  total_days_active: number
}

export function StreakTracker() {
  const { user } = useAuth()
  const [streak, setStreak] = useState<StreakData>({
    current_streak: 0,
    longest_streak: 0,
    last_activity_date: null,
    total_days_active: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      calculateStreak()
    }
  }, [user])

  async function calculateStreak() {
    if (!user) return

    const supabase = createClient()

    try {
      // Get all user activities (albums, likes, comments) ordered by date
      const { data: albums } = await supabase
        .from('albums')
        .select('created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (!albums || albums.length === 0) {
        setLoading(false)
        return
      }

      // Calculate streak
      const dates = albums.map(a => new Date(a.created_at).toDateString())
      const uniqueDates = [...new Set(dates)]

      let currentStreak = 0
      let longestStreak = 0
      let tempStreak = 1
      const today = new Date().toDateString()
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString()

      // Check if user was active today or yesterday
      if (uniqueDates[0] === today || uniqueDates[0] === yesterday) {
        currentStreak = 1

        // Count consecutive days
        for (let i = 1; i < uniqueDates.length; i++) {
          const prevDate = new Date(uniqueDates[i - 1])
          const currDate = new Date(uniqueDates[i])
          const diffDays = Math.floor((prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24))

          if (diffDays === 1) {
            currentStreak++
            tempStreak++
          } else {
            tempStreak = 1
          }

          longestStreak = Math.max(longestStreak, tempStreak)
        }
      }

      longestStreak = Math.max(longestStreak, currentStreak)

      setStreak({
        current_streak: currentStreak,
        longest_streak: longestStreak,
        last_activity_date: albums[0].created_at,
        total_days_active: uniqueDates.length
      })
    } catch (error) {
      console.error('Error calculating streak:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <GlassCard variant="default" padding="md" className="animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-32 mb-4" />
        <div className="h-12 bg-gray-200 rounded w-20" />
      </GlassCard>
    )
  }

  const isActiveToday = streak.last_activity_date &&
    new Date(streak.last_activity_date).toDateString() === new Date().toDateString()

  const hasStreak = streak.current_streak > 0

  return (
    <GlassCard
      variant={hasStreak ? "featured" : "default"}
      glow={hasStreak ? "orange" : "none"}
      hover="lift"
      padding="md"
      className={cn(
        "transition-all duration-300",
        hasStreak && "bg-gradient-to-br from-orange-50/80 to-red-50/80"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={cn(
            "p-2 rounded-lg",
            streak.current_streak > 0
              ? "bg-gradient-to-br from-orange-100 to-red-100"
              : "bg-gray-200"
          )}>
            {streak.current_streak > 0 ? (
              <motion.div
                animate={{
                  scale: [1, 1.15, 1],
                  rotate: [0, -3, 3, 0]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <Flame className="h-5 w-5 text-orange-600" />
              </motion.div>
            ) : (
              <Flame className="h-5 w-5 text-gray-500" />
            )}
          </div>
          <h3 className="font-bold text-gray-900">Activity Streak</h3>
        </div>

        {isActiveToday && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full"
          >
            <Zap className="h-3 w-3" />
            Active today!
          </motion.div>
        )}
      </div>

      {/* Current Streak */}
      <div className="mb-6">
        <div className="flex items-baseline gap-2 mb-2">
          <AnimatedCounter
            value={streak.current_streak}
            className={cn(
              "text-5xl font-bold",
              hasStreak
                ? "bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent"
                : "text-gray-400"
            )}
            formatNumber={false}
          />
          <span className="text-lg text-gray-600 font-medium">
            {streak.current_streak === 1 ? 'day' : 'days'}
          </span>
        </div>
        {streak.current_streak === 0 ? (
          <p className="text-sm text-gray-600">
            Create an album or upload photos to start your streak!
          </p>
        ) : (
          <p className="text-sm text-gray-700">
            Keep it up! Post today to maintain your streak.
          </p>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 border border-gray-200/50 hover:shadow-sm transition-shadow">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="h-4 w-4 text-yellow-600" />
            <span className="text-xs text-gray-600 font-medium">Best Streak</span>
          </div>
          <AnimatedCounter
            value={streak.longest_streak}
            className="text-2xl font-bold text-gray-900"
            formatNumber={false}
          />
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 border border-gray-200/50 hover:shadow-sm transition-shadow">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="h-4 w-4 text-teal-600" />
            <span className="text-xs text-gray-600 font-medium">Active Days</span>
          </div>
          <AnimatedCounter
            value={streak.total_days_active}
            className="text-2xl font-bold text-gray-900"
            formatNumber={false}
          />
        </div>
      </div>

      {/* Motivation Message */}
      {streak.current_streak > 0 && (
        <div className="mt-4 p-3 bg-white/50 rounded-lg border border-orange-200/50">
          <p className="text-xs text-gray-700 text-center">
            {streak.current_streak >= 7 && "🔥 You're on fire! Keep the momentum going!"}
            {streak.current_streak >= 3 && streak.current_streak < 7 && "✨ Great progress! Just 4 more days to hit a week!"}
            {streak.current_streak < 3 && "💪 Building consistency! Keep posting daily!"}
          </p>
        </div>
      )}
    </GlassCard>
  )
}
