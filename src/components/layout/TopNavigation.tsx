'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Search, Heart, Plus, Globe, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UserNav } from './UserNav'
import { NotificationCenter } from '@/components/notifications/NotificationCenter'
import { MessageCenter } from '@/components/messaging/MessageCenter'
import { instagramStyles } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

export function TopNavigation() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)

  // Sync search query with URL params when on search page
  useEffect(() => {
    if (pathname === '/search') {
      const query = searchParams.get('q') || ''
      setSearchQuery(query)
    }
  }, [pathname, searchParams])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    } else {
      router.push('/search')
    }
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    // If on search page, update URL immediately for live search
    if (pathname === '/search' && value.trim()) {
      router.push(`/search?q=${encodeURIComponent(value.trim())}`)
    } else if (pathname === '/search' && !value.trim()) {
      router.push('/search')
    }
  }

  const clearSearch = () => {
    setSearchQuery('')
    if (pathname === '/search') {
      router.push('/search')
    }
  }

  return (
    <header className={cn(
      "sticky top-0 z-50 w-full backdrop-blur-xl border-b",
      "bg-white/90 dark:bg-gray-900/90",
      "border-gray-200/50 dark:border-gray-700/50",
      "shadow-sm"
    )}>
      <div className="flex items-center justify-between gap-2 sm:gap-4 h-16 px-3 sm:px-4 lg:px-6 mx-auto max-w-7xl">
        {/* Left: Logo */}
        <div className="flex items-center flex-shrink-0">
          <Link href="/dashboard" className="flex items-center group">
            <div className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent whitespace-nowrap hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 transition-all duration-300">
              Adventure Log
            </div>
          </Link>
        </div>

        {/* Center: Search Bar - Enhanced design */}
        <div className="flex flex-1 max-w-2xl mx-1 sm:mx-2 md:mx-4">
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <Search className={cn(
              "absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-200",
              isFocused ? "text-blue-500" : "text-gray-400"
            )} />
            <Input
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Search adventures, places, travelers..."
              className={cn(
                "pl-10 sm:pl-12 pr-10 sm:pr-12 h-10 sm:h-11 rounded-full border-2 transition-all duration-300 text-sm font-medium",
                isFocused
                  ? "border-blue-500 bg-white dark:bg-gray-800 shadow-lg shadow-blue-500/20 ring-4 ring-blue-500/10"
                  : "border-gray-200/60 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
              )}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full p-1 transition-all duration-200"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </form>
        </div>

        {/* Right: Actions and User Menu */}
        <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
          {/* Action buttons - Hidden on mobile (available in bottom nav), visible on tablet+ */}
          <div className="hidden md:flex items-center gap-1.5">
            <Link href="/albums/new">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 rounded-full hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30 transition-all duration-200 hover:scale-110 active:scale-95"
                title="Create Album"
              >
                <Plus className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              </Button>
            </Link>

            <Link href="/feed">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 rounded-full hover:bg-gradient-to-br hover:from-pink-50 hover:to-rose-50 dark:hover:from-pink-900/30 dark:hover:to-rose-900/30 transition-all duration-200 hover:scale-110 active:scale-95"
                title="Feed"
              >
                <Heart className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              </Button>
            </Link>

            <Link href="/globe">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 rounded-full hover:bg-gradient-to-br hover:from-emerald-50 hover:to-teal-50 dark:hover:from-emerald-900/30 dark:hover:to-teal-900/30 transition-all duration-200 hover:scale-110 active:scale-95"
                title="Explore Globe"
              >
                <Globe className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              </Button>
            </Link>
          </div>

          {/* Notifications and Messages - Always visible */}
          <NotificationCenter />
          <MessageCenter />

          {/* User menu - always visible */}
          <UserNav />
        </div>
      </div>
    </header>
  )
}