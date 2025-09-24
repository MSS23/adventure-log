'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface DataPoint {
  date: string
  value: number
  label?: string
}

interface LineChartProps {
  data: DataPoint[]
  height?: number
  className?: string
  color?: string
  showDots?: boolean
  animated?: boolean
  showGrid?: boolean
  onPointClick?: (point: DataPoint, index: number) => void
  onRangeSelect?: (startIndex: number, endIndex: number) => void
  selectable?: boolean
}

export function LineChart({
  data,
  height = 200,
  className,
  color = '#3B82F6',
  showDots = true,
  animated = true,
  showGrid = true,
  onPointClick,
  onRangeSelect,
  selectable = false
}: LineChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null)
  const [selectedRange, setSelectedRange] = useState<{start: number, end: number} | null>(null)

  const { pathData, points, maxValue, minValue } = useMemo(() => {
    if (!data.length) return { pathData: '', points: [], maxValue: 0, minValue: 0 }

    const maxValue = Math.max(...data.map(d => d.value))
    const minValue = Math.min(...data.map(d => d.value))
    const range = maxValue - minValue || 1

    const width = 400
    const chartHeight = height - 40
    const padding = 20

    const points = data.map((point, index) => ({
      x: padding + (index / Math.max(data.length - 1, 1)) * (width - 2 * padding),
      y: padding + (1 - (point.value - minValue) / range) * chartHeight,
      value: point.value,
      date: point.date,
      label: point.label
    }))

    const pathData = points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ')

    return { pathData, points, maxValue, minValue }
  }, [data, height])

  if (!data.length) {
    return (
      <div className={cn("flex items-center justify-center bg-gray-50 rounded-lg", className)} style={{ height }}>
        <p className="text-gray-500">No data available</p>
      </div>
    )
  }

  return (
    <div className={cn("relative", className)}>
      <svg width="100%" height={height} viewBox="0 0 400 200" className="overflow-visible">
        {/* Grid lines */}
        {showGrid && (
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f3f4f6" strokeWidth="1"/>
            </pattern>
          </defs>
        )}
        {showGrid && <rect width="100%" height="100%" fill="url(#grid)" />}

        {/* Line */}
        <motion.path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={animated ? { pathLength: 0 } : {}}
          animate={animated ? { pathLength: 1 } : {}}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />

        {/* Area under line */}
        <motion.path
          d={`${pathData} L ${points[points.length - 1]?.x} ${height - 20} L ${points[0]?.x} ${height - 20} Z`}
          fill={color}
          fillOpacity="0.1"
          initial={animated ? { pathLength: 0 } : {}}
          animate={animated ? { pathLength: 1 } : {}}
          transition={{ duration: 1.5, ease: "easeInOut", delay: 0.5 }}
        />

        {/* Range selection overlay */}
        {selectable && selectedRange && (
          <rect
            x={Math.min(points[selectedRange.start]?.x || 0, points[selectedRange.end]?.x || 0)}
            y={20}
            width={Math.abs((points[selectedRange.end]?.x || 0) - (points[selectedRange.start]?.x || 0))}
            height={height - 40}
            fill={color}
            fillOpacity="0.2"
            stroke={color}
            strokeWidth="1"
            strokeDasharray="5,5"
          />
        )}

        {/* Data points */}
        {showDots && points.map((point, index) => {
          const isInSelectedRange = selectedRange &&
            index >= Math.min(selectedRange.start, selectedRange.end) &&
            index <= Math.max(selectedRange.start, selectedRange.end)

          return (
            <motion.circle
              key={index}
              cx={point.x}
              cy={point.y}
              r={hoveredPoint === index ? 6 : isInSelectedRange ? 5 : 4}
              fill={isInSelectedRange ? '#ffffff' : color}
              stroke={isInSelectedRange ? color : 'none'}
              strokeWidth={isInSelectedRange ? 2 : 0}
              className="cursor-pointer hover:opacity-80 transition-all duration-200"
              initial={animated ? { scale: 0 } : {}}
              animate={animated ? { scale: 1 } : {}}
              transition={{ duration: 0.3, delay: animated ? index * 0.1 : 0 }}
              onMouseEnter={() => setHoveredPoint(index)}
              onMouseLeave={() => setHoveredPoint(null)}
              onClick={() => {
                if (onPointClick) {
                  onPointClick(data[index], index)
                } else if (selectable && onRangeSelect) {
                  if (!selectedRange) {
                    setSelectedRange({ start: index, end: index })
                  } else {
                    setSelectedRange({ start: selectedRange.start, end: index })
                    onRangeSelect(
                      Math.min(selectedRange.start, index),
                      Math.max(selectedRange.start, index)
                    )
                  }
                }
              }}
            />
          )
        })}

        {/* Tooltip */}
        {hoveredPoint !== null && (
          <g>
            <motion.rect
              x={points[hoveredPoint].x - 40}
              y={points[hoveredPoint].y - 35}
              width="80"
              height="25"
              rx="4"
              fill="rgba(0, 0, 0, 0.8)"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
            />
            <text
              x={points[hoveredPoint].x}
              y={points[hoveredPoint].y - 20}
              fill="white"
              textAnchor="middle"
              fontSize="12"
              fontWeight="500"
            >
              {points[hoveredPoint].value}
            </text>
          </g>
        )}
      </svg>

      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-500 w-12">
        <span>{maxValue}</span>
        <span>{Math.round((maxValue + minValue) / 2)}</span>
        <span>{minValue}</span>
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between text-xs text-gray-500 mt-2 px-5">
        {data.map((point, index) => (
          <span key={index} className={index % Math.ceil(data.length / 4) === 0 ? '' : 'opacity-0'}>
            {new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        ))}
      </div>
    </div>
  )
}

