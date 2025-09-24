'use client'

import { Card, CardContent, CardHeader, CardTitle } from './card'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

export interface StatsCardProps {
  title: string
  value: string | number
  description?: string
  icon?: LucideIcon
  trend?: {
    value: number
    label: string
    type: 'increase' | 'decrease' | 'neutral'
  }
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'gray' | 'adventure' | 'ocean' | 'sunset'
  className?: string
  contentClassName?: string
  loading?: boolean
  error?: string | null
  onClick?: () => void
}

const colorVariants = {
  blue: {
    border: 'border-l-blue-500',
    iconBg: 'bg-blue-100 dark:bg-blue-900/20',
    iconColor: 'text-blue-600 dark:text-blue-400',
    trendIncrease: 'text-blue-600',
    trendDecrease: 'text-blue-500',
  },
  green: {
    border: 'border-l-green-500',
    iconBg: 'bg-green-100 dark:bg-green-900/20',
    iconColor: 'text-green-600 dark:text-green-400',
    trendIncrease: 'text-green-600',
    trendDecrease: 'text-green-500',
  },
  purple: {
    border: 'border-l-purple-500',
    iconBg: 'bg-purple-100 dark:bg-purple-900/20',
    iconColor: 'text-purple-600 dark:text-purple-400',
    trendIncrease: 'text-purple-600',
    trendDecrease: 'text-purple-500',
  },
  orange: {
    border: 'border-l-orange-500',
    iconBg: 'bg-orange-100 dark:bg-orange-900/20',
    iconColor: 'text-orange-600 dark:text-orange-400',
    trendIncrease: 'text-orange-600',
    trendDecrease: 'text-orange-500',
  },
  red: {
    border: 'border-l-red-500',
    iconBg: 'bg-red-100 dark:bg-red-900/20',
    iconColor: 'text-red-600 dark:text-red-400',
    trendIncrease: 'text-red-600',
    trendDecrease: 'text-red-500',
  },
  gray: {
    border: 'border-l-gray-500',
    iconBg: 'bg-gray-100 dark:bg-gray-800',
    iconColor: 'text-gray-800 dark:text-gray-700',
    trendIncrease: 'text-gray-800',
    trendDecrease: 'text-gray-800',
  },
  adventure: {
    border: 'border-l-adventure-500',
    iconBg: 'bg-adventure-100 dark:bg-adventure-900/20',
    iconColor: 'text-adventure-600 dark:text-adventure-400',
    trendIncrease: 'text-adventure-600',
    trendDecrease: 'text-adventure-500',
  },
  ocean: {
    border: 'border-l-ocean-500',
    iconBg: 'bg-ocean-100 dark:bg-ocean-900/20',
    iconColor: 'text-ocean-600 dark:text-ocean-400',
    trendIncrease: 'text-ocean-600',
    trendDecrease: 'text-ocean-500',
  },
  sunset: {
    border: 'border-l-sunset-500',
    iconBg: 'bg-sunset-100 dark:bg-sunset-900/20',
    iconColor: 'text-sunset-600 dark:text-sunset-400',
    trendIncrease: 'text-sunset-600',
    trendDecrease: 'text-sunset-500',
  },
} as const

/**
 * Reusable stats card component for dashboard and analytics
 * Supports theming, trends, loading states, and interactions
 */
export function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  color = 'blue',
  className = '',
  contentClassName = '',
  loading = false,
  error = null,
  onClick
}: StatsCardProps) {
  const colors = colorVariants[color]

  if (loading) {
    return (
      <Card className={cn(
        'bg-white/70 backdrop-blur-sm border-0 shadow-lg transition-all duration-300',
        colors.border,
        className
      )}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse"></div>
          <div className={cn("p-2 rounded-lg animate-pulse", colors.iconBg)}>
            <div className="h-4 w-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
          </div>
        </CardHeader>
        <CardContent className={contentClassName}>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-2 animate-pulse"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse"></div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={cn(
        'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/10',
        'border-l-4 border-l-red-500',
        className
      )}>
        <CardContent className={cn('pt-6', contentClassName)}>
          <div className="text-center">
            <p className="text-red-600 dark:text-red-400 font-medium text-sm">Failed to load</p>
            <p className="text-red-500 dark:text-red-300 text-sm mt-1">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      className={cn(
        'bg-white/70 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300',
        colors.border,
        onClick && 'cursor-pointer hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {title}
        </CardTitle>
        {Icon && (
          <div className={cn('p-2 rounded-lg', colors.iconBg)}>
            <Icon className={cn('h-4 w-4', colors.iconColor)} />
          </div>
        )}
      </CardHeader>
      <CardContent className={contentClassName}>
        <div className="flex items-end justify-between">
          <div className="flex-1">
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </div>
            {description && (
              <p className="text-sm text-gray-800 dark:text-gray-700">
                {description}
              </p>
            )}
          </div>

          {trend && (
            <div className={cn(
              'flex items-center text-sm font-medium',
              trend.type === 'increase' ? colors.trendIncrease :
              trend.type === 'decrease' ? colors.trendDecrease :
              'text-gray-800 dark:text-gray-700'
            )}>
              <span className="mr-1">
                {trend.type === 'increase' ? '↗' :
                 trend.type === 'decrease' ? '↘' : '→'}
              </span>
              <span>
                {trend.type !== 'neutral' && (trend.value > 0 ? '+' : '')}
                {trend.value}
                {trend.type !== 'neutral' && '%'}
              </span>
              <span className="ml-1 text-gray-800 dark:text-gray-700">
                {trend.label}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Grid of stats cards with responsive layout
 */
interface StatsGridProps {
  cards: StatsCardProps[]
  columns?: 2 | 3 | 4 | 5
  className?: string
  loading?: boolean
  error?: string | null
}

export function StatsGrid({
  cards,
  columns = 4,
  className = '',
  loading = false,
  error = null
}: StatsGridProps) {
  const gridCols = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'
  }

  if (loading) {
    return (
      <div className={cn('grid gap-6', gridCols[columns], className)}>
        {Array.from({ length: columns }).map((_, index) => (
          <StatsCard
            key={index}
            title=""
            value={0}
            loading={true}
          />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/10">
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-red-600 dark:text-red-400 font-medium">Failed to load statistics</p>
            <p className="text-red-500 dark:text-red-300 text-sm mt-1">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('grid gap-6', gridCols[columns], className)}>
      {cards.map((card, index) => (
        <StatsCard
          key={card.title || index}
          {...card}
        />
      ))}
    </div>
  )
}

/**
 * Compact horizontal stats card for sidebars or small spaces
 */
export function CompactStatsCard({
  title,
  value,
  icon: Icon,
  color = 'blue',
  className = '',
  onClick
}: Pick<StatsCardProps, 'title' | 'value' | 'icon' | 'color' | 'className' | 'onClick'>) {
  const colors = colorVariants[color]

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg bg-white/70 backdrop-blur-sm border shadow-sm hover:shadow-md transition-all duration-200',
        onClick && 'cursor-pointer hover:scale-105',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {Icon && (
        <div className={cn('p-2 rounded-lg', colors.iconBg)}>
          <Icon className={cn('h-4 w-4', colors.iconColor)} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-700 truncate">
          {title}
        </p>
        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
      </div>
    </div>
  )
}

export default StatsCard