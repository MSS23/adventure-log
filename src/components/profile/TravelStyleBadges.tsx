'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Backpack,
  Gem,
  Mountain,
  Palmtree,
  Camera,
  Utensils,
  Tent,
  Plane,
  Ship,
  Bike,
  Car,
  Train,
  Compass,
  Map,
  Heart,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useHaptics } from '@/lib/hooks/useHaptics'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'

export interface TravelStyle {
  id: string
  label: string
  icon: typeof Backpack
  color: string
  bgColor: string
  description: string
}

export const travelStyles: TravelStyle[] = [
  {
    id: 'backpacker',
    label: 'Backpacker',
    icon: Backpack,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 border-amber-200',
    description: 'Budget-friendly adventures',
  },
  {
    id: 'luxury',
    label: 'Luxury',
    icon: Gem,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 border-purple-200',
    description: 'Five-star experiences',
  },
  {
    id: 'adventure',
    label: 'Adventure',
    icon: Mountain,
    color: 'text-green-600',
    bgColor: 'bg-green-50 border-green-200',
    description: 'Thrilling experiences',
  },
  {
    id: 'beach',
    label: 'Beach Lover',
    icon: Palmtree,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50 border-cyan-200',
    description: 'Sun, sand, and sea',
  },
  {
    id: 'photographer',
    label: 'Photographer',
    icon: Camera,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50 border-pink-200',
    description: 'Capturing moments',
  },
  {
    id: 'foodie',
    label: 'Foodie',
    icon: Utensils,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 border-orange-200',
    description: 'Culinary explorer',
  },
  {
    id: 'camping',
    label: 'Camping',
    icon: Tent,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 border-emerald-200',
    description: 'Outdoor enthusiast',
  },
  {
    id: 'jetsetter',
    label: 'Jetsetter',
    icon: Plane,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-200',
    description: 'Frequent flyer',
  },
  {
    id: 'cruise',
    label: 'Cruiser',
    icon: Ship,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50 border-indigo-200',
    description: 'Sea voyages',
  },
  {
    id: 'cyclist',
    label: 'Cyclist',
    icon: Bike,
    color: 'text-lime-600',
    bgColor: 'bg-lime-50 border-lime-200',
    description: 'Two-wheeled adventures',
  },
  {
    id: 'roadtrip',
    label: 'Road Tripper',
    icon: Car,
    color: 'text-red-600',
    bgColor: 'bg-red-50 border-red-200',
    description: 'Open road explorer',
  },
  {
    id: 'train',
    label: 'Train Travel',
    icon: Train,
    color: 'text-slate-600',
    bgColor: 'bg-slate-50 border-slate-200',
    description: 'Rail journeys',
  },
  {
    id: 'explorer',
    label: 'Explorer',
    icon: Compass,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50 border-teal-200',
    description: 'Off the beaten path',
  },
  {
    id: 'planner',
    label: 'Planner',
    icon: Map,
    color: 'text-violet-600',
    bgColor: 'bg-violet-50 border-violet-200',
    description: 'Detailed itineraries',
  },
  {
    id: 'romantic',
    label: 'Romantic',
    icon: Heart,
    color: 'text-rose-600',
    bgColor: 'bg-rose-50 border-rose-200',
    description: 'Couple getaways',
  },
  {
    id: 'spontaneous',
    label: 'Spontaneous',
    icon: Sparkles,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50 border-yellow-200',
    description: 'Last-minute trips',
  },
]

interface TravelStyleBadgesProps {
  selectedStyles: string[]
  onChange?: (styles: string[]) => void
  editable?: boolean
  maxSelect?: number
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function TravelStyleBadges({
  selectedStyles,
  onChange,
  editable = false,
  maxSelect = 5,
  className,
  size = 'md',
}: TravelStyleBadgesProps) {
  const { triggerSelection, triggerLight } = useHaptics()
  const prefersReducedMotion = useReducedMotion()

  const handleToggle = (styleId: string) => {
    if (!editable || !onChange) return

    const isSelected = selectedStyles.includes(styleId)

    if (isSelected) {
      // Remove
      triggerLight()
      onChange(selectedStyles.filter((s) => s !== styleId))
    } else if (selectedStyles.length < maxSelect) {
      // Add
      triggerSelection()
      onChange([...selectedStyles, styleId])
    }
  }

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs gap-1',
    md: 'px-3 py-1.5 text-sm gap-1.5',
    lg: 'px-4 py-2 text-base gap-2',
  }

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  }

  // Display mode - just show selected badges
  if (!editable) {
    if (selectedStyles.length === 0) return null

    return (
      <div className={cn('flex flex-wrap gap-2', className)}>
        {selectedStyles.map((styleId) => {
          const style = travelStyles.find((s) => s.id === styleId)
          if (!style) return null
          const Icon = style.icon

          return (
            <motion.div
              key={style.id}
              className={cn(
                'inline-flex items-center rounded-full border font-medium',
                style.bgColor,
                style.color,
                sizeClasses[size]
              )}
              initial={prefersReducedMotion ? {} : { scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            >
              <Icon className={iconSizes[size]} />
              <span>{style.label}</span>
            </motion.div>
          )
        })}
      </div>
    )
  }

  // Edit mode - show all badges with selection
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">
          Select your travel styles ({selectedStyles.length}/{maxSelect})
        </span>
        {selectedStyles.length > 0 && (
          <button
            onClick={() => onChange?.([])}
            className="text-gray-400 hover:text-gray-600 text-xs"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <AnimatePresence>
          {travelStyles.map((style) => {
            const Icon = style.icon
            const isSelected = selectedStyles.includes(style.id)
            const canSelect = selectedStyles.length < maxSelect

            return (
              <motion.button
                key={style.id}
                onClick={() => handleToggle(style.id)}
                disabled={!isSelected && !canSelect}
                className={cn(
                  'inline-flex items-center rounded-full border font-medium transition-all',
                  sizeClasses[size],
                  isSelected
                    ? cn(style.bgColor, style.color, 'shadow-sm')
                    : canSelect
                    ? 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    : 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed'
                )}
                whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
                whileHover={
                  prefersReducedMotion || (!isSelected && !canSelect)
                    ? {}
                    : { scale: 1.02 }
                }
                layout
                title={style.description}
              >
                <Icon className={iconSizes[size]} />
                <span>{style.label}</span>
                {isSelected && (
                  <motion.span
                    className="ml-1"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                  >
                    ✓
                  </motion.span>
                )}
              </motion.button>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}

// Compact display for profile cards
export function TravelStyleBadgesCompact({
  selectedStyles,
  maxDisplay = 3,
  className,
}: {
  selectedStyles: string[]
  maxDisplay?: number
  className?: string
}) {
  if (selectedStyles.length === 0) return null

  const displayStyles = selectedStyles.slice(0, maxDisplay)
  const remaining = selectedStyles.length - maxDisplay

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {displayStyles.map((styleId) => {
        const style = travelStyles.find((s) => s.id === styleId)
        if (!style) return null
        const Icon = style.icon

        return (
          <div
            key={style.id}
            className={cn(
              'p-1.5 rounded-full border',
              style.bgColor,
              style.color
            )}
            title={style.label}
          >
            <Icon className="h-3 w-3" />
          </div>
        )
      })}
      {remaining > 0 && (
        <span className="text-xs text-gray-400 ml-1">+{remaining}</span>
      )}
    </div>
  )
}
