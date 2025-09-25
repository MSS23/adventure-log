'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity,
  Camera,
  Heart,
  MessageCircle,
  Share2,
  MapPin,
  Users,
  Globe,
  Bookmark,
  UserPlus,
  Award,
  TrendingUp,
  Search,
  RefreshCw
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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

// Feed data will come from real API calls - no mock data
const feedData: FeedActivity[] = []

type FeedFilter = 'all' | 'following' | 'photos' | 'albums' | 'achievements'

export default function FeedPage() {
  const [activeFilter, setActiveFilter] = useState<FeedFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const filteredFeed = feedData
    .filter(activity => {
      if (activeFilter === 'all') return true
      if (activeFilter === 'following') return true // Mock: show all for now
      if (activeFilter === 'photos') return activity.type === 'photo_upload'
      if (activeFilter === 'albums') return activity.type === 'album_create'
      if (activeFilter === 'achievements') return activity.type === 'achievement'
      return true
    })
    .filter(activity => {
      if (!searchQuery) return true
      return (
        activity.content.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.content.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.content.location?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    })

  const handleRefresh = async () => {
    setIsRefreshing(true)
    // Simulate refresh
    setTimeout(() => setIsRefreshing(false), 1500)
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'photo_upload': return <Camera className="h-4 w-4 text-blue-600" />
      case 'album_create': return <MapPin className="h-4 w-4 text-green-600" />
      case 'location_visit': return <Globe className="h-4 w-4 text-purple-600" />
      case 'like': return <Heart className="h-4 w-4 text-red-600" />
      case 'comment': return <MessageCircle className="h-4 w-4 text-gray-800" />
      case 'follow': return <UserPlus className="h-4 w-4 text-blue-600" />
      case 'achievement': return <Award className="h-4 w-4 text-yellow-600" />
      default: return <Activity className="h-4 w-4 text-gray-800" />
    }
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Activity className="h-8 w-8 text-blue-600" />
            Activity Feed
          </h1>
          <p className="text-gray-800 mt-2">
            See what your fellow travelers are up to around the world
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            Refresh
          </Button>
          <Button>
            <Users className="h-4 w-4 mr-2" />
            Find Friends
          </Button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-700" />
          <Input
            placeholder="Search activities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs value={activeFilter} onValueChange={(value) => setActiveFilter(value as FeedFilter)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="following">Following</TabsTrigger>
            <TabsTrigger value="photos">Photos</TabsTrigger>
            <TabsTrigger value="albums">Albums</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Feed */}
        <div className="lg:col-span-2 space-y-6">
          <AnimatePresence>
            {filteredFeed.map((activity, index) => (
              <motion.div
                key={activity.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Card className="group hover:shadow-lg transition-all duration-300">
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={activity.user.avatar} alt={activity.user.name} />
                        <AvatarFallback>
                          {activity.user.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getActivityIcon(activity.type)}
                          <Link
                            href={`/profile/${activity.user.username}`}
                            className="font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                          >
                            {activity.user.name}
                          </Link>
                          <span className="text-gray-800">@{activity.user.username}</span>
                          <div className="text-sm text-gray-800">
                            {getTimeAgo(activity.timestamp)}
                          </div>
                        </div>

                        <h3 className="font-medium text-gray-900 mb-1">
                          {activity.content.title}
                          {activity.content.targetUser && (
                            <Link
                              href={`/profile/${activity.content.targetUser.username}`}
                              className="text-blue-600 hover:text-blue-700 ml-1"
                            >
                              {activity.content.targetUser.name}
                            </Link>
                          )}
                        </h3>

                        {activity.content.description && (
                          <p className="text-gray-800 text-sm mb-2">
                            {activity.content.description}
                          </p>
                        )}

                        {activity.content.location && (
                          <div className="flex items-center gap-1 text-sm text-gray-800 mb-2">
                            <MapPin className="h-3 w-3" />
                            {activity.content.location}
                          </div>
                        )}

                        {activity.content.achievementType && activity.content.metadata && (
                          <div className="flex items-center gap-3 text-sm text-gray-800 mb-2">
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                              {activity.content.metadata.countriesVisited as number} Countries
                            </Badge>
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                              {activity.content.metadata.totalPhotos as number} Photos
                            </Badge>
                          </div>
                        )}
                      </div>

                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>

                  {/* Activity Image */}
                  {activity.content.imageUrl && (
                    <div className="px-6 pb-4">
                      <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
                        <Image
                          src={activity.content.imageUrl}
                          alt={activity.content.title}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                    </div>
                  )}

                  {/* Engagement */}
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            'flex items-center gap-2 transition-colors',
                            activity.engagement.userLiked
                              ? 'text-red-600 hover:text-red-700'
                              : 'text-gray-800 hover:text-red-600'
                          )}
                        >
                          <Heart className={cn('h-4 w-4', activity.engagement.userLiked && 'fill-current')} />
                          <span className="text-sm">{activity.engagement.likes}</span>
                        </Button>

                        <Button variant="ghost" size="sm" className="flex items-center gap-2 text-gray-800 hover:text-blue-600">
                          <MessageCircle className="h-4 w-4" />
                          <span className="text-sm">{activity.engagement.comments}</span>
                        </Button>

                        <Button variant="ghost" size="sm" className="flex items-center gap-2 text-gray-800 hover:text-green-600">
                          <Share2 className="h-4 w-4" />
                          <span className="text-sm">{activity.engagement.shares}</span>
                        </Button>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          'transition-colors',
                          activity.engagement.userBookmarked
                            ? 'text-yellow-600 hover:text-yellow-700'
                            : 'text-gray-700 hover:text-yellow-600'
                        )}
                      >
                        <Bookmark className={cn('h-4 w-4', activity.engagement.userBookmarked && 'fill-current')} />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Empty State */}
          {filteredFeed.length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <Activity className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {searchQuery || activeFilter !== 'all' ? 'No activities found' : 'Your feed is quiet'}
                  </h3>
                  <p className="text-gray-800 mb-6">
                    {searchQuery || activeFilter !== 'all'
                      ? 'Try adjusting your search or filters'
                      : 'Follow some travelers to see their adventures here!'
                    }
                  </p>
                  <Button>
                    <Users className="h-4 w-4 mr-2" />
                    Discover Travelers
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Trending Locations */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-orange-600" />
                Trending Destinations
              </h3>
            </CardHeader>
            <CardContent>
              <div className="text-center py-6">
                <p className="text-gray-800">Trending destinations will appear here as users share their adventures.</p>
              </div>
            </CardContent>
          </Card>

          {/* Suggested Users */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                Suggested for You
              </h3>
            </CardHeader>
            <CardContent>
              <div className="text-center py-6">
                <p className="text-gray-800">Friend suggestions will appear here based on your travel interests.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}