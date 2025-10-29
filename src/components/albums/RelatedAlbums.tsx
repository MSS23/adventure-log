'use client'

import { useState, useEffect } from 'react'
import { Album } from '@/types/database'
import { AlbumCard } from './AlbumCard'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { log } from '@/lib/utils/logger'

interface RelatedAlbumsProps {
  userId: string
  currentAlbumId: string
  username: string
  className?: string
}

export function RelatedAlbums({
  userId,
  currentAlbumId,
  username,
  className
}: RelatedAlbumsProps) {
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const [scrollPosition, setScrollPosition] = useState(0)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    const fetchRelatedAlbums = async () => {
      try {
        setLoading(true)

        const { data, error } = await supabase
          .from('albums')
          .select('*')
          .eq('user_id', userId)
          .neq('id', currentAlbumId)
          .order('created_at', { ascending: false })
          .limit(8)

        if (error) throw error

        setAlbums(data || [])
      } catch (err) {
        log.error('Failed to fetch related albums', {
          component: 'RelatedAlbums',
          action: 'fetchRelatedAlbums',
          userId,
          currentAlbumId
        }, err instanceof Error ? err : new Error(String(err)))
      } finally {
        setLoading(false)
      }
    }

    if (userId) {
      fetchRelatedAlbums()
    }
  }, [userId, currentAlbumId, supabase])

  const handleScroll = (direction: 'left' | 'right') => {
    const container = document.getElementById('related-albums-scroll')
    if (!container) return

    const scrollAmount = 320 // Width of card + gap
    const newPosition = direction === 'left'
      ? Math.max(0, scrollPosition - scrollAmount)
      : scrollPosition + scrollAmount

    container.scrollTo({
      left: newPosition,
      behavior: 'smooth'
    })
  }

  const updateScrollButtons = () => {
    const container = document.getElementById('related-albums-scroll')
    if (!container) return

    setCanScrollLeft(container.scrollLeft > 0)
    setCanScrollRight(
      container.scrollLeft < container.scrollWidth - container.clientWidth - 10
    )
    setScrollPosition(container.scrollLeft)
  }

  useEffect(() => {
    const container = document.getElementById('related-albums-scroll')
    if (!container) return

    updateScrollButtons()

    container.addEventListener('scroll', updateScrollButtons)
    window.addEventListener('resize', updateScrollButtons)

    return () => {
      container.removeEventListener('scroll', updateScrollButtons)
      window.removeEventListener('resize', updateScrollButtons)
    }
  }, [albums])

  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        <h2 className="text-2xl font-semibold text-gray-900">
          More from {username}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="aspect-square bg-gray-200 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      </div>
    )
  }

  if (albums.length === 0) {
    return null
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">
          More from {username}
        </h2>
        {albums.length > 4 && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={() => handleScroll('left')}
              disabled={!canScrollLeft}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={() => handleScroll('right')}
              disabled={!canScrollRight}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>

      {/* Albums Carousel */}
      <div className="relative">
        <div
          id="related-albums-scroll"
          className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {albums.map((album) => (
            <div
              key={album.id}
              className="flex-shrink-0 w-72"
            >
              <AlbumCard album={album} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
