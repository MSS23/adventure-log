'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { useHaptics } from '@/lib/hooks/useHaptics'
import { useIntersectionObserver } from '@/lib/hooks/useIntersectionObserver'

/**
 * ProgressRing - Animated circular progress indicator
 *
 * Features:
 * - Smooth animated fill
 * - Optional milestone markers
 * - Multiple color variants
 * - Celebratory animation at 100%
 */

interface ProgressRingProps {
  /** Progress value (0-100) */
  progress: number
  /** Ring size */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Ring thickness */
  thickness?: 'thin' | 'normal' | 'thick'
  /** Color variant */
  variant?: 'teal' | 'purple' | 'orange' | 'blue' | 'gradient'
  /** Show percentage label */
  showLabel?: boolean
  /** Custom label (overrides percentage) */
  label?: string | React.ReactNode
  /** Milestone markers (array of percentages) */
  milestones?: number[]
  /** Animate on scroll into view */
  animateOnView?: boolean
  /** Callback when 100% is reached */
  onComplete?: () => void
  className?: string
  children?: React.ReactNode
}

// Size configurations
const sizeConfig = {
  sm: { diameter: 60, labelSize: 'text-xs' },
  md: { diameter: 80, labelSize: 'text-sm' },
  lg: { diameter: 120, labelSize: 'text-xl' },
  xl: { diameter: 160, labelSize: 'text-3xl' },
}

// Thickness configurations
const thicknessConfig = {
  thin: 4,
  normal: 8,
  thick: 12,
}

// Color variants
const colorVariants = {
  teal: {
    stroke: 'stroke-teal-500',
    bg: 'stroke-teal-100',
    glow: 'drop-shadow-[0_0_8px_rgba(20,184,166,0.5)]',
  },
  purple: {
    stroke: 'stroke-purple-500',
    bg: 'stroke-purple-100',
    glow: 'drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]',
  },
  orange: {
    stroke: 'stroke-orange-500',
    bg: 'stroke-orange-100',
    glow: 'drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]',
  },
  blue: {
    stroke: 'stroke-blue-500',
    bg: 'stroke-blue-100',
    glow: 'drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]',
  },
  gradient: {
    stroke: '', // Uses gradient instead
    bg: 'stroke-gray-100',
    glow: 'drop-shadow-[0_0_12px_rgba(20,184,166,0.4)]',
  },
}

