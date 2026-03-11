'use client'

import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatsCardProps {
  label: string
  value: number
  onClick?: () => void
  className?: string
}

export function StatsCard({
  label,
  value,
  onClick,
  className
}: StatsCardProps) {
  const content = (
    <CardContent className="p-6">
      <div>
        <p className="text-3xl font-bold text-stone-900">{value}</p>
        <p className="text-sm text-stone-600 mt-1">{label}</p>
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
        <Card className="border border-stone-200 shadow-sm rounded-2xl">
          {content}
        </Card>
      </button>
    )
  }

  return (
    <Card className={cn("border border-stone-200 shadow-sm rounded-2xl", className)}>
      {content}
    </Card>
  )
}
