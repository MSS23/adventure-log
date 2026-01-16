'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { useFollows } from '@/lib/hooks/useFollows'
import { UserPlus, UserCheck, Clock, UserX, Sparkles } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'

interface FollowButtonProps {
  userId: string
  className?: string
  size?: 'sm' | 'default' | 'lg'
  showText?: boolean
}

// Particle burst animation component
function SuccessBurst({ onComplete }: { onComplete: () => void }) {
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    const timer = setTimeout(onComplete, 600)
    return () => clearTimeout(timer)
  }, [onComplete])

  if (prefersReducedMotion) return null

  const particles = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    angle: (i * 45) * (Math.PI / 180),
  }))

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute left-1/2 top-1/2 w-1.5 h-1.5 rounded-full bg-gradient-to-r from-blue-400 to-cyan-400"
          initial={{ x: '-50%', y: '-50%', scale: 1, opacity: 1 }}
          animate={{
            x: `calc(-50% + ${Math.cos(particle.angle) * 24}px)`,
            y: `calc(-50% + ${Math.sin(particle.angle) * 24}px)`,
            scale: 0,
            opacity: 0,
          }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      ))}
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        initial={{ scale: 0, opacity: 1 }}
        animate={{ scale: 1.5, opacity: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Sparkles className="w-6 h-6 text-blue-400" />
      </motion.div>
    </div>
  )
}

export function FollowButton({
  userId,
  className = '',
  size = 'default',
  showText = true
}: FollowButtonProps) {
  const { user } = useAuth()
  const { followStatus, follow, unfollow, loading } = useFollows(userId)
  const [localLoading, setLocalLoading] = useState(false)
  const [optimisticStatus, setOptimisticStatus] = useState(followStatus)
  const [showBurst, setShowBurst] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  // Update optimistic status when actual status changes
  useEffect(() => {
    setOptimisticStatus(followStatus)
  }, [followStatus])

  const handleBurstComplete = useCallback(() => {
    setShowBurst(false)
  }, [])

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault() // Prevent navigation if button is inside a link
    e.stopPropagation() // Prevent parent click handlers

    // Don't allow clicking if not logged in
    if (!user) {
      window.location.href = '/login'
      return
    }

    setLocalLoading(true)

    // Optimistic update for better UX
    const wasNotFollowing = optimisticStatus === 'not_following'
    if (optimisticStatus === 'following') {
      setOptimisticStatus('not_following')
    } else if (optimisticStatus === 'pending') {
      setOptimisticStatus('not_following')
    } else {
      setOptimisticStatus('pending')
    }

    try {
      if (followStatus === 'following') {
        await unfollow(userId)
      } else if (followStatus === 'pending') {
        await unfollow(userId) // Cancel request
      } else {
        await follow(userId)
        // Show burst animation on successful follow
        if (wasNotFollowing) {
          setShowBurst(true)
        }
      }
    } catch {
      // Revert optimistic update on error
      setOptimisticStatus(followStatus)
    } finally {
      setLocalLoading(false)
    }
  }

  const isLoading = loading || localLoading

  const getButtonContent = () => {
    const currentStatus = isLoading ? optimisticStatus : followStatus

    switch (currentStatus) {
      case 'following':
        return {
          icon: UserCheck,
          text: 'Following',
          className: 'bg-gradient-to-r from-gray-100 to-gray-50 hover:from-gray-200 hover:to-gray-100 text-gray-900 border-gray-200',
          iconColor: 'text-green-600',
          showIcon: true
        }
      case 'pending':
        return {
          icon: Clock,
          text: 'Requested',
          className: 'bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 text-amber-800 border-amber-200',
          iconColor: 'text-amber-600',
          showIcon: true
        }
      case 'blocked':
        return {
          icon: UserX,
          text: 'Blocked',
          className: 'bg-gray-100 text-gray-400 cursor-not-allowed',
          iconColor: 'text-gray-400',
          showIcon: true
        }
      default:
        return {
          icon: UserPlus,
          text: 'Follow',
          className: 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30',
          iconColor: 'text-white',
          showIcon: false
        }
    }
  }

  const buttonContent = getButtonContent()
  const IconComponent = buttonContent.icon

  if (followStatus === 'blocked') {
    return null // Don't show button for blocked users
  }

  // Don't show follow button for own profile
  if (user?.id === userId) {
    return null
  }

  return (
    <motion.div
      className="relative inline-block"
      whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
      whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      {/* Success burst animation */}
      <AnimatePresence>
        {showBurst && <SuccessBurst onComplete={handleBurstComplete} />}
      </AnimatePresence>

      <Button
        onClick={handleClick}
        disabled={isLoading}
        size={size}
        variant="outline"
        className={cn(
          'rounded-xl font-medium transition-all duration-300 relative overflow-hidden',
          'min-h-[44px] md:min-h-[36px]', // Larger touch target on mobile (44px recommended)
          buttonContent.className,
          isLoading && 'opacity-60 cursor-wait',
          className
        )}
      >
        {/* Shine effect on hover */}
        {!prefersReducedMotion && followStatus === 'not_following' && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full"
            whileHover={{ translateX: '200%' }}
            transition={{ duration: 0.6 }}
          />
        )}

        <span className="relative flex items-center gap-2">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading"
                initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={prefersReducedMotion ? {} : { opacity: 0, scale: 0.8 }}
                className="h-4 w-4 rounded-full border-2 border-current border-t-transparent"
                style={{ animation: 'spin 1s linear infinite' }}
              />
            ) : buttonContent.showIcon ? (
              <motion.div
                key={followStatus}
                initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.5, rotate: -90 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={prefersReducedMotion ? {} : { opacity: 0, scale: 0.5, rotate: 90 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              >
                <IconComponent className={cn("h-4 w-4", buttonContent.iconColor)} />
              </motion.div>
            ) : null}
          </AnimatePresence>

          {showText && (
            <AnimatePresence mode="wait">
              <motion.span
                key={isLoading ? 'loading' : followStatus}
                initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReducedMotion ? {} : { opacity: 0, y: -10 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              >
                {isLoading ? 'Loading...' : buttonContent.text}
              </motion.span>
            </AnimatePresence>
          )}
        </span>
      </Button>
    </motion.div>
  )
}