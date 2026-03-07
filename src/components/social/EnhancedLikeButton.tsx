'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLikes } from '@/lib/hooks/useSocial'
import { LikeCounter } from '@/components/ui/animated-count'
import { transitions } from '@/lib/animations/spring-configs'

interface EnhancedLikeButtonProps {
  albumId?: string
  photoId?: string
  showCount?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'minimal' | 'pill'
  className?: string
}

export function EnhancedLikeButton({
  albumId,
  photoId,
  showCount = false,
  size = 'md',
  variant = 'default',
  className,
}: EnhancedLikeButtonProps) {
  const { isLiked, likesCount, toggleLike } = useLikes(albumId, photoId)
  const [isAnimating, setIsAnimating] = useState(false)
  const [particles, setParticles] = useState<number[]>([])

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Trigger animation before the state changes
    if (!isLiked) {
      setIsAnimating(true)
      // Add particles for burst effect
      setParticles(Array.from({ length: 6 }, (_, i) => i))
      setTimeout(() => {
        setIsAnimating(false)
        setParticles([])
      }, 700)
    }

    toggleLike()
  }, [isLiked, toggleLike])

  const sizes = {
    sm: {
      button: 'h-8 min-w-8',
      icon: 'h-4 w-4',
      text: 'text-xs',
    },
    md: {
      button: 'h-10 min-w-10',
      icon: 'h-5 w-5',
      text: 'text-sm',
    },
    lg: {
      button: 'h-12 min-w-12',
      icon: 'h-6 w-6',
      text: 'text-base',
    },
  }

  const sizeConfig = sizes[size]

  // Minimal variant - just icon
  if (variant === 'minimal') {
    return (
      <motion.button
        onClick={handleClick}
        className={cn(
          'relative p-2 rounded-full transition-colors touch-manipulation',
          isLiked ? 'hover:bg-red-100 active:bg-red-200' : 'hover:bg-gray-100 active:bg-gray-200',
          className
        )}
        whileTap={{ scale: 0.85 }}
        transition={transitions.snap}
      >
        {/* Particle burst effect */}
        <AnimatePresence>
          {particles.map((i) => (
            <motion.span
              key={i}
              className="absolute top-1/2 left-1/2 w-1.5 h-1.5 rounded-full bg-red-400"
              initial={{ x: '-50%', y: '-50%', scale: 0, opacity: 1 }}
              animate={{
                x: `${Math.cos((i / 6) * Math.PI * 2) * 25 - 50}%`,
                y: `${Math.sin((i / 6) * Math.PI * 2) * 25 - 50}%`,
                scale: 1,
                opacity: 0,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          ))}
        </AnimatePresence>

        <motion.div
          animate={isAnimating ? { scale: [1, 1.3, 1] } : {}}
          transition={{ duration: 0.3 }}
        >
          <Heart
            className={cn(
              sizeConfig.icon,
              'transition-all duration-200',
              isLiked ? 'fill-red-500 text-red-500' : 'text-gray-700'
            )}
            strokeWidth={1.5}
          />
        </motion.div>
      </motion.button>
    )
  }

  // Pill variant - horizontal with count
  if (variant === 'pill') {
    return (
      <motion.button
        onClick={handleClick}
        className={cn(
          'relative flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200',
          isLiked
            ? 'bg-red-50 text-red-600 hover:bg-red-100'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
          className
        )}
        whileTap={{ scale: 0.95 }}
        transition={transitions.snap}
      >
        <motion.div
          animate={isAnimating ? { scale: [1, 1.4, 1], rotate: [0, -15, 15, 0] } : {}}
          transition={{ duration: 0.4 }}
        >
          <Heart
            className={cn(
              sizeConfig.icon,
              isLiked && 'fill-current'
            )}
            strokeWidth={1.5}
          />
        </motion.div>

        {showCount && (
          <LikeCounter
            count={likesCount}
            isLiked={isLiked}
            className={sizeConfig.text}
          />
        )}
      </motion.button>
    )
  }

  // Default variant
  return (
    <motion.button
      onClick={handleClick}
      className={cn(
        'relative flex items-center justify-center gap-1.5 rounded-lg transition-all duration-200',
        sizeConfig.button,
        showCount && 'px-3',
        isLiked
          ? 'bg-red-500 text-white hover:bg-red-600 shadow-md shadow-red-500/25'
          : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300',
        className
      )}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.95 }}
      transition={transitions.snap}
    >
      {/* Sparkle effect on like */}
      <AnimatePresence>
        {isAnimating && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {[...Array(4)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute"
                style={{
                  top: '50%',
                  left: '50%',
                }}
                initial={{ scale: 0, x: '-50%', y: '-50%' }}
                animate={{
                  scale: [0, 1, 0],
                  x: `${Math.cos((i / 4) * Math.PI * 2) * 30 - 50}%`,
                  y: `${Math.sin((i / 4) * Math.PI * 2) * 30 - 50}%`,
                }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
              >
                <Sparkles className="h-3 w-3 text-yellow-400" />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        animate={isAnimating ? { scale: [1, 1.5, 1], rotate: [0, -20, 20, 0] } : {}}
        transition={{ duration: 0.4, type: 'spring' }}
      >
        <Heart
          className={cn(
            sizeConfig.icon,
            isLiked && 'fill-current'
          )}
          strokeWidth={isLiked ? 0 : 1.5}
        />
      </motion.div>

      {showCount && (
        <LikeCounter
          count={likesCount}
          isLiked={isLiked}
          className={cn(sizeConfig.text, 'font-medium')}
        />
      )}
    </motion.button>
  )
}

/**
 * Compact like button for tight spaces
 */
export function CompactLikeButton({
  albumId,
  photoId,
  className,
}: {
  albumId?: string
  photoId?: string
  className?: string
}) {
  return (
    <EnhancedLikeButton
      albumId={albumId}
      photoId={photoId}
      size="sm"
      variant="minimal"
      className={className}
    />
  )
}

/**
 * Like button with count badge
 */
export function LikeButtonWithBadge({
  albumId,
  photoId,
  className,
}: {
  albumId?: string
  photoId?: string
  className?: string
}) {
  const { isLiked, likesCount } = useLikes(albumId, photoId)

  return (
    <div className={cn('relative inline-flex', className)}>
      <EnhancedLikeButton
        albumId={albumId}
        photoId={photoId}
        variant="minimal"
        size="md"
      />
      {likesCount > 0 && (
        <motion.span
          className={cn(
            'absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold px-1',
            isLiked ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-700'
          )}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={transitions.bounce}
        >
          {likesCount > 99 ? '99+' : likesCount}
        </motion.span>
      )}
    </div>
  )
}
