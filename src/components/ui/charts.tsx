'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ProgressRingProps {
  progress: number
  size?: number
  strokeWidth?: number
  className?: string
  children?: React.ReactNode
  color?: string
}

export function ProgressRing({
  progress,
  size = 120,
  strokeWidth = 8,
  className,
  children,
  color = '#3B82F6'
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDasharray = `${circumference} ${circumference}`
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-gray-200"
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: "easeInOut" }}
          strokeLinecap="round"
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  )
}

interface BarChartProps {
  data: Array<{ label: string; value: number; color?: string }>
  maxValue?: number
  className?: string
  showLabels?: boolean
  animated?: boolean
}

export function BarChart({
  data,
  maxValue,
  className,
  showLabels = true,
  animated = true
}: BarChartProps) {
  const max = maxValue || Math.max(...data.map(d => d.value))

  return (
    <div className={cn("space-y-3", className)}>
      {data.map((item, index) => (
        <div key={item.label} className="space-y-1">
          {showLabels && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-700 font-medium">{item.label}</span>
              <span className="text-gray-600">{item.value}</span>
            </div>
          )}
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: item.color || '#3B82F6' }}
              initial={animated ? { width: 0 } : { width: `${(item.value / max) * 100}%` }}
              animate={{ width: `${(item.value / max) * 100}%` }}
              transition={{ duration: 1, delay: animated ? index * 0.1 : 0, ease: "easeInOut" }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: React.ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
  gradient?: string
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  className,
  gradient = 'from-blue-500 to-indigo-600'
}: StatCardProps) {
  return (
    <div className={cn(
      "relative p-6 rounded-xl bg-white shadow-lg border-0 overflow-hidden group hover:shadow-xl transition-all duration-300",
      className
    )}>
      {/* Background gradient */}
      <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${gradient}`} />

      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <motion.p
            className="text-3xl font-bold text-gray-900"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {value}
          </motion.p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className={cn(
              "flex items-center gap-1 mt-2 text-xs font-medium",
              trend.isPositive ? "text-green-600" : "text-red-600"
            )}>
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}%</span>
              <span className="text-gray-500">vs last month</span>
            </div>
          )}
        </div>
        {icon && (
          <div className={`p-3 rounded-lg bg-gradient-to-br ${gradient} text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}

interface DonutChartProps {
  data: Array<{ label: string; value: number; color: string }>
  size?: number
  strokeWidth?: number
  className?: string
  showLabels?: boolean
}

export function DonutChart({
  data,
  size = 200,
  strokeWidth = 20,
  className,
  showLabels = true
}: DonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI

  let cumulativePercentage = 0

  return (
    <div className={cn("flex items-center gap-6", className)}>
      <div className="relative">
        <svg width={size} height={size} className="transform -rotate-90">
          {data.map((item, index) => {
            const percentage = (item.value / total) * 100
            const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`
            const strokeDashoffset = -((cumulativePercentage / 100) * circumference)

            cumulativePercentage += percentage

            return (
              <motion.circle
                key={item.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={item.color}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                initial={{ strokeDasharray: `0 ${circumference}` }}
                animate={{ strokeDasharray, strokeDashoffset }}
                transition={{ duration: 1, delay: index * 0.1, ease: "easeInOut" }}
              />
            )
          })}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{total}</div>
            <div className="text-xs text-gray-500">Total</div>
          </div>
        </div>
      </div>

      {showLabels && (
        <div className="space-y-2">
          {data.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">{item.label}</div>
                <div className="text-xs text-gray-500">
                  {item.value} ({Math.round((item.value / total) * 100)}%)
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

interface ActivityHeatmapProps {
  data: Array<{ date: string; value: number }>
  className?: string
}

export function ActivityHeatmap({ data, className }: ActivityHeatmapProps) {
  const maxValue = Math.max(...data.map(d => d.value))

  const getIntensity = (value: number) => {
    if (value === 0) return 'bg-gray-100'
    const intensity = (value / maxValue) * 4
    if (intensity <= 1) return 'bg-green-200'
    if (intensity <= 2) return 'bg-green-300'
    if (intensity <= 3) return 'bg-green-400'
    return 'bg-green-500'
  }

  return (
    <div className={cn("grid grid-cols-7 gap-1", className)}>
      {data.map((day, index) => (
        <motion.div
          key={day.date}
          className={cn(
            "w-3 h-3 rounded-sm cursor-pointer hover:scale-125 transition-transform",
            getIntensity(day.value)
          )}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.2, delay: index * 0.01 }}
          title={`${day.date}: ${day.value} activities`}
        />
      ))}
    </div>
  )
}