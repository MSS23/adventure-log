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
      // Calm field-notebook surfaces — flat, bordered; shadow only on hover
      variant: {
        default: 'bg-card border border-border',
        glass: 'bg-card border border-border',
        frost: 'bg-muted/50 border border-border',
        elevated: 'bg-card border border-border',
        featured: 'bg-primary/5 border border-primary/20',
        solid: 'bg-card border border-border',
        dark: 'bg-[color:var(--background)]/85 backdrop-blur-xl border border-[color:var(--border)] text-[color:var(--foreground)]',
      },
      glow: {
        none: '',
        subtle: 'hover:shadow-md hover:border-primary/30',
        teal: 'hover:shadow-md hover:border-primary/30',
        purple: 'hover:shadow-md hover:border-primary/30',
        orange: 'hover:shadow-md hover:border-primary/30',
        rainbow: 'hover:shadow-md hover:border-primary/30',
      },
      hover: {
        none: '',
        lift: 'hover:-translate-y-0.5',
        scale: 'hover:scale-[1.01]',
        glow: 'hover:ring-2 hover:ring-ring/20',
        border: 'hover:border-primary/40',
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
              ? { y: -2, boxShadow: '0 10px 24px rgba(26, 20, 14, 0.08)' }
              : hover === 'scale'
              ? { scale: 1.01 }
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
      gradient && 'border-b border-border',
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
      'font-heading text-xl font-semibold leading-none tracking-tight text-foreground',
      // gradient text retired in the calm redesign — prop kept for API compatibility
      gradient && 'text-foreground',
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
    className={cn('text-sm text-muted-foreground', className)}
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
    className={cn('flex items-center pt-4 border-t border-border', className)}
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
