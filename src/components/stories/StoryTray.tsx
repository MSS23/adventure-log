'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { CreateStoryModal } from './CreateStoryModal'
import { StoryFeedItem } from '@/types/database'
import { getStoryFeed } from '@/app/(app)/stories/actions'
import { toast } from 'sonner'
import { Platform } from '@/lib/utils/platform'

export interface StoryTrayProps {
  onStoryClick: (stories: StoryFeedItem[], startIndex: number) => void
  className?: string
  showCreateButton?: boolean
}

export function StoryTray({ onStoryClick, className = "", showCreateButton = true }: StoryTrayProps) {
  const [stories, setStories] = useState<StoryFeedItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Load stories on mount
  useEffect(() => {
    loadStories()
  }, [])

  // Check scroll state
  useEffect(() => {
    checkScrollState()
  }, [stories])

  const loadStories = async () => {
    setIsLoading(true)
    try {
      const result = await getStoryFeed(undefined, 50, false) // Exclude own stories
      if (result.success && result.data) {
        setStories(result.data.stories)
      } else {
        console.error('Failed to load stories:', result.error)
        toast.error('Failed to load stories')
      }
    } catch (error) {
      console.error('Failed to load stories:', error)
      toast.error('Failed to load stories')
    } finally {
      setIsLoading(false)
    }
  }

  const checkScrollState = () => {
    const container = scrollContainerRef.current
    if (!container) return

    setCanScrollLeft(container.scrollLeft > 0)
    setCanScrollRight(
      container.scrollLeft < container.scrollWidth - container.clientWidth
    )
  }

  const scrollLeft = () => {
    const container = scrollContainerRef.current
    if (!container) return

    container.scrollBy({
      left: -200,
      behavior: 'smooth'
    })
  }

  const scrollRight = () => {
    const container = scrollContainerRef.current
    if (!container) return

    container.scrollBy({
      left: 200,
      behavior: 'smooth'
    })
  }

  const handleStoryClick = (clickedStory: StoryFeedItem) => {
    const storyIndex = stories.findIndex(story => story.id === clickedStory.id)
    if (storyIndex !== -1) {
      onStoryClick(stories, storyIndex)
    }
  }

  const getTimeUntilExpiry = (expiresAt: string) => {
    const now = new Date()
    const expiry = new Date(expiresAt)
    const diff = expiry.getTime() - now.getTime()

    if (diff <= 0) return 'Expired'

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 0) {
      return `${hours}h`
    } else {
      return `${minutes}m`
    }
  }

  if (isLoading) {
    return (
      <div className={`w-full ${className}`}>
        <div className="flex items-center gap-4 pb-2 mb-4 border-b">
          <h2 className="text-lg font-semibold">Stories</h2>
        </div>
        <div className="flex gap-3 overflow-hidden">
          {showCreateButton && (
            <div className="flex-shrink-0">
              <Skeleton className="w-16 h-16 rounded-full" />
              <Skeleton className="w-12 h-3 mt-2 mx-auto" />
            </div>
          )}
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex-shrink-0">
              <Skeleton className="w-16 h-16 rounded-full" />
              <Skeleton className="w-12 h-3 mt-2 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!isLoading && stories.length === 0) {
    return (
      <div className={`w-full ${className}`}>
        <div className="flex items-center gap-4 pb-2 mb-4 border-b">
          <h2 className="text-lg font-semibold">Stories</h2>
        </div>
        <div className="flex items-center gap-4">
          {showCreateButton && (
            <CreateStoryModal onStoryCreated={loadStories}>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex flex-col items-center cursor-pointer"
              >
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-primary to-primary/60 flex items-center justify-center text-white mb-2">
                  <Plus className="w-6 h-6" />
                </div>
                <span className="text-xs text-muted-foreground">Your Story</span>
              </motion.div>
            </CreateStoryModal>
          )}
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No stories available</p>
            <p className="text-xs">Check back later or create your own!</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between pb-2 mb-4 border-b">
        <h2 className="text-lg font-semibold">Stories</h2>
        {stories.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={scrollLeft}
              disabled={!canScrollLeft}
              className="w-8 h-8"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={scrollRight}
              disabled={!canScrollRight}
              className="w-8 h-8"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="relative">
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
          onScroll={checkScrollState}
        >
          {/* Create Story Button */}
          {showCreateButton && (
            <CreateStoryModal onStoryCreated={loadStories}>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex flex-col items-center cursor-pointer flex-shrink-0"
              >
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-primary to-primary/60 flex items-center justify-center text-white mb-2 ring-2 ring-offset-2 ring-primary/20">
                  <Plus className="w-6 h-6" />
                </div>
                <span className="text-xs text-muted-foreground text-center max-w-[64px] truncate">
                  Your Story
                </span>
              </motion.div>
            </CreateStoryModal>
          )}

          {/* Story Items */}
          {stories.map((story) => (
            <motion.div
              key={story.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex flex-col items-center cursor-pointer flex-shrink-0 relative"
              onClick={() => handleStoryClick(story)}
            >
              {/* Story Ring */}
              <div className="relative">
                <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-pink-500 via-purple-500 to-blue-500">
                  <div className="w-full h-full rounded-full bg-background p-[2px]">
                    <div className="relative w-full h-full rounded-full overflow-hidden">
                      <Image
                        src={story.image_url || story.media_url}
                        alt={`${story.user?.display_name || story.user?.username || 'User'}'s story`}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </div>
                  </div>
                </div>

                {/* Time remaining badge */}
                <div className="absolute -bottom-1 -right-1">
                  <Badge variant="secondary" className="text-xs px-1 py-0 h-5 min-w-[20px]">
                    {getTimeUntilExpiry(story.expires_at)}
                  </Badge>
                </div>

                {/* Viewed indicator (if implemented) */}
                {story.has_viewed && (
                  <div className="absolute inset-0 rounded-full bg-black/20 flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full bg-white/80 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-gray-600" />
                    </div>
                  </div>
                )}
              </div>

              {/* User info */}
              <div className="mt-2 text-center max-w-[80px]">
                <span className="text-xs text-muted-foreground truncate block">
                  {story.user?.display_name || story.user?.username || 'Unknown'}
                </span>
              </div>
            </motion.div>
          ))}

          {/* Spacer for better scrolling UX */}
          <div className="w-4 flex-shrink-0" />
        </div>

        {/* Gradient fade effects */}
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent pointer-events-none z-10" />
        )}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none z-10" />
        )}
      </div>

      {/* Mobile scroll hint */}
      {Platform.isNative() && stories.length > 4 && (
        <p className="text-xs text-muted-foreground text-center mt-2">
          Swipe to see more stories
        </p>
      )}
    </div>
  )
}