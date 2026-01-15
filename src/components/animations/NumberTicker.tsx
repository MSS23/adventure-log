'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useSpring, useTransform, useInView } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'

/**
 * NumberTicker - Animated counting number display
 *
 * Features:
 * - Smooth spring-based counting animation
 * - Triggers when scrolled into view
 * - Supports formatting (locale, decimals, prefix/suffix)
 * - Reduced motion support
 */

interface NumberTickerProps {
  /** Target value to count to */
  value: number
  /** Starting value (default: 0) */
  from?: number
  /** Duration in seconds (default: 1.5) */
  duration?: number
  /** Delay before animation starts (default: 0) */
  delay?: number
  /** Number of decimal places (default: 0) */
  decimals?: number
  /** Prefix (e.g., "$", "€") */
  prefix?: string
  /** Suffix (e.g., "%", "k", "+") */
  suffix?: string
  /** Locale for number formatting (default: "en-US") */
  locale?: string
  /** Additional classes */
  className?: string
  /** Direction of count (up or down) */
  direction?: 'up' | 'down'
  /** Size variant */
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  /** Color variant */
  color?: 'default' | 'teal' | 'gradient'
  /** Trigger animation only once */
  once?: boolean
}

const sizeClasses = {
  sm: 'text-lg font-semibold',
  md: 'text-2xl font-bold',
  lg: 'text-3xl font-bold',
  xl: 'text-4xl font-bold',
  '2xl': 'text-5xl font-bold',
}

const colorClasses = {
  default: 'text-gray-900',
  teal: 'text-teal-600',
  gradient: 'bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent',
}

export function NumberTicker({
  value,
  from = 0,
  duration = 1.5,
  delay = 0,
  decimals = 0,
  prefix = '',
  suffix = '',
  locale = 'en-US',
  className,
  direction = 'up',
  size = 'lg',
  color = 'default',
  once = true,
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once, margin: '-50px' })
  const prefersReducedMotion = useReducedMotion()

  const startValue = direction === 'up' ? from : value
  const endValue = direction === 'up' ? value : from

  // Spring animation for smooth counting
  const springValue = useSpring(startValue, {
    duration: duration * 1000,
    bounce: 0,
  })

  const displayValue = useTransform(springValue, (latest) => {
    const formatted = Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(latest)
    return `${prefix}${formatted}${suffix}`
  })

  useEffect(() => {
    if (isInView && !prefersReducedMotion) {
      // Add delay before starting animation
      const timeout = setTimeout(() => {
        springValue.set(endValue)
      }, delay * 1000)
      return () => clearTimeout(timeout)
    } else if (isInView && prefersReducedMotion) {
      // Immediately show final value for reduced motion
      springValue.set(endValue)
    }
  }, [isInView, endValue, springValue, delay, prefersReducedMotion])

  if (prefersReducedMotion) {
    const formatted = Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value)
    return (
      <span
        ref={ref}
        className={cn(sizeClasses[size], colorClasses[color], className)}
      >
        {prefix}{formatted}{suffix}
      </span>
    )
  }

  return (
    <motion.span
      ref={ref}
      className={cn(sizeClasses[size], colorClasses[color], className)}
    >
      {displayValue}
    </motion.span>
  )
}

/**
 * CountUpOnView - Simple wrapper that counts up when scrolled into view
 */
interface CountUpOnViewProps {
  end: number
  prefix?: string
  suffix?: string
  className?: string
  duration?: number
}

export function CountUpOnView({
  end,
  prefix = '',
  suffix = '',
  className,
  duration = 2,
}: CountUpOnViewProps) {
  return (
    <NumberTicker
      value={end}
      prefix={prefix}
      suffix={suffix}
      className={className}
      duration={duration}
    />
  )
}

/**
 * AnimatedStatNumber - Stat card number with pop animation
 */
interface AnimatedStatNumberProps {
  value: number
  label: string
  prefix?: string
  suffix?: string
  icon?: React.ReactNode
  color?: 'teal' | 'blue' | 'purple' | 'orange' | 'pink'
  className?: string
}

const statColorClasses = {
  teal: {
    bg: 'bg-gradient-to-br from-teal-50 to-teal-100',
    icon: 'text-teal-600 bg-teal-100',
    number: 'text-teal-700',
  },
  blue: {
    bg: 'bg-gradient-to-br from-blue-50 to-blue-100',
    icon: 'text-blue-600 bg-blue-100',
    number: 'text-blue-700',
  },
  purple: {
    bg: 'bg-gradient-to-br from-purple-50 to-purple-100',
    icon: 'text-purple-600 bg-purple-100',
    number: 'text-purple-700',
  },
  orange: {
    bg: 'bg-gradient-to-br from-orange-50 to-orange-100',
    icon: 'text-orange-600 bg-orange-100',
    number: 'text-orange-700',
  },
  pink: {
    bg: 'bg-gradient-to-br from-pink-50 to-pink-100',
    icon: 'text-pink-600 bg-pink-100',
    number: 'text-pink-700',
  },
}

export function AnimatedStatNumber({
  value,
  label,
  prefix = '',
  suffix = '',
  icon,
  color = 'teal',
  className,
}: AnimatedStatNumberProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-20px' })
  const colors = statColorClasses[color]

  return (
    <motion.div
      ref={ref}
      className={cn(
        'relative overflow-hidden rounded-2xl p-4 transition-all duration-300',
        colors.bg,
        'hover:-translate-y-1 hover:shadow-lg',
        className
      )}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {/* Icon */}
      {icon && (
        <div className={cn('p-2 rounded-xl w-fit mb-2', colors.icon)}>
          {icon}
        </div>
      )}

      {/* Animated number */}
      <NumberTicker
        value={value}
        prefix={prefix}
        suffix={suffix}
        className={cn('block', colors.number)}
        size="xl"
        duration={1.5}
        delay={0.2}
      />

      {/* Label */}
      <span className="text-sm text-gray-600 font-medium">{label}</span>

      {/* Shine effect on hover */}
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent group-hover:translate-x-full transition-transform duration-1000" />
    </motion.div>
  )
}

/**
 * LiveCounter - Real-time updating counter with pulse effect
 */
interface LiveCounterProps {
  value: number
  label?: string
  className?: string
  pulseOnChange?: boolean
}

export function LiveCounter({
  value,
  label,
  className,
  pulseOnChange = true,
}: LiveCounterProps) {
  const [displayValue, setDisplayValue] = useState(value)
  const [isPulsing, setIsPulsing] = useState(false)
  const prevValue = useRef(value)

  useEffect(() => {
    if (value !== prevValue.current) {
      setIsPulsing(true)
      setDisplayValue(value)
      prevValue.current = value

      const timeout = setTimeout(() => setIsPulsing(false), 300)
      return () => clearTimeout(timeout)
    }
  }, [value])

  return (
    <motion.div
      className={cn('inline-flex items-center gap-1', className)}
      animate={
        isPulsing && pulseOnChange
          ? { scale: [1, 1.2, 1] }
          : { scale: 1 }
      }
      transition={{ duration: 0.3 }}
    >
      <span className="font-bold tabular-nums">{displayValue.toLocaleString()}</span>
      {label && <span className="text-gray-500 text-sm">{label}</span>}
    </motion.div>
  )
}
