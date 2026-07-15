'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Pencil, Settings, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { User } from '@/types/database'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { AnimatedCounter } from '@/components/ui/animated-count'
import { FollowButton } from '@/components/social/FollowButton'
import { FoundingExplorerBadge } from '@/components/profile/FoundingExplorerBadge'
import { getAvatarUrl } from '@/lib/utils/avatar'
import { getDisplayInitial, getDisplayName } from '@/lib/utils/display-name'
import { getWebOrigin, withRef } from '@/lib/utils/native-routes'
import { trackGrowthEvent } from '@/lib/utils/growth-events'

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
  followStats,
}: ProfileHeroProps) {
  const displayName = getDisplayName(profile.display_name, profile.username)
  const username = profile.username || 'anonymous'
  const initials = getDisplayInitial(profile.display_name, profile.username)

  const handleShare = async () => {
    if (!profile.username) return
    const url = withRef(`${getWebOrigin()}/u/${profile.username}`, profile.username)
    const title = `${displayName} on Adventure Log`
    trackGrowthEvent('share_link_created', { meta: { surface: 'profile_hero' } })

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
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return
        await copyToClipboard()
      }
    } else {
      await copyToClipboard()
    }
  }

  return (
    <section className="px-4 pt-8 sm:px-6 sm:pt-10">
      <div className="border-b border-border pb-7">
        <div className="flex items-start gap-4 sm:gap-6">
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            className="relative shrink-0"
          >
            <Avatar className="h-20 w-20 border border-border ring-4 ring-background sm:h-24 sm:w-24">
              <AvatarImage src={getAvatarUrl(profile.avatar_url, profile.username)} alt={displayName} />
              <AvatarFallback className="bg-accent font-heading text-2xl font-semibold text-accent-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-[3px] border-background bg-primary" aria-hidden />
          </motion.div>

          <div className="min-w-0 flex-1">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="flex flex-wrap items-start justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="al-eyebrow mb-1">Travel profile</p>
                <h1 className="al-display truncate text-2xl sm:text-3xl">{displayName}</h1>
                <p className="mt-1 flex items-center gap-2 font-mono text-[11px] tracking-wider text-muted-foreground">
                  @{username}
                  <FoundingExplorerBadge createdAt={profile.created_at} />
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                {isOwnProfile ? (
                  <>
                    <Button asChild size="sm" className="min-h-10 rounded-full px-4 text-xs font-semibold">
                      <Link href="/profile/edit">
                        <Pencil className="mr-1.5 h-3.5 w-3.5" />
                        Edit
                      </Link>
                    </Button>
                    {profile.username && (
                      <Button variant="ghost" size="icon" onClick={handleShare} aria-label="Share profile" className="h-10 w-10 rounded-full">
                        <Share2 className="h-4 w-4" />
                      </Button>
                    )}
                    <Button asChild variant="ghost" size="icon" className="h-10 w-10 rounded-full">
                      <Link href="/settings" aria-label="Settings">
                        <Settings className="h-4 w-4" />
                      </Link>
                    </Button>
                  </>
                ) : (
                  <FollowButton userId={profile.id} size="sm" showText />
                )}
              </div>
            </motion.div>

            {profile.bio && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.16 }}
                className="mt-3 max-w-xl font-heading text-[15px] italic leading-relaxed text-muted-foreground"
              >
                {profile.bio}
              </motion.p>
            )}

            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22 }}
              className="mt-4 flex items-center gap-5"
            >
              <FollowStat href="/following" value={followStats.followingCount} label="Following" />
              <span className="h-4 w-px bg-border" aria-hidden />
              <FollowStat href="/followers" value={followStats.followersCount} label="Followers" />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}

function FollowStat({ href, value, label }: { href: string; value: number; label: string }) {
  return (
    <Link href={href} className="group inline-flex items-baseline gap-1.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <AnimatedCounter value={value} className="font-heading text-base font-semibold text-foreground transition-colors group-hover:text-primary" />
      <span className="text-xs text-muted-foreground">{label}</span>
    </Link>
  )
}
