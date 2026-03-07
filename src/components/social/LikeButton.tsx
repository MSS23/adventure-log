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
}

export function LikeButton({
  albumId,
  photoId,
  showCount = false,
  size = 'md',
  className,
  showParticles = true
}: LikeButtonProps) {
  const { isLiked, likesCount, toggleLike } = useLikes(albumId, photoId)
  const { triggerLight, triggerSuccess } = useHaptics()
  const [showBurst, setShowBurst] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Trigger haptic feedback
    if (!isLiked) {
      triggerSuccess()
      // Show particle burst on like
      if (showParticles && !prefersReducedMotion) {
        setShowBurst(true)
        setTimeout(() => setShowBurst(false), 600)
      }
    } else {
      triggerLight()
    }

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
      <div className="relative">
        <motion.button
          onClick={handleClick}
          className={cn(
            "min-w-[44px] min-h-[44px] p-2.5 sm:p-2 -m-2 rounded-full transition-colors touch-manipulation flex items-center justify-center",
            isLiked ? "hover:bg-red-100 active:bg-red-200" : "hover:bg-gray-100 active:bg-gray-200",
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
                  isLiked ? "fill-red-500 text-red-500" : "text-gray-900"
                )}
                strokeWidth={1.5}
              />
            </motion.div>
          </AnimatePresence>
        </motion.button>

        {/* Particle burst effect */}
        <ParticleBurst
          isActive={showBurst}
          colors={['#ef4444', '#f97316', '#ec4899', '#f43f5e']}
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
          className={cn(
            "rounded-lg transition-all duration-200",
            isLiked ? "bg-red-500 hover:bg-red-600 text-white" : "hover:bg-red-50 hover:text-red-600",
            className
          )}
          onClick={handleClick}
        >
          <div className="flex items-center gap-1.5">
            <AnimatePresence mode="wait">
              <motion.div
                key={isLiked ? 'liked' : 'not-liked'}
                initial={prefersReducedMotion ? {} : { scale: 0.5, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
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
        colors={['#ef4444', '#f97316', '#ec4899', '#f43f5e']}
        particleCount={10}
        spread={40}
        size="md"
      />
    </div>
  )
}
