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
  showCount = false,
  size = 'md',
  className
}: LikeButtonProps) {
  const { isLiked, likesCount, toggleLike } = useLikes(albumId, photoId)

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Fire and forget - optimistic update makes it instant
    toggleLike()
  }

  const sizes = {
    sm: 'h-8 px-2 text-sm',
    md: 'h-9 px-3 text-sm',
    lg: 'h-10 px-4 text-base'
  }

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  }

  // Match the style of comment and globe buttons on feed
  if (!showCount) {
    return (
      <button
        onClick={handleClick}
        className={cn(
          "min-w-[44px] min-h-[44px] p-2.5 sm:p-2 -m-2 rounded-full transition-colors touch-manipulation flex items-center justify-center",
          isLiked ? "hover:bg-red-100 active:bg-red-200" : "hover:bg-gray-100 active:bg-gray-200",
          className
        )}
      >
        <Heart
          className={cn(
            "h-5 w-5 sm:h-6 sm:w-6 transition-all duration-200",
            isLiked ? "fill-red-500 text-red-500" : "text-gray-900"
          )}
          strokeWidth={1.5}
        />
      </button>
    )
  }

  // With count - use button component style
  return (
    <Button
      variant={isLiked ? "default" : "outline"}
      size="sm"
      className={cn(
        "rounded-lg transition-all duration-200",
        isLiked ? "bg-red-500 hover:bg-red-600 text-white" : "hover:bg-red-50 hover:text-red-600",
        className
      )}
      onClick={handleClick}
    >
      <div className="flex items-center gap-1.5">
        <Heart
          className={cn(
            "h-4 w-4",
            isLiked && "fill-current",
            "transition-all duration-200"
          )}
        />
        <span className="text-sm font-medium">{likesCount}</span>
      </div>
    </Button>
  )
}