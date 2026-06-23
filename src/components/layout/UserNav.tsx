'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/components/auth/AuthProvider'
import { LayoutDashboard, Settings, LogOut, Camera, Bookmark, Star, MapPin, MessageSquarePlus, User, Sun, Moon, Monitor } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { getAvatarUrl } from '@/lib/utils/avatar'
import { getDisplayName, getDisplayInitial } from '@/lib/utils/display-name'
import { FeedbackDialog } from '@/components/feedback/FeedbackDialog'
import { useTheme } from '@/lib/contexts/ThemeContext'

const themeMeta = {
  light: { icon: Sun, label: 'Light' },
  dark: { icon: Moon, label: 'Dark' },
  system: { icon: Monitor, label: 'System' },
} as const

export function UserNav() {
  const { user, profile, signOut } = useAuth()
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()

  if (!user) return null

  const ThemeIcon = themeMeta[theme].icon

  const initials =
    profile?.display_name || profile?.username
      ? getDisplayInitial(profile.display_name, profile.username)
      : user.email?.substring(0, 2).toUpperCase() || 'U'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-full p-0">
          <Avatar className="h-9 w-9 sm:h-10 sm:w-10">
            <AvatarImage src={getAvatarUrl(profile?.avatar_url, profile?.username)} alt={profile?.name || 'User'} />
            <AvatarFallback className="text-xs sm:text-sm">{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {profile?.display_name || profile?.username
                ? getDisplayName(profile.display_name, profile.username)
                : user.email?.split('@')[0]}
            </p>
            <p className="text-sm leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/dashboard" className="flex items-center">
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link href="/profile" className="flex items-center">
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link href="/albums" className="flex items-center">
            <Camera className="mr-2 h-4 w-4" />
            <span>My Albums</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/saved" className="flex items-center">
            <Bookmark className="mr-2 h-4 w-4" />
            <span>Saved</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link href="/wishlist" className="flex items-center">
            <Star className="mr-2 h-4 w-4" />
            <span>Wishlist</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link href="/countries" className="flex items-center">
            <MapPin className="mr-2 h-4 w-4" />
            <span>Countries</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/settings" className="flex items-center">
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem
          className="cursor-pointer"
          onSelect={(e) => {
            e.preventDefault()
            toggleTheme()
          }}
        >
          <ThemeIcon className="mr-2 h-4 w-4" />
          <span className="flex-1">Theme</span>
          <span className="text-xs text-muted-foreground">{themeMeta[theme].label}</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          className="cursor-pointer"
          onSelect={(e) => {
            e.preventDefault()
            setFeedbackOpen(true)
          }}
        >
          <MessageSquarePlus className="mr-2 h-4 w-4" />
          <span>Send feedback</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="cursor-pointer text-destructive focus:text-destructive"
          onClick={signOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>

      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </DropdownMenu>
  )
}