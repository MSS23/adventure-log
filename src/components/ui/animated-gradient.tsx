'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'

/**
 * AnimatedGradient - Subtle animated gradient background
 *
 * Creates a living, breathing background that shifts colors slowly
 */

interface AnimatedGradientProps {
  /** Gradient color scheme */
  variant?: 'ocean' | 'sunset' | 'forest' | 'aurora' | 'teal' | 'purple' | 'warm'
  /** Animation speed in seconds (default: 15) */
  speed?: number
  /** Enable blur effect */
  blur?: boolean
  /** Intensity of the gradient (0-1) */
  intensity?: number
  className?: string
  children?: React.ReactNode
}

const gradientPresets = {
  ocean: {
    colors: ['#0ea5e9', '#06b6d4', '#14b8a6', '#0d9488'],
    positions: ['0%', '33%', '66%', '100%'],
  },
  sunset: {
    colors: ['#f97316', '#f59e0b', '#ec4899', '#8b5cf6'],
    positions: ['0%', '33%', '66%', '100%'],
  },
  forest: {
    colors: ['#22c55e', '#10b981', '#14b8a6', '#0d9488'],
    positions: ['0%', '33%', '66%', '100%'],
  },
  aurora: {
    colors: ['#8b5cf6', '#06b6d4', '#22c55e', '#eab308'],
    positions: ['0%', '33%', '66%', '100%'],
  },
  teal: {
    colors: ['#14b8a6', '#06b6d4', '#0ea5e9', '#0d9488'],
    positions: ['0%', '33%', '66%', '100%'],
  },
  purple: {
    colors: ['#8b5cf6', '#a855f7', '#d946ef', '#ec4899'],
    positions: ['0%', '33%', '66%', '100%'],
  },
  warm: {
    colors: ['#f97316', '#ef4444', '#f59e0b', '#fbbf24'],
    positions: ['0%', '33%', '66%', '100%'],
  },
}

export function AnimatedGradient({
  variant = 'ocean',
  speed = 15,
  blur = true,
  intensity = 0.3,
  className,
  children,
}: AnimatedGradientProps) {
  const prefersReducedMotion = useReducedMotion()
  const preset = gradientPresets[variant]

  if (prefersReducedMotion) {
    // Static gradient for reduced motion users
    return (
      <div
        className={cn('relative overflow-hidden', className)}
        style={{
          background: `linear-gradient(135deg, ${preset.colors.join(', ')})`,
          opacity: intensity,
        }}
      >
        {children}
      </div>
    )
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      <motion.div
        className={cn(
          'absolute inset-0 -z-10',
          blur && 'blur-3xl'
        )}
        animate={{
          background: [
            `linear-gradient(0deg, ${preset.colors[0]} 0%, ${preset.colors[1]} 50%, ${preset.colors[2]} 100%)`,
            `linear-gradient(90deg, ${preset.colors[1]} 0%, ${preset.colors[2]} 50%, ${preset.colors[3]} 100%)`,
            `linear-gradient(180deg, ${preset.colors[2]} 0%, ${preset.colors[3]} 50%, ${preset.colors[0]} 100%)`,
            `linear-gradient(270deg, ${preset.colors[3]} 0%, ${preset.colors[0]} 50%, ${preset.colors[1]} 100%)`,
            `linear-gradient(360deg, ${preset.colors[0]} 0%, ${preset.colors[1]} 50%, ${preset.colors[2]} 100%)`,
          ],
        }}
        transition={{
          duration: speed,
          ease: 'linear',
          repeat: Infinity,
        }}
        style={{ opacity: intensity }}
      />
      {children}
    </div>
  )
}

/**
 * GradientBorder - Animated gradient border around elements
 */
interface GradientBorderProps {
  variant?: keyof typeof gradientPresets
  speed?: number
  borderWidth?: number
  borderRadius?: number
  className?: string
  children?: React.ReactNode
}

export function GradientBorder({
  variant = 'teal',
  speed = 3,
  borderWidth = 2,
  borderRadius = 16,
  className,
  children,
}: GradientBorderProps) {
  const prefersReducedMotion = useReducedMotion()
  const preset = gradientPresets[variant]

  return (
    <div
      className={cn('relative p-[2px] rounded-2xl', className)}
      style={{ borderRadius }}
    >
      {/* Animated gradient border */}
      <motion.div
        className="absolute inset-0 rounded-inherit"
        style={{
          borderRadius,
          padding: borderWidth,
          background: `linear-gradient(90deg, ${preset.colors.join(', ')})`,
          backgroundSize: '200% 100%',
        }}
        animate={
          prefersReducedMotion
            ? undefined
            : {
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
              }
        }
        transition={{
          duration: speed,
          ease: 'linear',
          repeat: Infinity,
        }}
      />
      {/* Content container */}
      <div
        className="relative bg-white rounded-inherit"
        style={{ borderRadius: borderRadius - borderWidth }}
      >
        {children}
      </div>
    </div>
  )
}

/**
 * GlowEffect - Pulsing glow effect behind elements
 */
interface GlowEffectProps {
  color?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  intensity?: number
  pulse?: boolean
  className?: string
  children?: React.ReactNode
}

const glowSizes = {
  sm: 'blur-xl',
  md: 'blur-2xl',
  lg: 'blur-3xl',
  xl: 'blur-[100px]',
}

