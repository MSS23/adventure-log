'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { useFollows } from '@/lib/hooks/useFollows'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Users, Loader2, UserMinus, ArrowLeft, Heart } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { getPhotoUrl } from '@/lib/utils/photo-url'

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
            <p className="al-eyebrow">Connections</p>
            <h1 className="al-display text-3xl md:text-4xl">Following</h1>
            <p className="text-sm text-muted-foreground">
              People you&apos;re following.
            </p>
          </header>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.1 }}
        >
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <p className="al-eyebrow flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-primary" aria-hidden />
              Following
            </p>
            <p className="al-stat-value text-3xl md:text-4xl mt-1">
              <AnimatedCounter value={stats.followingCount} />
            </p>
          </div>
        </motion.div>

        {/* Following List */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.2 }}
          className="rounded-2xl border border-border bg-card overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-heading text-base md:text-lg font-semibold text-foreground flex items-center gap-2">
              <Heart className="h-5 w-5 text-accent" aria-hidden />
              People You Follow
              <span className="text-xs font-mono tracking-wide font-normal text-muted-foreground">({following.length})</span>
            </h2>
          </div>
          {following.length === 0 ? (
            <motion.div
              className="flex flex-col items-center justify-center px-6 py-14 text-center"
              initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
                <Users className="h-6 w-6" />
              </div>
              <p className="font-heading text-lg font-semibold text-foreground">Not following anyone yet</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Discover and follow travelers to see their adventures.
              </p>
              <Button
                variant="coral"
                className="mt-5 cursor-pointer"
                onClick={() => router.push('/explore')}
              >
                Discover People
              </Button>
            </motion.div>
          ) : (
            <motion.div
              className="divide-y divide-border"
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
                      className="group flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/60"
                    >
                      <Link
                        href={`/globe?user=${followingUser.id}`}
                        className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                      >
                        <Avatar className="h-12 w-12">
                          <AvatarImage
                            src={getPhotoUrl(followingUser.avatar_url, 'avatars') || ''}
                            alt={followingUser.display_name || followingUser.username || 'User'}
                          />
                          <AvatarFallback className="bg-accent text-accent-foreground font-semibold">
                            {(followingUser.display_name || followingUser.username || 'U').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                            {followingUser.display_name || followingUser.username}
                          </p>
                          <p className="text-xs font-mono tracking-wide text-muted-foreground truncate">
                            @{followingUser.username}
                          </p>
                          {followingUser.bio && (
                            <p className="text-sm text-muted-foreground truncate mt-0.5">
                              {followingUser.bio}
                            </p>
                          )}
                        </div>
                      </Link>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUnfollow(followingUser.id)}
                        disabled={actionLoading === followingUser.id}
                        className="ml-4 cursor-pointer rounded-full px-4 hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive focus-visible:ring-destructive/40"
                      >
                        {actionLoading === followingUser.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <UserMinus className="h-4 w-4 mr-1" />
                            Unfollow
                          </>
                        )}
                      </Button>
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
