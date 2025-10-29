'use client'

import { cn } from '@/lib/utils'

export type ProfileTab = 'albums' | 'map' | 'saved'

interface ProfileTabsProps {
  activeTab: ProfileTab
  onTabChange: (tab: ProfileTab) => void
  hideMap?: boolean
  hideSaved?: boolean
}

export function ProfileTabs({
  activeTab,
  onTabChange,
  hideMap = false,
  hideSaved = false
}: ProfileTabsProps) {
  const tabs: Array<{ id: ProfileTab; label: string; hidden?: boolean }> = [
    { id: 'albums', label: 'Albums' },
    { id: 'map', label: 'Map View', hidden: hideMap },
    { id: 'saved', label: 'Saved', hidden: hideSaved }
  ]

  const visibleTabs = tabs.filter(tab => !tab.hidden)

  return (
    <div className="border-b border-gray-200">
      <div className="flex gap-8">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "pb-3 px-1 text-sm font-medium transition-colors relative",
              activeTab === tab.id
                ? "text-teal-600"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600"></div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
