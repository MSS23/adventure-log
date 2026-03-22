'use client'

import { Globe as GlobeIcon, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface GlobeHeaderProps {
  locationsCount: number
  clustersCount: number
  totalAlbums: number
  totalPhotos: number
  availableYearsCount: number
  travelStats: {
    countriesVisited: number
    citiesVisited: number
    countriesPercentage: string
    citiesPercentage: string
  }
  filterUserId?: string
}

export function GlobeHeader({
  locationsCount,
  clustersCount,
  totalAlbums,
  totalPhotos,
  availableYearsCount,
  travelStats,
  filterUserId
}: GlobeHeaderProps) {
  return (
    <>
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-olive-600 to-olive-600 p-6 text-white shadow-xl">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
            <GlobeIcon className="h-8 w-8" />
            Your Travel Globe
          </h1>
          <p className="text-white/90 text-sm">
            {locationsCount > 0
              ? `Explore your ${locationsCount} ${locationsCount === 1 ? 'adventure' : 'adventures'} across the world`
              : 'Create your first album to see your travels on the globe'}
          </p>

          {/* Stats Grid */}
          {locationsCount > 0 && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-white/20 backdrop-blur-md rounded-lg p-4 border border-white/20 shadow-lg">
                <div className="text-3xl font-bold text-white">{clustersCount}</div>
                <div className="text-sm text-white/90 uppercase tracking-wide mt-1.5 font-medium">Location{clustersCount !== 1 ? 's' : ''}</div>
              </div>
              <div className="bg-white/20 backdrop-blur-md rounded-lg p-4 border border-white/20 shadow-lg">
                <div className="text-3xl font-bold text-white">{totalAlbums}</div>
                <div className="text-sm text-white/90 uppercase tracking-wide mt-1.5 font-medium">Album{totalAlbums !== 1 ? 's' : ''}</div>
              </div>
              <div className="bg-white/20 backdrop-blur-md rounded-lg p-4 border border-white/20 shadow-lg">
                <div className="text-3xl font-bold text-white">{totalPhotos}</div>
                <div className="text-sm text-white/90 uppercase tracking-wide mt-1.5 font-medium">Photo{totalPhotos !== 1 ? 's' : ''}</div>
              </div>
              <div className="bg-white/20 backdrop-blur-md rounded-lg p-4 border border-white/20 shadow-lg">
                <div className="text-3xl font-bold text-white">{availableYearsCount}</div>
                <div className="text-sm text-white/90 uppercase tracking-wide mt-1.5 font-medium">Year{availableYearsCount !== 1 ? 's' : ''}</div>
              </div>
              <div className="bg-white/20 backdrop-blur-md rounded-lg p-4 border border-white/20 shadow-lg">
                <div className="text-3xl font-bold text-white">{travelStats.countriesPercentage}%</div>
                <div className="text-sm text-white/90 uppercase tracking-wide mt-1.5 font-medium">{travelStats.countriesVisited} Countr{travelStats.countriesVisited !== 1 ? 'ies' : 'y'}</div>
              </div>
              <div className="bg-white/20 backdrop-blur-md rounded-lg p-4 border border-white/20 shadow-lg">
                <div className="text-3xl font-bold text-white">{travelStats.citiesPercentage}%</div>
                <div className="text-sm text-white/90 uppercase tracking-wide mt-1.5 font-medium">{travelStats.citiesVisited} Cit{travelStats.citiesVisited !== 1 ? 'ies' : 'y'}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions - Centered */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <Link href="/albums/new">
          <Button size="sm" className="shadow-lg">
            <Plus className="h-4 w-4 mr-2" />
            {filterUserId ? 'Add Your Own Adventure' : 'Add Adventure'}
          </Button>
        </Link>
      </div>
    </>
  )
}
