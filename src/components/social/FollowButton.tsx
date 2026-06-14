'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
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
          className="absolute left-1/2 top-1/2 w-1.5 h-1.5 rounded-full bg-primary"
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
        <Sparkles className="w-6 h-6 text-primary" />
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
  const router = useRouter()
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
      router.push('/login')
      return
    }

    setLocalLoading(true)

    // Act on the status we're currently displaying (optimisticStatus), so the
    // action and the optimistic UI never disagree under rapid clicks / realtime updates.
    const current = optimisticStatus
    const isUndoing = current === 'following' || current === 'pending'

    // Optimistic update for better UX
    setOptimisticStatus(isUndoing ? 'not_following' : 'pending')

    try {
      if (isUndoing) {
        await unfollow(userId) // Unfollow or cancel a pending request
      } else {
        await follow(userId)
        // Show burst animation on successful follow
        setShowBurst(true)
      }
    } catch {
      // Revert optimistic update on error
      setOptimisticStatus(current)
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
          className: 'bg-muted text-foreground border-border hover:bg-muted/70',
          iconColor: 'text-primary',
          showIcon: true
        }
      case 'pending':
        return {
          icon: Clock,
          text: 'Requested',
          className: 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/15',
          iconColor: 'text-primary',
          showIcon: true
        }
      case 'blocked':
        return {
          icon: UserX,
          text: 'Blocked',
          className: 'bg-muted text-muted-foreground border-border cursor-not-allowed',
          iconColor: 'text-muted-foreground',
          showIcon: true
        }
      default:
        return {
          icon: UserPlus,
          text: 'Follow',
          className: 'bg-primary text-primary-foreground border-transparent font-semibold shadow-sm hover:bg-primary/90 hover:shadow-md',
          iconColor: 'text-primary-foreground',
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
          'rounded-xl font-medium transition-all duration-200 relative overflow-hidden',
          'min-h-[44px] md:min-h-[36px]', // Larger touch target on mobile (44px recommended)
          buttonContent.className,
          isLoading && 'opacity-60 cursor-wait',
          className
        )}
      >
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