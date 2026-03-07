'use client'

import { motion, AnimatePresence, Variants } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { ReactNode, useMemo } from 'react'
import { transitions } from '@/lib/animations/spring-configs'

interface PageTransitionProps {
  children: ReactNode
  className?: string
  variant?: 'fade' | 'slide' | 'scale' | 'slideLeft' | 'slideRight'
}

// Different page transition variants
const pageVariants: Record<string, Variants> = {
  fade: {
    initial: { opacity: 0 },
    enter: {
      opacity: 1,
      transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }
    },
    exit: {
      opacity: 0,
      transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }
    }
  },
  slide: {
    initial: { opacity: 0, y: 20 },
    enter: {
      opacity: 1,
      y: 0,
      transition: { ...transitions.natural, when: 'beforeChildren' as const }
    },
    exit: {
      opacity: 0,
      y: -20,
      transition: { ...transitions.natural }
    }
  },
  scale: {
    initial: { opacity: 0, scale: 0.96 },
    enter: {
      opacity: 1,
      scale: 1,
      transition: { ...transitions.natural, when: 'beforeChildren' as const }
    },
    exit: {
      opacity: 0,
      scale: 1.02,
      transition: { duration: 0.2 }
    }
  },
  slideLeft: {
    initial: { opacity: 0, x: 30 },
    enter: {
      opacity: 1,
      x: 0,
      transition: { ...transitions.natural }
    },
    exit: {
      opacity: 0,
      x: -30,
      transition: { duration: 0.2 }
    }
  },
  slideRight: {
    initial: { opacity: 0, x: -30 },
    enter: {
      opacity: 1,
      x: 0,
      transition: { ...transitions.natural }
    },
    exit: {
      opacity: 0,
      x: 30,
      transition: { duration: 0.2 }
    }
  }
}

// Route patterns for determining transition direction
const getRouteDepth = (path: string): number => {
  return path.split('/').filter(Boolean).length
}

export function PageTransition({ children, className, variant = 'slide' }: PageTransitionProps) {
  const pathname = usePathname()

  const variants = useMemo(() => pageVariants[variant], [variant])

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial="initial"
        animate="enter"
        exit="exit"
        variants={variants}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

/**
 * Smart page transition that determines direction based on navigation
 */
export function SmartPageTransition({ children, className }: Omit<PageTransitionProps, 'variant'>) {
  const pathname = usePathname()

  // Simple fade for now - could be enhanced with navigation direction detection
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={transitions.natural}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

// Simple fade transition for sections within pages
export function FadeTransition({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Slide up animation for modals and overlays
export function SlideUpTransition({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 25
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
