'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useFavorites, type Favorite } from '@/lib/hooks/useFavorites'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface FavoriteButtonProps {
  targetId: string
  targetType: 'photo' | 'album' | 'location'
  metadata?: Favorite['metadata']
  variant?: 'default' | 'ghost' | 'outline'
  size?: 'sm' | 'default' | 'lg'
  showCount?: boolean
  showLabel?: boolean
  className?: string
  disabled?: boolean
  onToggle?: (isFavorited: boolean) => void
}

export function FavoriteButton({
  targetId,
  targetType,
  metadata,
  variant = 'ghost',
  size = 'default',
  showCount = false,
  showLabel = false,
  className,
  disabled = false,
  onToggle
}: FavoriteButtonProps) {
  const { isFavorited, toggleFavorite, getFavoritesCount, loading } = useFavorites({
    targetType,
    autoFetch: true
  })

  const [isAnimating, setIsAnimating] = useState(false)
  const favorited = isFavorited(targetId, targetType)
  const count = showCount ? getFavoritesCount(targetType) : 0

  const handleClick = async () => {
    if (disabled || isAnimating) return

    setIsAnimating(true)

    try {
      const newFavoriteState = await toggleFavorite(targetId, targetType, metadata)
      onToggle?.(newFavoriteState)

      // Show toast notification
      toast.success(
        newFavoriteState
          ? `Added to ${targetType} favorites`
          : `Removed from ${targetType} favorites`,
        {
          duration: 2000,
          position: 'bottom-center'
        }
      )

    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : `Failed to update ${targetType} favorite`,
        {
          duration: 3000,
          position: 'bottom-center'
        }
      )
    } finally {
      // Delay to allow animation to complete
      setTimeout(() => setIsAnimating(false), 300)
    }
  }

  const getLabel = () => {
    if (!showLabel) return null

    switch (targetType) {
      case 'photo':
        return favorited ? 'Favorited' : 'Add to favorites'
      case 'album':
        return favorited ? 'Favorite album' : 'Favorite album'
      case 'location':
        return favorited ? 'Favorite place' : 'Add to wishlist'
      default:
        return favorited ? 'Favorited' : 'Favorite'
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={variant}
        size={size}
        onClick={handleClick}
        disabled={disabled || loading || isAnimating}
        className={cn(
          'relative overflow-hidden transition-colors',
          favorited && variant === 'ghost' && 'text-red-600 hover:text-red-700 hover:bg-red-50',
          favorited && variant === 'outline' && 'border-red-300 text-red-600 hover:bg-red-50',
          favorited && variant === 'default' && 'bg-red-600 hover:bg-red-700 text-white',
          className
        )}
        aria-label={`${favorited ? 'Remove from' : 'Add to'} ${targetType} favorites`}
      >
        {/* Heart icon with animation */}
        <motion.div
          key={favorited ? 'filled' : 'empty'}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-2"
        >
          <Heart
            className={cn(
              'h-4 w-4 transition-all duration-200',
              favorited && 'fill-current',
              isAnimating && 'scale-125'
            )}
          />
          {showLabel && (
            <span className="text-sm font-medium">
              {getLabel()}
            </span>
          )}
        </motion.div>

        {/* Animated background pulse for favorite action */}
        {isAnimating && favorited && (
          <motion.div
            initial={{ scale: 0, opacity: 0.7 }}
            animate={{ scale: 2, opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 bg-red-400 rounded-full"
          />
        )}
      </Button>

      {/* Favorites count badge */}
      {showCount && count > 0 && (
        <Badge
          variant="secondary"
          className="text-sm bg-gray-100 text-gray-800"
        >
          {count}
        </Badge>
      )}
    </div>
  )
}

// Specialized components for different target types
export function PhotoFavoriteButton(props: Omit<FavoriteButtonProps, 'targetType'>) {
  return <FavoriteButton {...props} targetType="photo" />
}

export function AlbumFavoriteButton(props: Omit<FavoriteButtonProps, 'targetType'>) {
  return <FavoriteButton {...props} targetType="album" />
}

export function LocationFavoriteButton(props: Omit<FavoriteButtonProps, 'targetType'>) {
  return <FavoriteButton {...props} targetType="location" />
}

// Compact favorite button for tight spaces
export function CompactFavoriteButton({
  targetId,
  targetType,
  metadata,
  className,
  ...props
}: Omit<FavoriteButtonProps, 'variant' | 'size' | 'showCount' | 'showLabel'>) {
  return (
    <FavoriteButton
      targetId={targetId}
      targetType={targetType}
      metadata={metadata}
      variant="ghost"
      size="sm"
      showCount={false}
      showLabel={false}
      className={cn('h-8 w-8 p-0', className)}
      {...props}
    />
  )
}

// Favorite button with count for dashboards
export function FavoriteButtonWithCount({
  targetId,
  targetType,
  metadata,
  className,
  ...props
}: Omit<FavoriteButtonProps, 'showCount'>) {
  return (
    <FavoriteButton
      targetId={targetId}
      targetType={targetType}
      metadata={metadata}
      showCount={true}
      className={className}
      {...props}
    />
  )
}