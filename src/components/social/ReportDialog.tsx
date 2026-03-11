'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flag, Loader2, CheckCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import type { ReportReason, ReportTargetType } from '@/types/database'

interface ReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetType: ReportTargetType
  targetId: string
  targetUserId?: string
}

const REPORT_REASONS: { value: ReportReason; label: string; description: string }[] = [
  { value: 'spam', label: 'Spam', description: 'Unwanted or repetitive content' },
  { value: 'harassment', label: 'Harassment', description: 'Bullying, threats, or targeted abuse' },
  { value: 'inappropriate', label: 'Inappropriate Content', description: 'Nudity, violence, or disturbing material' },
  { value: 'copyright', label: 'Copyright Violation', description: 'Unauthorized use of copyrighted material' },
  { value: 'misinformation', label: 'Misinformation', description: 'False or misleading information' },
  { value: 'other', label: 'Other', description: 'Something else not listed above' },
]

export function ReportDialog({
  open,
  onOpenChange,
  targetType,
  targetId,
  targetUserId,
}: ReportDialogProps) {
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null)
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!selectedReason) return

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_type: targetType,
          target_id: targetId,
          reported_user_id: targetUserId,
          reason: selectedReason,
          description: description.trim() || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to submit report')
      }

      setIsSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit report')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenChange = (value: boolean) => {
    if (!value) {
      // Reset state when closing
      setTimeout(() => {
        setSelectedReason(null)
        setDescription('')
        setIsSubmitted(false)
        setError(null)
      }, 200)
    }
    onOpenChange(value)
  }

  const targetLabel = targetType === 'user' ? 'user' : targetType

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <AnimatePresence mode="wait">
          {isSubmitted ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center py-6 text-center"
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-olive-100 dark:bg-olive-900/30">
                <CheckCircle className="h-7 w-7 text-olive-600 dark:text-olive-400" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-stone-900 dark:text-stone-100">
                Report Submitted
              </h3>
              <p className="mb-6 max-w-sm text-sm text-stone-600 dark:text-stone-400">
                Thank you for helping keep our community safe. Our team will review your report
                and take appropriate action.
              </p>
              <button
                type="button"
                onClick={() => handleOpenChange(false)}
                className="rounded-lg bg-olive-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-olive-700 dark:bg-olive-700 dark:hover:bg-olive-600"
              >
                Done
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-olive-100 dark:bg-olive-900/30">
                    <Flag className="h-5 w-5 text-olive-600 dark:text-olive-400" />
                  </div>
                  <DialogTitle className="text-lg font-semibold text-stone-900 dark:text-stone-100">
                    Report {targetLabel}
                  </DialogTitle>
                </div>
                <DialogDescription className="pt-2 text-sm text-stone-600 dark:text-stone-400">
                  Select the reason that best describes why you are reporting this {targetLabel}.
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4 space-y-4">
                {/* Reason selection */}
                <fieldset className="space-y-2">
                  <legend className="sr-only">Report reason</legend>
                  {REPORT_REASONS.map((option) => (
                    <label
                      key={option.value}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                        selectedReason === option.value
                          ? 'border-olive-500 bg-olive-50 dark:border-olive-400 dark:bg-olive-900/20'
                          : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50 dark:border-white/[0.1] dark:bg-[#1A1A1A] dark:hover:border-stone-600 dark:hover:bg-stone-750'
                      }`}
                    >
                      <input
                        type="radio"
                        name="report-reason"
                        value={option.value}
                        checked={selectedReason === option.value}
                        onChange={() => setSelectedReason(option.value)}
                        className="mt-0.5 h-4 w-4 border-stone-300 text-olive-600 focus:ring-olive-500 dark:border-stone-600"
                      />
                      <div className="flex-1">
                        <span className="block text-sm font-medium text-stone-900 dark:text-stone-100">
                          {option.label}
                        </span>
                        <span className="block text-xs text-stone-500 dark:text-stone-400">
                          {option.description}
                        </span>
                      </div>
                    </label>
                  ))}
                </fieldset>

                {/* Description */}
                <div>
                  <label
                    htmlFor="report-description"
                    className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300"
                  >
                    Additional details (optional)
                  </label>
                  <textarea
                    id="report-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide any additional context..."
                    maxLength={1000}
                    rows={3}
                    className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-olive-500 focus:outline-none focus:ring-2 focus:ring-olive-500/20 dark:border-stone-600 dark:bg-[#1A1A1A] dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-olive-400 dark:focus:ring-olive-400/20"
                  />
                  <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">
                    {description.length}/1000 characters
                  </p>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-sm text-red-600 dark:text-red-400"
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <DialogFooter className="mt-4 gap-2 sm:gap-0">
                <button
                  type="button"
                  onClick={() => handleOpenChange(false)}
                  disabled={isSubmitting}
                  className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-50 dark:border-stone-600 dark:bg-[#1A1A1A] dark:text-stone-300 dark:hover:bg-stone-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!selectedReason || isSubmitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-olive-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-olive-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-olive-700 dark:hover:bg-olive-600"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Report'
                  )}
                </button>
              </DialogFooter>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
