'use client'

import { useState, useEffect } from 'react'
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
  Clock
} from 'lucide-react'
import { cn } from '@/lib/utils'

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
    <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-10">
      <Card className="bg-white/90 backdrop-blur-md border-0 shadow-2xl w-full max-w-4xl">
        <CardContent className="p-6">
          {/* Year Selection */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Year:</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {availableYears.map((year) => (
                <Button
                  key={year}
                  variant={selectedYear === year ? "default" : "outline"}
                  size="sm"
                  onClick={() => onYearChange(year)}
                  className={cn(
                    "transition-all duration-200",
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
              <div className="flex items-center justify-center gap-4 mb-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onReset}
                  className="hover:bg-gray-50"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>

                <Button
                  onClick={isPlaying ? onPause : onPlay}
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 shadow-md px-8"
                >
                  {isPlaying ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5" />
                  )}
                </Button>

                <div className="flex items-center gap-2">
                  <FastForward className="h-4 w-4 text-gray-600" />
                  <Select value={speed.toString()} onValueChange={(value) => onSpeedChange(parseFloat(value))}>
                    <SelectTrigger className="w-20">
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
              <div className="mb-6">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                  <span>Progress</span>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    <span>{formatDuration(totalDuration / speed)}</span>
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
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Start</span>
                  <span>{Math.round(progress.percentage)}%</span>
                  <span>End</span>
                </div>
              </div>

              {/* Current Location Info */}
              {currentSegment && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <MapPin className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {currentSegment.locationName || `Location ${currentSegment.sequenceOrder}`}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {formatDate(currentSegment.visitDate)} • {selectedYear}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Camera className="h-3 w-3" />
                        <span>{currentSegment.albumCount} albums</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {currentSegment.photoCount} photos
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
                  className="text-gray-600 hover:text-gray-900"
                >
                  {isExpanded ? 'Hide' : 'Show'} Timeline Overview
                  <span className="ml-1">{isExpanded ? '▲' : '▼'}</span>
                </Button>
              </div>

              {/* Expanded Timeline View */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-48 overflow-y-auto">
                    {timeline.map((entry, index) => (
                      <button
                        key={entry.id}
                        onClick={() => onSeek(index)}
                        className={cn(
                          "p-3 rounded-lg text-left transition-all duration-200 hover:shadow-md",
                          progress.segment === index
                            ? "bg-blue-100 border-2 border-blue-300 shadow-md"
                            : "bg-gray-50 hover:bg-gray-100 border border-gray-200"
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm text-gray-900 line-clamp-1">
                            {entry.locationName || `Stop ${entry.sequenceOrder}`}
                          </span>
                          <Badge
                            variant={progress.segment === index ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {index + 1}
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-600">
                          {formatDate(entry.visitDate)}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                          <span>{entry.albumCount} albums</span>
                          <span>•</span>
                          <span>{entry.photoCount} photos</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Stats Summary */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{timeline.length}</div>
                    <div className="text-xs text-gray-600">Destinations</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {timeline.reduce((sum, entry) => sum + entry.albumCount, 0)}
                    </div>
                    <div className="text-xs text-gray-600">Albums</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">
                      {timeline.reduce((sum, entry) => sum + entry.photoCount, 0)}
                    </div>
                    <div className="text-xs text-gray-600">Photos</div>
                  </div>
                </div>
              </div>
            </>
          )}

          {selectedYear && timeline.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No travels in {selectedYear}</p>
              <p className="text-sm">Select a different year or add some albums for this year</p>
            </div>
          )}

          {!selectedYear && (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Select a year to begin</p>
              <p className="text-sm">Choose a year above to view your travel timeline</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}