export function ProgressRing({
  progress,
  size = 'md',
  thickness = 'normal',
  variant = 'teal',
  showLabel = true,
  label,
  milestones,
  animateOnView = true,
  onComplete,
  className,
  children,
}: ProgressRingProps) {
  const prefersReducedMotion = useReducedMotion()
  const { triggerMilestone } = useHaptics()
  const [hasCompleted, setHasCompleted] = useState(false)
  const prevProgressRef = useRef(progress)

  // Intersection observer for animate on view
  const { ref: observerRef, isIntersecting } = useIntersectionObserver({
    threshold: 0.3,
    triggerOnce: true,
  })
  const containerRef = observerRef as React.RefObject<HTMLDivElement>

  const config = sizeConfig[size]
  const strokeWidth = thicknessConfig[thickness]
  const colors = colorVariants[variant]

  // Calculate SVG dimensions
  const radius = (config.diameter - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  // Animated progress value
  const progressValue = useMotionValue(0)
  const springProgress = useSpring(progressValue, {
    stiffness: 100,
    damping: 20,
  })

  // Transform progress to stroke-dashoffset
  const strokeDashoffset = useTransform(
    springProgress,
    [0, 100],
    [circumference, 0]
  )

  // Update progress animation
  useEffect(() => {
    if (!animateOnView || isIntersecting) {
      progressValue.set(prefersReducedMotion ? progress : 0)
      if (!prefersReducedMotion) {
        const timeout = setTimeout(() => {
          progressValue.set(progress)
        }, 100)
        return () => clearTimeout(timeout)
      }
    }
  }, [progress, progressValue, prefersReducedMotion, animateOnView, isIntersecting])

  // Handle completion
  useEffect(() => {
    if (progress >= 100 && !hasCompleted) {
      setHasCompleted(true)
      triggerMilestone()
      onComplete?.()
    } else if (progress < 100) {
      setHasCompleted(false)
    }
  }, [progress, hasCompleted, onComplete, triggerMilestone])

  // Unique gradient ID
  const gradientId = `progress-gradient-${Math.random().toString(36).substr(2, 9)}`

  return (
    <motion.div
      ref={containerRef}
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: config.diameter, height: config.diameter }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{
        opacity: animateOnView ? (isIntersecting ? 1 : 0) : 1,
        scale: animateOnView ? (isIntersecting ? 1 : 0.8) : 1,
      }}
      transition={{ duration: 0.5 }}
    >
      {/* SVG Ring */}
      <svg
        className={cn(
          'transform -rotate-90',
          hasCompleted && !prefersReducedMotion && colors.glow
        )}
        width={config.diameter}
        height={config.diameter}
      >
        {/* Gradient definition for gradient variant */}
        {variant === 'gradient' && (
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#14b8a6" />
              <stop offset="50%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
        )}

        {/* Background ring */}
        <circle
          className={colors.bg}
          cx={config.diameter / 2}
          cy={config.diameter / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
        />

        {/* Progress ring */}
        <motion.circle
          className={variant !== 'gradient' ? colors.stroke : ''}
          cx={config.diameter / 2}
          cy={config.diameter / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{
            strokeDashoffset,
            stroke: variant === 'gradient' ? `url(#${gradientId})` : undefined,
          }}
        />

        {/* Milestone markers */}
        {milestones?.map((milestone) => {
          const angle = (milestone / 100) * 360 - 90
          const x = config.diameter / 2 + (radius + strokeWidth / 2 + 4) * Math.cos((angle * Math.PI) / 180)
          const y = config.diameter / 2 + (radius + strokeWidth / 2 + 4) * Math.sin((angle * Math.PI) / 180)

          return (
            <circle
              key={milestone}
              cx={x}
              cy={y}
              r={3}
              className={cn(
                progress >= milestone ? 'fill-current' : 'fill-gray-300',
                variant !== 'gradient' && colors.stroke.replace('stroke-', 'text-')
              )}
              style={variant === 'gradient' && progress >= milestone ? { fill: '#14b8a6' } : undefined}
            />
          )
        })}
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {children || (showLabel && (
          <motion.div
            className={cn(
              config.labelSize,
              'font-bold text-gray-900'
            )}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {label || `${Math.round(progress)}%`}
          </motion.div>
        ))}
      </div>

      {/* Completion celebration */}
      <AnimatedCelebration show={hasCompleted && !prefersReducedMotion} />
    </motion.div>
  )
}

// Completion celebration animation
function AnimatedCelebration({ show }: { show: boolean }) {
  if (!show) return null

  return (
    <motion.div
      className="absolute inset-0 pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute inset-0 rounded-full border-2 border-teal-400"
          initial={{ scale: 1, opacity: 0.8 }}
          animate={{ scale: 1.5 + i * 0.3, opacity: 0 }}
          transition={{
            duration: 1,
            delay: i * 0.2,
            repeat: 2,
            repeatDelay: 0.5,
          }}
        />
      ))}
    </motion.div>
  )
}

/**
 * StatProgressRing - Progress ring with stat label and title
 */
interface StatProgressRingProps extends Omit<ProgressRingProps, 'label' | 'showLabel' | 'progress'> {
  title: string
  current: number
  target: number
  unit?: string
}

export function StatProgressRing({
  title,
  current,
  target,
  unit = '',
  ...props
}: StatProgressRingProps) {
  const progress = Math.min((current / target) * 100, 100)

  return (
    <div className="flex flex-col items-center gap-2">
      <ProgressRing
        progress={progress}
        {...props}
        label={
          <div className="flex flex-col items-center">
            <span className="font-bold">{current}</span>
            <span className="text-xs text-gray-500">/ {target}{unit}</span>
          </div>
        }
      />
      <span className="text-sm font-medium text-gray-700">{title}</span>
    </div>
  )
}

/**
 * MultiProgressRing - Multiple concentric progress rings
 */
