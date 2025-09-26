'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, Heart, MessageCircle, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UserNav } from './UserNav'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { instagramStyles } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

export function TopNavigation() {
  const [searchQuery, setSearchQuery] = useState('')
  const router = useRouter()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  return (
    <header className={cn(
      "sticky top-0 z-40 w-full backdrop-blur-md border-b",
      "bg-white/80 dark:bg-gray-900/80",
      instagramStyles.borders.light
    )}>
      <div className="flex items-center justify-between h-16 px-4 mx-auto max-w-6xl">
        {/* Left: Logo */}
        <div className="flex items-center space-x-4">
          <Link href="/dashboard" className="flex items-center space-x-2 group">
            <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Adventure Log
            </div>
          </Link>
        </div>

        {/* Center: Search (Desktop only) */}
        <div className="hidden md:flex flex-1 max-w-lg mx-8 lg:max-w-xl">
          <form onSubmit={handleSearch} className="relative w-full">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search photos, albums, locations..."
                className={cn(
                  "pl-10 pr-4 h-10 w-full lg:h-11",
                  "bg-gray-50/50 dark:bg-gray-800/50 border-gray-200/50 dark:border-gray-700/50",
                  "focus:bg-white dark:focus:bg-gray-800 focus:border-gray-300 dark:focus:border-gray-600",
                  "placeholder:text-gray-400 dark:placeholder:text-gray-500",
                  "transition-all duration-200 hover:bg-gray-100/50 dark:hover:bg-gray-700/50"
                )}
              />
            </div>
          </form>
        </div>

        {/* Right: Actions and User Menu */}
        <div className="flex items-center space-x-2">
          {/* Mobile search button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden h-8 w-8 p-0"
            onClick={() => router.push('/search')}
          >
            <Search className="h-5 w-5" />
          </Button>

          {/* Action buttons - desktop only */}
          <div className="hidden md:flex items-center space-x-1">
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
          </div>

          <div className="flex items-center space-x-2">
            <ThemeToggle variant="icon" />
            <UserNav />
          </div>
        </div>
      </div>
    </header>
  )
}