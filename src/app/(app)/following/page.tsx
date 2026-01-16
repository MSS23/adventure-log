'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { useFollows } from '@/lib/hooks/useFollows'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Users, Loader2, UserMinus, ArrowLeft, Heart, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { cn } from '@/lib/utils'

// Animated counter component
function AnimatedCounter({ value, duration = 0.8 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    if (prefersReducedMotion) {
      setCount(value)
      return
    }

    const step = value / (duration * 60)
    let current = 0
    const timer = setInterval(() => {
      current += step
      if (current >= value) {
        setCount(value)
        clearInterval(timer)
      } else {
        setCount(Math.floor(current))
      }
    }, 1000 / 60)
    return () => clearInterval(timer)
  }, [value, duration, prefersReducedMotion])

  return <span>{count.toLocaleString()}</span>
}

export default function FollowingPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { following, loading, stats, refreshFollowLists, unfollowUser } = useFollows()
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    if (user) {
      refreshFollowLists()
    }
  }, [user, refreshFollowLists])

  const handleUnfollow = async (userId: string) => {
    setActionLoading(userId)
    try {
      await unfollowUser(userId)
      await refreshFollowLists()
    } finally {
      setActionLoading(null)
    }
  }

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
    hidden: prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring' as const, stiffness: 300, damping: 24 }
    },
    exit: prefersReducedMotion ? { opacity: 1 } : { opacity: 0, x: -20 }
  }

  const headerVariants = {
    hidden: prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring' as const, stiffness: 300, damping: 25 }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          className="h-10 w-10 rounded-full border-4 border-solid border-teal-200 border-t-teal-600"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/30">
      <div className="max-w-4xl mx-auto space-y-6 p-4">
        {/* Header */}
        <motion.div
          className="flex items-center gap-4"
          initial="hidden"
          animate="visible"
          variants={headerVariants}
        >
          <motion.div
            whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
            whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
          >
            <Button
              variant="ghost"
              onClick={() => window.history.back()}
              size="sm"
              className="hover:bg-white/80 backdrop-blur-sm border border-transparent hover:border-gray-200 hover:shadow-sm transition-all rounded-xl"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </motion.div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              Following
              {stats.followingCount > 0 && !prefersReducedMotion && (
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25, delay: 0.3 }}
                >
                  <Heart className="h-5 w-5 text-pink-500" />
                </motion.div>
              )}
            </h1>
            <p className="text-gray-600">People you&apos;re following</p>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.1 }}
        >
          <div className={cn(
            "rounded-2xl p-6 text-center",
            "bg-gradient-to-br from-white/95 to-white/80",
            "backdrop-blur-xl border border-white/50",
            "shadow-lg shadow-purple-500/5",
            "hover:shadow-xl hover:shadow-purple-500/10 transition-shadow duration-300"
          )}>
            <motion.div
              className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center mx-auto mb-3"
              whileHover={prefersReducedMotion ? {} : { scale: 1.1, rotate: 5 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              <Users className="h-8 w-8 text-purple-600" />
            </motion.div>
            <div className="text-4xl font-bold text-gray-900">
              <AnimatedCounter value={stats.followingCount} />
            </div>
            <div className="text-sm text-gray-600 font-medium mt-1">Following</div>
          </div>
        </motion.div>

        {/* Following List */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.2 }}
          className={cn(
            "rounded-2xl overflow-hidden",
            "bg-gradient-to-br from-white/95 to-white/80",
            "backdrop-blur-xl border border-white/50",
            "shadow-xl shadow-black/5"
          )}
        >
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Heart className="h-5 w-5 text-pink-500" />
              People You Follow
              <span className="text-sm font-normal text-gray-500">({following.length})</span>
            </h2>
          </div>
          <div className="p-4">
            {following.length === 0 ? (
              <motion.div
                className="text-center py-12"
                initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              >
                <motion.div
                  className="relative inline-block"
                  animate={prefersReducedMotion ? {} : { y: [0, -8, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center mx-auto mb-4">
                    <Users className="h-10 w-10 text-purple-400" />
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
                <p className="text-gray-700 font-medium">Not following anyone yet</p>
                <p className="text-sm text-gray-500 mt-2">
                  Discover and follow travelers to see their adventures!
                </p>
                <motion.div
                  whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
                  whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                >
                  <Button
                    className="mt-6 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg shadow-purple-500/25"
                    onClick={() => router.push('/search?contentType=travelers')}
                  >
                    Discover People
                  </Button>
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                className="space-y-3"
                initial="hidden"
                animate="visible"
                variants={containerVariants}
              >
                <AnimatePresence mode="popLayout">
                  {following.map((follow) => {
                    const followingUser = follow.following
                    if (!followingUser) return null

                    return (
                      <motion.div
                        key={follow.id}
                        variants={itemVariants}
                        layout={!prefersReducedMotion}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-xl",
                          "bg-white/60 backdrop-blur-sm",
                          "border border-gray-100",
                          "hover:shadow-md hover:border-purple-200 hover:bg-white/80 transition-all duration-300",
                          "group"
                        )}
                        whileHover={prefersReducedMotion ? {} : { y: -2 }}
                      >
                        <Link
                          href={`/globe?user=${followingUser.id}`}
                          className="flex items-center gap-3 flex-1 min-w-0"
                        >
                          <motion.div
                            whileHover={prefersReducedMotion ? {} : { scale: 1.08 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                          >
                            <Avatar className="h-12 w-12 ring-2 ring-gray-100 group-hover:ring-purple-200 transition-all">
                              <AvatarImage src={followingUser.avatar_url || ''} />
                              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white font-semibold">
                                {(followingUser.display_name || followingUser.username || 'U').charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          </motion.div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 truncate group-hover:text-purple-600 transition-colors">
                              {followingUser.display_name || followingUser.username}
                            </p>
                            <p className="text-sm text-gray-500 truncate">
                              @{followingUser.username}
                            </p>
                            {followingUser.bio && (
                              <p className="text-sm text-gray-400 truncate mt-0.5">
                                {followingUser.bio}
                              </p>
                            )}
                          </div>
                        </Link>

                        <motion.div
                          whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
                          whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
                        >
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUnfollow(followingUser.id)}
                            disabled={actionLoading === followingUser.id}
                            className="ml-4 border-gray-200 hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-all rounded-full px-4"
                          >
                            {actionLoading === followingUser.id ? (
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                              >
                                <Loader2 className="h-4 w-4" />
                              </motion.div>
                            ) : (
                              <>
                                <UserMinus className="h-4 w-4 mr-1" />
                                Unfollow
                              </>
                            )}
                          </Button>
                        </motion.div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
