'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
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
      <div className={cn("space-y-6", className)}>
        <h2 className="text-2xl font-semibold text-gray-900">
          More from {username}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <h2 className="text-2xl font-semibold text-gray-900">
        More from {username}
      </h2>

      {/* Albums Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {albums.slice(0, 4).map((album) => (
          <AlbumCard key={album.id} album={album} />
        ))}
      </div>

      {albums.length > 4 && (
        <div className="text-center">
          <Link href={`/profile/${userId}`}>
            <Button variant="outline" className="rounded-full">
              View All Albums
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
