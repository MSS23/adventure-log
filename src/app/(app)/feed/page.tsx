'use client'

import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Camera,
  Heart,
  MessageCircle,
  Share2,
  MapPin,
  Bookmark,
  RefreshCw,
  MoreHorizontal,
  Plus
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { instagramStyles } from '@/lib/design-tokens'
import { Native } from '@/lib/utils/native'
import { Platform } from '@/lib/utils/platform'
import { Haptics } from '@/lib/utils/haptics'
import Link from 'next/link'
import Image from 'next/image'

interface FeedActivity {
  id: string
  type: 'photo_upload' | 'album_create' | 'location_visit' | 'like' | 'comment' | 'follow' | 'achievement'
  userId: string
  user: {
    id: string
    name: string
    username: string
    avatar?: string
  }
  timestamp: string
  content: {
    title: string
    description?: string
    imageUrl?: string
    location?: string
    albumId?: string
    photoId?: string
    targetUser?: {
      id: string
      name: string
      username: string
    }
    achievementType?: string
    metadata?: Record<string, unknown>
  }
  engagement: {
    likes: number
    comments: number
    shares: number
    userLiked: boolean
    userBookmarked: boolean
  }
}

// Instagram-style mock data for demonstration
const feedData: FeedActivity[] = [
  {
    id: '1',
    type: 'photo_upload',
    userId: 'user1',
    user: {
      id: 'user1',
      name: 'Sarah Chen',
      username: 'sarahwanders',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b547?w=64&h=64&fit=crop&crop=face'
    },
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
    content: {
      title: 'Sunrise over Santorini',
      description: 'Woke up at 5am for this incredible view! The blue domes and white buildings never get old 🌅',
      imageUrl: 'https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?w=800&h=800&fit=crop',
      location: 'Santorini, Greece'
    },
    engagement: {
      likes: 124,
      comments: 18,
      shares: 7,
      userLiked: false,
      userBookmarked: true
    }
  },
  {
    id: '2',
    type: 'photo_upload',
    userId: 'user2',
    user: {
      id: 'user2',
      name: 'Marco Rodriguez',
      username: 'marcoexplores',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=64&h=64&fit=crop&crop=face'
    },
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    content: {
      title: 'Street food adventure in Tokyo',
      description: 'Best ramen I\'ve ever had! This tiny shop in Shibuya has been family-owned for 50 years 🍜',
      imageUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&h=800&fit=crop',
      location: 'Shibuya, Tokyo'
    },
    engagement: {
      likes: 89,
      comments: 12,
      shares: 3,
      userLiked: true,
      userBookmarked: false
    }
  },
  {
    id: '3',
    type: 'photo_upload',
    userId: 'user3',
    user: {
      id: 'user3',
      name: 'Emma Johnson',
      username: 'emmadventures',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=64&h=64&fit=crop&crop=face'
    },
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(), // 6 hours ago
    content: {
      title: 'Alpine hiking bliss',
      description: 'Three days hiking through the Swiss Alps. My legs are tired but my soul is full! 🏔️',
      imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=800&fit=crop',
      location: 'Swiss Alps, Switzerland'
    },
    engagement: {
      likes: 156,
      comments: 23,
      shares: 11,
      userLiked: false,
      userBookmarked: false
    }
  },
  {
    id: '4',
    type: 'photo_upload',
    userId: 'user4',
    user: {
      id: 'user4',
      name: 'Alex Kim',
      username: 'alexcaptures',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=64&h=64&fit=crop&crop=face'
    },
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(), // 12 hours ago
    content: {
      title: 'Northern Lights magic',
      description: 'Spent 3 hours in -20°C weather but it was worth every frozen minute! Nature\'s own light show ✨',
      imageUrl: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=800&h=800&fit=crop',
      location: 'Tromsø, Norway'
    },
    engagement: {
      likes: 201,
      comments: 31,
      shares: 15,
      userLiked: true,
      userBookmarked: true
    }
  },
  {
    id: '5',
    type: 'photo_upload',
    userId: 'user5',
    user: {
      id: 'user5',
      name: 'Maya Patel',
      username: 'mayamoves',
      avatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=64&h=64&fit=crop&crop=face'
    },
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(), // 18 hours ago
    content: {
      title: 'Bali temple sunrise',
      description: 'Early morning meditation at Pura Lempuyang. The crowds haven\'t arrived yet and it\'s pure serenity 🙏',
      imageUrl: 'https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?w=800&h=800&fit=crop',
      location: 'Bali, Indonesia'
    },
    engagement: {
      likes: 178,
      comments: 22,
      shares: 9,
      userLiked: false,
      userBookmarked: false
    }
  },
  {
    id: '6',
    type: 'photo_upload',
    userId: 'user6',
    user: {
      id: 'user6',
      name: 'James Wilson',
      username: 'jamesjourneys',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=64&h=64&fit=crop&crop=face'
    },
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    content: {
      title: 'Safari sunset',
      description: 'Nothing prepares you for seeing elephants in the wild. This matriarch led her family right past our jeep 🐘',
      imageUrl: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&h=800&fit=crop',
      location: 'Maasai Mara, Kenya'
    },
    engagement: {
      likes: 267,
      comments: 45,
      shares: 22,
      userLiked: true,
      userBookmarked: true
    }
  }
]

