'use client'

import { Button } from '@/components/ui/button'
import { Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLikes } from '@/lib/hooks/useSocial'

interface LikeButtonProps {
  albumId?: string
  photoId?: string
  showCount?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LikeButton({
  albumId,
  photoId,
  showCount = true,
  size = 'md',
  className
}: LikeButtonProps) {
  const { isLiked, likesCount, loading, toggleLike } = useLikes(albumId, photoId)

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    await toggleLike()
  }

  const sizes = {
    sm: 'h-8 px-2 text-xs',
    md: 'h-9 px-3 text-sm',
    lg: 'h-10 px-4 text-base'
  }

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  }

  return (
    <Button
      variant={isLiked ? "default" : "outline"}
      size="sm"
      className={cn(
        sizes[size],
        isLiked ? "bg-red-500 hover:bg-red-600 text-white" : "hover:bg-red-50 hover:text-red-600",
        className
      )}
      onClick={handleClick}
      disabled={loading}
    >
      <Heart
        className={cn(
          iconSizes[size],
          showCount && "mr-1",
          isLiked && "fill-current"
        )}
      />
      {showCount && <span>{likesCount}</span>}
    </Button>
  )
}