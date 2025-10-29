'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Search, Heart, Plus, Globe, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UserNav } from './UserNav'
import { NotificationCenter } from '@/components/notifications/NotificationCenter'
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
      "sticky top-0 z-50 w-full border-b bg-white",
      "border-gray-200",
      "shadow-sm"
    )}>
      <div className="flex items-center justify-between gap-2 sm:gap-4 h-16 px-3 sm:px-4 lg:px-6 mx-auto max-w-7xl">
        {/* Left: Logo */}
        <div className="flex items-center flex-shrink-0">
          <Link href="/feed" className="cursor-pointer">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">AL</span>
              </div>
              <span className="text-lg sm:text-xl font-semibold text-gray-900 whitespace-nowrap hidden sm:block">
                Adventure Log
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Search Bar - Enhanced design */}
        <div className="flex flex-1 max-w-2xl mx-1 sm:mx-2 md:mx-4">
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <Search className={cn(
              "absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-200",
              isFocused ? "text-teal-500" : "text-gray-400"
            )} />
            <Input
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Search adventures..."
              className={cn(
                "pl-10 sm:pl-12 pr-10 sm:pr-12 h-10 rounded-full border transition-all duration-200 text-sm",
                isFocused
                  ? "border-teal-500 bg-white ring-2 ring-teal-100"
                  : "border-gray-300 bg-gray-50 hover:bg-white hover:border-gray-400"
              )}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-1 transition-all duration-200"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </form>
        </div>

        {/* Right: Actions and User Menu */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Action buttons - Hidden on mobile, visible on tablet+ */}
          <div className="hidden md:flex items-center gap-1">
            <Link href="/albums/new">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 rounded-full hover:bg-gray-100 transition-all duration-200"
                title="Create Album"
              >
                <Plus className="h-5 w-5 text-gray-700" />
              </Button>
            </Link>

            <Link href="/feed">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 rounded-full hover:bg-gray-100 transition-all duration-200"
                title="Feed"
              >
                <Heart className="h-5 w-5 text-gray-700" />
              </Button>
            </Link>

            <Link href="/globe">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 rounded-full hover:bg-gray-100 transition-all duration-200"
                title="Explore Globe"
              >
                <Globe className="h-5 w-5 text-gray-700" />
              </Button>
            </Link>
          </div>

          {/* Notifications */}
          <NotificationCenter />

          {/* User menu */}
          <UserNav />
        </div>
      </div>
    </header>
  )
}