interface AreaChartProps {
  data: DataPoint[]
  height?: number
  className?: string
  colors?: string[]
  stacked?: boolean
  animated?: boolean
}

export function AreaChart({
  data,
  height = 200,
  className,
  colors = ['#3B82F6', '#10B981', '#F59E0B'],
  animated = true
}: AreaChartProps) {
  const { pathData, maxValue } = useMemo(() => {
    if (!data.length) return { pathData: '', maxValue: 0 }

    const maxValue = Math.max(...data.map(d => d.value))
    const width = 400
    const chartHeight = height - 40
    const padding = 20

    const points = data.map((point, index) => ({
      x: padding + (index / Math.max(data.length - 1, 1)) * (width - 2 * padding),
      y: padding + (1 - point.value / maxValue) * chartHeight,
      value: point.value
    }))

    const pathData = points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ')

    return { pathData, maxValue }
  }, [data, height])

  if (!data.length) {
    return (
      <div className={cn("flex items-center justify-center bg-gray-50 rounded-lg", className)} style={{ height }}>
        <p className="text-gray-500">No data available</p>
      </div>
    )
  }

  return (
    <div className={cn("relative", className)}>
      <svg width="100%" height={height} viewBox="0 0 400 200">
        <defs>
          <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors[0]} stopOpacity="0.3"/>
            <stop offset="100%" stopColor={colors[0]} stopOpacity="0.05"/>
          </linearGradient>
        </defs>

        {/* Area */}
        <motion.path
          d={`${pathData} L ${400 - 20} ${height - 20} L 20 ${height - 20} Z`}
          fill="url(#areaGradient)"
          initial={animated ? { pathLength: 0 } : {}}
          animate={animated ? { pathLength: 1 } : {}}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />

        {/* Line */}
        <motion.path
          d={pathData}
          fill="none"
          stroke={colors[0]}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={animated ? { pathLength: 0 } : {}}
          animate={animated ? { pathLength: 1 } : {}}
          transition={{ duration: 1.5, ease: "easeInOut", delay: 0.3 }}
        />
      </svg>

      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-500 w-12">
        <span>{maxValue}</span>
        <span>{Math.round(maxValue / 2)}</span>
        <span>0</span>
      </div>
    </div>
  )
}

