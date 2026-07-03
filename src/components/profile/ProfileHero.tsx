'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { User } from '@/types/database'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { getAvatarUrl } from '@/lib/utils/avatar'
import { getDisplayName, getDisplayInitial } from '@/lib/utils/display-name'
import { Settings, Pencil, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { AnimatedCounter } from '@/components/ui/animated-count'
import { FollowButton } from '@/components/social/FollowButton'
import { getWebOrigin, withRef } from '@/lib/utils/native-routes'

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
  const displayName = getDisplayName(profile.display_name, profile.username)
  const username = profile.username || 'anonymous'
  const initials = getDisplayInitial(profile.display_name, profile.username)

  // Share the public profile URL (web origin + referral handle) via the native
  // share sheet when available, otherwise copy to clipboard with a toast.
  const handleShare = async () => {
    if (!profile.username) return
    const url = withRef(`${getWebOrigin()}/u/${profile.username}`, profile.username)
    const title = `${displayName} on Adventure Log`

    const copyToClipboard = async () => {
      try {
        await navigator.clipboard.writeText(url)
        toast.success('Profile link copied')
      } catch {
        toast.error('Could not copy profile link')
      }
    }

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, url })
      } catch (err) {
        // User dismissing the share sheet is not an error.
        if (err instanceof Error && err.name === 'AbortError') return
        await copyToClipboard()
      }
    } else {
      await copyToClipboard()
    }
  }

  return (
    <div className="relative px-4 sm:px-6">
      {/* Cover band — the photo uploaded in Settings when set (this is the
          only surface that displays it), otherwise a quiet accent surface. */}
      <div className="relative h-32 sm:h-40 rounded-2xl overflow-hidden bg-primary/10 dark:bg-primary/15">
        {profile.cover_photo_url && (
          <Image
            src={profile.cover_photo_url}
            alt=""
            fill
            priority
            className="object-cover"
            sizes="(max-width: 672px) 100vw, 672px"
          />
        )}
      </div>

      <div className="relative z-10 pb-7 -mt-12 sm:-mt-14">
        <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
          {/* Avatar — overlaps the cover band */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            className="relative"
          >
            <Avatar className="h-24 w-24 sm:h-28 sm:w-28 ring-4 ring-background">
              <AvatarImage
                src={getAvatarUrl(profile.avatar_url, profile.username)}
                alt={displayName}
              />
              <AvatarFallback className="bg-accent font-heading text-3xl font-semibold text-accent-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
          </motion.div>

          {/* Profile Info */}
          <div className="flex-1 pt-3 sm:pt-12">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex flex-wrap items-start justify-between gap-x-3 gap-y-3"
            >
              <div className="min-w-0">
                <h1 className="al-display text-2xl sm:text-3xl">
                  {displayName}
                </h1>
                <p className="font-mono text-[11px] tracking-wider text-muted-foreground mt-1">
                  @{username}
                </p>
              </div>

              {/* Action Buttons — top-right of info block, wrap tidily on narrow screens */}
              <div className="flex flex-wrap items-center justify-end gap-2">
                {isOwnProfile ? (
                  <>
                    <Link href="/profile/edit">
                      <Button
                        size="sm"
                        className="rounded-full text-[12px] font-semibold min-h-[44px]"
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1.5" />
                        Edit profile
                      </Button>
                    </Link>
                    {profile.username && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleShare}
                        aria-label="Share profile"
                        className="rounded-full h-11 w-11"
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                    )}
                    <Link href="/settings" aria-label="Settings">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full h-11 w-11"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </Link>
                  </>
                ) : (
                  <FollowButton userId={profile.id} size="sm" showText />
                )}
              </div>
            </motion.div>

            {/* Bio — serif italic, editorial voice */}
            {profile.bio && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="mt-3 font-heading italic text-[15px] leading-relaxed max-w-xl text-muted-foreground"
              >
                {profile.bio}
              </motion.p>
            )}

            {/* Follow Stats Row */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-6 mt-4"
            >
              <Link href="/following" className="group">
                <span className="font-heading text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                  <AnimatedCounter value={followStats.followingCount} className="" />
                </span>
                <span className="text-muted-foreground ml-1 text-xs">
                  Following
                </span>
              </Link>
              <Link href="/followers" className="group">
                <span className="font-heading text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                  <AnimatedCounter value={followStats.followersCount} className="" />
                </span>
                <span className="text-muted-foreground ml-1 text-xs">
                  Followers
                </span>
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
