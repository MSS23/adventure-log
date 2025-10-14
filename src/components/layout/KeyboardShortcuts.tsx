'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Command } from 'lucide-react'
import { log } from '@/lib/utils/logger'

interface Shortcut {
  key: string
  label: string
  action: () => void
  category: 'Navigation' | 'Actions' | 'Search' | 'UI'
}

export function KeyboardShortcuts() {
  const router = useRouter()
  const [showHelp, setShowHelp] = useState(false)

  const shortcuts: Shortcut[] = [
    // Navigation
    { key: 'd', label: 'Go to Dashboard', action: () => router.push('/dashboard'), category: 'Navigation' },
    { key: 'f', label: 'Go to Feed', action: () => router.push('/feed'), category: 'Navigation' },
    { key: 'g', label: 'Go to Globe', action: () => router.push('/globe'), category: 'Navigation' },
    { key: 'a', label: 'Go to Albums', action: () => router.push('/albums'), category: 'Navigation' },
    { key: 'p', label: 'Go to Profile', action: () => router.push('/profile'), category: 'Navigation' },

    // Actions
    { key: 'n', label: 'New Album', action: () => router.push('/albums/new'), category: 'Actions' },
    { key: 's', label: 'New Story', action: () => router.push('/stories/new'), category: 'Actions' },

    // Search
    { key: '/', label: 'Focus Search', action: () => {
      const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement
      if (searchInput) {
        searchInput.focus()
      } else {
        router.push('/search')
      }
    }, category: 'Search' },

    // UI
    { key: '?', label: 'Show Shortcuts', action: () => setShowHelp(true), category: 'UI' },
  ]

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    // Ignore if user is typing in an input/textarea
    if (event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement) {
      return
    }

    // Check for shortcuts
    const shortcut = shortcuts.find(s => s.key === event.key.toLowerCase())
    if (shortcut) {
      event.preventDefault()
      log.info('Keyboard shortcut triggered', { key: shortcut.key, label: shortcut.label })
      shortcut.action()
    }
  }, [shortcuts])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [handleKeyPress])

  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = []
    }
    acc[shortcut.category].push(shortcut)
    return acc
  }, {} as Record<string, Shortcut[]>)

  return (
    <>
      {/* Help Button - Bottom Left */}
      <button
        onClick={() => setShowHelp(true)}
        className="fixed bottom-6 left-6 z-40 h-10 w-10 rounded-full bg-gray-800 hover:bg-gray-700 text-white shadow-lg flex items-center justify-center transition-all hover:scale-110"
        title="Keyboard Shortcuts (?)"
      >
        <Command className="h-5 w-5" />
      </button>

      {/* Shortcuts Dialog */}
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Command className="h-5 w-5" />
              Keyboard Shortcuts
            </DialogTitle>
            <DialogDescription>
              Use these shortcuts to navigate faster
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
              <div key={category}>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">{category}</h3>
                <div className="space-y-2">
                  {categoryShortcuts.map((shortcut) => (
                    <div
                      key={shortcut.key}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-sm text-gray-700">{shortcut.label}</span>
                      <Badge variant="secondary" className="font-mono">
                        {shortcut.key === '/' ? (
                          <span>/</span>
                        ) : shortcut.key === '?' ? (
                          <span>?</span>
                        ) : (
                          <span className="uppercase">{shortcut.key}</span>
                        )}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t text-center">
            <p className="text-xs text-gray-500">
              Press <Badge variant="secondary" className="mx-1">?</Badge> anytime to view shortcuts
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
