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
      } else {
        newSet.add(postId)
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
      } else {
        newSet.add(postId)
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

  return (
    <div
      ref={scrollRef}
      className="min-h-screen bg-gray-50 overflow-auto"
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
              'h-6 w-6 text-gray-600',
              isPulling && 'animate-spin'
            )}
          />
          <span className="text-xs text-gray-600 mt-1">
            {isPulling ? 'Release to refresh' : 'Pull to refresh'}
          </span>
        </div>
      </motion.div>

      {/* Instagram-style Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 bg-clip-text text-transparent">
                Adventure Feed
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
                <RefreshCw className={cn('h-5 w-5', isRefreshing && 'animate-spin')} />
              </Button>
              <Link href="/albums/new">
                <Button variant="ghost" size="sm">
                  <Plus className="h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stories Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex gap-4 overflow-x-auto scrollbar-hide">
            {/* Add Your Story */}
            <div className="flex flex-col items-center gap-2 min-w-[80px]">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center border-2 border-gray-300">
                  <Plus className="h-6 w-6 text-gray-600" />
                </div>
              </div>
              <span className="text-xs text-gray-700 text-center">Your Story</span>
            </div>

            {/* Other Stories */}
            {storiesData.map((story) => (
              <motion.div
                key={story.id}
                className="flex flex-col items-center gap-2 min-w-[80px] cursor-pointer"
                whileTap={{ scale: 0.95 }}
                onClick={() => handleStoryClick(story.id)}
              >
                <div className="relative">
                  <motion.div
                    className={cn(
                      "w-16 h-16 rounded-full p-0.5 transition-all duration-200",
                      story.hasNewStory && !story.isViewed
                        ? "bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600"
                        : "bg-gradient-to-tr from-gray-300 to-gray-400"
                    )}
                    whileHover={{ scale: 1.05 }}
                  >
                    <Avatar className="w-full h-full border-2 border-white">
                      <AvatarImage src={story.user.avatar} alt={story.user.name} />
                      <AvatarFallback>{story.user.name[0]}</AvatarFallback>
                    </Avatar>
                  </motion.div>
                </div>
                <span className="text-xs text-gray-700 text-center truncate w-16">{story.user.name}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Feed Container */}
      <div className="max-w-lg mx-auto bg-white lg:max-w-2xl xl:max-w-3xl pb-safe">
        <AnimatePresence>
          {filteredFeed.map((activity, index) => (
            <motion.div
              key={activity.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="border-b border-gray-200 bg-white"
            >
              {/* Post Header */}
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={activity.user.avatar} alt={activity.user.name} />
                    <AvatarFallback>
                      {activity.user.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <Link
                      href={`/profile/${activity.user.username}`}
                      className="font-semibold text-sm text-gray-900 hover:text-blue-600 transition-colors"
                    >
                      {activity.user.username}
                    </Link>
                    {activity.content.location && (
                      <div className="flex items-center gap-1 text-xs text-gray-800">
                        <MapPin className="h-3 w-3" />
                        {activity.content.location}
                      </div>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </div>

              {/* Post Image */}
              {activity.content.imageUrl && (
                <div
                  className="relative aspect-square bg-gray-100 select-none"
                  onDoubleClick={() => handleDoubleTap(activity.id)}
                >
                  <Image
                    src={activity.content.imageUrl}
                    alt={activity.content.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 512px) 100vw, 512px"
                  />

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
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleLike(activity.id)}
                    className="p-0 h-auto hover:bg-transparent"
                  >
                    <Heart className={cn(
                      'h-6 w-6 transition-all',
                      (likedPosts.has(activity.id) || activity.engagement.userLiked)
                        ? 'fill-red-500 text-red-500 scale-110'
                        : 'text-gray-900 hover:text-gray-600'
                    )} />
                  </Button>
                  <Button variant="ghost" size="sm" className="p-0 h-auto hover:bg-transparent">
                    <MessageCircle className="h-6 w-6 text-gray-900 hover:text-gray-600" />
                  </Button>
                  <Button variant="ghost" size="sm" className="p-0 h-auto hover:bg-transparent">
                    <Share2 className="h-6 w-6 text-gray-900 hover:text-gray-600" />
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleBookmark(activity.id)}
                  className="p-0 h-auto hover:bg-transparent"
                >
                  <Bookmark className={cn(
                    'h-6 w-6 transition-all',
                    (bookmarkedPosts.has(activity.id) || activity.engagement.userBookmarked)
                      ? 'fill-gray-900 text-gray-900'
                      : 'text-gray-900 hover:text-gray-600'
                  )} />
                </Button>
              </div>

              {/* Like Count */}
              <div className="px-4 pb-2">
                <span className="font-semibold text-sm text-gray-900">
                  {activity.engagement.likes + (likedPosts.has(activity.id) ? 1 : 0)} likes
                </span>
              </div>

              {/* Caption */}
              <div className="px-4 pb-2">
                <div className="text-sm">
                  <Link
                    href={`/profile/${activity.user.username}`}
                    className="font-semibold text-gray-900 hover:text-blue-600"
                  >
                    {activity.user.username}
                  </Link>
                  <span className="text-gray-900 ml-2">{activity.content.description}</span>
                </div>
              </div>

              {/* Comments Preview */}
              {activity.engagement.comments > 0 && (
                <div className="px-4 pb-2">
                  <button className="text-sm text-gray-800 hover:text-gray-600">
                    View all {activity.engagement.comments} comments
                  </button>
                </div>
              )}

              {/* Timestamp */}
              <div className="px-4 pb-4">
                <span className="text-xs text-gray-800 uppercase">
                  {getTimeAgo(activity.timestamp)}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Empty State */}
        {filteredFeed.length === 0 && (
          <div className="text-center py-16 px-8">
            <Camera className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Welcome to Adventure Feed!
            </h3>
            <p className="text-gray-600 mb-6">
              Start sharing your travel adventures or follow other travelers to see their posts here.
            </p>
            <Link href="/albums/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Share Your First Adventure
              </Button>
            </Link>
          </div>
        )}
      </div>

    </div>
  )
}