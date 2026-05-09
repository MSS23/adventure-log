'use client'

import { usePathname } from 'next/navigation'
import { AnimatePresence, motion, MotionConfig } from 'framer-motion'
import type { ReactNode } from 'react'

interface PageTransitionProps {
  children: ReactNode
  className?: string
  variant?: 'fade' | 'slide' | 'scale' | 'slideLeft' | 'slideRight'
}

const EDITORIAL_EASE = [0.22, 1, 0.36, 1] as const

/**
 * Per-route transition. AnimatePresence keyed by pathname does the swap;
 * MotionConfig honors the user's reduced-motion preference globally.
 */
export function PageTransition({ children, className }: PageTransitionProps) {
  const pathname = usePathname()

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.32, ease: EDITORIAL_EASE }}
          className={className}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </MotionConfig>
  )
}

/** Smart transition kept for API parity. */
export function SmartPageTransition({ children, className }: Omit<PageTransitionProps, 'variant'>) {
  return <PageTransition className={className}>{children}</PageTransition>
}

/** Fade-in helper for sections within a page. */
export function FadeTransition({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: EDITORIAL_EASE }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/** Slide-up for modals or drawer-style content. */
export function SlideUpTransition({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.35, ease: EDITORIAL_EASE }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
