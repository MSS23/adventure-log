'use client'

import { useState } from 'react'
import { MoreHorizontal, ShieldBan, Flag } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { BlockUserDialog } from '@/components/social/BlockUserDialog'
import { ReportDialog } from '@/components/social/ReportDialog'
import { useAuth } from '@/components/auth/AuthProvider'
import type { ReportTargetType } from '@/types/database'

interface UserActionsMenuProps {
  /** The user ID of the person being acted upon */
  userId: string
  /** The username displayed in the block dialog */
  username: string
  /** Type of content being reported (defaults to 'user') */
  targetType?: ReportTargetType
  /** ID of the content being reported (defaults to userId) */
  targetId?: string
  /** Callback after the user is blocked */
  onBlocked?: () => void
  /** Additional class names for the trigger button */
  className?: string
}

export function UserActionsMenu({
  userId,
  username,
  targetType = 'user',
  targetId,
  onBlocked,
  className,
}: UserActionsMenuProps) {
  const { user } = useAuth()
  const [blockDialogOpen, setBlockDialogOpen] = useState(false)
  const [reportDialogOpen, setReportDialogOpen] = useState(false)

  // Don't show the menu for the current user's own content
  if (!user || user.id === userId) {
    return null
  }

  const resolvedTargetId = targetId || userId

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200 ${className || ''}`}
            aria-label="User actions"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onSelect={() => setReportDialogOpen(true)}
            className="flex cursor-pointer items-center gap-2 text-amber-600 dark:text-amber-400"
          >
            <Flag className="h-4 w-4" />
            <span>Report</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => setBlockDialogOpen(true)}
            variant="destructive"
            className="flex cursor-pointer items-center gap-2"
          >
            <ShieldBan className="h-4 w-4" />
            <span>Block @{username}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <BlockUserDialog
        open={blockDialogOpen}
        onOpenChange={setBlockDialogOpen}
        userId={userId}
        username={username}
        onBlocked={onBlocked}
      />

      <ReportDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        targetType={targetType}
        targetId={resolvedTargetId}
        targetUserId={userId}
      />
    </>
  )
}