interface MultiProgressRingProps {
  rings: Array<{
    progress: number
    variant: 'teal' | 'purple' | 'orange' | 'blue'
    label?: string
  }>
  size?: 'md' | 'lg' | 'xl'
  className?: string
}

export function MultiProgressRing({
  rings,
  size = 'lg',
  className,
}: MultiProgressRingProps) {
  const prefersReducedMotion = useReducedMotion()
  const config = sizeConfig[size]
  const baseStroke = 8
  const gap = 4

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: config.diameter, height: config.diameter }}
    >
      <svg
        className="transform -rotate-90"
        width={config.diameter}
        height={config.diameter}
      >
        {rings.map((ring, index) => {
          const strokeWidth = baseStroke
          const radius = (config.diameter / 2) - (strokeWidth / 2) - (index * (strokeWidth + gap))
          const circumference = 2 * Math.PI * radius
          const offset = circumference - (ring.progress / 100) * circumference
          const colors = colorVariants[ring.variant]

          return (
            <g key={index}>
              {/* Background */}
              <circle
                className={colors.bg}
                cx={config.diameter / 2}
                cy={config.diameter / 2}
                r={radius}
                fill="none"
                strokeWidth={strokeWidth}
              />
              {/* Progress */}
              <motion.circle
                className={colors.stroke}
                cx={config.diameter / 2}
                cy={config.diameter / 2}
                r={radius}
                fill="none"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: prefersReducedMotion ? offset : offset }}
                transition={{ duration: 1.5, delay: index * 0.2, ease: 'easeOut' }}
              />
            </g>
          )
        })}
      </svg>

      {/* Legend */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center gap-0.5">
          {rings.map((ring, index) => (
            <div key={index} className="flex items-center gap-1 text-xs">
              <div className={cn(
                'w-2 h-2 rounded-full',
                colorVariants[ring.variant].stroke.replace('stroke-', 'bg-')
              )} />
              <span className="text-gray-600">{ring.label || `${Math.round(ring.progress)}%`}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * ProgressBar - Horizontal progress bar variant
 */
interface ProgressBarProps {
  progress: number
  variant?: 'teal' | 'purple' | 'orange' | 'blue' | 'gradient'
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  label?: string
  milestones?: number[]
  animateOnView?: boolean
  className?: string
}

const barSizes = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
}

const barColors = {
  teal: 'bg-teal-500',
  purple: 'bg-purple-500',
  orange: 'bg-orange-500',
  blue: 'bg-blue-500',
  gradient: 'bg-gradient-to-r from-teal-500 via-cyan-500 to-purple-500',
}

export function ProgressBar({
  progress,
  variant = 'teal',
  size = 'md',
  showLabel = false,
  label,
  milestones,
  animateOnView = true,
  className,
}: ProgressBarProps) {
  const prefersReducedMotion = useReducedMotion()
  const { ref: observerRef, isIntersecting } = useIntersectionObserver({
    threshold: 0.5,
    triggerOnce: true,
  })
  const barRef = observerRef as React.RefObject<HTMLDivElement>

  const shouldAnimate = !animateOnView || isIntersecting

  return (
    <div ref={barRef} className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm text-gray-600">{label}</span>
          <span className="text-sm font-medium text-gray-900">{Math.round(progress)}%</span>
        </div>
      )}

      <div className={cn('relative w-full bg-gray-100 rounded-full overflow-hidden', barSizes[size])}>
        {/* Progress fill */}
        <motion.div
          className={cn('h-full rounded-full', barColors[variant])}
          initial={{ width: 0 }}
          animate={{ width: shouldAnimate ? `${Math.min(progress, 100)}%` : 0 }}
          transition={{
            duration: prefersReducedMotion ? 0 : 1,
            ease: 'easeOut',
          }}
        />

        {/* Milestone markers */}
        {milestones?.map((milestone) => (
          <div
            key={milestone}
            className="absolute top-0 bottom-0 w-0.5 bg-white/50"
            style={{ left: `${milestone}%` }}
          />
        ))}
      </div>
    </div>
  )
}

export { sizeConfig, thicknessConfig, colorVariants }
