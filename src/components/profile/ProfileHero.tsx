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
    <div className="relative">
      {/* Editorial cover gradient — olive → coral-soft */}
      <div
        className="h-36 sm:h-44 rounded-t-2xl relative overflow-hidden"
        style={{
          background:
            'linear-gradient(135deg, #4A5D23 0%, #A2322B 50%, #F2A179 100%)',
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            mixBlendMode: 'overlay',
            opacity: 0.2,
          }}
        />
      </div>

      <div className="relative z-10 px-5 sm:px-8 pb-7 -mt-12 sm:-mt-14">
        <div className="flex flex-col sm:flex-row items-start gap-5 sm:gap-6">
          {/* Avatar — overlaps the gradient */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            className="relative"
          >
            <Avatar
              className="h-24 w-24 sm:h-28 sm:w-28"
              style={{
                border: '4px solid var(--color-ivory)',
                boxShadow: '0 4px 16px rgba(26,20,14,0.12)',
              }}
            >
              <AvatarImage
                src={getPhotoUrl(profile.avatar_url, 'avatars') || ''}
                alt={displayName}
              />
              <AvatarFallback
                className="font-heading text-3xl font-semibold text-white"
                style={{ background: 'var(--color-coral)' }}
              >
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
              className="flex items-start justify-between gap-3"
            >
              <div>
                <h1
                  className="font-heading text-2xl sm:text-3xl font-semibold"
                  style={{ letterSpacing: '-0.02em', color: 'var(--color-ink)' }}
                >
                  {displayName}
                </h1>
                <p className="font-mono text-[11px] tracking-wider text-[color:var(--color-muted-warm)] mt-0.5">
                  @{username}
                  {profile.location && (
                    <>
                      {' · '}
                      {profile.location}
                    </>
                  )}
                </p>
              </div>

              {/* Action Buttons — top-right of info block */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {isOwnProfile ? (
                  <>
                    <Link href="/settings">
                      <Button
                        size="sm"
                        className="rounded-full text-[12px] font-semibold"
                        style={{
                          background: 'var(--color-ink)',
                          color: 'var(--color-ivory)',
                        }}
                      >
                        <Settings className="h-3.5 w-3.5 mr-1.5" />
                        Edit
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
                            url: window.location.href,
                          })
                        }
                      }}
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <Button
                    className="rounded-full text-[12px] font-semibold"
                    style={{
                      background: 'var(--color-coral)',
                      color: '#fff',
                      boxShadow: '0 6px 18px rgba(226,85,58,0.33)',
                    }}
                  >
                    Follow
                  </Button>
                )}
              </div>
            </motion.div>

            {/* Bio — serif italic per mockup */}
            {profile.bio && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="mt-3 font-heading italic text-[15px] leading-relaxed max-w-xl"
                style={{ color: 'var(--color-ink-soft)' }}
              >
                {profile.bio}
              </motion.p>
            )}

            {/* Follow Stats Row */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-5 mt-4"
            >
              <Link href="/following" className="group">
                <span className="font-heading text-base font-semibold text-[color:var(--color-ink)] group-hover:text-[color:var(--color-coral)] transition-colors">
                  <AnimatedCounter value={followStats.followingCount} className="" />
                </span>
                <span className="text-[color:var(--color-muted-warm)] ml-1 text-xs">
                  Following
                </span>
              </Link>
              <Link href="/followers" className="group">
                <span className="font-heading text-base font-semibold text-[color:var(--color-ink)] group-hover:text-[color:var(--color-coral)] transition-colors">
                  <AnimatedCounter value={followStats.followersCount} className="" />
                </span>
                <span className="text-[color:var(--color-muted-warm)] ml-1 text-xs">
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
