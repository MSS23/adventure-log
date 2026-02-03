'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Album, User } from '@/types/database'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Heart, MessageCircle, Globe, ChevronDown, Edit, Trash2, MapPin, Calendar, Share2 } from 'lucide-react'
import { UserLink, UserAvatarLink } from '@/components/social/UserLink'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { log } from '@/lib/utils/logger'
import { motion, AnimatePresence } from 'framer-motion'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { transitions } from '@/lib/animations/spring-configs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface AlbumInfoSidebarProps {
  album: Album
  user?: User | null
  isOwnAlbum: boolean
  onFollowClick?: () => void
  followStatus?: string
  followLoading?: boolean
  likeCount: number
  commentCount: number
  isLiked: boolean
  onLikeClick: () => void
  onCommentClick: () => void
  onGlobeClick: () => void
  photoCount?: number
  className?: string
}

export function AlbumInfoSidebar({
  album,
  user,
  isOwnAlbum,
  onFollowClick,
  followStatus,
  followLoading,
  likeCount,
  commentCount,
  isLiked,
  onLikeClick,
  onCommentClick,
  onGlobeClick,
  photoCount = 0,
  className
}: AlbumInfoSidebarProps) {
  const [showPhotoDetails, setShowPhotoDetails] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showHeartBurst, setShowHeartBurst] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const prefersReducedMotion = useReducedMotion()

  // Get user data from album relations
  const albumUser = user || album.user || (album as unknown as { users?: User }).users

  // Handle animated like click
  const handleAnimatedLike = () => {
    if (!isLiked && !prefersReducedMotion) {
      setShowHeartBurst(true)
      setTimeout(() => setShowHeartBurst(false), 600)
    }
    onLikeClick()
  }

  const handleDelete = async () => {
    if (!album.id) return

    setIsDeleting(true)
    try {
      log.info('Deleting album', {
        component: 'AlbumInfoSidebar',
        action: 'delete-album',
        albumId: album.id
      })

      const { error } = await supabase
        .from('albums')
        .delete()
        .eq('id', album.id)

      if (error) throw error

      toast.success('Album deleted successfully')
      router.push('/my-log')
    } catch (error) {
      log.error('Failed to delete album', {
        component: 'AlbumInfoSidebar',
        action: 'delete-album',
        albumId: album.id
      }, error as Error)
      toast.error('Failed to delete album')
    } finally {
      setIsDeleting(false)
    }
  }

  // Format date range
  const formatDateRange = () => {
    if (!album.date_start) return null
    const startDate = album.date_start
    const endDate = album.date_end

    if (endDate && startDate !== endDate) {
      return `${format(new Date(startDate), 'MMM d')} - ${format(new Date(endDate), 'MMM d, yyyy')}`
    }
    return format(new Date(startDate), 'MMM d, yyyy')
  }

  return (
    <motion.div
      className={cn(
        "rounded-2xl overflow-hidden",
        "bg-gradient-to-br from-white/95 to-white/80",
        "backdrop-blur-xl border border-white/50",
        "shadow-xl shadow-black/5",
        "p-6 space-y-5",
        className
      )}
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      {/* User Header */}
      {albumUser && (
        <motion.div
          className="flex items-center justify-between"
          initial={prefersReducedMotion ? {} : { opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-3">
            <UserAvatarLink user={albumUser}>
              <Avatar className="h-11 w-11 ring-2 ring-white shadow-md">
                <AvatarImage src={albumUser.avatar_url || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-teal-400 to-cyan-500 text-white text-sm font-semibold">
                  {albumUser.display_name?.[0] || albumUser.username?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
            </UserAvatarLink>
            <div className="flex-1 min-w-0">
              <UserLink
                user={albumUser}
                className="font-semibold text-gray-900 hover:text-teal-600 transition-colors text-sm"
              />
              <p className="text-xs text-gray-500">
                @{albumUser.username}
              </p>
            </div>
          </div>
          {!isOwnAlbum && onFollowClick && (
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                size="sm"
                onClick={onFollowClick}
                disabled={followLoading}
                className={cn(
                  "rounded-full px-5 h-9 text-sm font-medium shadow-sm",
                  followStatus === 'following'
                    ? "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
                    : "bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white border-0"
                )}
              >
                {followLoading ? (
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : followStatus === 'following' ? (
                  'Following'
                ) : followStatus === 'pending' ? (
                  'Requested'
                ) : (
                  'Follow'
                )}
              </Button>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Album Title and Metadata */}
      <motion.div
        className="space-y-3"
        initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <h1 className="text-2xl font-bold text-gray-900 leading-tight">{album.title}</h1>

        {/* Location Badge */}
        {album.location_name && (
          <motion.div
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-200"
            whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
          >
            <MapPin className="h-3.5 w-3.5 text-teal-600" />
            <span className="text-sm font-medium text-teal-700">{album.location_name}</span>
          </motion.div>
        )}

        {/* Date with icon */}
        {formatDateRange() && (
          <div className="flex items-center gap-2 text-gray-600">
            <div className="p-1.5 bg-gray-100 rounded-lg">
              <Calendar className="h-4 w-4 text-gray-500" />
            </div>
            <span className="text-sm">{formatDateRange()}</span>
          </div>
        )}
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        className="grid grid-cols-3 gap-4 py-4 border-y border-gray-100/70"
        initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
      >
        <motion.div
          className="text-center cursor-pointer"
          onClick={handleAnimatedLike}
          whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
          whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
        >
          <div className="relative">
            <p className={cn(
              "text-xl font-bold transition-colors",
              isLiked ? "text-red-500" : "text-gray-900"
            )}>
              {likeCount}
            </p>
            {/* Heart burst effect */}
            <AnimatePresence>
              {showHeartBurst && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-visible">
                  {[...Array(6)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute"
                      initial={{ scale: 0, opacity: 1 }}
                      animate={{
                        scale: [0, 1],
                        opacity: [1, 0],
                        x: Math.cos((i * 60 * Math.PI) / 180) * 20,
                        y: Math.sin((i * 60 * Math.PI) / 180) * 20
                      }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    >
                      <Heart className="h-3 w-3 fill-red-400 text-red-400" />
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">Likes</p>
        </motion.div>

        <motion.div
          className="text-center cursor-pointer"
          onClick={onCommentClick}
          whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
          whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
        >
          <p className="text-xl font-bold text-gray-900">{commentCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Comments</p>
        </motion.div>

        <motion.div
          className="text-center"
          whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
        >
          <p className="text-xl font-bold text-gray-900">{photoCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Photos</p>
        </motion.div>
      </motion.div>

      {/* Description */}
      {album.description && (
        <motion.p
          className="text-gray-700 text-sm leading-relaxed"
          initial={prefersReducedMotion ? {} : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
        >
          {album.description}
        </motion.p>
      )}

      {/* Show Photo Details Toggle */}
      <motion.button
        onClick={() => setShowPhotoDetails(!showPhotoDetails)}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors w-full py-2"
        whileHover={prefersReducedMotion ? {} : { x: 2 }}
      >
        <span>Show Details</span>
        <motion.div
          animate={{ rotate: showPhotoDetails ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="h-4 w-4" />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {showPhotoDetails && (
          <motion.div
            className="p-4 bg-gray-50/80 rounded-xl space-y-2.5 text-sm border border-gray-100"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Location</span>
              <span className="text-gray-900 font-medium">{album.location_name || 'Not specified'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 text-xs font-medium">Visibility</span>
              <span className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium capitalize",
                album.visibility === 'public' ? "bg-green-50 text-green-700 border border-green-200" :
                album.visibility === 'private' ? "bg-red-50 text-red-700 border border-red-200" :
                "bg-amber-50 text-amber-700 border border-amber-200"
              )}>
                {album.visibility || 'public'}
              </span>
            </div>
            {album.country_code && (
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Country</span>
                <span className="text-gray-900 font-medium">{album.country_code}</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit and Delete Buttons (for own albums) */}
      {isOwnAlbum && (
        <motion.div
          className="flex gap-2 pt-2"
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Link href={`/albums/${album.id}/edit`} className="flex-1">
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 rounded-xl hover:bg-gray-50"
            >
              <Edit className="h-4 w-4" />
              Edit Album
            </Button>
          </Link>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Album?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this album? This action cannot be undone and will permanently remove all photos and data associated with this album.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="bg-red-600 hover:bg-red-700 rounded-xl"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Album'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </motion.div>
      )}

      {/* Action Buttons */}
      <motion.div
        className="grid grid-cols-4 gap-2 pt-3"
        initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        {/* Like Button with animation */}
        <motion.button
          onClick={handleAnimatedLike}
          className={cn(
            "flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all",
            isLiked
              ? "bg-red-50 text-red-500"
              : "hover:bg-gray-50 text-gray-600"
          )}
          whileTap={prefersReducedMotion ? {} : { scale: 0.9 }}
          transition={transitions.snap}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={isLiked ? 'liked' : 'not-liked'}
              initial={prefersReducedMotion ? {} : { scale: 0.8, rotate: -15 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={transitions.bounce}
            >
              <Heart className={cn(
                "h-5 w-5",
                isLiked && "fill-current"
              )} />
            </motion.div>
          </AnimatePresence>
          <span className="text-xs font-medium">Like</span>
        </motion.button>

        {/* Comment Button */}
        <motion.button
          onClick={onCommentClick}
          className="flex flex-col items-center gap-1.5 py-3 rounded-xl hover:bg-gray-50 transition-colors text-gray-600"
          whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
          whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
          transition={transitions.snap}
        >
          <MessageCircle className="h-5 w-5" />
          <span className="text-xs font-medium">Comment</span>
        </motion.button>

        {/* Share Button */}
        <motion.button
          onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: album.title,
                text: `Check out "${album.title}" on Adventure Log!`,
                url: typeof window !== 'undefined' ? window.location.href : ''
              }).catch(() => {})
            } else {
              if (typeof window !== 'undefined') {
                navigator.clipboard.writeText(window.location.href)
                toast.success('Link copied!')
              }
            }
          }}
          className="flex flex-col items-center gap-1.5 py-3 rounded-xl hover:bg-gray-50 transition-colors text-gray-600"
          whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
          whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
          transition={transitions.snap}
        >
          <Share2 className="h-5 w-5" />
          <span className="text-xs font-medium">Share</span>
        </motion.button>

        {/* Globe Button */}
        {album.latitude && album.longitude && (
          <motion.button
            onClick={onGlobeClick}
            className="flex flex-col items-center gap-1.5 py-3 rounded-xl hover:bg-teal-50 transition-colors text-gray-600 hover:text-teal-600"
            whileHover={prefersReducedMotion ? {} : { scale: 1.05, y: -2 }}
            whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
            transition={transitions.snap}
          >
            <Globe className="h-5 w-5" />
            <span className="text-xs font-medium whitespace-nowrap">Globe</span>
          </motion.button>
        )}
      </motion.div>
    </motion.div>
  )
}
