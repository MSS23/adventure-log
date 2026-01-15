'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'

interface Particle {
  id: number
  x: number
  y: number
  rotation: number
  scale: number
  color: string
}

interface ParticleBurstProps {
  isActive: boolean
  x?: number
  y?: number
  particleCount?: number
  colors?: string[]
  duration?: number
  spread?: number
  size?: 'sm' | 'md' | 'lg'
}

const defaultColors = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#ec4899', // pink
  '#f43f5e', // rose
]

const sizeConfig = {
  sm: { particle: 4, spread: 30 },
  md: { particle: 6, spread: 50 },
  lg: { particle: 8, spread: 70 },
}

function generateParticles(
  count: number,
  colors: string[],
  spread: number
): Particle[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * 360 + Math.random() * 30
    const distance = spread * (0.5 + Math.random() * 0.5)
    const radians = (angle * Math.PI) / 180

    return {
      id: i,
      x: Math.cos(radians) * distance,
      y: Math.sin(radians) * distance,
      rotation: Math.random() * 360,
      scale: 0.5 + Math.random() * 0.5,
      color: colors[Math.floor(Math.random() * colors.length)],
    }
  })
}

export function ParticleBurst({
  isActive,
  x = 0,
  y = 0,
  particleCount = 12,
  colors = defaultColors,
  duration = 0.6,
  spread = 50,
  size = 'md',
}: ParticleBurstProps) {
  const prefersReducedMotion = useReducedMotion()

  if (prefersReducedMotion) {
    return null
  }

  const config = sizeConfig[size]
  const particles = generateParticles(particleCount, colors, spread || config.spread)

  return (
    <AnimatePresence>
      {isActive && (
        <div
          className="pointer-events-none absolute inset-0 overflow-visible"
          style={{ left: x, top: y }}
        >
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute rounded-full"
              style={{
                width: config.particle,
                height: config.particle,
                backgroundColor: particle.color,
                left: '50%',
                top: '50%',
                marginLeft: -config.particle / 2,
                marginTop: -config.particle / 2,
              }}
              initial={{
                x: 0,
                y: 0,
                scale: 0,
                opacity: 1,
              }}
              animate={{
                x: particle.x,
                y: particle.y,
                scale: [0, particle.scale, 0],
                opacity: [1, 1, 0],
                rotate: particle.rotation,
              }}
              exit={{
                opacity: 0,
              }}
              transition={{
                duration,
                ease: [0.36, 0.66, 0.04, 1],
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  )
}

// Heart-specific particle burst with heart shapes
export function HeartParticleBurst({
  isActive,
  x = 0,
  y = 0,
}: {
  isActive: boolean
  x?: number
  y?: number
}) {
  const prefersReducedMotion = useReducedMotion()

  if (prefersReducedMotion) {
    return null
  }

  const hearts = Array.from({ length: 6 }, (_, i) => {
    const angle = (i / 6) * 360
    const radians = (angle * Math.PI) / 180
    const distance = 40 + Math.random() * 20

    return {
      id: i,
      x: Math.cos(radians) * distance,
      y: Math.sin(radians) * distance,
      scale: 0.4 + Math.random() * 0.3,
      delay: i * 0.03,
    }
  })

  return (
    <AnimatePresence>
      {isActive && (
        <div
          className="pointer-events-none absolute inset-0 overflow-visible"
          style={{ left: x, top: y }}
        >
          {hearts.map((heart) => (
            <motion.div
              key={heart.id}
              className="absolute text-red-500"
              style={{
                left: '50%',
                top: '50%',
                fontSize: '14px',
              }}
              initial={{
                x: 0,
                y: 0,
                scale: 0,
                opacity: 1,
              }}
              animate={{
                x: heart.x,
                y: heart.y,
                scale: [0, heart.scale, 0],
                opacity: [1, 1, 0],
              }}
              transition={{
                duration: 0.5,
                delay: heart.delay,
                ease: [0.36, 0.66, 0.04, 1],
              }}
            >
              ❤️
            </motion.div>
          ))}
        </div>
      )}
    </AnimatePresence>
  )
}

// Confetti burst for celebrations (100th like, achievements, etc.)
export function ConfettiBurst({
  isActive,
  duration = 2,
}: {
  isActive: boolean
  duration?: number
}) {
  const prefersReducedMotion = useReducedMotion()

  if (prefersReducedMotion) {
    return null
  }

  const confettiColors = [
    '#f43f5e', // rose
    '#8b5cf6', // violet
    '#3b82f6', // blue
    '#14b8a6', // teal
    '#f59e0b', // amber
    '#10b981', // emerald
  ]

  const confetti = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * 300,
    y: -200 - Math.random() * 100,
    rotation: Math.random() * 720 - 360,
    color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
    shape: Math.random() > 0.5 ? 'rect' : 'circle',
    delay: Math.random() * 0.3,
  }))

  return (
    <AnimatePresence>
      {isActive && (
        <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
          {confetti.map((piece) => (
            <motion.div
              key={piece.id}
              className={piece.shape === 'rect' ? 'w-2 h-3' : 'w-2 h-2 rounded-full'}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                backgroundColor: piece.color,
              }}
              initial={{
                x: 0,
                y: 0,
                rotate: 0,
                opacity: 1,
              }}
              animate={{
                x: piece.x,
                y: [0, piece.y],
                rotate: piece.rotation,
                opacity: [1, 1, 0],
              }}
              transition={{
                duration,
                delay: piece.delay,
                ease: [0.2, 0, 0.8, 1],
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  )
}
