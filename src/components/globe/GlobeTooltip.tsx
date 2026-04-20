'use client'

import { Card } from '@/components/ui/card'

/** Keyboard shortcut help card shown when search is active */
export function GlobeSearchHelp() {
  return (
    <div className="fixed bottom-4 right-4 z-40">
      <Card className="bg-olive-900/80 text-white text-sm p-2">
        <div className="space-y-1">
          <div><kbd className="bg-white/20 px-1 rounded">⌃K</kbd> Search</div>
          <div><kbd className="bg-white/20 px-1 rounded">↑↓</kbd> Navigate</div>
          <div><kbd className="bg-white/20 px-1 rounded">⏎</kbd> Select</div>
          <div><kbd className="bg-white/20 px-1 rounded">Esc</kbd> Close</div>
        </div>
      </Card>
    </div>
  )
}
