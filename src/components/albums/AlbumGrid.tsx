'use client'

import { Album } from '@/types/database'
import { AlbumCard } from './AlbumCard'
import { SimpleAlbumCard } from './SimpleAlbumCard'
import { Camera } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AlbumGridProps {
  albums: Album[]
  columns?: 2 | 3 | 4
  emptyMessage?: string
  emptyIcon?: React.ReactNode
  className?: string
  useSimpleCard?: boolean
}

export function AlbumGrid({
  albums,
  columns = 4,
  emptyMessage = "No albums yet",
  emptyIcon,
  className,
  useSimpleCard = false
}: AlbumGridProps) {
  if (albums.length === 0) {
    return (
      <div className="text-center py-12">
        {emptyIcon || <Camera className="h-16 w-16 mx-auto text-gray-300 mb-3" />}
        <p className="text-gray-600">{emptyMessage}</p>
      </div>
    )
  }

  const gridClasses = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-2 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
  }

  const CardComponent = useSimpleCard ? SimpleAlbumCard : AlbumCard

  return (
    <div className={cn(
      "grid gap-6",
      gridClasses[columns],
      className
    )}>
      {albums.map((album) => (
        <CardComponent key={album.id} album={album} />
      ))}
    </div>
  )
}
