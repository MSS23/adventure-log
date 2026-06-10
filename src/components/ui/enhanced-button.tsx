'use client'

import * as React from 'react'
import { motion, HTMLMotionProps } from 'framer-motion'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { transitions } from '@/lib/animations/spring-configs'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-base font-medium transition-colors duration-200 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg:not([class*="size-"])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md',
        destructive:
          'bg-destructive text-white hover:bg-destructive/90 shadow-sm hover:shadow-md focus-visible:ring-destructive/40',
        outline:
          'border border-border bg-card text-foreground hover:bg-muted hover:border-primary/30',
        secondary:
          'bg-secondary text-secondary-foreground border border-border hover:bg-muted',
        ghost: 'text-muted-foreground hover:text-foreground hover:bg-muted',
        link: 'text-primary underline-offset-4 hover:underline',
        glow: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md',
      },
      size: {
        default: 'h-11 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-10 rounded-lg gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-12 rounded-xl px-6 has-[>svg]:px-4',
        icon: 'size-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

interface EnhancedButtonProps
  extends Omit<HTMLMotionProps<'button'>, 'children'>,
    VariantProps<typeof buttonVariants> {
  children?: React.ReactNode
  asChild?: boolean
  ripple?: boolean
  loading?: boolean
  loadingText?: string
}

/**
 * Enhanced Button with press feedback, optional ripple effect, and loading state
 */
export function EnhancedButton({
  className,
  variant,
  size,
  asChild = false,
  ripple = true,
  loading = false,
  loadingText,
  children,
  disabled,
  onClick,
  ...props
}: EnhancedButtonProps) {
  const [ripples, setRipples] = React.useState<Array<{ x: number; y: number; id: number }>>([])

  const handleClick = React.useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (ripple && !disabled && !loading) {
        const rect = e.currentTarget.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        const id = Date.now()

        setRipples((prev) => [...prev, { x, y, id }])
        setTimeout(() => {
          setRipples((prev) => prev.filter((r) => r.id !== id))
        }, 600)
      }

      if (!disabled && !loading && onClick) {
        onClick(e)
      }
    },
    [ripple, disabled, loading, onClick]
  )

  const content = loading ? (
    <>
      <motion.span
        className="inline-block h-4 w-4 rounded-full border-2 border-current border-t-transparent"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />
      {loadingText || children}
    </>
  ) : (
    children
  )

  if (asChild) {
    return (
      <Slot className={cn(buttonVariants({ variant, size, className }))}>
        {children}
      </Slot>
    )
  }

  return (
    <motion.button
      className={cn(
        buttonVariants({ variant, size, className }),
        'relative overflow-hidden'
      )}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={transitions.snap}
      disabled={disabled || loading}
      onClick={handleClick}
      {...props}
    >
      {/* Ripple effects */}
      {ripple &&
        ripples.map((r) => (
          <motion.span
            key={r.id}
            className="absolute rounded-full bg-white/30 pointer-events-none"
            style={{ left: r.x, top: r.y }}
            initial={{ width: 0, height: 0, x: 0, y: 0, opacity: 0.5 }}
            animate={{
              width: 200,
              height: 200,
              x: -100,
              y: -100,
              opacity: 0,
            }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        ))}
      {content}
    </motion.button>
  )
}

/**
 * Icon button with enhanced animations
 */
export function IconButton({
  className,
  children,
  variant = 'ghost',
  ...props
}: Omit<EnhancedButtonProps, 'size'>) {
  return (
    <EnhancedButton
      className={cn('size-10 p-0', className)}
      variant={variant}
      size="icon"
      ripple={false}
      {...props}
    >
      {children}
    </EnhancedButton>
  )
}

/**
 * Floating action button
 */
export function FAB({
  className,
  children,
  extended,
  label,
  ...props
}: EnhancedButtonProps & { extended?: boolean; label?: string }) {
  return (
    <motion.button
      className={cn(
        'fixed bottom-6 right-6 z-50 rounded-full bg-primary text-primary-foreground shadow-lg',
        'flex items-center justify-center gap-2',
        'hover:bg-primary/90 hover:shadow-xl',
        'active:scale-95 transition-colors',
        extended ? 'h-14 px-6' : 'size-14',
        className
      )}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={transitions.snap}
      {...props}
    >
      {children}
      {extended && label && <span className="font-medium">{label}</span>}
    </motion.button>
  )
}

/**
 * Button group with shared styling
 */
export function ButtonGroup({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'inline-flex rounded-xl overflow-hidden border border-border',
        '[&>button]:rounded-none [&>button]:border-0',
        '[&>button:not(:last-child)]:border-r [&>button:not(:last-child)]:border-border',
        className
      )}
    >
      {children}
    </div>
  )
}

export { buttonVariants }