export function GlowEffect({
  color = '#14b8a6',
  size = 'md',
  intensity = 0.5,
  pulse = true,
  className,
  children,
}: GlowEffectProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <div className={cn('relative', className)}>
      {/* Glow layer */}
      <motion.div
        className={cn(
          'absolute inset-0 -z-10 rounded-full',
          glowSizes[size]
        )}
        style={{
          backgroundColor: color,
          opacity: intensity,
        }}
        animate={
          pulse && !prefersReducedMotion
            ? {
                opacity: [intensity * 0.5, intensity, intensity * 0.5],
                scale: [0.9, 1.05, 0.9],
              }
            : undefined
        }
        transition={{
          duration: 3,
          ease: 'easeInOut',
          repeat: Infinity,
        }}
      />
      {children}
    </div>
  )
}

/**
 * ShimmerEffect - Animated shimmer/shine effect
 */
interface ShimmerEffectProps {
  className?: string
  children?: React.ReactNode
}

export function ShimmerEffect({ className, children }: ShimmerEffectProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {children}
      {!prefersReducedMotion && (
        <motion.div
          className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
          animate={{ x: ['0%', '200%'] }}
          transition={{
            duration: 2,
            ease: 'easeInOut',
            repeat: Infinity,
            repeatDelay: 3,
          }}
        />
      )}
    </div>
  )
}

/**
 * MeshGradient - Complex mesh gradient background
 */
interface MeshGradientProps {
  variant?: 'subtle' | 'vibrant' | 'dark'
  className?: string
  children?: React.ReactNode
}

export function MeshGradient({
  variant = 'subtle',
  className,
  children,
}: MeshGradientProps) {
  const prefersReducedMotion = useReducedMotion()

  const meshStyles = {
    subtle: {
      backgroundColor: '#f8fafc',
      backgroundImage: `
        radial-gradient(at 40% 20%, rgba(20, 184, 166, 0.15) 0px, transparent 50%),
        radial-gradient(at 80% 0%, rgba(6, 182, 212, 0.1) 0px, transparent 50%),
        radial-gradient(at 0% 50%, rgba(14, 165, 233, 0.1) 0px, transparent 50%),
        radial-gradient(at 80% 50%, rgba(139, 92, 246, 0.08) 0px, transparent 50%),
        radial-gradient(at 0% 100%, rgba(20, 184, 166, 0.1) 0px, transparent 50%)
      `,
    },
    vibrant: {
      backgroundColor: '#f8fafc',
      backgroundImage: `
        radial-gradient(at 40% 20%, rgba(20, 184, 166, 0.3) 0px, transparent 50%),
        radial-gradient(at 80% 0%, rgba(6, 182, 212, 0.25) 0px, transparent 50%),
        radial-gradient(at 0% 50%, rgba(14, 165, 233, 0.2) 0px, transparent 50%),
        radial-gradient(at 80% 50%, rgba(139, 92, 246, 0.15) 0px, transparent 50%),
        radial-gradient(at 0% 100%, rgba(236, 72, 153, 0.15) 0px, transparent 50%)
      `,
    },
    dark: {
      backgroundColor: '#0f172a',
      backgroundImage: `
        radial-gradient(at 40% 20%, rgba(20, 184, 166, 0.2) 0px, transparent 50%),
        radial-gradient(at 80% 0%, rgba(6, 182, 212, 0.15) 0px, transparent 50%),
        radial-gradient(at 0% 50%, rgba(14, 165, 233, 0.1) 0px, transparent 50%),
        radial-gradient(at 80% 50%, rgba(139, 92, 246, 0.12) 0px, transparent 50%),
        radial-gradient(at 0% 100%, rgba(20, 184, 166, 0.15) 0px, transparent 50%)
      `,
    },
  }

  return (
    <motion.div
      className={cn('relative', className)}
      style={meshStyles[variant]}
      animate={
        !prefersReducedMotion
          ? {
              backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
            }
          : undefined
      }
      transition={{
        duration: 20,
        ease: 'linear',
        repeat: Infinity,
      }}
    >
      {children}
    </motion.div>
  )
}

/**
 * MouseGradient - Gradient that follows mouse position
 */
interface MouseGradientProps {
  color?: string
  size?: number
  intensity?: number
  className?: string
  children?: React.ReactNode
}

export function MouseGradient({
  color = 'rgba(20, 184, 166, 0.15)',
  size = 400,
  intensity = 1,
  className,
  children,
}: MouseGradientProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const springX = useSpring(mouseX, { stiffness: 300, damping: 30 })
  const springY = useSpring(mouseY, { stiffness: 300, damping: 30 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      mouseX.set(e.clientX - rect.left)
      mouseY.set(e.clientY - rect.top)
    }

    const container = containerRef.current
    container?.addEventListener('mousemove', handleMouseMove)

    return () => {
      container?.removeEventListener('mousemove', handleMouseMove)
    }
  }, [mouseX, mouseY])

  return (
    <div ref={containerRef} className={cn('relative overflow-hidden', className)}>
      <motion.div
        className="pointer-events-none absolute -z-10"
        style={{
          width: size,
          height: size,
          x: springX,
          y: springY,
          translateX: '-50%',
          translateY: '-50%',
          background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
          opacity: intensity,
        }}
      />
      {children}
    </div>
  )
}
