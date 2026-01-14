'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface AnimatedInputProps extends React.ComponentProps<'input'> {
  label?: string
  error?: string
  success?: boolean
}

export function AnimatedInput({
  className,
  label,
  error,
  success,
  type,
  onFocus,
  onBlur,
  ...props
}: AnimatedInputProps) {
  const [isFocused, setIsFocused] = React.useState(false)

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true)
    onFocus?.(e)
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false)
    onBlur?.(e)
  }

  return (
    <div className="relative w-full">
      {label && (
        <motion.label
          className="block text-sm font-medium text-gray-700 mb-1.5"
          initial={{ y: 0 }}
          animate={{ y: isFocused ? -2 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        >
          {label}
        </motion.label>
      )}

      <div className="relative">
        {/* Glow effect */}
        <motion.div
          className={cn(
            "absolute -inset-0.5 rounded-lg opacity-0 blur-sm pointer-events-none",
            success ? "bg-green-400" : error ? "bg-red-400" : "bg-teal-400"
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: isFocused ? 0.3 : 0 }}
          transition={{ duration: 0.2 }}
        />

        <motion.div
          initial={{ scale: 1 }}
          animate={{ scale: isFocused ? 1.01 : 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          <input
            type={type}
            className={cn(
              "relative w-full h-10 px-3 py-2 text-base rounded-lg border bg-white",
              "placeholder:text-gray-400 text-gray-900",
              "transition-all duration-200 outline-none",
              "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
              error
                ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                : success
                ? "border-green-300 focus:border-green-500 focus:ring-2 focus:ring-green-200"
                : "border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-200",
              className
            )}
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...props}
          />
        </motion.div>
      </div>

      {/* Error message with animation */}
      <motion.div
        initial={{ opacity: 0, y: -5, height: 0 }}
        animate={{
          opacity: error ? 1 : 0,
          y: error ? 0 : -5,
          height: error ? 'auto' : 0
        }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden"
      >
        {error && (
          <p className="text-sm text-red-500 mt-1.5">{error}</p>
        )}
      </motion.div>

      {/* Success indicator */}
      {success && !error && (
        <motion.div
          className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 15 }}
        >
          <svg
            className="h-5 w-5 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </motion.div>
      )}
    </div>
  )
}

// Animated textarea component
interface AnimatedTextareaProps extends React.ComponentProps<'textarea'> {
  label?: string
  error?: string
}

export function AnimatedTextarea({
  className,
  label,
  error,
  onFocus,
  onBlur,
  ...props
}: AnimatedTextareaProps) {
  const [isFocused, setIsFocused] = React.useState(false)

  const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setIsFocused(true)
    onFocus?.(e)
  }

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setIsFocused(false)
    onBlur?.(e)
  }

  return (
    <div className="relative w-full">
      {label && (
        <motion.label
          className="block text-sm font-medium text-gray-700 mb-1.5"
          initial={{ y: 0 }}
          animate={{ y: isFocused ? -2 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        >
          {label}
        </motion.label>
      )}

      <div className="relative">
        {/* Glow effect */}
        <motion.div
          className={cn(
            "absolute -inset-0.5 rounded-lg opacity-0 blur-sm pointer-events-none",
            error ? "bg-red-400" : "bg-teal-400"
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: isFocused ? 0.3 : 0 }}
          transition={{ duration: 0.2 }}
        />

        <motion.div
          initial={{ scale: 1 }}
          animate={{ scale: isFocused ? 1.005 : 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          <textarea
            className={cn(
              "relative w-full px-3 py-2 text-base rounded-lg border bg-white resize-none",
              "placeholder:text-gray-400 text-gray-900",
              "transition-all duration-200 outline-none",
              "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
              error
                ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                : "border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-200",
              className
            )}
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...props}
          />
        </motion.div>
      </div>

      {/* Error message with animation */}
      <motion.div
        initial={{ opacity: 0, y: -5, height: 0 }}
        animate={{
          opacity: error ? 1 : 0,
          y: error ? 0 : -5,
          height: error ? 'auto' : 0
        }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden"
      >
        {error && (
          <p className="text-sm text-red-500 mt-1.5">{error}</p>
        )}
      </motion.div>
    </div>
  )
}
