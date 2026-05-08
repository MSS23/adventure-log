'use client'

import { Plane } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TravelLocation } from '@/lib/hooks/useTravelTimeline'

interface GlobeTimelineProps {
  availableYears: number[]
  effectiveSelectedYear: number | null
  handleYearChange: (year: number) => void
  handleEffectiveYearChange: (year: number | null) => void
  getYearData: (year: number) => { locations: TravelLocation[]; totalLocations: number } | null
  locations: TravelLocation[]
  currentLocationIndex: number
}

export function GlobeTimeline({
  availableYears,
  effectiveSelectedYear,
  handleYearChange,
  handleEffectiveYearChange,
  getYearData,
  locations,
  currentLocationIndex
}: GlobeTimelineProps) {
  if (availableYears.length === 0) return null

  return (
    <div className="bg-gradient-to-br from-stone-900/95 via-slate-800/95 to-stone-900/95 backdrop-blur-xl rounded-2xl p-6 shadow-2xl border border-stone-700/50">
      <div className="space-y-6">
        {/* Year Selection */}
        <div className="text-center">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="h-px w-12 bg-gradient-to-r from-transparent via-olive-500 to-olive-500"></div>
            <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-olive-400 to-olive-400 bg-clip-text text-transparent">
              Travel Timeline
            </h3>
            <div className="h-px w-12 bg-gradient-to-r from-olive-500 via-olive-500 to-transparent"></div>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {/* All Years Button */}
            <button
              onClick={() => handleEffectiveYearChange(null)}
              className={cn(
                "group relative px-6 py-3.5 rounded-2xl transition-all duration-300 min-w-[110px] overflow-hidden",
                !effectiveSelectedYear
                  ? "bg-gradient-to-br from-olive-500 to-olive-500 shadow-lg shadow-olive-500/30 scale-105 hover:shadow-xl hover:shadow-olive-500/40"
                  : "bg-stone-800/80 hover:bg-stone-700/80 border border-stone-600/50 hover:border-stone-500"
              )}
            >
              <div className="relative z-10">
                <div className={cn(
                  "font-bold text-2xl",
                  !effectiveSelectedYear ? "text-white" : "text-stone-200"
                )}>
                  All Years
                </div>
                <div className={cn(
                  "text-sm mt-1 font-medium",
                  !effectiveSelectedYear ? "text-olive-50" : "text-stone-400"
                )}>
                  {availableYears.reduce((total, year) => {
                    const yearData = getYearData(year)
                    return total + (yearData?.totalLocations || 0)
                  }, 0)} places
                </div>
              </div>
              {!effectiveSelectedYear && (
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              )}
            </button>

            {/* Individual Year Buttons */}
            {availableYears.map((year) => {
              const yearData = getYearData(year)
              const isSelected = effectiveSelectedYear === year
              return (
                <button
                  key={year}
                  onClick={() => handleYearChange(year)}
                  className={cn(
                    "group relative px-6 py-3.5 rounded-2xl transition-all duration-300 min-w-[110px] overflow-hidden",
                    isSelected
                      ? "bg-gradient-to-br from-olive-500 via-pink-500 to-rose-500 shadow-lg shadow-olive-500/30 scale-105 hover:shadow-xl hover:shadow-olive-500/40"
                      : "bg-stone-800/80 hover:bg-stone-700/80 border border-stone-600/50 hover:border-stone-500"
                  )}
                >
                  <div className="relative z-10">
                    <div className={cn(
                      "font-bold text-2xl",
                      isSelected ? "text-white" : "text-stone-200"
                    )}>
                      {year}
                    </div>
                    {yearData && (
                      <div className={cn(
                        "text-sm mt-1 font-medium",
                        isSelected ? "text-olive-50" : "text-stone-400"
                      )}>
                        {yearData.totalLocations} places
                      </div>
                    )}
                  </div>
                  {isSelected && (
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Journey Progress - Only show if viewing single year with multiple locations */}
        {locations.length > 1 && effectiveSelectedYear !== null && (
          <div className="space-y-3 pt-6 border-t border-stone-700/50">
            {/* Current Location Info */}
            {locations[currentLocationIndex] && (
              <div className="relative overflow-hidden bg-gradient-to-br from-stone-800/90 via-slate-800/70 to-stone-900/90 backdrop-blur-md rounded-2xl p-5 border border-stone-600/50 shadow-xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-olive-500/10 to-olive-500/10 rounded-full blur-3xl"></div>

                <div className="relative z-10">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-olive-500/20 rounded-lg">
                          <Plane className="h-4 w-4 text-olive-400 flex-shrink-0" />
                        </div>
                        <span className="text-base font-bold text-stone-400 uppercase tracking-widest">
                          Location {currentLocationIndex + 1} of {locations.length}
                        </span>
                      </div>
                      <div className="font-bold text-white text-2xl leading-tight mb-1.5">
                        {locations[currentLocationIndex].name}
                      </div>
                      <div className="flex items-center gap-2 text-stone-400 text-sm">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {locations[currentLocationIndex].visitDate.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Progress Bar */}
                  <div className="relative">
                    <div className="w-full bg-stone-700/40 rounded-full h-2.5 overflow-hidden shadow-inner">
                      <div
                        className="bg-gradient-to-r from-olive-500 to-olive-500 h-2.5 rounded-full transition-all duration-500 shadow-lg shadow-olive-500/50"
                        style={{ width: `${((currentLocationIndex + 1) / locations.length) * 100}%` }}
                      >
                        <div className="h-full w-full bg-gradient-to-r from-white/30 to-transparent"></div>
                      </div>
                    </div>
                    <div className="flex justify-between mt-2 text-xs font-medium text-stone-400">
                      <span>Progress</span>
                      <span>{Math.round(((currentLocationIndex + 1) / locations.length) * 100)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
