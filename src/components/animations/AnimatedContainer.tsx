'use client'

import { motion, HTMLMotionProps, Variants } from 'framer-motion'
import { ReactNode } from 'react'

// Animation variants for different effects
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 }
}

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1 }
}

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 }
}

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0 }
}

// Stagger container for children animations
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1
    }
  }
}

// Individual stagger item
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24
    }
  }
}

interface AnimatedContainerProps extends Omit<HTMLMotionProps<'div'>, 'variants'> {
  children: ReactNode
  variant?: 'fadeInUp' | 'fadeIn' | 'scaleIn' | 'slideInLeft' | 'slideInRight' | 'staggerContainer' | 'staggerItem'
  delay?: number
  duration?: number
  className?: string
}

const variantMap: Record<string, Variants> = {
  fadeInUp,
  fadeIn,
  scaleIn,
  slideInLeft,
  slideInRight,
  staggerContainer,
  staggerItem
}

export function AnimatedContainer({
  children,
  variant = 'fadeInUp',
  delay = 0,
  duration = 0.4,
  className,
  ...props
}: AnimatedContainerProps) {
  const variants = variantMap[variant]

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={variants}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.1, 0.25, 1]
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

// Specialized component for staggered lists
interface StaggerListProps {
  children: ReactNode
  className?: string
  staggerDelay?: number
}

export function StaggerList({ children, className, staggerDelay = 0.08 }: StaggerListProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
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
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Individual item for stagger list
interface StaggerItemProps extends Omit<HTMLMotionProps<'div'>, 'variants'> {
  children: ReactNode
  className?: string
}

export function StaggerItem({ children, className, ...props }: StaggerItemProps) {
  return (
    <motion.div
      variants={staggerItem}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

// Page transition wrapper
interface PageTransitionProps {
  children: ReactNode
  className?: string
}

export function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{
        duration: 0.3,
        ease: [0.25, 0.1, 0.25, 1]
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Scroll-triggered animation wrapper
interface ScrollAnimationProps {
  children: ReactNode
  className?: string
  once?: boolean
  amount?: number
}

export function ScrollAnimation({ children, className, once = true, amount = 0.3 }: ScrollAnimationProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount }}
      transition={{
        duration: 0.5,
        ease: [0.25, 0.1, 0.25, 1]
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Hover scale effect
interface HoverScaleProps extends Omit<HTMLMotionProps<'div'>, 'whileHover' | 'whileTap'> {
  children: ReactNode
  scale?: number
  className?: string
}

export function HoverScale({ children, scale = 1.02, className, ...props }: HoverScaleProps) {
  return (
    <motion.div
      whileHover={{ scale }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

// Tab content transition
interface TabContentProps {
  children: ReactNode
  activeKey: string
  className?: string
}

export function TabContent({ children, activeKey, className }: TabContentProps) {
  return (
    <motion.div
      key={activeKey}
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{
        duration: 0.25,
        ease: [0.25, 0.1, 0.25, 1]
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
