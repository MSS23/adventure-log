'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { User } from '@/types/database'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { Camera, Settings, Share2, MapPin, Globe } from 'lucide-react'

interface ProfileHeroProps {
  profile: User
  isOwnProfile?: boolean
  followStats: {
    followersCount: number
    followingCount: number
  }
  onEditCover?: () => void
  onViewGlobe?: () => void
}

export function ProfileHero({
  profile,
  isOwnProfile = false,
  followStats,
  onEditCover,
  onViewGlobe
}: ProfileHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollY } = useScroll()

  // Parallax transforms
  const y = useTransform(scrollY, [0, 300], [0, 50])
  const scale = useTransform(scrollY, [0, 300], [1, 1.1])
  const opacity = useTransform(scrollY, [0, 200], [1, 0.6])

  const displayName = profile.display_name || profile.username || 'Anonymous User'
  const username = profile.username || 'anonymous'
  const initials = displayName.charAt(0).toUpperCase()

  const coverPhotoUrl = profile.cover_photo_url
    ? getPhotoUrl(profile.cover_photo_url, 'covers')
    : null

  return (
    <div ref={containerRef} className="relative mb-6">
      {/* Cover Photo with Parallax */}
      <div className="relative h-40 md:h-48 lg:h-56 overflow-hidden rounded-b-2xl">
        <motion.div
          style={{ y, scale }}
          className="absolute inset-0"
        >
          {coverPhotoUrl ? (
            <Image
              src={coverPhotoUrl}
              alt="Cover photo"
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-600" />
          )}
          {/* Gradient overlay for text readability */}
          <motion.div
            style={{ opacity }}
            className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent"
          />
        </motion.div>

        {/* Edit Cover Button */}
        {isOwnProfile && (
          <motion.button
            onClick={onEditCover}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="absolute top-4 right-4 flex items-center gap-2 px-3 py-2 rounded-full
                       bg-white/20 backdrop-blur-md border border-white/30
                       text-white text-sm font-medium
                       hover:bg-white/30 transition-colors z-10"
          >
            <Camera className="h-4 w-4" />
            <span className="hidden sm:inline">Edit Cover</span>
          </motion.button>
        )}

        {/* View Globe Button */}
        {onViewGlobe && (
          <motion.button
            onClick={onViewGlobe}
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25, delay: 0.1 }}
            className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2.5 rounded-full
                       bg-gradient-to-r from-teal-500 to-cyan-500
                       text-white text-sm font-semibold
                       shadow-lg shadow-teal-500/30
                       hover:shadow-xl hover:shadow-teal-500/40
                       border border-white/20
                       z-10 transition-all duration-300"
          >
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">View My Globe</span>
            <span className="sm:hidden">Globe</span>
          </motion.button>
        )}
      </div>

      {/* Profile Info Section */}
      <div className="relative px-4 sm:px-6 -mt-16 sm:-mt-20 pt-4 pb-4 bg-white/90 backdrop-blur-sm rounded-t-2xl">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          {/* Avatar */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24, delay: 0.1 }}
            className="relative"
          >
            <div className="relative">
              {/* Animated ring */}
              <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500 animate-spin-slow opacity-75 blur-sm" />
              <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500 opacity-75" />
              <Avatar className="relative h-28 w-28 sm:h-32 sm:w-32 ring-4 ring-white shadow-2xl">
                <AvatarImage
                  src={getPhotoUrl(profile.avatar_url, 'avatars') || ''}
                  alt={displayName}
                />
                <AvatarFallback className="text-3xl sm:text-4xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
          </motion.div>

          {/* Name and Actions */}
          <div className="flex-1 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {displayName}
              </h1>
              <p className="text-gray-500 font-medium">@{username}</p>
              {profile.location && (
                <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-600">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{profile.location}</span>
                </div>
              )}
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-3"
            >
              {isOwnProfile ? (
                <>
                  <Link href="/settings">
                    <Button
                      variant="outline"
                      className="rounded-full border-2 border-gray-200 hover:border-teal-500 hover:text-teal-600 transition-all"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full hover:bg-gray-100"
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
                <Button className="rounded-full bg-teal-500 hover:bg-teal-600 text-white px-6">
                  Follow
                </Button>
              )}
            </motion.div>
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-4 text-gray-700 max-w-2xl leading-relaxed"
          >
            {profile.bio}
          </motion.p>
        )}

        {/* Follow Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex items-center gap-6 mt-4"
        >
          <button className="group">
            <span className="font-bold text-gray-900 group-hover:text-teal-600 transition-colors">
              {followStats.followingCount}
            </span>
            <span className="text-gray-600 ml-1">Following</span>
          </button>
          <button className="group">
            <span className="font-bold text-gray-900 group-hover:text-teal-600 transition-colors">
              {followStats.followersCount}
            </span>
            <span className="text-gray-600 ml-1">Followers</span>
          </button>
        </motion.div>
      </div>

      {/* Custom CSS for slow spin animation */}
      <style jsx global>{`
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  )
}
