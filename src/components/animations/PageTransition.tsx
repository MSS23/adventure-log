'use client'

import { usePathname } from 'next/navigation'
import { motion, MotionConfig } from 'framer-motion'
import type { ReactNode } from 'react'

interface PageTransitionProps {
  children: ReactNode
  className?: string
  variant?: 'fade' | 'slide' | 'scale' | 'slideLeft' | 'slideRight'
}

const EDITORIAL_EASE = [0.22, 1, 0.36, 1] as const

/**
 * Per-route transition.
 *
 * Keyed by pathname so each navigation remounts with a fresh enter animation.
 * We deliberately do NOT use `<AnimatePresence mode="wait">` here: that serializes
 * the swap, forcing the outgoing page to finish its exit animation before the
 * incoming page renders at all — which adds up to ~0.6s of dead time to every
 * sidebar click and makes navigation feel sluggish. Rendering the new page
 * immediately with a short, non-blocking fade-up keeps the editorial feel while
 * making transitions feel instant. MotionConfig honors reduced-motion globally.
 */
export function PageTransition({ children, className }: PageTransitionProps) {
  const pathname = usePathname()

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: EDITORIAL_EASE }}
        className={className}
      >
        {children}
      </motion.div>
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
