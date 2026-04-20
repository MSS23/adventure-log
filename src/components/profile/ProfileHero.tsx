'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { User } from '@/types/database'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { Settings, Share2, MapPin } from 'lucide-react'
import { AnimatedCounter } from '@/components/ui/animated-count'

interface ProfileHeroProps {
  profile: User
  isOwnProfile?: boolean
  followStats: {
    followersCount: number
    followingCount: number
  }
}

export function ProfileHero({
  profile,
  isOwnProfile = false,
  followStats
}: ProfileHeroProps) {
  const displayName = profile.display_name || profile.username || 'Anonymous User'
  const username = profile.username || 'anonymous'
  const initials = displayName.charAt(0).toUpperCase()

  return (
    <div className="relative overflow-hidden rounded-2xl border border-stone-200 dark:border-white/[0.06] bg-gradient-to-b from-olive-50/40 via-white to-white dark:from-olive-950/20 dark:via-[#111111] dark:to-[#111111]">
      <div className="relative z-10 px-5 sm:px-8 py-7 sm:py-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-6">
          {/* Avatar */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            className="relative"
          >
            <div className="ring-[3px] ring-olive-500/30 dark:ring-olive-400/20 rounded-full p-0.5">
              <Avatar className="h-24 w-24 sm:h-28 sm:w-28 shadow-xl">
                <AvatarImage
                  src={getPhotoUrl(profile.avatar_url, 'avatars') || ''}
                  alt={displayName}
                />
                <AvatarFallback className="text-3xl bg-gradient-to-br from-olive-500 to-olive-600 text-white font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
          </motion.div>

          {/* Profile Info */}
          <div className="flex-1 text-center sm:text-left">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
                {displayName}
              </h1>
              <p className="text-stone-500 dark:text-stone-400 font-medium text-sm sm:text-base">@{username}</p>

              {profile.location && (
                <div className="flex items-center justify-center sm:justify-start gap-1.5 mt-2 text-sm text-stone-600 dark:text-stone-400">
                  <MapPin className="h-4 w-4 text-olive-500 dark:text-olive-400" />
                  <span>{profile.location}</span>
                </div>
              )}
            </motion.div>

            {/* Bio */}
            {profile.bio && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="mt-3 text-stone-600 dark:text-stone-400 max-w-xl leading-relaxed"
              >
                {profile.bio}
              </motion.p>
            )}

            {/* Stats & Actions Row */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap items-center justify-center sm:justify-start gap-4 sm:gap-6 mt-4"
            >
              {/* Follow Stats with animated counters */}
              <div className="flex items-center gap-4">
                <button className="group text-center hover:scale-105 transition-transform">
                  <AnimatedCounter
                    value={followStats.followingCount}
                    className="font-bold text-stone-900 dark:text-stone-100 group-hover:text-olive-600 dark:group-hover:text-olive-400 transition-colors"
                  />
                  <span className="text-stone-500 dark:text-stone-400 ml-1 text-sm">Following</span>
                </button>
                <button className="group text-center hover:scale-105 transition-transform">
                  <AnimatedCounter
                    value={followStats.followersCount}
                    className="font-bold text-stone-900 dark:text-stone-100 group-hover:text-olive-600 dark:group-hover:text-olive-400 transition-colors"
                  />
                  <span className="text-stone-500 dark:text-stone-400 ml-1 text-sm">Followers</span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {isOwnProfile ? (
                  <>
                    <Link href="/settings">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full border-stone-200 hover:border-olive-500 hover:text-olive-600"
                      >
                        <Settings className="h-4 w-4 mr-1.5" />
                        Edit Profile
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full h-9 w-9"
                      onClick={() => {
                        if (navigator.share) {
                          navigator.share({
                            title: `${displayName} on Adventure Log`,
                            url: window.location.href
                          })
                        }
                      }}
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <Button className="rounded-full bg-olive-500 hover:bg-olive-600 text-white px-5">
                    Follow
                  </Button>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
