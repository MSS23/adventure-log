'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase'
import { log } from '@/lib/utils/logger'
import {
  Home,
  Camera,
  Globe,
  User,
  Settings,
  Plus,
  X,
  Search,
  TrendingUp,
  Heart,
  Star,
  Activity
} from 'lucide-react'

interface AppSidebarProps {
  open: boolean
  onClose: () => void
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Albums', href: '/albums', icon: Camera },
  { name: 'Analytics', href: '/analytics', icon: TrendingUp },
  { name: 'Search', href: '/search', icon: Search },
  { name: 'Feed', href: '/feed', icon: Activity },
  { name: 'Favorites', href: '/favorites', icon: Heart },
  { name: 'Wishlist', href: '/wishlist', icon: Star },
  { name: 'Globe', href: '/globe', icon: Globe },
  { name: 'Profile', href: '/profile', icon: User },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function AppSidebar({ open, onClose }: AppSidebarProps) {
  const pathname = usePathname()

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 lg:p-6 border-b border-gray-200">
          <Link href="/dashboard" className="flex items-center">
            <Globe className="h-8 w-8 text-blue-600" />
            <span className="ml-2 text-xl font-bold text-gray-900">Adventure Log</span>
          </Link>

          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation Content - Flexible area */}
        <div className="flex flex-col h-full">
          <nav className="flex-1 mt-6 px-3 pb-4 overflow-y-auto">
          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "group flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-all duration-200 ease-in-out",
                    isActive
                      ? "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 shadow-sm border-l-4 border-blue-500"
                      : "text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 hover:text-gray-900 hover:shadow-sm"
                  )}
                  onClick={onClose} // Close sidebar on mobile when link is clicked
                >
                  <item.icon
                    className={cn(
                      "mr-3 h-5 w-5 flex-shrink-0",
                      isActive ? "text-blue-700" : "text-gray-700 group-hover:text-gray-800"
                    )}
                  />
                  {item.name}
                </Link>
              )
            })}
          </div>

          <div className="mt-8 px-3">
            <Link href="/albums/new">
              <Button className="w-full justify-start bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-sm transition-all duration-200">
                <Plus className="mr-2 h-4 w-4" />
                New Album
              </Button>
            </Link>
          </div>
          </nav>

          {/* Bottom section with stats - Fixed at bottom */}
          <QuickStats />
        </div>
      </div>
    </>
  )
}

// Quick Stats Component
function QuickStats() {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    albums: 0,
    photos: 0,
    countries: 0
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchStats = useCallback(async () => {
    try {
      const [albumsResult, photosResult] = await Promise.all([
        supabase
          .from('albums')
          .select('id, country_id')
          .eq('user_id', user?.id),
        supabase
          .from('photos')
          .select('id')
          .eq('user_id', user?.id)
      ])

      const albums = albumsResult.data || []
      const uniqueCountries = new Set(albums.filter(a => a.country_id).map(a => a.country_id))

      setStats({
        albums: albums.length,
        photos: photosResult.data?.length || 0,
        countries: uniqueCountries.size
      })
    } catch (err) {
      log.error('Error fetching sidebar stats', { error: err })
    } finally {
      setLoading(false)
    }
  }, [user?.id, supabase])

  useEffect(() => {
    if (user) {
      fetchStats()
    }
  }, [user, fetchStats])

  return (
    <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-gray-50">
      <div className="text-sm text-gray-800">
        <p className="font-medium mb-2">Quick Stats</p>
        {loading ? (
          <div className="mt-2 space-y-1">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex justify-between">
                <div className="h-3 bg-gray-200 rounded w-12 animate-pulse"></div>
                <div className="h-3 bg-gray-200 rounded w-6 animate-pulse"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-2 space-y-1">
            <div className="flex justify-between">
              <span>Albums</span>
              <span>{stats.albums}</span>
            </div>
            <div className="flex justify-between">
              <span>Photos</span>
              <span>{stats.photos}</span>
            </div>
            <div className="flex justify-between">
              <span>Countries</span>
              <span>{stats.countries}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}