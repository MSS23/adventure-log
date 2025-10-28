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

  return (
    <Button
      variant={isLiked ? "default" : "ghost"}
      size="icon"
      className={cn(
        "rounded-full transition-all duration-200",
        isLiked ? "bg-red-500 hover:bg-red-600 text-white" : "hover:bg-red-50 hover:text-red-600",
        showCount && "px-3 w-auto rounded-lg",
        !showCount && "h-10 w-10 p-0",
        className
      )}
      onClick={handleClick}
    >
      <div className={cn("flex items-center justify-center", showCount && "gap-1.5")}>
        <Heart
          className={cn(
            "h-6 w-6",
            isLiked && "fill-current",
            "transition-all duration-200"
          )}
          strokeWidth={1.5}
        />
        {showCount && <span className="text-sm font-medium">{likesCount}</span>}
      </div>
    </Button>
  )
}