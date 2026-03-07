'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Globe, MapPin, Camera, Plane, LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  value: number | string
  label: string
  icon: LucideIcon
  gradient: 'teal' | 'blue' | 'purple' | 'orange'
  delay?: number
  onClick?: () => void
}

const gradientStyles = {
  teal: {
    bg: 'bg-gradient-to-br from-teal-50 to-cyan-100',
    border: 'border-teal-200/50 hover:border-teal-300',
    shadow: 'hover:shadow-teal-500/20',
    icon: 'bg-teal-100 text-teal-600',
    value: 'text-teal-700'
  },
  blue: {
    bg: 'bg-gradient-to-br from-blue-50 to-indigo-100',
    border: 'border-blue-200/50 hover:border-blue-300',
    shadow: 'hover:shadow-blue-500/20',
    icon: 'bg-blue-100 text-blue-600',
    value: 'text-blue-700'
  },
  purple: {
    bg: 'bg-gradient-to-br from-purple-50 to-pink-100',
    border: 'border-purple-200/50 hover:border-purple-300',
    shadow: 'hover:shadow-purple-500/20',
    icon: 'bg-purple-100 text-purple-600',
    value: 'text-purple-700'
  },
  orange: {
    bg: 'bg-gradient-to-br from-orange-50 to-amber-100',
    border: 'border-orange-200/50 hover:border-orange-300',
    shadow: 'hover:shadow-orange-500/20',
    icon: 'bg-orange-100 text-orange-600',
    value: 'text-orange-700'
  }
}

function AnimatedCounter({ value, className }: { value: number; className?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })

  useEffect(() => {
    if (!isInView) return

    const duration = 1500 // 1.5 seconds
    const startTime = performance.now()
    const startValue = 0

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Easing function (ease-out-expo)
      const eased = 1 - Math.pow(1 - progress, 4)
      const currentCount = Math.floor(startValue + (value - startValue) * eased)

      setCount(currentCount)

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [value, isInView])

  return (
    <span ref={ref} className={className}>
      {count.toLocaleString()}
    </span>
  )
}

function StatCard({ value, label, icon: Icon, gradient, delay = 0, onClick }: StatCardProps) {
  const styles = gradientStyles[gradient]
  const isNumeric = typeof value === 'number'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 24,
        delay
      }}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'relative p-4 rounded-2xl border-2 cursor-pointer',
        'transition-all duration-300',
        'hover:shadow-xl',
        styles.bg,
        styles.border,
        styles.shadow
      )}
    >
      {/* Icon */}
      <div className={cn('inline-flex p-2 rounded-xl mb-3', styles.icon)}>
        <Icon className="h-5 w-5" />
      </div>

      {/* Value */}
      <div className={cn('text-2xl sm:text-3xl font-bold mb-1', styles.value)}>
        {isNumeric ? (
          <AnimatedCounter value={value} />
        ) : (
          value
        )}
      </div>

      {/* Label */}
      <div className="text-sm font-medium text-gray-600">
        {label}
      </div>

      {/* Decorative gradient overlay on hover */}
      <div className="absolute inset-0 rounded-2xl bg-white/0 hover:bg-white/20 transition-colors pointer-events-none" />
    </motion.div>
  )
}

interface AnimatedStatsGridProps {
  stats: {
    countries: number
    cities: number
    photos: number
    distance: number
  }
  onStatClick?: (stat: string) => void
}

export function AnimatedStatsGrid({ stats, onStatClick }: AnimatedStatsGridProps) {
  const formatDistance = (km: number): string => {
    if (km >= 1000) {
      return `${Math.floor(km / 1000)}k km`
    }
    return `${km} km`
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
    >
      <StatCard
        value={stats.countries}
        label="Countries"
        icon={Globe}
        gradient="teal"
        delay={0}
        onClick={() => onStatClick?.('countries')}
      />
      <StatCard
        value={stats.cities}
        label="Cities"
        icon={MapPin}
        gradient="blue"
        delay={0.05}
        onClick={() => onStatClick?.('cities')}
      />
      <StatCard
        value={stats.photos}
        label="Photos"
        icon={Camera}
        gradient="purple"
        delay={0.1}
        onClick={() => onStatClick?.('photos')}
      />
      <StatCard
        value={formatDistance(stats.distance)}
        label="Distance"
        icon={Plane}
        gradient="orange"
        delay={0.15}
        onClick={() => onStatClick?.('distance')}
      />
    </motion.div>
  )
}
