'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Calendar,
  MapPin,
  Camera,
  Clock,
  Plus
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface TimelineEntry {
  id: string
  year: number
  sequenceOrder: number
  cityId?: number
  countryId?: number
  visitDate: string
  latitude: number
  longitude: number
  albumCount: number
  photoCount: number
  locationName?: string
}

interface TimelineControlsProps {
  availableYears: number[]
  selectedYear: number | null
  onYearChange: (year: number) => void
  isPlaying: boolean
  onPlay: () => void
  onPause: () => void
  onReset: () => void
  speed: number
  onSpeedChange: (speed: number) => void
  progress: {
    segment: number
    total: number
    percentage: number
  }
  onSeek: (segment: number) => void
  currentSegment: TimelineEntry | null
  timeline: TimelineEntry[]
  totalDuration: number
}

const speedOptions = [
  { value: 0.25, label: '0.25x' },
  { value: 0.5, label: '0.5x' },
  { value: 1, label: '1x' },
  { value: 2, label: '2x' },
  { value: 3, label: '3x' },
  { value: 5, label: '5x' }
]

export function TimelineControls({
  availableYears,
  selectedYear,
  onYearChange,
  isPlaying,
  onPlay,
  onPause,
  onReset,
  speed,
  onSpeedChange,
  progress,
  onSeek,
  currentSegment,
  timeline,
  totalDuration
}: TimelineControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 w-full max-w-7xl px-4 sm:px-6">
      <Card className="bg-white/95 backdrop-blur-md border-0 shadow-2xl w-full">
        <CardContent className="p-4 sm:p-6">
          {/* Year Selection */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-6">
            <div className="flex items-center gap-2 flex-shrink-0">
              <Calendar className="h-4 w-4 text-gray-700" />
              <span className="text-base font-medium text-gray-800">Travel Year:</span>
            </div>
            <div className="flex gap-2 flex-wrap justify-center">
              {availableYears.map((year) => (
                <Button
                  key={year}
                  variant={selectedYear === year ? "default" : "outline"}
                  size="sm"
                  onClick={() => onYearChange(year)}
                  className={cn(
                    "transition-all duration-200 min-w-[60px]",
                    selectedYear === year
                      ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                      : "hover:bg-blue-50 hover:border-blue-300"
                  )}
                >
                  {year}
                </Button>
              ))}
            </div>
          </div>

          {selectedYear && timeline.length > 0 && (
            <>
              {/* Main Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onReset}
                    className="hover:bg-gray-50 flex-shrink-0"
                  >
                    <RotateCcw className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Reset</span>
                  </Button>

                  <Button
                    onClick={isPlaying ? onPause : onPlay}
                    size="lg"
                    className="bg-blue-600 hover:bg-blue-700 shadow-md px-6 sm:px-8"
                  >
                    {isPlaying ? (
                      <Pause className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5" />
                    )}
                    <span className="ml-2 hidden sm:inline">
                      {isPlaying ? 'Pause' : 'Play'}
                    </span>
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <FastForward className="h-4 w-4 text-gray-700 flex-shrink-0" />
                  <span className="text-base text-gray-800 hidden sm:inline">Speed:</span>
                  <Select value={speed.toString()} onValueChange={(value) => onSpeedChange(parseFloat(value))}>
                    <SelectTrigger className="w-16 sm:w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {speedOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value.toString()}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-6 bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between text-sm text-gray-800 mb-3">
                  <span className="font-medium">Journey Progress</span>
                  <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-full">
                    <Clock className="h-3 w-3" />
                    <span className="font-mono">{formatDuration(totalDuration / speed)}</span>
                  </div>
                </div>
                <Slider
                  value={[progress.percentage]}
                  onValueChange={([value]) => {
                    const targetSegment = Math.floor((value / 100) * progress.total)
                    onSeek(targetSegment)
                  }}
                  max={100}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-gray-700 mt-2">
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Start
                  </span>
                  <span className="bg-white px-2 py-1 rounded-full font-medium">
                    {Math.round(progress.percentage)}%
                  </span>
                  <span className="flex items-center gap-1">
                    End
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  </span>
                </div>
              </div>

              {/* Current Location Info */}
              {currentSegment && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                        <MapPin className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-gray-900 truncate">
                          {currentSegment.locationName || `Location ${currentSegment.sequenceOrder}`}
                        </h4>
                        <p className="text-sm text-gray-800">
                          {formatDate(currentSegment.visitDate)} • {selectedYear}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
                      <div className="flex items-center gap-1 text-sm text-gray-800">
                        <Camera className="h-3 w-3" />
                        <span className="hidden sm:inline">{currentSegment.albumCount} albums</span>
                        <span className="sm:hidden">{currentSegment.albumCount}a</span>
                      </div>
                      <Badge variant="secondary" className="text-sm">
                        <span className="hidden sm:inline">{currentSegment.photoCount} photos</span>
                        <span className="sm:hidden">{currentSegment.photoCount}p</span>
                      </Badge>
                    </div>
                  </div>
                </div>
              )}

              {/* Timeline Overview Toggle */}
              <div className="text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-gray-800 hover:text-gray-900 hover:bg-gray-100 rounded-full px-4 py-2 transition-all duration-200"
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  {isExpanded ? 'Hide' : 'Show'} Timeline Overview
                  <span className="ml-2 text-lg">{isExpanded ? '▲' : '▼'}</span>
                </Button>
              </div>

              {/* Expanded Timeline View */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-56 sm:max-h-48 overflow-y-auto">
                    {timeline.map((entry, index) => (
                      <button
                        key={entry.id}
                        onClick={() => onSeek(index)}
                        className={cn(
                          "p-3 rounded-lg text-left transition-all duration-200 hover:shadow-md min-h-[80px]",
                          progress.segment === index
                            ? "bg-blue-100 border-2 border-blue-300 shadow-md"
                            : "bg-gray-50 hover:bg-gray-100 border border-gray-200"
                        )}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <span className="font-medium text-sm text-gray-900 line-clamp-1 pr-2 flex-1">
                            {entry.locationName || `Stop ${entry.sequenceOrder}`}
                          </span>
                          <Badge
                            variant={progress.segment === index ? "default" : "secondary"}
                            className="text-sm flex-shrink-0"
                          >
                            {index + 1}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-800 mb-1">
                          {formatDate(entry.visitDate)}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <span className="hidden sm:inline">{entry.albumCount} albums</span>
                          <span className="sm:hidden">{entry.albumCount}a</span>
                          <span>•</span>
                          <span className="hidden sm:inline">{entry.photoCount} photos</span>
                          <span className="sm:hidden">{entry.photoCount}p</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Stats Summary */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-3 gap-3 sm:gap-4 text-center">
                  <div className="p-2 sm:p-3 bg-blue-50 rounded-lg">
                    <div className="text-xl sm:text-2xl font-bold text-blue-600">{timeline.length}</div>
                    <div className="text-sm text-gray-800">
                      <span className="hidden sm:inline">Destinations</span>
                      <span className="sm:hidden">Stops</span>
                    </div>
                  </div>
                  <div className="p-2 sm:p-3 bg-green-50 rounded-lg">
                    <div className="text-xl sm:text-2xl font-bold text-green-600">
                      {timeline.reduce((sum, entry) => sum + entry.albumCount, 0)}
                    </div>
                    <div className="text-sm text-gray-800">Albums</div>
                  </div>
                  <div className="p-2 sm:p-3 bg-purple-50 rounded-lg">
                    <div className="text-xl sm:text-2xl font-bold text-purple-600">
                      {timeline.reduce((sum, entry) => sum + entry.photoCount, 0)}
                    </div>
                    <div className="text-sm text-gray-800">Photos</div>
                  </div>
                </div>
              </div>
            </>
          )}


          {!selectedYear && (
            <div className="text-center py-12 px-6">
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 max-w-md mx-auto">
                <div className="p-4 bg-purple-100 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                  <Calendar className="h-10 w-10 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Choose Your Adventure Year
                </h3>
                <p className="text-gray-800 mb-6 leading-relaxed">
                  Select a year from above to explore your travel timeline and watch your journey unfold with interactive flight animations.
                </p>
                <div className="space-y-3">
                  {availableYears.length > 0 ? (
                    <p className="text-sm text-purple-600 font-medium">
                      ✨ You have travels from {availableYears.length} year{availableYears.length > 1 ? 's' : ''}
                    </p>
                  ) : (
                    <Button
                      asChild
                      size="lg"
                      className="w-full bg-purple-600 hover:bg-purple-700 shadow-lg"
                    >
                      <Link href="/albums/new">
                        <Plus className="h-5 w-5 mr-2" />
                        Create Your First Album
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}