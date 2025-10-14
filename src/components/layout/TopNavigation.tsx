'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, Heart, MessageCircle, Plus, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UserNav } from './UserNav'
import { instagramStyles } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

export function TopNavigation() {
  const router = useRouter()

  return (
    <header className={cn(
      "sticky top-0 z-40 w-full backdrop-blur-md border-b",
      "bg-white/80",
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

        {/* Spacer for centered layout */}
        <div className="flex-1" />

        {/* Right: Actions and User Menu */}
        <div className="flex items-center space-x-2">
          {/* Action buttons */}
          <div className="flex items-center space-x-1">
            {/* Search button - all devices */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => router.push('/search')}
              title="Search"
            >
              <Search className="h-5 w-5" />
            </Button>
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

          <div className="flex items-center space-x-2">
            <UserNav />
          </div>
        </div>
      </div>
    </header>
  )
}