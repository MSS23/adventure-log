'use client'

import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatsCardProps {
  label: string
  value: number
  icon?: React.ReactNode
  onClick?: () => void
  className?: string
}

export function StatsCard({
  label,
  value,
  icon,
  onClick,
  className
}: StatsCardProps) {
  const content = (
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-600 mt-1">{label}</p>
        </div>
        {icon && (
          <div className="text-gray-400">
            {icon}
          </div>
        )}
      </div>
    </CardContent>
  )

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={cn(
          "w-full text-left transition-all hover:shadow-md",
          className
        )}
      >
        <Card className="border border-gray-200 shadow-sm rounded-2xl">
          {content}
        </Card>
      </button>
    )
  }

  return (
    <Card className={cn("border border-gray-200 shadow-sm rounded-2xl", className)}>
      {content}
    </Card>
  )
}
