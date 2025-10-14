'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Search, Heart, MessageCircle, Plus, Globe, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UserNav } from './UserNav'
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
      "sticky top-0 z-40 w-full backdrop-blur-md border-b",
      "bg-white/80",
      instagramStyles.borders.light
    )}>
      <div className="flex items-center justify-between gap-2 sm:gap-4 h-16 px-3 sm:px-4 mx-auto max-w-6xl">
        {/* Left: Logo */}
        <div className="flex items-center flex-shrink-0">
          <Link href="/dashboard" className="flex items-center group">
            <div className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent whitespace-nowrap">
              Adventure Log
            </div>
          </Link>
        </div>

        {/* Center: Search Bar - Responsive sizing */}
        <div className="flex flex-1 max-w-xl mx-1 sm:mx-2 md:mx-4">
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <Search className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Search..."
              className={cn(
                "pl-8 sm:pl-10 pr-8 sm:pr-10 h-9 sm:h-10 rounded-full border-gray-200 transition-all text-sm",
                isFocused ? "border-blue-500 bg-white shadow-sm" : "bg-gray-50"
              )}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </form>
        </div>

        {/* Right: Actions and User Menu */}
        <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
          {/* Action buttons - Hidden on mobile (available in bottom nav), visible on tablet+ */}
          <div className="hidden md:flex items-center gap-1">
            <Link href="/albums/new">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Plus className="h-5 w-5" />
              </Button>
            </Link>

            <Link href="/feed">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Heart className="h-5 w-5" />
              </Button>
            </Link>

            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MessageCircle className="h-5 w-5" />
            </Button>

            <Link href="/globe">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Explore Globe">
                <Globe className="h-5 w-5" />
              </Button>
            </Link>
          </div>

          {/* User menu - always visible */}
          <UserNav />
        </div>
      </div>
    </header>
  )
}