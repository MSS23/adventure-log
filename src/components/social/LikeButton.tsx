'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLikes } from '@/lib/hooks/useSocial'
import { useHaptics } from '@/lib/hooks/useHaptics'
import { ParticleBurst } from '@/components/animations/ParticleBurst'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'

interface LikeButtonProps {
  albumId?: string
  photoId?: string
  showCount?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
  showParticles?: boolean
  /**
   * Fired on tap with the *next* liked state. Lets a parent that renders its
   * own like count (e.g. the feed footer, which shows a server-provided
   * `likes_count`) keep that number in sync optimistically — the button itself
   * only owns the heart when `showCount` is false.
   */
  onToggle?: (nextLiked: boolean) => void
}

export function LikeButton({
  albumId,
  photoId,
  showCount = false,
  size: _size = 'md',
  className,
  showParticles = true,
  onToggle,
}: LikeButtonProps) {
  const { isLiked, likesCount, toggleLike } = useLikes(albumId, photoId, undefined, { fetchList: showCount, subscribe: showCount })
  const { triggerLight, triggerSuccess } = useHaptics()
  const [showBurst, setShowBurst] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const nextLiked = !isLiked

    // Trigger haptic feedback
    if (nextLiked) {
      triggerSuccess()
      // Show particle burst on like
      if (showParticles && !prefersReducedMotion) {
        setShowBurst(true)
        setTimeout(() => setShowBurst(false), 600)
      }
    } else {
      triggerLight()
    }

    // Let a parent-owned count update optimistically, in lockstep with the heart.
    onToggle?.(nextLiked)

    // Fire and forget - optimistic update makes it instant
    toggleLike()
  }

  const _sizes = {
    sm: 'h-8 px-2 text-sm',
    md: 'h-9 px-3 text-sm',
    lg: 'h-10 px-4 text-base'
  }

  const _iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  }

  // Match the style of comment and globe buttons on feed
  if (!showCount) {
    return (
      <div className="relative">
        <motion.button
          onClick={handleClick}
          aria-label={isLiked ? 'Unlike' : 'Like'}
          aria-pressed={isLiked}
          className={cn(
            "min-w-[44px] min-h-[44px] p-2.5 sm:p-2 -m-2 rounded-full transition-colors duration-200 touch-manipulation flex items-center justify-center",
            isLiked ? "hover:bg-accent/10 active:bg-accent/20" : "hover:bg-muted active:bg-muted/80",
            className
          )}
          whileTap={prefersReducedMotion ? {} : { scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={isLiked ? 'liked' : 'not-liked'}
              initial={prefersReducedMotion ? {} : { scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={prefersReducedMotion ? {} : { scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 500, damping: 15 }}
            >
              <Heart
                className={cn(
                  "h-5 w-5 sm:h-6 sm:w-6 transition-colors duration-200",
                  isLiked
                    ? "fill-accent text-accent"
                    : "text-muted-foreground"
                )}
                strokeWidth={1.5}
              />
            </motion.div>
          </AnimatePresence>
        </motion.button>

        {/* Particle burst effect */}
        <ParticleBurst
          isActive={showBurst}
          colors={['#C75B3A', '#F38162', '#D4A54A', '#F2A179']}
          particleCount={8}
          spread={35}
          size="sm"
        />
      </div>
    )
  }

  // With count - use button component style
  return (
    <div className="relative">
      <motion.div
        whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      >
        <Button
          variant={isLiked ? "default" : "outline"}
          size="sm"
          aria-label={isLiked ? 'Unlike' : 'Like'}
          aria-pressed={isLiked}
          className={cn(
            "rounded-xl transition-all duration-200",
            isLiked
              ? "bg-accent hover:bg-accent/90 text-accent-foreground border-transparent"
              : "hover:bg-accent/10 hover:text-accent hover:border-accent/30",
            className
          )}
          onClick={handleClick}
        >
          <div className="flex items-center gap-1.5">
            <AnimatePresence mode="wait">
              <motion.div
                key={isLiked ? 'liked' : 'not-liked'}
                initial={prefersReducedMotion ? {} : { scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 15 }}
              >
                <Heart
                  className={cn(
                    "h-4 w-4",
                    isLiked && "fill-current",
                    "transition-all duration-200"
                  )}
                />
              </motion.div>
            </AnimatePresence>
            <motion.span
              key={likesCount}
              initial={prefersReducedMotion ? {} : { y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-sm font-medium"
            >
              {likesCount}
            </motion.span>
          </div>
        </Button>
      </motion.div>

      {/* Particle burst effect */}
      <ParticleBurst
        isActive={showBurst}
        colors={['#C75B3A', '#F38162', '#D4A54A', '#F2A179']}
        particleCount={10}
        spread={40}
        size="md"
      />
    </div>
  )
}
