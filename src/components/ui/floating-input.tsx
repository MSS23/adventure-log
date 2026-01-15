'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Check, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { transitions } from '@/lib/animations/spring-configs'

interface FloatingInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  success?: boolean
  helperText?: string
  icon?: React.ReactNode
  showPasswordToggle?: boolean
}

export const FloatingInput = React.forwardRef<HTMLInputElement, FloatingInputProps>(
  (
    {
      className,
      label,
      error,
      success,
      helperText,
      icon,
      type = 'text',
      showPasswordToggle,
      disabled,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = React.useState(false)
    const [hasValue, setHasValue] = React.useState(!!props.value || !!props.defaultValue)
    const [showPassword, setShowPassword] = React.useState(false)

    const isFloating = isFocused || hasValue
    const actualType = showPasswordToggle && type === 'password'
      ? (showPassword ? 'text' : 'password')
      : type

    return (
      <div className={cn('relative', className)}>
        {/* Input container */}
        <div className="relative">
          {/* Leading icon */}
          {icon && (
            <div className={cn(
              'absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors',
              isFocused && 'text-teal-500',
              error && 'text-red-500',
              success && 'text-green-500'
            )}>
              {icon}
            </div>
          )}

          {/* Floating label */}
          <motion.label
            className={cn(
              'absolute pointer-events-none transition-colors duration-200',
              icon ? 'left-10' : 'left-3',
              isFloating
                ? 'text-xs font-medium'
                : 'text-base text-gray-500',
              isFocused && !error && !success && 'text-teal-600',
              error && 'text-red-500',
              success && 'text-green-600',
              disabled && 'text-gray-400'
            )}
            initial={false}
            animate={{
              y: isFloating ? -24 : 0,
              scale: isFloating ? 0.85 : 1,
              x: isFloating && icon ? -28 : 0,
            }}
            transition={transitions.snap}
          >
            {label}
          </motion.label>

          {/* Input field */}
          <input
            ref={ref}
            type={actualType}
            disabled={disabled}
            className={cn(
              'w-full h-12 px-3 pt-2 pb-2 text-base bg-white border rounded-lg outline-none transition-all duration-200',
              'placeholder:text-transparent',
              icon && 'pl-10',
              (showPasswordToggle || error || success) && 'pr-10',
              // Default state
              'border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20',
              // Error state
              error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
              // Success state
              success && 'border-green-500 focus:border-green-500 focus:ring-green-500/20',
              // Disabled state
              disabled && 'bg-gray-50 cursor-not-allowed opacity-60',
            )}
            onFocus={() => setIsFocused(true)}
            onBlur={(e) => {
              setIsFocused(false)
              setHasValue(!!e.target.value)
            }}
            onChange={(e) => {
              setHasValue(!!e.target.value)
              props.onChange?.(e)
            }}
            {...props}
          />

          {/* Trailing icon/button area */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {/* Password toggle */}
            {showPasswordToggle && type === 'password' && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            )}

            {/* Status icons */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  key="error"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={transitions.snap}
                >
                  <AlertCircle className="h-4 w-4 text-red-500" />
                </motion.div>
              )}
              {success && !error && (
                <motion.div
                  key="success"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={transitions.snap}
                >
                  <Check className="h-4 w-4 text-green-500" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Focus underline animation */}
          <motion.div
            className={cn(
              'absolute bottom-0 left-0 right-0 h-0.5 rounded-full',
              error ? 'bg-red-500' : success ? 'bg-green-500' : 'bg-teal-500'
            )}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: isFocused ? 1 : 0 }}
            transition={transitions.snap}
            style={{ originX: 0.5 }}
          />
        </div>

        {/* Helper/Error text */}
        <AnimatePresence mode="wait">
          {(error || helperText) && (
            <motion.p
              key={error ? 'error' : 'helper'}
              className={cn(
                'mt-1.5 text-xs',
                error ? 'text-red-500' : 'text-gray-500'
              )}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
            >
              {error || helperText}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    )
  }
)

FloatingInput.displayName = 'FloatingInput'

// ==========================================
// FLOATING TEXTAREA
// ==========================================

interface FloatingTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string
  success?: boolean
  helperText?: string
  maxLength?: number
  showCount?: boolean
}

