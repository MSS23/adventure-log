'use client'

import { motion, type Variants, type HTMLMotionProps } from 'framer-motion'
import { forwardRef, type ReactNode } from 'react'

const EDITORIAL_EASE = [0.22, 1, 0.36, 1] as const

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.04,
    },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: EDITORIAL_EASE },
  },
}

type DivProps = Omit<HTMLMotionProps<'div'>, 'variants' | 'initial' | 'animate'>

interface MotionListProps extends DivProps {
  children: ReactNode
  stagger?: number
  delayChildren?: number
}

/**
 * Container that orchestrates staggered reveals for child <MotionItem /> nodes.
 * Defaults to a 50ms stagger with editorial easing.
 */
export const MotionList = forwardRef<HTMLDivElement, MotionListProps>(
  function MotionList(
    { children, stagger = 0.05, delayChildren = 0.04, ...rest },
    ref,
  ) {
    return (
      <motion.div
        ref={ref}
        initial="hidden"
        animate="show"
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: { staggerChildren: stagger, delayChildren },
          },
        }}
        {...rest}
      >
        {children}
      </motion.div>
    )
  },
)

interface MotionItemProps extends DivProps {
  children: ReactNode
  /**
   * Override the default upward translate distance. Useful for tighter rows.
   */
  rise?: number
}

export const MotionItem = forwardRef<HTMLDivElement, MotionItemProps>(
  function MotionItem({ children, rise = 14, ...rest }, ref) {
    return (
      <motion.div
        ref={ref}
        variants={{
          hidden: { opacity: 0, y: rise },
          show: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.45, ease: EDITORIAL_EASE },
          },
        }}
        {...rest}
      >
        {children}
      </motion.div>
    )
  },
)

/**
 * Standalone fade-and-rise reveal for single elements outside a list context.
 * Honors prefers-reduced-motion via framer-motion's MotionConfig (set globally).
 */
export const MotionReveal = forwardRef<HTMLDivElement, MotionItemProps & { delay?: number }>(
  function MotionReveal({ children, rise = 14, delay = 0, ...rest }, ref) {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: rise }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EDITORIAL_EASE, delay }}
        {...rest}
      >
        {children}
      </motion.div>
    )
  },
)

export { containerVariants, itemVariants, EDITORIAL_EASE }
