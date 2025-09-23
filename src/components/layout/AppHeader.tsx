'use client'

import { Menu, Bell, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UserNav } from './UserNav'

interface AppHeaderProps {
  onMenuClick: () => void
}

export function AppHeader({ onMenuClick }: AppHeaderProps) {
  return (
    <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 px-6 lg:px-10 py-2 shadow-sm">
      <div className="flex items-center justify-between h-12">
        {/* Left side - Mobile menu button and search */}
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden h-8 w-8 p-0"
            onClick={onMenuClick}
          >
            <Menu className="h-4 w-4" />
          </Button>

          {/* Search bar */}
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search albums, photos..."
              className="pl-10 w-72 h-9 bg-gray-50/50 border-gray-200 focus:bg-white transition-colors text-sm"
            />
          </div>
        </div>

        {/* Right side - Notifications and user menu */}
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" className="relative h-8 w-8 p-0">
            <Bell className="h-4 w-4" />
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 text-white text-xs rounded-full flex items-center justify-center text-[10px]">
              3
            </span>
          </Button>

          <UserNav />
        </div>
      </div>
    </header>
  )
}