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

// Flat, bordered Field Notebook tiles — the per-stat accent lives only in the
// small icon chip (tint tokens are defined for both light and dark themes).
const gradientStyles = {
  teal: {
    icon: 'bg-[color:var(--color-forest-tint)] text-[color:var(--color-forest)]',
  },
  blue: {
    icon: 'bg-[color:var(--color-sky-tint)] text-[color:var(--color-sky)]',
  },
  purple: {
    icon: 'bg-[color:var(--color-coral-tint)] text-[color:var(--color-coral)]',
  },
  orange: {
    icon: 'bg-[color:var(--color-gold-tint)] text-[color:var(--color-gold)]',
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
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'relative p-4 sm:p-5 rounded-2xl border border-border bg-card cursor-pointer',
        'transition-all duration-200',
        'hover:border-primary/30 hover:shadow-md'
      )}
    >
      {/* Icon */}
      <div className={cn('inline-flex p-2 rounded-full mb-3', styles.icon)}>
        <Icon className="h-5 w-5" />
      </div>

      {/* Value */}
      <div className="al-stat-value text-2xl sm:text-3xl mb-1">
        {isNumeric ? (
          <AnimatedCounter value={value} />
        ) : (
          value
        )}
      </div>

      {/* Label */}
      <div className="text-xs text-muted-foreground font-medium">
        {label}
      </div>
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
