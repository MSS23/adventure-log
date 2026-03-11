'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldAlert, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useBlockUser } from '@/lib/hooks/useBlockedUsers'

interface BlockUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  username: string
  onBlocked?: () => void
}

export function BlockUserDialog({
  open,
  onOpenChange,
  userId,
  username,
  onBlocked,
}: BlockUserDialogProps) {
  const [reason, setReason] = useState('')
  const blockUser = useBlockUser()

  const handleBlock = async () => {
    try {
      await blockUser.mutateAsync({
        blockedId: userId,
        reason: reason.trim() || undefined,
      })
      onOpenChange(false)
      setReason('')
      onBlocked?.()
    } catch {
      // Error handled by mutation onError
    }
  }

  const handleOpenChange = (value: boolean) => {
    if (!value) {
      setReason('')
    }
    onOpenChange(value)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <ShieldAlert className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <DialogTitle className="text-lg font-semibold text-stone-900 dark:text-stone-100">
              Block @{username}?
            </DialogTitle>
          </div>
          <DialogDescription className="pt-2 text-sm text-stone-600 dark:text-stone-400">
            Blocking this user will:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <ul className="space-y-2 text-sm text-stone-700 dark:text-stone-300">
            <li className="flex items-start gap-2">
              <span className="mt-1 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-400" />
              Remove them from your followers and following lists
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-400" />
              Prevent them from viewing your profile and albums
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-400" />
              Hide their content from your feed and search results
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-400" />
              They will not be notified that you blocked them
            </li>
          </ul>

          <div>
            <label
              htmlFor="block-reason"
              className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300"
            >
              Reason (optional)
            </label>
            <textarea
              id="block-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why are you blocking this user?"
              maxLength={500}
              rows={2}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-olive-500 focus:outline-none focus:ring-2 focus:ring-olive-500/20 dark:border-stone-600 dark:bg-[#1A1A1A] dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-olive-400 dark:focus:ring-olive-400/20"
            />
          </div>

          <AnimatePresence>
            {blockUser.isError && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-sm text-red-600 dark:text-red-400"
              >
                {blockUser.error?.message || 'Failed to block user. Please try again.'}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <button
            type="button"
            onClick={() => handleOpenChange(false)}
            disabled={blockUser.isPending}
            className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-50 dark:border-stone-600 dark:bg-[#1A1A1A] dark:text-stone-300 dark:hover:bg-stone-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleBlock}
            disabled={blockUser.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50 dark:bg-red-700 dark:hover:bg-red-600"
          >
            {blockUser.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Blocking...
              </>
            ) : (
              'Block User'
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
