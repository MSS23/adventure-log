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
    <div className="border-b border-stone-200">
      <div className="flex gap-8">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "pb-3 px-1 text-sm font-medium transition-colors relative",
              activeTab === tab.id
                ? "text-olive-600"
                : "text-stone-600 hover:text-stone-900"
            )}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-olive-500"></div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
