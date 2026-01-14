'use client'

import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'

interface AnimatedEmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  className?: string
  iconColor?: string
  iconBgColor?: string
}

export function AnimatedEmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
  iconColor = 'text-gray-400',
  iconBgColor = 'bg-gray-100'
}: AnimatedEmptyStateProps) {
  return (
    <motion.div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-6 text-center",
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {/* Floating icon animation */}
      <motion.div
        className={cn(
          "relative p-6 rounded-full mb-6",
          iconBgColor
        )}
        animate={{
          y: [0, -8, 0],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        {/* Subtle pulse ring */}
        <motion.div
          className="absolute inset-0 rounded-full bg-gray-200"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0, 0.5]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        <motion.div
          initial={{ rotate: 0 }}
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <Icon className={cn("h-12 w-12 relative z-10", iconColor)} />
        </motion.div>
      </motion.div>

      {/* Title with stagger */}
      <motion.h3
        className="text-xl font-semibold text-gray-900 mb-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
      >
        {title}
      </motion.h3>

      {/* Description */}
      {description && (
        <motion.p
          className="text-gray-500 max-w-md"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          {description}
        </motion.p>
      )}

      {/* Action button */}
      {actionLabel && onAction && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="mt-6"
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              onClick={onAction}
              className="bg-teal-500 hover:bg-teal-600 text-white px-6"
            >
              {actionLabel}
            </Button>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  )
}

// Compact version for inline use
interface CompactEmptyStateProps {
  icon: LucideIcon
  message: string
  className?: string
}

export function CompactEmptyState({
  icon: Icon,
  message,
  className
}: CompactEmptyStateProps) {
  return (
    <motion.div
      className={cn(
        "flex items-center justify-center gap-3 py-8 text-gray-500",
        className
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        animate={{ rotate: [0, 10, -10, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <Icon className="h-5 w-5" />
      </motion.div>
      <span className="text-sm">{message}</span>
    </motion.div>
  )
}

// Loading dots animation
export function LoadingDots({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center gap-1", className)}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 bg-teal-500 rounded-full"
          animate={{
            y: [0, -8, 0],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  )
}