// Stories data for Instagram-style stories section
const storiesData = [
  {
    id: 'story1',
    user: {
      id: 'user1',
      name: 'Sarah',
      username: 'sarahwanders',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b547?w=64&h=64&fit=crop&crop=face'
    },
    hasNewStory: true,
    isViewed: false
  },
  {
    id: 'story2',
    user: {
      id: 'user2',
      name: 'Marco',
      username: 'marcoexplores',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=64&h=64&fit=crop&crop=face'
    },
    hasNewStory: true,
    isViewed: true
  },
  {
    id: 'story3',
    user: {
      id: 'user3',
      name: 'Emma',
      username: 'emmadventures',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=64&h=64&fit=crop&crop=face'
    },
    hasNewStory: true,
    isViewed: false
  },
  {
    id: 'story4',
    user: {
      id: 'user4',
      name: 'Alex',
      username: 'alexcaptures',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=64&h=64&fit=crop&crop=face'
    },
    hasNewStory: true,
    isViewed: false
  }
]

export default function FeedPage() {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Set<string>>(new Set())
  const [showHeartAnimation, setShowHeartAnimation] = useState<string | null>(null)
  const [pullDistance, setPullDistance] = useState(0)
  const [isPulling, setIsPulling] = useState(false)
  const touchStartY = useRef(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Instagram-style double-tap to like
  const handleDoubleTap = useCallback((postId: string) => {
    setLikedPosts(prev => new Set(prev).add(postId))
    setShowHeartAnimation(postId)
    setTimeout(() => setShowHeartAnimation(null), 1000)
  }, [])

  // Toggle like state
  const toggleLike = useCallback((postId: string) => {
    setLikedPosts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(postId)) {
        newSet.delete(postId)
        // Light haptic feedback for unlike
        Haptics.light()
      } else {
        newSet.add(postId)
        // Impact haptic feedback for like action
        Haptics.impact()
      }
      return newSet
    })
  }, [])

  // Toggle bookmark state
  const toggleBookmark = useCallback((postId: string) => {
    setBookmarkedPosts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(postId)) {
        newSet.delete(postId)
        // Light haptic feedback for removing bookmark
        Haptics.light()
      } else {
        newSet.add(postId)
        // Selection haptic feedback for bookmarking
        Haptics.selection()
      }
      return newSet
    })
  }, [])

  const filteredFeed = feedData

  const handleRefresh = async () => {
    setIsRefreshing(true)
    // Simulate refresh
    setTimeout(() => {
      setIsRefreshing(false)
      setPullDistance(0)
      setIsPulling(false)
    }, 1500)
  }

  // Pull-to-refresh functionality
  const handleTouchStart = (e: React.TouchEvent) => {
    if (scrollRef.current?.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (scrollRef.current?.scrollTop === 0 && !isRefreshing) {
      const currentY = e.touches[0].clientY
      const distance = Math.max(0, currentY - touchStartY.current)

      if (distance > 0) {
        e.preventDefault()
        setPullDistance(Math.min(distance * 0.5, 80))
        setIsPulling(distance > 60)
      }
    }
  }

  const handleTouchEnd = () => {
    if (pullDistance > 60 && !isRefreshing) {
      handleRefresh()
    } else {
      setPullDistance(0)
      setIsPulling(false)
    }
  }

  // Enhanced story interaction
  const handleStoryClick = (storyId: string) => {
    // Simulate story viewing
    console.log('Opening story:', storyId)
  }

  const getTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  // Share post function
  const handleSharePost = async (activity: FeedActivity) => {
    try {
      // Light haptic feedback for share action
      Haptics.light()

      const shareTitle = `${activity.user.name}'s Adventure`
      const shareText = `Check out this adventure from ${activity.user.username}: ${activity.content.title}${activity.content.description ? ' - ' + activity.content.description.substring(0, 100) + '...' : ''}`
      const shareUrl = `${window.location.origin}/profile/${activity.user.username}`

      if (Platform.isCapabilityAvailable('share')) {
        await Native.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl
        })
        // Success haptic feedback after successful share
        Haptics.success()
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(`${shareText} ${shareUrl}`)
        await Native.showToast('Post link copied to clipboard!')
        // Medium haptic feedback for clipboard copy
        Haptics.medium()
      }
    } catch (error) {
      console.error('Failed to share post:', error)
      await Native.showToast('Failed to share post. Please try again.')
      // Error haptic feedback for failed share
      Haptics.error()
    }
  }

  return (
    <div
      ref={scrollRef}
      className={cn("min-h-screen overflow-auto", instagramStyles.layout.container)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      <motion.div
        initial={{ opacity: 0, y: -40 }}
        animate={{
          opacity: pullDistance > 0 ? 1 : 0,
          y: pullDistance > 0 ? pullDistance - 40 : -40
        }}
        className="absolute top-0 left-1/2 transform -translate-x-1/2 z-50 pt-4"
      >
        <div className="flex flex-col items-center">
          <RefreshCw
            className={cn(
              'h-6 w-6 text-gray-600 dark:text-gray-400',
              isPulling && 'animate-spin'
            )}
          />
          <span className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {isPulling ? 'Release to refresh' : 'Pull to refresh'}
          </span>
        </div>
      </motion.div>

      {/* Professional Header */}
      <div className="sticky top-0 z-40 bg-white/98 dark:bg-gray-900/98 backdrop-blur-lg border-b border-gray-200/30 dark:border-gray-700/30">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent">
                Adventure Feed
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className={cn("rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200", instagramStyles.interactive.touchTarget)}
              >
                <RefreshCw className={cn('h-4 w-4 text-gray-600 dark:text-gray-400', isRefreshing && 'animate-spin')} />
              </Button>
              <Link href="/albums/new">
                <Button
                  size="sm"
                  className="h-8 px-3 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 text-sm font-semibold"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Share
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stories Section */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100/50 dark:border-gray-800/50">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex gap-4 overflow-x-auto scrollbar-hide">
            {/* Add Your Story */}
            <div className="flex flex-col items-center gap-2 min-w-[68px] group cursor-pointer">
              <div className="relative transition-transform duration-200 group-hover:scale-105">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-500 group-hover:border-pink-400 dark:group-hover:border-pink-400 transition-colors duration-200">
                  <Plus className="h-5 w-5 text-gray-500 dark:text-gray-400 group-hover:text-pink-500 dark:group-hover:text-pink-400 transition-colors duration-200" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg">
                  <Plus className="h-3 w-3 text-white" />
                </div>
              </div>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center group-hover:text-pink-500 dark:group-hover:text-pink-400 transition-colors duration-200">Your Story</span>
            </div>

            {/* Other Stories */}
            {storiesData.map((story) => (
              <motion.div
                key={story.id}
                className="flex flex-col items-center gap-3 min-w-[80px] cursor-pointer group"
                whileTap={{ scale: 0.95 }}
                onClick={() => handleStoryClick(story.id)}
              >
                <div className="relative">
                  <motion.div
                    className={cn(
                      "w-16 h-16 rounded-full p-0.5 transition-all duration-300",
                      story.hasNewStory && !story.isViewed
                        ? "bg-gradient-to-tr from-pink-500 via-purple-500 to-indigo-500 shadow-lg"
                        : "bg-gradient-to-tr from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-500"
                    )}
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    <Avatar className="w-full h-full border-3 border-white dark:border-gray-900 shadow-sm">
                      <AvatarImage src={story.user.avatar} alt={story.user.name} />
                      <AvatarFallback className="bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 text-indigo-700 dark:text-indigo-300 font-semibold">
                        {story.user.name[0]}
                      </AvatarFallback>
                    </Avatar>
                  </motion.div>
                  {story.hasNewStory && !story.isViewed && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white dark:border-gray-900"></div>
                  )}
                </div>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center truncate w-16 group-hover:text-pink-500 dark:group-hover:text-pink-400 transition-colors duration-200">
                  {story.user.name}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Feed Container */}
      <div className="max-w-lg mx-auto bg-gray-50/30 dark:bg-gray-950/30 pb-safe">
        <AnimatePresence>
          {filteredFeed.map((activity, index) => (
            <motion.div
              key={activity.id}
              layout
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -30, scale: 0.95 }}
              transition={{
                duration: 0.4,
                delay: index * 0.1,
                ease: [0.25, 0.25, 0, 1]
              }}
              className="bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-shadow duration-300 mb-0 mx-0 overflow-hidden border-0 border-b border-gray-100 dark:border-gray-800"
            >
              {/* Post Header */}
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-8 w-8 ring-0">
                      <AvatarImage src={activity.user.avatar} alt={activity.user.name} />
                      <AvatarFallback className="bg-gradient-to-br from-pink-100 to-purple-100 dark:from-pink-900 dark:to-purple-900 text-pink-700 dark:text-pink-300 font-semibold text-xs">
                        {activity.user.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/profile/${activity.user.username}`}
                      className="font-semibold text-sm text-gray-900 dark:text-white hover:text-pink-600 dark:hover:text-pink-400 transition-colors duration-200 block"
                    >
                      {activity.user.username}
                    </Link>
                    {activity.content.location && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        <MapPin className="h-3 w-3 text-gray-400 dark:text-gray-500" />
                        <span className="truncate">{activity.content.location}</span>
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn("rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200", instagramStyles.interactive.touchTarget)}
                >
                  <MoreHorizontal className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                </Button>
              </div>

              {/* Post Image */}
              {activity.content.imageUrl && (
                <div
                  className="relative aspect-square bg-gray-100 dark:bg-gray-800 select-none cursor-pointer group overflow-hidden"
                  onDoubleClick={() => handleDoubleTap(activity.id)}
                >
                  <Image
                    src={activity.content.imageUrl}
                    alt={activity.content.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  {/* Double-tap heart animation */}
                  <AnimatePresence>
                    {showHeartAnimation === activity.id && (
                      <motion.div
                        initial={{ scale: 0, opacity: 1 }}
                        animate={{ scale: 1.2, opacity: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1 }}
                        className="absolute inset-0 flex items-center justify-center pointer-events-none"
                      >
                        <Heart className="h-20 w-20 text-white fill-red-500 drop-shadow-lg" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleLike(activity.id)}
                    className={cn("hover:bg-transparent group", instagramStyles.interactive.touchTarget)}
                  >
                    <Heart className={cn(
                      'h-6 w-6 transition-all duration-200',
                      (likedPosts.has(activity.id) || activity.engagement.userLiked)
                        ? 'fill-red-500 text-red-500 scale-105'
                        : 'text-gray-700 dark:text-gray-300 group-hover:text-red-500 dark:group-hover:text-red-400 group-hover:scale-105'
                    )} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn("hover:bg-transparent group", instagramStyles.interactive.touchTarget)}
                  >
                    <MessageCircle className="h-6 w-6 text-gray-700 dark:text-gray-300 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-all duration-200 group-hover:scale-105" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSharePost(activity)}
                    className={cn("hover:bg-transparent group", instagramStyles.interactive.touchTarget)}
                  >
                    <Share2 className="h-6 w-6 text-gray-700 dark:text-gray-300 group-hover:text-green-500 dark:group-hover:text-green-400 transition-all duration-200 group-hover:scale-105" />
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleBookmark(activity.id)}
                  className={cn("hover:bg-transparent group", instagramStyles.interactive.touchTarget)}
                >
                  <Bookmark className={cn(
                    'h-6 w-6 transition-all duration-200',
                    (bookmarkedPosts.has(activity.id) || activity.engagement.userBookmarked)
                      ? 'fill-amber-500 text-amber-500 scale-105'
                      : 'text-gray-700 dark:text-gray-300 group-hover:text-amber-500 dark:group-hover:text-amber-400 group-hover:scale-105'
                  )} />
                </Button>
              </div>

              {/* Like Count */}
              <div className="px-3 pb-1">
                <span className="font-semibold text-sm text-gray-900 dark:text-white">
                  {activity.engagement.likes + (likedPosts.has(activity.id) ? 1 : 0)} likes
                </span>
              </div>

              {/* Caption */}
              <div className="px-3 pb-2">
                <div className="text-sm leading-relaxed">
                  <Link
                    href={`/profile/${activity.user.username}`}
                    className="font-semibold text-gray-900 dark:text-white hover:text-pink-600 dark:hover:text-pink-400 transition-colors duration-200"
                  >
                    {activity.user.username}
                  </Link>
                  <span className="text-gray-800 dark:text-gray-200 ml-2">{activity.content.description}</span>
                </div>
              </div>

              {/* Comments Preview */}
              {activity.engagement.comments > 0 && (
                <div className="px-3 pb-1">
                  <button className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors duration-200">
                    View all {activity.engagement.comments} comments
                  </button>
                </div>
              )}

              {/* Timestamp */}
              <div className="px-3 pb-3">
                <span className="text-xs text-gray-400 dark:text-gray-500 font-medium tracking-wide uppercase">
                  {getTimeAgo(activity.timestamp)}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Empty State */}
        {filteredFeed.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.25, 0.25, 0, 1] }}
            className="text-center py-16 px-4"
          >
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 mx-auto max-w-sm">
              <div className="w-16 h-16 bg-gradient-to-br from-pink-100 to-purple-100 dark:from-pink-900/50 dark:to-purple-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Camera className="h-8 w-8 text-pink-600 dark:text-pink-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Welcome to Adventure Feed!
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm leading-relaxed">
                Start sharing your travel adventures to see them appear here.
              </p>
              <Link href="/albums/new">
                <Button className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white rounded-full px-6 py-2 shadow-lg hover:shadow-xl transition-all duration-200 text-sm font-semibold">
                  <Plus className="h-4 w-4 mr-2" />
                  Share Your First Adventure
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </div>

    </div>
  )
}