export const FloatingTextarea = React.forwardRef<HTMLTextAreaElement, FloatingTextareaProps>(
  (
    {
      className,
      label,
      error,
      success,
      helperText,
      maxLength,
      showCount = true,
      disabled,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = React.useState(false)
    const [hasValue, setHasValue] = React.useState(!!props.value || !!props.defaultValue)
    const [charCount, setCharCount] = React.useState(
      typeof props.value === 'string' ? props.value.length : 0
    )

    const isFloating = isFocused || hasValue

    return (
      <div className={cn('relative', className)}>
        {/* Floating label */}
        <motion.label
          className={cn(
            'absolute left-3 pointer-events-none transition-colors duration-200 bg-white px-1',
            isFloating
              ? 'text-xs font-medium -top-2'
              : 'text-base text-gray-500 top-3',
            isFocused && !error && !success && 'text-teal-600',
            error && 'text-red-500',
            success && 'text-green-600',
            disabled && 'text-gray-400'
          )}
          initial={false}
          animate={{
            y: isFloating ? 0 : 8,
            scale: isFloating ? 0.85 : 1,
          }}
          transition={transitions.snap}
        >
          {label}
        </motion.label>

        {/* Textarea */}
        <textarea
          ref={ref}
          disabled={disabled}
          maxLength={maxLength}
          className={cn(
            'w-full min-h-[120px] px-3 pt-4 pb-2 text-base bg-white border rounded-lg outline-none transition-all duration-200 resize-y',
            'placeholder:text-transparent',
            // Default state
            'border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20',
            // Error state
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
            // Success state
            success && 'border-green-500 focus:border-green-500 focus:ring-green-500/20',
            // Disabled state
            disabled && 'bg-gray-50 cursor-not-allowed opacity-60',
          )}
          onFocus={() => setIsFocused(true)}
          onBlur={(e) => {
            setIsFocused(false)
            setHasValue(!!e.target.value)
          }}
          onChange={(e) => {
            setHasValue(!!e.target.value)
            setCharCount(e.target.value.length)
            props.onChange?.(e)
          }}
          {...props}
        />

        {/* Bottom row: helper text + character count */}
        <div className="flex items-center justify-between mt-1.5">
          <AnimatePresence mode="wait">
            {(error || helperText) && (
              <motion.p
                key={error ? 'error' : 'helper'}
                className={cn(
                  'text-xs',
                  error ? 'text-red-500' : 'text-gray-500'
                )}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
              >
                {error || helperText}
              </motion.p>
            )}
          </AnimatePresence>

          {showCount && maxLength && (
            <motion.span
              className={cn(
                'text-xs ml-auto',
                charCount > maxLength * 0.9 ? 'text-amber-500' : 'text-gray-400',
                charCount >= maxLength && 'text-red-500'
              )}
              animate={{
                scale: charCount >= maxLength * 0.9 ? [1, 1.1, 1] : 1,
              }}
            >
              {charCount}/{maxLength}
            </motion.span>
          )}
        </div>
      </div>
    )
  }
)

FloatingTextarea.displayName = 'FloatingTextarea'

// ==========================================
// FLOATING SELECT (Styled wrapper)
// ==========================================

interface FloatingSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  error?: string
  options: { value: string; label: string }[]
}

export const FloatingSelect = React.forwardRef<HTMLSelectElement, FloatingSelectProps>(
  ({ className, label, error, options, disabled, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false)
    const [hasValue, setHasValue] = React.useState(!!props.value)

    const isFloating = isFocused || hasValue

    return (
      <div className={cn('relative', className)}>
        <motion.label
          className={cn(
            'absolute left-3 pointer-events-none transition-colors duration-200 bg-white px-1',
            isFloating
              ? 'text-xs font-medium -top-2 z-10'
              : 'text-base text-gray-500 top-3',
            isFocused && !error && 'text-teal-600',
            error && 'text-red-500',
            disabled && 'text-gray-400'
          )}
        >
          {label}
        </motion.label>

        <select
          ref={ref}
          disabled={disabled}
          className={cn(
            'w-full h-12 px-3 pt-2 pb-2 text-base bg-white border rounded-lg outline-none transition-all duration-200 appearance-none cursor-pointer',
            'border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
            disabled && 'bg-gray-50 cursor-not-allowed opacity-60',
          )}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChange={(e) => {
            setHasValue(!!e.target.value)
            props.onChange?.(e)
          }}
          {...props}
        >
          <option value="">{label}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Dropdown arrow */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg
            className={cn(
              'h-4 w-4 text-gray-400 transition-transform',
              isFocused && 'rotate-180 text-teal-500'
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {error && (
          <p className="mt-1.5 text-xs text-red-500">{error}</p>
        )}
      </div>
    )
  }
)

FloatingSelect.displayName = 'FloatingSelect'
