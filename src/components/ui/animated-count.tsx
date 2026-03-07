'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion'
import { cn } from '@/lib/utils'

interface AnimatedCounterProps {
  value: number
  className?: string
  duration?: number
  formatNumber?: boolean
}

/**
 * Animated counter that smoothly transitions between numbers
 * with a flip/slide animation
 */
export function AnimatedCounter({
  value,
  className,
  duration = 0.5,
  formatNumber = true,
}: AnimatedCounterProps) {
  const springValue = useSpring(value, {
    stiffness: 100,
    damping: 30,
    duration: duration * 1000,
  })

  const displayValue = useTransform(springValue, (v) => {
    const num = Math.round(v)
    if (formatNumber) {
      return formatCount(num)
    }
    return num.toString()
  })

  useEffect(() => {
    springValue.set(value)
  }, [value, springValue])

  return (
    <motion.span className={cn('tabular-nums', className)}>
      {displayValue}
    </motion.span>
  )
}

/**
 * Flip-style counter where each digit animates independently
 */
export function FlipCounter({
  value,
  className,
}: {
  value: number
  className?: string
}) {
  const prevValue = useRef(value)
  const digits = value.toString().split('')
  const prevDigits = prevValue.current.toString().split('')

  useEffect(() => {
    prevValue.current = value
  }, [value])

  // Pad arrays to same length
  const maxLength = Math.max(digits.length, prevDigits.length)
  while (digits.length < maxLength) digits.unshift('0')
  while (prevDigits.length < maxLength) prevDigits.unshift('0')

  return (
    <span className={cn('inline-flex tabular-nums', className)}>
      {digits.map((digit, index) => (
        <AnimatePresence mode="popLayout" key={index}>
          <motion.span
            key={`${index}-${digit}`}
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{
              type: 'spring',
              stiffness: 500,
              damping: 30,
              delay: index * 0.05,
            }}
            className="inline-block"
          >
            {digit}
          </motion.span>
        </AnimatePresence>
      ))}
    </span>
  )
}

/**
 * Like counter with heart pop animation
 */
export function LikeCounter({
  count,
  isLiked,
  className,
}: {
  count: number
  isLiked: boolean
  className?: string
}) {
  const [prevCount, setPrevCount] = useState(count)
  const direction = count > prevCount ? 1 : -1

  useEffect(() => {
    setPrevCount(count)
  }, [count])

  return (
    <div className={cn('relative overflow-hidden', className)}>
      <AnimatePresence mode="popLayout">
        <motion.span
          key={count}
          initial={{ y: direction * 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -direction * 20, opacity: 0 }}
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 30,
          }}
          className={cn(
            'inline-block tabular-nums',
            isLiked && 'text-red-500'
          )}
        >
          {formatCount(count)}
        </motion.span>
      </AnimatePresence>
    </div>
  )
}

/**
 * Stat counter with optional label
 */
export function StatCounter({
  value,
  label,
  className,
  animate = true,
}: {
  value: number
  label?: string
  className?: string
  animate?: boolean
}) {
  return (
    <div className={cn('text-center', className)}>
      {animate ? (
        <AnimatedCounter
          value={value}
          className="text-2xl font-bold"
        />
      ) : (
        <span className="text-2xl font-bold tabular-nums">
          {formatCount(value)}
        </span>
      )}
      {label && (
        <p className="text-sm text-gray-500 mt-1">{label}</p>
      )}
    </div>
  )
}

/**
 * Badge counter with pulse animation on change
 */
export function BadgeCounter({
  count,
  className,
  maxCount = 99,
}: {
  count: number
  className?: string
  maxCount?: number
}) {
  const displayCount = count > maxCount ? `${maxCount}+` : count.toString()
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (count > 0) {
      setIsAnimating(true)
      const timer = setTimeout(() => setIsAnimating(false), 300)
      return () => clearTimeout(timer)
    }
  }, [count])

  if (count <= 0) return null

  return (
    <motion.span
      className={cn(
        'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-medium text-white bg-red-500 rounded-full',
        className
      )}
      animate={isAnimating ? { scale: [1, 1.2, 1] } : {}}
      transition={{ duration: 0.3 }}
    >
      {displayCount}
    </motion.span>
  )
}

/**
 * Countdown timer display
 */
export function CountdownDisplay({
  seconds,
  className,
}: {
  seconds: number
  className?: string
}) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  const format = (n: number) => n.toString().padStart(2, '0')

  return (
    <span className={cn('tabular-nums font-mono', className)}>
      {hours > 0 && (
        <>
          <FlipCounter value={hours} />
          <span className="mx-0.5">:</span>
        </>
      )}
      <FlipCounter value={minutes} />
      <span className="mx-0.5">:</span>
      <FlipCounter value={secs} />
    </span>
  )
}

// Helper function to format large numbers
function formatCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`
  }
  return count.toString()
}
