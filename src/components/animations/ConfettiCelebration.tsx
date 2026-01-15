'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { useHaptics } from '@/lib/hooks/useHaptics'

/**
 * ConfettiCelebration - Full-screen confetti burst for celebrations
 *
 * Use for:
 * - Achievement unlocks
 * - Milestone celebrations (100 likes, 10 countries visited)
 * - First-time user actions
 */

interface ConfettiPiece {
  id: number
  x: number
  y: number
  rotation: number
  scale: number
  color: string
  delay: number
  duration: number
  shape: 'square' | 'circle' | 'triangle' | 'star'
}

interface ConfettiCelebrationProps {
  /** Whether to show the celebration */
  show: boolean
  /** Callback when animation completes */
  onComplete?: () => void
  /** Number of confetti pieces (default: 50) */
  count?: number
  /** Duration in seconds (default: 3) */
  duration?: number
  /** Colors to use */
  colors?: string[]
  /** Trigger haptic feedback */
  haptic?: boolean
  /** Starting position (default: center) */
  origin?: { x: number; y: number }
}

const defaultColors = [
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#0ea5e9', // sky
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
]

const shapes = ['square', 'circle', 'triangle', 'star'] as const

function generateConfetti(
  count: number,
  colors: string[],
  origin: { x: number; y: number }
): ConfettiPiece[] {
  return Array.from({ length: count }, (_, i) => {
    // Random spread from origin
    const angle = Math.random() * Math.PI * 2
    const velocity = 100 + Math.random() * 300
    const x = origin.x + Math.cos(angle) * velocity
    const y = origin.y - Math.abs(Math.sin(angle) * velocity) - Math.random() * 200

    return {
      id: i,
      x,
      y,
      rotation: Math.random() * 720 - 360,
      scale: 0.5 + Math.random() * 0.5,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 0.3,
      duration: 2 + Math.random() * 2,
      shape: shapes[Math.floor(Math.random() * shapes.length)],
    }
  })
}

function ConfettiPieceComponent({
  piece,
  screenHeight,
}: {
  piece: ConfettiPiece
  screenHeight: number
}) {
  const finalY = screenHeight + 100

  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        left: piece.x,
        top: piece.y,
        width: 10 * piece.scale,
        height: 10 * piece.scale,
      }}
      initial={{
        opacity: 1,
        y: 0,
        rotate: 0,
        scale: 0,
      }}
      animate={{
        opacity: [1, 1, 0],
        y: finalY - piece.y,
        rotate: piece.rotation,
        scale: [0, piece.scale, piece.scale],
      }}
      transition={{
        duration: piece.duration,
        delay: piece.delay,
        ease: [0.25, 0.1, 0.25, 1],
      }}
    >
      {piece.shape === 'square' && (
        <div
          className="w-full h-full rounded-sm"
          style={{ backgroundColor: piece.color }}
        />
      )}
      {piece.shape === 'circle' && (
        <div
          className="w-full h-full rounded-full"
          style={{ backgroundColor: piece.color }}
        />
      )}
      {piece.shape === 'triangle' && (
        <div
          className="w-0 h-0"
          style={{
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderBottom: `10px solid ${piece.color}`,
          }}
        />
      )}
      {piece.shape === 'star' && (
        <svg viewBox="0 0 24 24" className="w-full h-full">
          <path
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            fill={piece.color}
          />
        </svg>
      )}
    </motion.div>
  )
}

