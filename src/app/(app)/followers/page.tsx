'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { useFollows } from '@/lib/hooks/useFollows'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Users, Loader2, UserPlus, Check, X, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { FollowButton } from '@/components/social/FollowButton'
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

export default function FollowersPage() {
  const { user } = useAuth()
  const { followers, pendingRequests, loading, stats, refreshFollowLists, acceptFollowRequest, rejectFollowRequest } = useFollows()
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    if (user) {
      refreshFollowLists()
    }
  }, [user, refreshFollowLists])

  const handleAccept = async (followerUserId: string) => {
    setActionLoading(followerUserId)
    try {
      await acceptFollowRequest(followerUserId)
      await refreshFollowLists()
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (followerUserId: string) => {
    setActionLoading(followerUserId)
    try {
      await rejectFollowRequest(followerUserId)
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30">
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
              Followers
              {stats.followersCount > 0 && !prefersReducedMotion && (
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25, delay: 0.3 }}
                >
                  <Sparkles className="h-5 w-5 text-amber-400" />
                </motion.div>
              )}
            </h1>
            <p className="text-gray-600">People following you</p>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          className="grid grid-cols-2 gap-4"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <motion.div variants={itemVariants}>
            <div className={cn(
              "rounded-2xl p-6 text-center",
              "bg-gradient-to-br from-white/95 to-white/80",
              "backdrop-blur-xl border border-white/50",
              "shadow-lg shadow-blue-500/5",
              "hover:shadow-xl hover:shadow-blue-500/10 transition-shadow duration-300"
            )}>
              <motion.div
                className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center mx-auto mb-3"
                whileHover={prefersReducedMotion ? {} : { scale: 1.1, rotate: 5 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                <Users className="h-7 w-7 text-blue-600" />
              </motion.div>
              <div className="text-3xl font-bold text-gray-900">
                <AnimatedCounter value={stats.followersCount} />
              </div>
              <div className="text-sm text-gray-600 font-medium">Followers</div>
            </div>
          </motion.div>
          <motion.div variants={itemVariants}>
            <div className={cn(
              "rounded-2xl p-6 text-center relative overflow-hidden",
              "bg-gradient-to-br from-white/95 to-white/80",
              "backdrop-blur-xl border border-white/50",
              "shadow-lg shadow-purple-500/5",
              "hover:shadow-xl hover:shadow-purple-500/10 transition-shadow duration-300"
            )}>
              {stats.pendingRequestsCount > 0 && !prefersReducedMotion && (
                <motion.div
                  className="absolute top-2 right-2"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <span className="flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                  </span>
                </motion.div>
              )}
              <motion.div
                className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center mx-auto mb-3"
                whileHover={prefersReducedMotion ? {} : { scale: 1.1, rotate: -5 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                <UserPlus className="h-7 w-7 text-purple-600" />
              </motion.div>
              <div className="text-3xl font-bold text-gray-900">
                <AnimatedCounter value={stats.pendingRequestsCount} />
              </div>
              <div className="text-sm text-gray-600 font-medium">Pending Requests</div>
            </div>
          </motion.div>
        </motion.div>

        {/* Follow Requests Section */}
        <AnimatePresence>
          {pendingRequests.length > 0 && (
            <motion.div
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? {} : { opacity: 0, y: -20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className={cn(
                "rounded-2xl overflow-hidden",
                "bg-gradient-to-br from-orange-50/90 to-amber-50/70",
                "backdrop-blur-xl border border-orange-200/50",
                "shadow-lg shadow-orange-500/10"
              )}
            >
              <div className="px-6 py-4 border-b border-orange-200/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <motion.div
                      animate={prefersReducedMotion ? {} : { rotate: [0, -10, 10, 0] }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                    >
                      <UserPlus className="h-5 w-5 text-orange-600" />
                    </motion.div>
                    <span className="font-semibold text-gray-900">Follow Requests</span>
                    <motion.span
                      className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"
                      initial={prefersReducedMotion ? {} : { scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 25, delay: 0.2 }}
                    >
                      {pendingRequests.length}
                    </motion.span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Approve or decline follow requests
                  </p>
                </div>
              </div>
              <div className="p-4">
                <motion.div
                  className="space-y-3"
                  initial="hidden"
                  animate="visible"
                  variants={containerVariants}
                >
                  <AnimatePresence mode="popLayout">
                    {pendingRequests.map((request, index) => {
                      const requester = request.follower
                      if (!requester) return null

                      return (
                        <motion.div
                          key={request.id}
                          variants={itemVariants}
                          layout={!prefersReducedMotion}
                          className={cn(
                            "flex items-center justify-between p-4 rounded-xl",
                            "bg-white/80 backdrop-blur-sm",
                            "border border-orange-200/50",
                            "hover:shadow-md hover:border-orange-300 transition-all duration-300"
                          )}
                          whileHover={prefersReducedMotion ? {} : { y: -2 }}
                        >
                          <Link
                            href={`/globe?user=${requester.id}`}
                            className="flex items-center gap-3 flex-1 min-w-0 group"
                          >
                            <Avatar className="h-11 w-11 ring-2 ring-orange-200 group-hover:ring-orange-300 transition-all">
                              <AvatarImage src={requester.avatar_url || ''} />
                              <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-500 text-white font-semibold">
                                {(requester.display_name || requester.username || 'U').charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900 truncate group-hover:text-orange-600 transition-colors">
                                {requester.display_name || requester.username}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                @{requester.username}
                              </p>
                            </div>
                          </Link>

                          <div className="flex items-center gap-2 ml-4">
                            <motion.div
                              whileHover={prefersReducedMotion ? {} : { scale: 1.1 }}
                              whileTap={prefersReducedMotion ? {} : { scale: 0.9 }}
                            >
                              <Button
                                size="icon"
                                variant="default"
                                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 h-9 w-9 rounded-full shadow-md shadow-green-500/25"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  handleAccept(requester.id)
                                }}
                                disabled={actionLoading === requester.id}
                                title="Accept"
                              >
                                {actionLoading === requester.id ? (
                                  <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                  >
                                    <Loader2 className="h-4 w-4" />
                                  </motion.div>
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                              </Button>
                            </motion.div>
                            <motion.div
                              whileHover={prefersReducedMotion ? {} : { scale: 1.1 }}
                              whileTap={prefersReducedMotion ? {} : { scale: 0.9 }}
                            >
                              <Button
                                size="icon"
                                variant="outline"
                                className="border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 h-9 w-9 rounded-full"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  handleReject(requester.id)
                                }}
                                disabled={actionLoading === requester.id}
                                title="Reject"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </motion.div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Followers List */}
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
              <Users className="h-5 w-5 text-blue-500" />
              Your Followers
              <span className="text-sm font-normal text-gray-500">({followers.length})</span>
            </h2>
          </div>
          <div className="p-4">
            {followers.length === 0 ? (
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
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center mx-auto mb-4">
                    <Users className="h-10 w-10 text-blue-400" />
                  </div>
                </motion.div>
                <p className="text-gray-700 font-medium">No followers yet</p>
                <p className="text-sm text-gray-500 mt-2">
                  Share your profile to gain followers!
                </p>
                <Link href="/explore">
                  <motion.div
                    whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
                    whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                  >
                    <Button className="mt-6 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg shadow-blue-500/25">
                      Explore & Connect
                    </Button>
                  </motion.div>
                </Link>
              </motion.div>
            ) : (
              <motion.div
                className="space-y-3"
                initial="hidden"
                animate="visible"
                variants={containerVariants}
              >
                <AnimatePresence mode="popLayout">
                  {followers.map((follow, index) => {
                    const followerUser = follow.follower
                    if (!followerUser) return null

                    return (
                      <motion.div
                        key={follow.id}
                        variants={itemVariants}
                        layout={!prefersReducedMotion}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-xl",
                          "bg-white/60 backdrop-blur-sm",
                          "border border-gray-100",
                          "hover:shadow-md hover:border-blue-200 hover:bg-white/80 transition-all duration-300",
                          "group"
                        )}
                        whileHover={prefersReducedMotion ? {} : { y: -2 }}
                      >
                        <Link
                          href={`/globe?user=${followerUser.id}`}
                          className="flex items-center gap-3 flex-1 min-w-0"
                        >
                          <motion.div
                            whileHover={prefersReducedMotion ? {} : { scale: 1.08 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                          >
                            <Avatar className="h-11 w-11 ring-2 ring-gray-100 group-hover:ring-blue-200 transition-all">
                              <AvatarImage src={followerUser.avatar_url || ''} />
                              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white font-semibold">
                                {(followerUser.display_name || followerUser.username || 'U').charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          </motion.div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                              {followerUser.display_name || followerUser.username}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              @{followerUser.username}
                            </p>
                          </div>
                        </Link>

                        <FollowButton
                          userId={followerUser.id}
                          size="sm"
                          showText={true}
                          className="ml-4"
                        />
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
