'use client'

import { Button } from '@/components/ui/button'

type MobileTab = 'map' | 'list' | 'input'

interface MobileNavigationProps {
  activeTab: MobileTab
  onTabChange: (tab: MobileTab) => void
  placeCount?: number
}

export function MobileNavigation({
  activeTab,
  onTabChange,
  placeCount = 0,
}: MobileNavigationProps) {
  const tabs: { id: MobileTab; label: string; icon: string }[] = [
    { id: 'map', label: '지도', icon: '🗺️' },
    { id: 'list', label: '목록', icon: '📍' },
    { id: 'input', label: '추가', icon: '➕' },
  ]

  return (
    <nav
      data-testid="mobile-nav"
      className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50 sm:hidden pb-safe"
    >
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant="ghost"
            size="touch"
            onClick={() => onTabChange(tab.id)}
            className={`
              flex-1 flex flex-col items-center justify-center gap-0.5 h-full rounded-none
              ${activeTab === tab.id
                ? 'text-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900'
              }
            `}
          >
            <span className="text-xl">{tab.icon}</span>
            <span className="text-xs font-medium">
              {tab.label}
              {tab.id === 'list' && placeCount > 0 && ` (${placeCount})`}
            </span>
          </Button>
        ))}
      </div>
    </nav>
  )
}

export type { MobileTab }