export function ConfettiCelebration({
  show,
  onComplete,
  count = 50,
  duration = 3,
  colors = defaultColors,
  haptic = true,
  origin,
}: ConfettiCelebrationProps) {
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([])
  const [screenHeight, setScreenHeight] = useState(0)
  const prefersReducedMotion = useReducedMotion()
  const { triggerSuccess } = useHaptics()

  useEffect(() => {
    setScreenHeight(window.innerHeight)
  }, [])

  useEffect(() => {
    if (show && !prefersReducedMotion) {
      const originPoint = origin || {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      }
      setConfetti(generateConfetti(count, colors, originPoint))

      if (haptic) {
        triggerSuccess()
      }

      const timeout = setTimeout(() => {
        setConfetti([])
        onComplete?.()
      }, duration * 1000)

      return () => clearTimeout(timeout)
    } else if (show && prefersReducedMotion) {
      // For reduced motion, just trigger haptic and complete
      if (haptic) {
        triggerSuccess()
      }
      onComplete?.()
    }
  }, [show, count, colors, origin, duration, onComplete, haptic, triggerSuccess, prefersReducedMotion])

  if (prefersReducedMotion) {
    return null
  }

  return (
    <AnimatePresence>
      {confetti.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {confetti.map((piece) => (
            <ConfettiPieceComponent
              key={piece.id}
              piece={piece}
              screenHeight={screenHeight}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  )
}

/**
 * ParticleBurst - Small particle burst for micro-celebrations
 */
interface ParticleBurstProps {
  show: boolean
  onComplete?: () => void
  x?: number
  y?: number
  count?: number
  colors?: string[]
  size?: 'sm' | 'md' | 'lg'
}

const burstSizes = {
  sm: { particles: 6, spread: 30, particleSize: 4 },
  md: { particles: 12, spread: 50, particleSize: 6 },
  lg: { particles: 20, spread: 80, particleSize: 8 },
}

export function ParticleBurst({
  show,
  onComplete,
  x = 0,
  y = 0,
  count,
  colors = defaultColors,
  size = 'md',
}: ParticleBurstProps) {
  const config = burstSizes[size]
  const particleCount = count || config.particles
  const prefersReducedMotion = useReducedMotion()

  if (prefersReducedMotion || !show) {
    return null
  }

  const particles = Array.from({ length: particleCount }, (_, i) => {
    const angle = (i / particleCount) * Math.PI * 2
    return {
      id: i,
      angle,
      color: colors[i % colors.length],
    }
  })

  return (
    <AnimatePresence>
      {show && (
        <div
          className="absolute pointer-events-none"
          style={{ left: x, top: y }}
        >
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute rounded-full"
              style={{
                width: config.particleSize,
                height: config.particleSize,
                backgroundColor: particle.color,
                left: -config.particleSize / 2,
                top: -config.particleSize / 2,
              }}
              initial={{ scale: 0, opacity: 1 }}
              animate={{
                scale: [0, 1, 0],
                opacity: [1, 1, 0],
                x: Math.cos(particle.angle) * config.spread,
                y: Math.sin(particle.angle) * config.spread,
              }}
              transition={{
                duration: 0.6,
                ease: 'easeOut',
              }}
              onAnimationComplete={() => {
                if (particle.id === particleCount - 1) {
                  onComplete?.()
                }
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  )
}

/**
 * CelebrationOverlay - Full-screen celebration with message
 */
interface CelebrationOverlayProps {
  show: boolean
  title: string
  subtitle?: string
  icon?: React.ReactNode
  onClose?: () => void
  autoClose?: number // milliseconds
  variant?: 'achievement' | 'milestone' | 'success'
}

const overlayVariants = {
  achievement: {
    bg: 'from-yellow-500/90 via-orange-500/90 to-pink-500/90',
    iconBg: 'bg-yellow-400',
  },
  milestone: {
    bg: 'from-teal-500/90 via-cyan-500/90 to-blue-500/90',
    iconBg: 'bg-teal-400',
  },
  success: {
    bg: 'from-green-500/90 via-emerald-500/90 to-teal-500/90',
    iconBg: 'bg-green-400',
  },
}

export function CelebrationOverlay({
  show,
  title,
  subtitle,
  icon,
  onClose,
  autoClose = 3000,
  variant = 'achievement',
}: CelebrationOverlayProps) {
  const prefersReducedMotion = useReducedMotion()
  const { triggerSuccess } = useHaptics()
  const colors = overlayVariants[variant]

  useEffect(() => {
    if (show) {
      triggerSuccess()
      if (autoClose > 0) {
        const timeout = setTimeout(() => {
          onClose?.()
        }, autoClose)
        return () => clearTimeout(timeout)
      }
    }
  }, [show, autoClose, onClose, triggerSuccess])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={cn(
            'fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br',
            colors.bg
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          {/* Confetti behind */}
          <ConfettiCelebration show={show} count={80} haptic={false} />

          {/* Content */}
          <motion.div
            className="relative z-10 text-center text-white p-8"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 20,
              delay: 0.1,
            }}
          >
            {/* Icon */}
            {icon && (
              <motion.div
                className={cn(
                  'w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center',
                  colors.iconBg
                )}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 200,
                  damping: 15,
                  delay: 0.2,
                }}
              >
                {icon}
              </motion.div>
            )}

            {/* Title */}
            <motion.h2
              className="text-4xl font-bold mb-2"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {title}
            </motion.h2>

            {/* Subtitle */}
            {subtitle && (
              <motion.p
                className="text-xl text-white/80"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                {subtitle}
              </motion.p>
            )}

            {/* Tap to dismiss */}
            <motion.p
              className="mt-8 text-sm text-white/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              Tap anywhere to dismiss
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
