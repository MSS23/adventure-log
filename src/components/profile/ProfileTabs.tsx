'use client'

import { cn } from '@/lib/utils'

export type ProfileTab = 'albums' | 'saved' | 'globe'

interface ProfileTabsProps {
  activeTab: ProfileTab
  onTabChange: (tab: ProfileTab) => void
  hideGlobe?: boolean
  hideSaved?: boolean
}

export function ProfileTabs({
  activeTab,
  onTabChange,
  hideGlobe = false,
  hideSaved = false
}: ProfileTabsProps) {
  const tabs: Array<{ id: ProfileTab; label: string; hidden?: boolean }> = [
    { id: 'albums', label: 'Albums' },
    { id: 'saved', label: 'Saved', hidden: hideSaved },
    { id: 'globe', label: 'Map View', hidden: hideGlobe }
  ]

  const visibleTabs = tabs.filter(tab => !tab.hidden)

  return (
    <div className="border-b border-border">
      <div className="flex gap-8">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "pb-3 px-1 text-sm font-medium transition-colors relative rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              activeTab === tab.id
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary"></div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
