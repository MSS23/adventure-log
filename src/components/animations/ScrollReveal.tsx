'use client'

import { motion, useInView, Variants } from 'framer-motion'
import { useRef, ReactNode } from 'react'

interface ScrollRevealProps {
  children: ReactNode
  className?: string
  delay?: number
  duration?: number
  once?: boolean
  amount?: number
  direction?: 'up' | 'down' | 'left' | 'right' | 'none'
}

const directionVariants: Record<string, Variants> = {
  up: {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0 }
  },
  down: {
    hidden: { opacity: 0, y: -40 },
    visible: { opacity: 1, y: 0 }
  },
  left: {
    hidden: { opacity: 0, x: 40 },
    visible: { opacity: 1, x: 0 }
  },
  right: {
    hidden: { opacity: 0, x: -40 },
    visible: { opacity: 1, x: 0 }
  },
  none: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  }
}

export function ScrollReveal({
  children,
  className,
  delay = 0,
  duration = 0.5,
  once = true,
  amount = 0.3,
  direction = 'up'
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once, amount })

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={directionVariants[direction]}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.1, 0.25, 1]
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Staggered scroll reveal for lists
interface StaggeredScrollRevealProps {
  children: ReactNode[]
  className?: string
  itemClassName?: string
  staggerDelay?: number
  once?: boolean
}

export function StaggeredScrollReveal({
  children,
  className,
  itemClassName,
  staggerDelay = 0.1,
  once = true
}: StaggeredScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once, amount: 0.2 })

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: 0.1
          }
        }
      }}
    >
      {children.map((child, index) => (
        <motion.div
          key={index}
          className={itemClassName}
          variants={{
            hidden: { opacity: 0, y: 30, scale: 0.95 },
            visible: {
              opacity: 1,
              y: 0,
              scale: 1,
              transition: {
                type: 'spring',
                stiffness: 300,
                damping: 24
              }
            }
          }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  )
}

// Counter animation for stats
interface CounterProps {
  value: number
  duration?: number
  className?: string
  suffix?: string
  prefix?: string
}

export function Counter({
  value,
  duration = 2,
  className,
  suffix = '',
  prefix = ''
}: CounterProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, amount: 0.5 })

  return (
    <motion.span
      ref={ref}
      className={className}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : { opacity: 0 }}
    >
      {isInView ? (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {prefix}
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {value}
          </motion.span>
          {suffix}
        </motion.span>
      ) : (
        `${prefix}0${suffix}`
      )}
    </motion.span>
  )
}

// Scale reveal for cards and images
interface ScaleRevealProps {
  children: ReactNode
  className?: string
  delay?: number
  once?: boolean
}

export function ScaleReveal({
  children,
  className,
  delay = 0,
  once = true
}: ScaleRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once, amount: 0.3 })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
      transition={{
        duration: 0.5,
        delay,
        type: 'spring',
        stiffness: 300,
        damping: 24
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
