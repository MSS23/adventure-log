'use client'

interface PhotoWeatherContextProps {
  latitude: number
  longitude: number
  takenAt: string
  location?: string | null
  showInline?: boolean
  compact?: boolean
  className?: string
}

export function PhotoWeatherContext({
  className = ''
}: PhotoWeatherContextProps) {
  // Simplified weather context - no API calls
  return (
    <div className={`p-3 rounded-lg ${className}`}>
      <div className="text-sm opacity-75">
        Weather data unavailable
      </div>
    </div>
  )
}
