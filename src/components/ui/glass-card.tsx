'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

/**
 * GlassCard - Modern glassmorphism card component with multiple variants
 *
 * Variants:
 * - default: Standard glass effect with subtle blur
 * - glass: Heavy glass effect with strong blur
 * - frost: Frosted gradient glass
 * - elevated: Solid white with deep shadow
 * - featured: Teal-tinted glass for highlights
 * - solid: Traditional solid background (no glass)
 *
 * Glow options add colored shadow effects on hover
 */

const glassCardVariants = cva(
  'rounded-2xl transition-all duration-300 overflow-hidden',
  {
    variants: {
      variant: {
        default: 'bg-white/80 dark:bg-stone-900/80 backdrop-blur-md border border-stone-200/30 dark:border-stone-700/30 shadow-lg',
        glass: 'bg-white/40 dark:bg-stone-900/40 backdrop-blur-xl border border-white/30 dark:border-stone-700/20 shadow-xl',
        frost: 'bg-gradient-to-br from-white/60 to-white/30 dark:from-stone-900/60 dark:to-stone-900/30 backdrop-blur-lg border border-white/40 dark:border-stone-700/30',
        elevated: 'bg-white dark:bg-stone-900 shadow-2xl border border-stone-100 dark:border-stone-800',
        featured: 'bg-gradient-to-br from-amber-50/80 to-orange-50/80 dark:from-amber-950/30 dark:to-orange-950/30 backdrop-blur-md border-2 border-amber-200/50 dark:border-amber-800/30',
        solid: 'bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 shadow-sm',
        dark: 'bg-stone-900/80 backdrop-blur-xl border border-stone-700/50 text-white',
      },
      glow: {
        none: '',
        subtle: 'hover:shadow-amber-500/10',
        teal: 'hover:shadow-xl hover:shadow-amber-500/20 hover:border-amber-300/50',
        purple: 'hover:shadow-xl hover:shadow-purple-500/20 hover:border-purple-300/50',
        orange: 'hover:shadow-xl hover:shadow-orange-500/20 hover:border-orange-300/50',
        rainbow: 'hover:shadow-xl hover:shadow-pink-500/20',
      },
      hover: {
        none: '',
        lift: 'hover:-translate-y-1',
        scale: 'hover:scale-[1.02]',
        glow: 'hover:ring-2 hover:ring-amber-500/20',
        border: 'hover:border-amber-400/60',
      },
      padding: {
        none: '',
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
        xl: 'p-8',
      },
      interactive: {
        true: 'cursor-pointer active:scale-[0.98]',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      glow: 'none',
      hover: 'none',
      padding: 'lg',
      interactive: false,
    },
  }
)

export interface GlassCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof glassCardVariants> {
  children?: React.ReactNode
  /** Optional animated entrance */
  animate?: boolean
  /** Stagger delay for list animations */
  staggerIndex?: number
}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  (
    {
      className,
      variant,
      glow,
      hover,
      padding,
      interactive,
      animate = false,
      staggerIndex = 0,
      children,
      ...props
    },
    ref
  ) => {
    const cardClassName = cn(
      glassCardVariants({ variant, glow, hover, padding, interactive }),
      className
    )

    if (animate) {
      return (
        <motion.div
          ref={ref}
          className={cardClassName}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 24,
            delay: staggerIndex * 0.08,
          }}
          whileHover={
            hover === 'lift'
              ? { y: -4, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)' }
              : hover === 'scale'
              ? { scale: 1.02 }
              : undefined
          }
        >
          {children}
        </motion.div>
      )
    }

    return (
      <div ref={ref} className={cardClassName} {...props}>
        {children}
      </div>
    )
  }
)

GlassCard.displayName = 'GlassCard'

/**
 * GlassCardHeader - Card header section with optional gradient underline
 */
const GlassCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { gradient?: boolean }
>(({ className, gradient = false, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex flex-col space-y-1.5 pb-4',
      gradient && 'border-b border-gradient-to-r from-amber-200/50 via-transparent to-orange-200/50',
      className
    )}
    {...props}
  />
))
GlassCardHeader.displayName = 'GlassCardHeader'

/**
 * GlassCardTitle - Card title with optional gradient text
 */
const GlassCardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement> & { gradient?: boolean }
>(({ className, gradient = false, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      'text-xl font-semibold leading-none tracking-tight',
      gradient && 'bg-gradient-to-r from-stone-900 via-stone-700 to-stone-900 dark:from-stone-100 dark:via-stone-300 dark:to-stone-100 bg-clip-text text-transparent',
      className
    )}
    {...props}
  />
))
GlassCardTitle.displayName = 'GlassCardTitle'

/**
 * GlassCardDescription - Subtle description text
 */
const GlassCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-stone-500 dark:text-stone-400', className)}
    {...props}
  />
))
GlassCardDescription.displayName = 'GlassCardDescription'

/**
 * GlassCardContent - Main content area
 */
const GlassCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('', className)} {...props} />
))
GlassCardContent.displayName = 'GlassCardContent'

/**
 * GlassCardFooter - Footer with actions
 */
const GlassCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center pt-4 border-t border-stone-200/50 dark:border-stone-700/30', className)}
    {...props}
  />
))
GlassCardFooter.displayName = 'GlassCardFooter'

/**
 * AnimatedGlassCard - Pre-configured animated glass card
 */
const AnimatedGlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ children, ...props }, ref) => (
    <GlassCard ref={ref} animate hover="lift" glow="teal" {...props}>
      {children}
    </GlassCard>
  )
)
AnimatedGlassCard.displayName = 'AnimatedGlassCard'

/**
 * FeaturedGlassCard - Pre-configured featured card with teal glow
 */
const FeaturedGlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ children, ...props }, ref) => (
    <GlassCard
      ref={ref}
      variant="featured"
      hover="lift"
      glow="teal"
      animate
      {...props}
    >
      {children}
    </GlassCard>
  )
)
FeaturedGlassCard.displayName = 'FeaturedGlassCard'

export {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
  GlassCardContent,
  GlassCardFooter,
  AnimatedGlassCard,
  FeaturedGlassCard,
  glassCardVariants,
}
