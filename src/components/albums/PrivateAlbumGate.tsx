'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { Lock, UserPlus, LogIn, Users, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { getPhotoUrl } from '@/lib/utils/photo-url'

interface PrivateAlbumGateProps {
  albumTitle: string
  coverPhotoUrl?: string | null
  ownerName?: string
  ownerUsername?: string
  ownerAvatarUrl?: string | null
  visibilityLevel: 'private' | 'friends'
  isLoggedIn: boolean
  onRequestAccess?: () => void
  className?: string
}

export function PrivateAlbumGate({
  albumTitle,
  coverPhotoUrl,
  ownerName,
  ownerUsername,
  ownerAvatarUrl,
  visibilityLevel,
  isLoggedIn,
  onRequestAccess,
  className
}: PrivateAlbumGateProps) {
  const imageUrl = coverPhotoUrl?.startsWith('http')
    ? coverPhotoUrl
    : getPhotoUrl(coverPhotoUrl)

  return (
    <div className={cn(
      "min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900",
      className
    )}>
      {/* Background Image (blurred) */}
      {imageUrl && (
        <div className="absolute inset-0 overflow-hidden">
          <Image
            src={imageUrl}
            alt={albumTitle}
            fill
            className="object-cover opacity-20 blur-2xl scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900/80 via-gray-800/80 to-gray-900/80" />
        </div>
      )}

      {/* Content */}
      <motion.div
        className="relative z-10 max-w-md w-full text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Lock Icon Animation */}
        <motion.div
          className="mx-auto mb-8"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            type: 'spring',
            stiffness: 200,
            damping: 15,
            delay: 0.2
          }}
        >
          <motion.div
            className="relative w-24 h-24 mx-auto"
            animate={{
              y: [0, -5, 0]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          >
            {/* Outer glow */}
            <motion.div
              className={cn(
                "absolute inset-0 rounded-full blur-xl",
                visibilityLevel === 'friends'
                  ? "bg-purple-500/30"
                  : "bg-amber-500/30"
              )}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            />

            {/* Icon container */}
            <div className={cn(
              "relative w-full h-full rounded-full flex items-center justify-center",
              visibilityLevel === 'friends'
                ? "bg-gradient-to-br from-purple-500 to-pink-500"
                : "bg-gradient-to-br from-amber-500 to-orange-500"
            )}>
              {visibilityLevel === 'friends' ? (
                <Users className="h-10 w-10 text-white" />
              ) : (
                <Lock className="h-10 w-10 text-white" />
              )}
            </div>
          </motion.div>
        </motion.div>

        {/* Album Title */}
        <motion.h1
          className="text-2xl md:text-3xl font-bold text-white mb-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {albumTitle}
        </motion.h1>

        {/* Visibility Badge */}
        <motion.div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white/80 mb-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {visibilityLevel === 'friends' ? (
            <>
              <Users className="h-4 w-4" />
              <span className="text-sm font-medium">Friends Only</span>
            </>
          ) : (
            <>
              <Lock className="h-4 w-4" />
              <span className="text-sm font-medium">Private Album</span>
            </>
          )}
        </motion.div>

        {/* Message */}
        <motion.p
          className="text-gray-300 mb-8 leading-relaxed"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          {visibilityLevel === 'friends'
            ? "This album is only visible to friends. Follow the creator to request access."
            : "This album is private and only visible to the creator."}
        </motion.p>

        {/* Owner Info */}
        {ownerName && (
          <motion.div
            className="flex items-center justify-center gap-3 mb-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Avatar className="h-12 w-12 ring-2 ring-white/20">
              <AvatarImage
                src={ownerAvatarUrl ? getPhotoUrl(ownerAvatarUrl, 'avatars') || undefined : undefined}
                alt={ownerName}
              />
              <AvatarFallback className="bg-teal-500 text-white">
                {ownerName[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="text-left">
              <p className="text-white font-medium">{ownerName}</p>
              {ownerUsername && (
                <p className="text-gray-400 text-sm">@{ownerUsername}</p>
              )}
            </div>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          className="space-y-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          {!isLoggedIn ? (
            <>
              <Link href="/login" className="block">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button className="w-full bg-white text-gray-900 hover:bg-gray-100">
                    <LogIn className="h-4 w-4 mr-2" />
                    Log in to view
                  </Button>
                </motion.div>
              </Link>
              <Link href="/signup" className="block">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    variant="outline"
                    className="w-full border-white/30 text-white hover:bg-white/10"
                  >
                    Create an account
                  </Button>
                </motion.div>
              </Link>
            </>
          ) : visibilityLevel === 'friends' && onRequestAccess ? (
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                onClick={onRequestAccess}
                className="w-full bg-teal-500 hover:bg-teal-600 text-white"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Request to Follow
              </Button>
            </motion.div>
          ) : (
            <p className="text-gray-400 text-sm">
              This album is private and cannot be accessed.
            </p>
          )}

          <Link href="/explore" className="block">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                variant="ghost"
                className="w-full text-gray-400 hover:text-white hover:bg-white/10"
              >
                <Globe className="h-4 w-4 mr-2" />
                Explore public albums
              </Button>
            </motion.div>
          </Link>
        </motion.div>
      </motion.div>

      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        {/* Floating particles */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-white/20"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0, 1, 0]
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2
            }}
          />
        ))}
      </div>
    </div>
  )
}

// Compact version for inline use
interface CompactPrivateGateProps {
  visibilityLevel: 'private' | 'friends'
  isLoggedIn: boolean
  onRequestAccess?: () => void
  className?: string
}

export function CompactPrivateGate({
  visibilityLevel,
  isLoggedIn,
  onRequestAccess,
  className
}: CompactPrivateGateProps) {
  return (
    <motion.div
      className={cn(
        "flex flex-col items-center justify-center p-8 bg-gray-50 rounded-2xl border border-gray-200",
        className
      )}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className={cn(
          "p-4 rounded-full mb-4",
          visibilityLevel === 'friends'
            ? "bg-purple-100"
            : "bg-amber-100"
        )}
        animate={{ rotate: [0, 5, -5, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {visibilityLevel === 'friends' ? (
          <Users className={cn(
            "h-8 w-8",
            visibilityLevel === 'friends' ? "text-purple-600" : "text-amber-600"
          )} />
        ) : (
          <Lock className="h-8 w-8 text-amber-600" />
        )}
      </motion.div>

      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {visibilityLevel === 'friends' ? 'Friends Only' : 'Private Album'}
      </h3>

      <p className="text-gray-500 text-sm text-center mb-4">
        {visibilityLevel === 'friends'
          ? "Follow the creator to request access"
          : "This album is only visible to the owner"}
      </p>

      {!isLoggedIn ? (
        <Link href="/login">
          <Button size="sm">Log in to view</Button>
        </Link>
      ) : visibilityLevel === 'friends' && onRequestAccess ? (
        <Button size="sm" onClick={onRequestAccess}>
          <UserPlus className="h-4 w-4 mr-2" />
          Request Access
        </Button>
      ) : null}
    </motion.div>
  )
}
