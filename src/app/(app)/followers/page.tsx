'use client'

import { useEffect, useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { useFollows } from '@/lib/hooks/useFollows'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ArrowLeft, Users, Loader2, UserPlus, Check, X } from 'lucide-react'
import Link from 'next/link'
import { FollowButton } from '@/components/social/FollowButton'
import { motion, AnimatePresence } from 'framer-motion'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { getDisplayInitial } from '@/lib/utils/display-name'
import type { Follower } from '@/types/database'

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

interface FollowersData {
  followers: Follower[]
  pendingRequests: Follower[]
  followersCount: number
  pendingRequestsCount: number
}

export default function FollowersPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const supabase = useMemo(() => createClient(), [])
  // useFollows still owns the accept/reject mutations. The lists themselves are
  // read through React Query below so revisits repaint from cache.
  const { acceptFollowRequest, rejectFollowRequest } = useFollows()
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const prefersReducedMotion = useReducedMotion()

  const queryKey = ['followers', user?.id]

  const { data, isLoading, isError } = useQuery<FollowersData>({
    queryKey,
    enabled: !!user,
    queryFn: async () => {
      // Mirrors useFollows.refreshFollowLists (followers + pending) and
      // refreshStats (counts) for the signed-in user.
      const [followersResult, pendingResult, followersCountResult, pendingCountResult] = await Promise.all([
        supabase
          .from('follows')
          .select(`
            *,
            follower:users!follows_follower_id_fkey(*)
          `)
          .eq('following_id', user!.id)
          .eq('status', 'accepted'),
        supabase
          .from('follows')
          .select(`
            *,
            follower:users!follows_follower_id_fkey(*)
          `)
          .eq('following_id', user!.id)
          .eq('status', 'pending'),
        supabase
          .from('follows')
          .select('id', { count: 'exact' })
          .eq('following_id', user!.id)
          .eq('status', 'accepted'),
        supabase
          .from('follows')
          .select('id', { count: 'exact' })
          .eq('following_id', user!.id)
          .eq('status', 'pending'),
      ])

      if (followersResult.error) throw followersResult.error
      if (pendingResult.error) throw pendingResult.error

      return {
        followers: (followersResult.data || []) as Follower[],
        pendingRequests: (pendingResult.data || []) as Follower[],
        followersCount: followersCountResult.count || 0,
        pendingRequestsCount: pendingCountResult.count || 0,
      }
    },
  })

  const followers = data?.followers ?? []
  const pendingRequests = data?.pendingRequests ?? []
  const followersCount = data?.followersCount ?? 0
  const pendingRequestsCount = data?.pendingRequestsCount ?? 0
  // Preserve original loading behavior: full-screen spinner while fetching.
  const loading = (isLoading || (!data && !isError)) && !!user

  const handleAccept = async (followerUserId: string) => {
    setActionLoading(followerUserId)
    try {
      await acceptFollowRequest(followerUserId)
      await queryClient.invalidateQueries({ queryKey })
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (followerUserId: string) => {
    setActionLoading(followerUserId)
    try {
      await rejectFollowRequest(followerUserId)
      await queryClient.invalidateQueries({ queryKey })
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
        <div
          className="h-10 w-10 rounded-full border-4 border-muted border-t-primary animate-spin"
          aria-hidden
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-2xl px-4 sm:px-6 py-6 md:py-8 space-y-8">
        {/* Header */}
        <motion.div
          className="flex items-center gap-4"
          initial="hidden"
          animate="visible"
          variants={headerVariants}
        >
          <Button
            variant="ghost"
            onClick={() => window.history.back()}
            size="sm"
            className="cursor-pointer rounded-full"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <header className="space-y-1">
            <p className="al-eyebrow">Your audience</p>
            <h1 className="al-display text-3xl md:text-4xl">Followers</h1>
            <p className="text-sm text-muted-foreground">
              People following you.
            </p>
          </header>
        </motion.div>

        {/* Stats */}
        <motion.div
          className="grid grid-cols-2 gap-4"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <motion.div variants={itemVariants}>
            <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
              <p className="al-eyebrow flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-primary" aria-hidden />
                Followers
              </p>
              <p className="al-stat-value text-3xl md:text-4xl mt-1">
                <AnimatedCounter value={followersCount} />
              </p>
            </div>
          </motion.div>
          <motion.div variants={itemVariants}>
            <div className="relative rounded-2xl border border-border bg-card p-4 sm:p-5">
              {pendingRequestsCount > 0 && (
                <span
                  className="absolute top-3 right-3 inline-flex h-2.5 w-2.5 rounded-full bg-accent"
                  aria-hidden
                />
              )}
              <p className="al-eyebrow flex items-center gap-1.5">
                <UserPlus className="h-3.5 w-3.5 text-accent" aria-hidden />
                Pending Requests
              </p>
              <p className="al-stat-value text-3xl md:text-4xl mt-1">
                <AnimatedCounter value={pendingRequestsCount} />
              </p>
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
              className="rounded-2xl border border-border bg-card overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-border">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5 text-accent" aria-hidden />
                    <span className="font-heading font-semibold text-foreground">Follow Requests</span>
                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-xs font-bold">
                      {pendingRequests.length}
                    </span>
                  </div>
                  <p className="hidden sm:block text-sm text-muted-foreground">
                    Approve or decline follow requests
                  </p>
                </div>
              </div>
              <motion.div
                className="divide-y divide-border"
                initial="hidden"
                animate="visible"
                variants={containerVariants}
              >
                <AnimatePresence mode="popLayout">
                  {pendingRequests.map((request) => {
                    const requester = request.follower
                    if (!requester) return null

                    return (
                      <motion.div
                        key={request.id}
                        variants={itemVariants}
                        layout={!prefersReducedMotion}
                        className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/60"
                      >
                        <Link
                          href={`/globe?user=${requester.id}`}
                          className="flex items-center gap-3 flex-1 min-w-0 group cursor-pointer"
                        >
                          <Avatar className="h-11 w-11">
                            <AvatarImage
                              src={getPhotoUrl(requester.avatar_url, 'avatars') || ''}
                              alt={requester.display_name || requester.username || 'User'}
                            />
                            <AvatarFallback className="bg-accent text-accent-foreground font-semibold">
                              {getDisplayInitial(requester.display_name, requester.username)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                              {requester.display_name || requester.username}
                            </p>
                            <p className="text-xs font-mono tracking-wide text-muted-foreground truncate">
                              @{requester.username}
                            </p>
                          </div>
                        </Link>

                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            size="icon"
                            variant="default"
                            className="cursor-pointer h-9 w-9 rounded-full"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleAccept(requester.id)
                            }}
                            disabled={actionLoading === requester.id}
                            title="Accept"
                          >
                            {actionLoading === requester.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            className="cursor-pointer h-9 w-9 rounded-full text-destructive border-destructive/30 hover:bg-destructive/10 hover:border-destructive/40 focus-visible:ring-destructive/40"
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
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Followers List */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.2 }}
          className="rounded-2xl border border-border bg-card overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-heading text-base md:text-lg font-semibold text-foreground flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" aria-hidden />
              Your Followers
              <span className="text-xs font-mono tracking-wide font-normal text-muted-foreground">({followers.length})</span>
            </h2>
          </div>
          {followers.length === 0 ? (
            <motion.div
              className="flex flex-col items-center justify-center px-6 py-14 text-center"
              initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
                <Users className="h-6 w-6" />
              </div>
              <p className="font-heading text-lg font-semibold text-foreground">No followers yet</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Share your profile to gain followers.
              </p>
              <Link href="/explore">
                <Button variant="coral" className="mt-5 cursor-pointer">
                  Explore &amp; Connect
                </Button>
              </Link>
            </motion.div>
          ) : (
            <motion.div
              className="divide-y divide-border"
              initial="hidden"
              animate="visible"
              variants={containerVariants}
            >
              <AnimatePresence mode="popLayout">
                {followers.map((follow) => {
                  const followerUser = follow.follower
                  if (!followerUser) return null

                  return (
                    <motion.div
                      key={follow.id}
                      variants={itemVariants}
                      layout={!prefersReducedMotion}
                      className="group flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/60"
                    >
                      <Link
                        href={`/globe?user=${followerUser.id}`}
                        className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                      >
                        <Avatar className="h-11 w-11">
                          <AvatarImage
                            src={getPhotoUrl(followerUser.avatar_url, 'avatars') || ''}
                            alt={followerUser.display_name || followerUser.username || 'User'}
                          />
                          <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                            {getDisplayInitial(followerUser.display_name, followerUser.username)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                            {followerUser.display_name || followerUser.username}
                          </p>
                          <p className="text-xs font-mono tracking-wide text-muted-foreground truncate">
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
        </motion.div>
      </div>
    </div>
  )
}
