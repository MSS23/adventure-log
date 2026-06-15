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
        <p className="text-3xl font-bold text-foreground">{value}</p>
        <p className="text-sm text-muted-foreground mt-1">{label}</p>
      </div>
    </CardContent>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "w-full text-left rounded-2xl transition-all duration-200 hover:shadow-md active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          className
        )}
      >
        <Card className="border border-border shadow-sm rounded-2xl">
          {content}
        </Card>
      </button>
    )
  }

  return (
    <Card className={cn("border border-border shadow-sm rounded-2xl", className)}>
      {content}
    </Card>
  )
}