interface CalendarHeatmapProps {
  data: Array<{ date: string; value: number }>
  className?: string
  months?: number
  colorScheme?: 'blue' | 'green' | 'purple' | 'red'
}

export function CalendarHeatmap({
  data,
  className,
  colorScheme = 'green'
}: CalendarHeatmapProps) {
  const maxValue = Math.max(...data.map(d => d.value), 1)

  const getIntensityColor = (value: number) => {
    const intensity = Math.ceil((value / maxValue) * 4)
    const colors = {
      blue: ['bg-gray-100', 'bg-blue-200', 'bg-blue-300', 'bg-blue-400', 'bg-blue-500'],
      green: ['bg-gray-100', 'bg-green-200', 'bg-green-300', 'bg-green-400', 'bg-green-500'],
      purple: ['bg-gray-100', 'bg-purple-200', 'bg-purple-300', 'bg-purple-400', 'bg-purple-500'],
      red: ['bg-gray-100', 'bg-red-200', 'bg-red-300', 'bg-red-400', 'bg-red-500']
    }
    return colors[colorScheme][intensity] || colors[colorScheme][0]
  }

  // Generate last 365 days
  const days = Array.from({ length: 365 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (365 - i))
    return date.toISOString().split('T')[0]
  })

  const dataMap = data.reduce((acc, item) => {
    acc[item.date] = item.value
    return acc
  }, {} as Record<string, number>)

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex justify-between items-center text-xs text-gray-600">
        <span>Less</span>
        <div className="flex gap-1">
          {Array.from({ length: 5 }, (_, i) => (
            <div
              key={i}
              className={cn("w-2 h-2 rounded-sm", getIntensityColor(i / 4 * maxValue))}
            />
          ))}
        </div>
        <span>More</span>
      </div>

      <div className="grid grid-cols-53 gap-1">
        {days.map((day, index) => (
          <motion.div
            key={day}
            className={cn(
              "w-2 h-2 rounded-sm cursor-pointer hover:opacity-80 transition-opacity",
              getIntensityColor(dataMap[day] || 0)
            )}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.1, delay: index * 0.001 }}
            title={`${day}: ${dataMap[day] || 0} activities`}
          />
        ))}
      </div>
    </div>
  )
}

interface TimelineChartProps {
  data: Array<{
    date: string
    title: string
    description?: string
    value: number
    type?: 'travel' | 'photo' | 'milestone'
  }>
  className?: string
  height?: number
}

export function TimelineChart({
  data,
  className
}: TimelineChartProps) {
  const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const getTypeColor = (type: string = 'travel') => {
    const colors = {
      travel: 'bg-blue-500',
      photo: 'bg-green-500',
      milestone: 'bg-purple-500'
    }
    return colors[type as keyof typeof colors] || colors.travel
  }

  const getTypeIcon = (type: string = 'travel') => {
    const icons = {
      travel: '✈️',
      photo: '📸',
      milestone: '🏆'
    }
    return icons[type as keyof typeof icons] || icons.travel
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

        <div className="space-y-6">
          {sortedData.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="relative flex items-start gap-4"
            >
              {/* Timeline dot */}
              <div className={cn(
                "w-3 h-3 rounded-full border-2 border-white shadow-sm z-10",
                getTypeColor(item.type)
              )} />

              {/* Content */}
              <div className="flex-1 pb-6">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{getTypeIcon(item.type)}</span>
                  <h4 className="font-medium text-gray-900">{item.title}</h4>
                  <span className="text-xs text-gray-500">
                    {new Date(item.date).toLocaleDateString()}
                  </span>
                </div>
                {item.description && (
                  <p className="text-sm text-gray-600 ml-7">{item.description}</p>
                )}
                <div className="ml-7 mt-2">
                  <span className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                    {item.value} {item.type === 'photo' ? 'photos' : 'activities'}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}